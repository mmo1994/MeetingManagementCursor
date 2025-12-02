import { Response, NextFunction } from 'express';
import { meetingService } from '../services/meeting.service';
import { AuthenticatedRequest } from '../types';
import { ParticipantStatus } from '@prisma/client';

export class MeetingController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const meeting = await meetingService.create(req.userId!, req.body, req);
      
      res.status(201).json({
        success: true,
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { upcoming, past, includeCancelled } = req.query;
      
      const meetings = await meetingService.getForUser(req.userId!, {
        upcoming: upcoming === 'true',
        past: past === 'true',
        includeCancelled: includeCancelled === 'true',
      });
      
      res.json({
        success: true,
        data: meetings,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const meeting = await meetingService.getById(req.params.id, req.userId!);
      
      res.json({
        success: true,
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const meeting = await meetingService.update(
        req.params.id,
        req.userId!,
        req.body,
        req
      );
      
      res.json({
        success: true,
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateTime(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { startTime, endTime } = req.body;
      const meeting = await meetingService.updateTime(
        req.params.id,
        req.userId!,
        startTime,
        endTime,
        req
      );
      
      res.json({
        success: true,
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const meeting = await meetingService.cancel(req.params.id, req.userId!, req);
      
      res.json({
        success: true,
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await meetingService.delete(req.params.id, req.userId!, req);
      
      res.json({
        success: true,
        message: 'Meeting deleted',
      });
    } catch (error) {
      next(error);
    }
  }
  
  async invite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const meeting = await meetingService.inviteParticipants(
        req.params.id,
        req.userId!,
        req.body.participants,
        req
      );
      
      res.json({
        success: true,
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async respond(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      
      if (!Object.values(ParticipantStatus).includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }
      
      const participant = await meetingService.respondToInvitation(
        req.params.id,
        req.userId!,
        status,
        req
      );
      
      res.json({
        success: true,
        data: participant,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const meetingController = new MeetingController();

