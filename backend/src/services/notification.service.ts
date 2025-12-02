import prisma from '../config/prisma';
import { NotificationType, ParticipantStatus, Notification } from '@prisma/client';
import { emailService } from './email.service';
import { pushService } from './push.service';

export class NotificationService {
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    relatedMeetingId?: string
  ): Promise<Notification> {
    // Check user settings
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });
    
    // Create in-app notification if enabled
    if (!settings || settings.inAppNotificationsEnabled) {
      return prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          relatedMeetingId,
        },
      });
    }
    
    // Return a dummy notification object if in-app is disabled
    return {
      id: '',
      userId,
      type,
      title,
      message,
      isRead: true,
      createdAt: new Date(),
      relatedMeetingId: relatedMeetingId || null,
    };
  }
  
  async getForUser(
    userId: string,
    options: { unreadOnly?: boolean; limit?: number } = {}
  ): Promise<Notification[]> {
    const where: Record<string, unknown> = { userId };
    
    if (options.unreadOnly) {
      where.isRead = false;
    }
    
    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
    });
  }
  
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
  
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    
    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found');
    }
    
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }
  
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    
    return result.count;
  }
  
  // Specific notification creators
  async createMeetingInvitation(
    userId: string,
    meetingId: string,
    meetingTitle: string,
    inviterName: string
  ): Promise<void> {
    await this.create(
      userId,
      NotificationType.MEETING_INVITATION,
      'New Meeting Invitation',
      `${inviterName} invited you to "${meetingTitle}"`,
      meetingId
    );
    
    // Send email and push notifications
    await this.sendExternalNotifications(
      userId,
      'New Meeting Invitation',
      `${inviterName} invited you to "${meetingTitle}"`,
      meetingId
    );
  }
  
  async createMeetingUpdate(
    userId: string,
    meetingId: string,
    meetingTitle: string
  ): Promise<void> {
    await this.create(
      userId,
      NotificationType.MEETING_UPDATED,
      'Meeting Updated',
      `The meeting "${meetingTitle}" has been updated`,
      meetingId
    );
    
    await this.sendExternalNotifications(
      userId,
      'Meeting Updated',
      `The meeting "${meetingTitle}" has been updated`,
      meetingId
    );
  }
  
  async createMeetingCancellation(
    userId: string,
    meetingId: string,
    meetingTitle: string,
    cancellerName: string
  ): Promise<void> {
    await this.create(
      userId,
      NotificationType.MEETING_CANCELLED,
      'Meeting Cancelled',
      `${cancellerName} cancelled the meeting "${meetingTitle}"`,
      meetingId
    );
    
    await this.sendExternalNotifications(
      userId,
      'Meeting Cancelled',
      `${cancellerName} cancelled the meeting "${meetingTitle}"`,
      meetingId
    );
  }
  
  async createMeetingReminder(
    userId: string,
    meetingId: string,
    meetingTitle: string,
    minutesBefore: number
  ): Promise<void> {
    const timeText = minutesBefore >= 60 
      ? `${Math.floor(minutesBefore / 60)} hour(s)` 
      : `${minutesBefore} minutes`;
    
    await this.create(
      userId,
      NotificationType.MEETING_REMINDER,
      'Meeting Reminder',
      `"${meetingTitle}" starts in ${timeText}`,
      meetingId
    );
    
    await this.sendExternalNotifications(
      userId,
      'Meeting Reminder',
      `"${meetingTitle}" starts in ${timeText}`,
      meetingId
    );
  }
  
  async createParticipantResponse(
    userId: string,
    meetingId: string,
    meetingTitle: string,
    participantName: string,
    status: ParticipantStatus
  ): Promise<void> {
    const statusText = {
      [ParticipantStatus.ACCEPTED]: 'accepted',
      [ParticipantStatus.DECLINED]: 'declined',
      [ParticipantStatus.TENTATIVE]: 'tentatively accepted',
      [ParticipantStatus.INVITED]: 'was invited to',
    }[status];
    
    await this.create(
      userId,
      NotificationType.PARTICIPANT_RESPONDED,
      'Response Received',
      `${participantName} ${statusText} your invitation to "${meetingTitle}"`,
      meetingId
    );
  }
  
  private async sendExternalNotifications(
    userId: string,
    title: string,
    message: string,
    meetingId?: string
  ): Promise<void> {
    // Get user and settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });
    
    if (!user) return;
    
    // Get meeting details for email
    let meeting = null;
    if (meetingId) {
      meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { participants: true, createdBy: true },
      });
    }
    
    // Send email notification
    if (user.settings?.emailNotificationsEnabled !== false) {
      try {
        await emailService.sendMeetingNotification(user.email, {
          title,
          message,
          meeting: meeting ? {
            title: meeting.title,
            description: meeting.description,
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            timezone: meeting.timezone,
            videoLink: meeting.videoLink,
            participants: meeting.participants.map(p => p.email),
            organizerName: meeting.createdBy.name,
          } : undefined,
        });
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    }
    
    // Send push notification
    if (user.settings?.pushNotificationsEnabled !== false) {
      try {
        await pushService.sendToUser(userId, {
          title,
          body: message,
          data: meetingId ? { meetingId } : undefined,
        });
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }
    }
  }
}

export const notificationService = new NotificationService();

