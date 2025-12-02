import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { AuthenticatedRequest } from '../types';

export class NotificationController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { unreadOnly, limit } = req.query;
      
      const notifications = await notificationService.getForUser(req.userId!, {
        unreadOnly: unreadOnly === 'true',
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      
      const unreadCount = await notificationService.getUnreadCount(req.userId!);
      
      res.json({
        success: true,
        data: notifications,
        unreadCount,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const notification = await notificationService.markAsRead(
        req.params.id,
        req.userId!
      );
      
      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const count = await notificationService.markAllAsRead(req.userId!);
      
      res.json({
        success: true,
        message: `Marked ${count} notifications as read`,
        count,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const count = await notificationService.getUnreadCount(req.userId!);
      
      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();

