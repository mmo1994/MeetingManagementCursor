import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { createAuditLog, AuditActions } from '../utils/audit';
import { CreateMeetingInput, UpdateMeetingInput } from '../utils/validation';
import { notificationService } from './notification.service';
import { googleCalendarService } from './google.service';
import { Meeting, MeetingParticipant, User, ParticipantStatus } from '@prisma/client';
import { Request } from 'express';

type MeetingWithParticipants = Meeting & {
  participants: (MeetingParticipant & { user: User | null })[];
  createdBy: User;
};

export class MeetingService {
  async create(
    userId: string,
    input: CreateMeetingInput,
    req?: Request
  ): Promise<MeetingWithParticipants> {
    // Validate times
    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);
    
    if (endTime <= startTime) {
      throw new AppError('End time must be after start time', 400);
    }
    
    // Get user for Google Calendar sync
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { googleOAuthToken: true },
    });
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Prepare participants - include creator
    const participantEmails = new Set(input.participants.map(p => p.email.toLowerCase()));
    participantEmails.add(user.email.toLowerCase());
    
    // Find existing users for participants
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: Array.from(participantEmails) } },
    });
    const userMap = new Map(existingUsers.map(u => [u.email.toLowerCase(), u]));
    
    // Create meeting
    const meeting = await prisma.meeting.create({
      data: {
        title: input.title,
        description: input.description,
        startTime,
        endTime,
        timezone: input.timezone,
        videoLink: input.videoLink || null,
        reminderMinutesBefore: input.reminderMinutesBefore || [15],
        createdByUserId: userId,
        participants: {
          create: Array.from(participantEmails).map(email => {
            const existingUser = userMap.get(email);
            return {
              email,
              userId: existingUser?.id || null,
              status: email === user.email.toLowerCase() 
                ? ParticipantStatus.ACCEPTED 
                : ParticipantStatus.INVITED,
            };
          }),
        },
      },
      include: {
        participants: { include: { user: true } },
        createdBy: true,
      },
    });
    
    // Create reminders
    await this.createReminders(meeting.id, startTime, input.reminderMinutesBefore || [15]);
    
    // Sync to Google Calendar if requested and connected
    let googleEventId: string | null = null;
    if (input.syncToGoogleCalendar && user.googleOAuthToken) {
      try {
        googleEventId = await googleCalendarService.createEvent(userId, {
          title: meeting.title,
          description: meeting.description || undefined,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          timezone: meeting.timezone,
          attendees: meeting.participants.map(p => p.email),
          videoLink: meeting.videoLink || undefined,
        });
        
        if (googleEventId) {
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: { googleCalendarEventId: googleEventId },
          });
        }
      } catch (error) {
        console.error('Failed to sync to Google Calendar:', error);
        // Don't fail the meeting creation
      }
    }
    
    // Send notifications to participants (except creator)
    const otherParticipants = meeting.participants.filter(
      p => p.userId && p.userId !== userId
    );
    
    for (const participant of otherParticipants) {
      if (participant.userId) {
        await notificationService.createMeetingInvitation(
          participant.userId,
          meeting.id,
          meeting.title,
          user.name
        );
      }
    }
    
    // Audit log
    await createAuditLog({
      action: AuditActions.MEETING_CREATED,
      entity: 'Meeting',
      entityId: meeting.id,
      userId,
      details: { title: meeting.title },
      req,
    });
    
    return meeting;
  }
  
  async getById(
    meetingId: string,
    userId: string
  ): Promise<MeetingWithParticipants> {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: { include: { user: true } },
        createdBy: true,
      },
    });
    
    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }
    
    // Check if user is creator or participant
    const isParticipant = meeting.participants.some(p => p.userId === userId);
    const isCreator = meeting.createdByUserId === userId;
    
    if (!isParticipant && !isCreator) {
      throw new AppError('Access denied', 403);
    }
    
    return meeting;
  }
  
  async getForUser(
    userId: string,
    options: {
      upcoming?: boolean;
      past?: boolean;
      includeCancelled?: boolean;
    } = {}
  ): Promise<MeetingWithParticipants[]> {
    const now = new Date();
    const where: Record<string, unknown> = {};
    
    // Filter by participation
    where.participants = { some: { userId } };
    
    // Time filters
    if (options.upcoming) {
      where.startTime = { gte: now };
    } else if (options.past) {
      where.startTime = { lt: now };
    }
    
    // Cancelled filter
    if (!options.includeCancelled) {
      where.isCancelled = false;
    }
    
    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        participants: { include: { user: true } },
        createdBy: true,
      },
      orderBy: { startTime: 'asc' },
    });
    
    return meetings;
  }
  
  async update(
    meetingId: string,
    userId: string,
    input: UpdateMeetingInput,
    req?: Request
  ): Promise<MeetingWithParticipants> {
    const meeting = await this.getById(meetingId, userId);
    
    // Only creator can update
    if (meeting.createdByUserId !== userId) {
      throw new AppError('Only the meeting creator can update it', 403);
    }
    
    if (meeting.isCancelled) {
      throw new AppError('Cannot update a cancelled meeting', 400);
    }
    
    // Validate times if provided
    if (input.startTime || input.endTime) {
      const startTime = input.startTime ? new Date(input.startTime) : meeting.startTime;
      const endTime = input.endTime ? new Date(input.endTime) : meeting.endTime;
      
      if (endTime <= startTime) {
        throw new AppError('End time must be after start time', 400);
      }
    }
    
    // Update participants if provided
    if (input.participants) {
      // Get current participants
      const currentEmails = new Set(meeting.participants.map(p => p.email));
      const newEmails = new Set(input.participants.map(p => p.email.toLowerCase()));
      
      // Find users for new participants
      const existingUsers = await prisma.user.findMany({
        where: { email: { in: Array.from(newEmails) } },
      });
      const userMap = new Map(existingUsers.map(u => [u.email.toLowerCase(), u]));
      
      // Delete removed participants
      const toRemove = [...currentEmails].filter(e => !newEmails.has(e));
      if (toRemove.length > 0) {
        await prisma.meetingParticipant.deleteMany({
          where: { meetingId, email: { in: toRemove } },
        });
      }
      
      // Add new participants
      const toAdd = [...newEmails].filter(e => !currentEmails.has(e));
      for (const email of toAdd) {
        const existingUser = userMap.get(email);
        await prisma.meetingParticipant.create({
          data: {
            meetingId,
            email,
            userId: existingUser?.id || null,
            status: ParticipantStatus.INVITED,
          },
        });
        
        // Send notification to new participant
        if (existingUser) {
          await notificationService.createMeetingInvitation(
            existingUser.id,
            meetingId,
            meeting.title,
            meeting.createdBy.name
          );
        }
      }
    }
    
    // Update meeting
    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        title: input.title,
        description: input.description,
        startTime: input.startTime ? new Date(input.startTime) : undefined,
        endTime: input.endTime ? new Date(input.endTime) : undefined,
        timezone: input.timezone,
        videoLink: input.videoLink,
        reminderMinutesBefore: input.reminderMinutesBefore,
      },
      include: {
        participants: { include: { user: true } },
        createdBy: true,
      },
    });
    
    // Update reminders if time changed
    if (input.startTime || input.reminderMinutesBefore) {
      await prisma.meetingReminder.deleteMany({ where: { meetingId } });
      await this.createReminders(
        meetingId,
        updated.startTime,
        updated.reminderMinutesBefore
      );
    }
    
    // Sync to Google Calendar if connected
    if (meeting.googleCalendarEventId) {
      try {
        await googleCalendarService.updateEvent(userId, meeting.googleCalendarEventId, {
          title: updated.title,
          description: updated.description || undefined,
          startTime: updated.startTime,
          endTime: updated.endTime,
          timezone: updated.timezone,
          attendees: updated.participants.map(p => p.email),
          videoLink: updated.videoLink || undefined,
        });
      } catch (error) {
        console.error('Failed to sync update to Google Calendar:', error);
      }
    }
    
    // Notify participants of update
    const participantsToNotify = updated.participants.filter(
      p => p.userId && p.userId !== userId
    );
    
    for (const participant of participantsToNotify) {
      if (participant.userId) {
        await notificationService.createMeetingUpdate(
          participant.userId,
          meetingId,
          updated.title
        );
      }
    }
    
    // Audit log
    await createAuditLog({
      action: AuditActions.MEETING_UPDATED,
      entity: 'Meeting',
      entityId: meetingId,
      userId,
      details: { title: updated.title },
      req,
    });
    
    return updated;
  }
  
  async updateTime(
    meetingId: string,
    userId: string,
    startTime: string,
    endTime: string,
    req?: Request
  ): Promise<MeetingWithParticipants> {
    return this.update(meetingId, userId, { startTime, endTime }, req);
  }
  
  async cancel(
    meetingId: string,
    userId: string,
    req?: Request
  ): Promise<MeetingWithParticipants> {
    const meeting = await this.getById(meetingId, userId);
    
    // Only creator can cancel
    if (meeting.createdByUserId !== userId) {
      throw new AppError('Only the meeting creator can cancel it', 403);
    }
    
    if (meeting.isCancelled) {
      throw new AppError('Meeting is already cancelled', 400);
    }
    
    // Update meeting
    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: { isCancelled: true },
      include: {
        participants: { include: { user: true } },
        createdBy: true,
      },
    });
    
    // Delete reminders
    await prisma.meetingReminder.deleteMany({ where: { meetingId } });
    
    // Delete from Google Calendar if synced
    if (meeting.googleCalendarEventId) {
      try {
        await googleCalendarService.deleteEvent(userId, meeting.googleCalendarEventId);
      } catch (error) {
        console.error('Failed to delete from Google Calendar:', error);
      }
    }
    
    // Notify participants
    const participantsToNotify = updated.participants.filter(
      p => p.userId && p.userId !== userId
    );
    
    for (const participant of participantsToNotify) {
      if (participant.userId) {
        await notificationService.createMeetingCancellation(
          participant.userId,
          meetingId,
          updated.title,
          updated.createdBy.name
        );
      }
    }
    
    // Audit log
    await createAuditLog({
      action: AuditActions.MEETING_CANCELLED,
      entity: 'Meeting',
      entityId: meetingId,
      userId,
      details: { title: updated.title },
      req,
    });
    
    return updated;
  }
  
  async delete(
    meetingId: string,
    userId: string,
    req?: Request
  ): Promise<void> {
    const meeting = await this.getById(meetingId, userId);
    
    // Only creator can delete
    if (meeting.createdByUserId !== userId) {
      throw new AppError('Only the meeting creator can delete it', 403);
    }
    
    // Delete from Google Calendar if synced
    if (meeting.googleCalendarEventId) {
      try {
        await googleCalendarService.deleteEvent(userId, meeting.googleCalendarEventId);
      } catch (error) {
        console.error('Failed to delete from Google Calendar:', error);
      }
    }
    
    // Delete meeting (cascades to participants, reminders, notifications)
    await prisma.meeting.delete({ where: { id: meetingId } });
    
    // Audit log
    await createAuditLog({
      action: AuditActions.MEETING_DELETED,
      entity: 'Meeting',
      entityId: meetingId,
      userId,
      details: { title: meeting.title },
      req,
    });
  }
  
  async inviteParticipants(
    meetingId: string,
    userId: string,
    participants: { email: string; userId?: string }[],
    req?: Request
  ): Promise<MeetingWithParticipants> {
    const meeting = await this.getById(meetingId, userId);
    
    // Only creator can invite
    if (meeting.createdByUserId !== userId) {
      throw new AppError('Only the meeting creator can invite participants', 403);
    }
    
    if (meeting.isCancelled) {
      throw new AppError('Cannot invite to a cancelled meeting', 400);
    }
    
    // Find existing users
    const emails = participants.map(p => p.email.toLowerCase());
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: emails } },
    });
    const userMap = new Map(existingUsers.map(u => [u.email.toLowerCase(), u]));
    
    // Add participants
    for (const participant of participants) {
      const email = participant.email.toLowerCase();
      const existingUser = userMap.get(email);
      
      // Check if already a participant
      const existing = meeting.participants.find(p => p.email === email);
      if (existing) continue;
      
      await prisma.meetingParticipant.create({
        data: {
          meetingId,
          email,
          userId: existingUser?.id || null,
          status: ParticipantStatus.INVITED,
        },
      });
      
      // Send notification
      if (existingUser) {
        await notificationService.createMeetingInvitation(
          existingUser.id,
          meetingId,
          meeting.title,
          meeting.createdBy.name
        );
      }
    }
    
    // Update Google Calendar if synced
    if (meeting.googleCalendarEventId) {
      const updatedMeeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { participants: true },
      });
      
      if (updatedMeeting) {
        try {
          await googleCalendarService.updateEvent(userId, meeting.googleCalendarEventId, {
            title: meeting.title,
            description: meeting.description || undefined,
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            timezone: meeting.timezone,
            attendees: updatedMeeting.participants.map(p => p.email),
            videoLink: meeting.videoLink || undefined,
          });
        } catch (error) {
          console.error('Failed to update Google Calendar attendees:', error);
        }
      }
    }
    
    // Audit log
    await createAuditLog({
      action: AuditActions.PARTICIPANT_INVITED,
      entity: 'Meeting',
      entityId: meetingId,
      userId,
      details: { participants: emails },
      req,
    });
    
    return this.getById(meetingId, userId);
  }
  
  async respondToInvitation(
    meetingId: string,
    userId: string,
    status: ParticipantStatus,
    req?: Request
  ): Promise<MeetingParticipant> {
    const meeting = await this.getById(meetingId, userId);
    
    // Find participant record
    const participant = meeting.participants.find(p => p.userId === userId);
    if (!participant) {
      throw new AppError('You are not a participant of this meeting', 403);
    }
    
    // Update status
    const updated = await prisma.meetingParticipant.update({
      where: { id: participant.id },
      data: { status },
    });
    
    // Notify creator
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && meeting.createdByUserId !== userId) {
      await notificationService.createParticipantResponse(
        meeting.createdByUserId,
        meetingId,
        meeting.title,
        user.name,
        status
      );
    }
    
    // Audit log
    await createAuditLog({
      action: AuditActions.PARTICIPANT_RESPONDED,
      entity: 'MeetingParticipant',
      entityId: participant.id,
      userId,
      details: { meetingId, status },
      req,
    });
    
    return updated;
  }
  
  private async createReminders(
    meetingId: string,
    startTime: Date,
    minutesBefore: number[]
  ): Promise<void> {
    const reminders = minutesBefore.map(minutes => ({
      meetingId,
      minutesBefore: minutes,
      scheduledFor: new Date(startTime.getTime() - minutes * 60 * 1000),
    }));
    
    await prisma.meetingReminder.createMany({
      data: reminders,
    });
  }
}

export const meetingService = new MeetingService();

