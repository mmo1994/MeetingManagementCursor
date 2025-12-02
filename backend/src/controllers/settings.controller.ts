import { Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service';
import { AuthenticatedRequest } from '../types';

export class SettingsController {
  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userWithSettings = await settingsService.get(req.userId!);
      
      // Remove password hash from response
      const { passwordHash, ...safeUser } = userWithSettings;
      
      res.json({
        success: true,
        data: safeUser,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userWithSettings = await settingsService.update(
        req.userId!,
        req.body,
        req
      );
      
      // Remove password hash from response
      const { passwordHash, ...safeUser } = userWithSettings;
      
      res.json({
        success: true,
        data: safeUser,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();

