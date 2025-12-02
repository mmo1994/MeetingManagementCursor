import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, getRefreshTokenExpiry } from '../utils/jwt';
import { createAuditLog, AuditActions } from '../utils/audit';
import { AppError } from '../middlewares/errorHandler';
import { RegisterInput, LoginInput } from '../utils/validation';
import { SafeUser } from '../types';
import { Request } from 'express';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  user: SafeUser;
  tokens: AuthTokens;
}

export class AuthService {
  async register(input: RegisterInput, req?: Request): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }
    
    // Hash password
    const passwordHash = await hashPassword(input.password);
    
    // Create user with default settings
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash,
        timezone: input.timezone || 'UTC',
        settings: {
          create: {
            emailNotificationsEnabled: true,
            pushNotificationsEnabled: true,
            inAppNotificationsEnabled: true,
            themePreference: 'SYSTEM',
          },
        },
      },
    });
    
    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);
    
    // Audit log
    await createAuditLog({
      action: AuditActions.USER_REGISTERED,
      entity: 'User',
      entityId: user.id,
      userId: user.id,
      details: { email: user.email },
      req,
    });
    
    // Return safe user (without password)
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, tokens };
  }
  
  async login(input: LoginInput, req?: Request): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }
    
    // Verify password
    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }
    
    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);
    
    // Audit log
    await createAuditLog({
      action: AuditActions.USER_LOGIN,
      entity: 'User',
      entityId: user.id,
      userId: user.id,
      details: { method: 'password' },
      req,
    });
    
    // Return safe user
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, tokens };
  }
  
  async refresh(refreshToken: string, req?: Request): Promise<AuthTokens> {
    // Verify token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }
    
    // Check if token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token', 401);
    }
    
    // Delete old token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });
    
    // Generate new tokens
    const tokens = await this.generateTokens(payload.userId, payload.email);
    
    // Audit log
    await createAuditLog({
      action: AuditActions.TOKEN_REFRESHED,
      entity: 'User',
      entityId: payload.userId,
      userId: payload.userId,
      req,
    });
    
    return tokens;
  }
  
  async logout(userId: string, refreshToken?: string, req?: Request): Promise<void> {
    // Delete specific token or all tokens for user
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    } else {
      await prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
    
    // Audit log
    await createAuditLog({
      action: AuditActions.USER_LOGOUT,
      entity: 'User',
      entityId: userId,
      userId,
      req,
    });
  }
  
  async getUser(userId: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) return null;
    
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
  
  private async generateTokens(userId: string, email: string): Promise<AuthTokens> {
    const payload = { userId, email };
    
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: getRefreshTokenExpiry(),
      },
    });
    
    return { accessToken, refreshToken };
  }
  
  // Clean up expired refresh tokens (called periodically)
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}

export const authService = new AuthService();

