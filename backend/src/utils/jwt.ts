import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { JWTPayload } from '../types';

export function generateAccessToken(payload: JWTPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiry as string,
  };
  return jwt.sign(payload, config.jwt.secret, options);
}

export function generateRefreshToken(payload: JWTPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiry as string,
  };
  return jwt.sign(payload, config.jwt.refreshSecret, options);
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, config.jwt.secret) as JWTPayload;
}

export function verifyRefreshToken(token: string): JWTPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

// Parse expiry string to milliseconds
export function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000; // default 15 minutes
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

export function getRefreshTokenExpiry(): Date {
  const ms = parseExpiry(config.jwt.refreshExpiry);
  return new Date(Date.now() + ms);
}

