import { Response, NextFunction } from 'express';
import { calendarService } from '../services/calendar.service';
import { AuthenticatedRequest } from '../types';

export class CalendarController {
  async getEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { start, end } = req.query;
      
      // Default to current month if not provided
      const startDate = start 
        ? new Date(start as string) 
        : new Date(new Date().setDate(1));
      
      const endDate = end 
        ? new Date(end as string) 
        : new Date(new Date().setMonth(new Date().getMonth() + 1));
      
      const events = await calendarService.getEvents(
        req.userId!,
        startDate,
        endDate
      );
      
      res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async sync(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await calendarService.syncGoogleCalendar(req.userId!);
      
      res.json({
        success: true,
        message: 'Calendar synced successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const calendarController = new CalendarController();

