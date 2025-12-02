import { Response, NextFunction } from 'express';
import { pushService } from '../services/push.service';
import { AuthenticatedRequest } from '../types';

export class PushController {
  async subscribe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { endpoint, keys } = req.body;
      
      await pushService.subscribe(req.userId!, {
        endpoint,
        keys,
      });
      
      res.json({
        success: true,
        message: 'Subscribed to push notifications',
      });
    } catch (error) {
      next(error);
    }
  }
  
  async unsubscribe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { endpoint } = req.body;
      
      await pushService.unsubscribe(endpoint);
      
      res.json({
        success: true,
        message: 'Unsubscribed from push notifications',
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getPublicKey(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const publicKey = pushService.getPublicKey();
      
      res.json({
        success: true,
        data: { publicKey },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const pushController = new PushController();

