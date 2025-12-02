import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { createAuditLog, AuditActions } from '../utils/audit';
import { UpdateSettingsInput } from '../utils/validation';
import { User, UserSettings, ThemePreference } from '@prisma/client';
import { Request } from 'express';

type UserWithSettings = User & { settings: UserSettings | null };

export class SettingsService {
  async get(userId: string): Promise<UserWithSettings> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Create default settings if they don't exist
    if (!user.settings) {
      const settings = await prisma.userSettings.create({
        data: {
          userId,
          emailNotificationsEnabled: true,
          pushNotificationsEnabled: true,
          inAppNotificationsEnabled: true,
          themePreference: ThemePreference.SYSTEM,
        },
      });
      return { ...user, settings };
    }
    
    return user;
  }
  
  async update(
    userId: string,
    input: UpdateSettingsInput,
    req?: Request
  ): Promise<UserWithSettings> {
    await this.get(userId); // Verify user exists
    
    // Update user fields
    if (input.name || input.timezone) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: input.name,
          timezone: input.timezone,
        },
      });
    }
    
    // Update settings
    const settingsUpdate: Partial<UserSettings> = {};
    
    if (input.emailNotificationsEnabled !== undefined) {
      settingsUpdate.emailNotificationsEnabled = input.emailNotificationsEnabled;
    }
    if (input.pushNotificationsEnabled !== undefined) {
      settingsUpdate.pushNotificationsEnabled = input.pushNotificationsEnabled;
    }
    if (input.inAppNotificationsEnabled !== undefined) {
      settingsUpdate.inAppNotificationsEnabled = input.inAppNotificationsEnabled;
    }
    if (input.themePreference) {
      settingsUpdate.themePreference = input.themePreference as ThemePreference;
    }
    
    if (Object.keys(settingsUpdate).length > 0) {
      await prisma.userSettings.update({
        where: { userId },
        data: settingsUpdate,
      });
    }
    
    // Audit log
    await createAuditLog({
      action: AuditActions.SETTINGS_UPDATED,
      entity: 'UserSettings',
      entityId: userId,
      userId,
      details: input,
      req,
    });
    
    return this.get(userId);
  }
}

export const settingsService = new SettingsService();

