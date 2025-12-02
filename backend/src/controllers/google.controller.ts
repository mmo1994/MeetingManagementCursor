import { Response, NextFunction, Request } from 'express';
import { googleCalendarService } from '../services/google.service';
import { createAuditLog, AuditActions } from '../utils/audit';
import { AuthenticatedRequest } from '../types';
import { config } from '../config';

export class GoogleController {
  async getConnectUrl(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Create state with user ID for callback
      const state = Buffer.from(JSON.stringify({
        userId: req.userId,
        timestamp: Date.now(),
      })).toString('base64');
      
      const url = googleCalendarService.getAuthUrl(state);
      
      res.json({
        success: true,
        data: { url },
      });
    } catch (error) {
      next(error);
    }
  }
  
  async callback(req: Request, res: Response, _next: NextFunction) {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        res.redirect(`${config.frontendUrl}/settings?google_error=${error}`);
        return;
      }
      
      if (!code || !state) {
        res.redirect(`${config.frontendUrl}/settings?google_error=missing_params`);
        return;
      }
      
      // Decode state
      let stateData;
      try {
        stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      } catch {
        res.redirect(`${config.frontendUrl}/settings?google_error=invalid_state`);
        return;
      }
      
      const { userId } = stateData;
      
      if (!userId) {
        res.redirect(`${config.frontendUrl}/settings?google_error=invalid_state`);
        return;
      }
      
      // Handle callback
      await googleCalendarService.handleCallback(code as string, userId);
      
      // Audit log
      await createAuditLog({
        action: AuditActions.GOOGLE_CONNECTED,
        entity: 'GoogleOAuthToken',
        userId,
        req,
      });
      
      res.redirect(`${config.frontendUrl}/settings?google_connected=true`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${config.frontendUrl}/settings?google_error=callback_failed`);
    }
  }
  
  async disconnect(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await googleCalendarService.disconnect(req.userId!);
      
      // Audit log
      await createAuditLog({
        action: AuditActions.GOOGLE_DISCONNECTED,
        entity: 'GoogleOAuthToken',
        userId: req.userId,
        req,
      });
      
      res.json({
        success: true,
        message: 'Google Calendar disconnected',
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const isConnected = await googleCalendarService.isConnected(req.userId!);
      
      res.json({
        success: true,
        data: { isConnected },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const googleController = new GoogleController();

