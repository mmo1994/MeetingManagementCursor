import cron from 'node-cron';
import prisma from '../config/prisma';
import { notificationService } from '../services/notification.service';
import { emailService } from '../services/email.service';
import { pushService } from '../services/push.service';

export function startReminderJob() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      await processReminders();
    } catch (error) {
      console.error('Reminder job error:', error);
    }
  });
  
  // Clean up expired refresh tokens every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const count = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (count.count > 0) {
        console.log(`Cleaned up ${count.count} expired refresh tokens`);
      }
    } catch (error) {
      console.error('Token cleanup error:', error);
    }
  });
}

async function processReminders() {
  const now = new Date();
  const oneMinuteLater = new Date(now.getTime() + 60 * 1000);
  
  // Find reminders that should be sent now
  const reminders = await prisma.meetingReminder.findMany({
    where: {
      scheduledFor: {
        lte: oneMinuteLater,
      },
      sentAt: null,
      meeting: {
        isCancelled: false,
        startTime: { gt: now },
      },
    },
    include: {
      meeting: {
        include: {
          participants: {
            include: { user: true },
          },
          createdBy: true,
        },
      },
    },
    take: 100, // Process in batches
  });
  
  for (const reminder of reminders) {
    try {
      const meeting = reminder.meeting;
      
      // Send reminders to all participants with user accounts
      for (const participant of meeting.participants) {
        if (!participant.userId) continue;
        
        const user = participant.user;
        if (!user) continue;
        
        // Get user settings
        const settings = await prisma.userSettings.findUnique({
          where: { userId: user.id },
        });
        
        // Create in-app notification
        if (!settings || settings.inAppNotificationsEnabled) {
          await notificationService.createMeetingReminder(
            user.id,
            meeting.id,
            meeting.title,
            reminder.minutesBefore
          );
        }
        
        // Send email
        if (!settings || settings.emailNotificationsEnabled) {
          try {
            await emailService.sendMeetingReminder(
              user.email,
              {
                title: meeting.title,
                description: meeting.description,
                startTime: meeting.startTime,
                endTime: meeting.endTime,
                timezone: meeting.timezone,
                videoLink: meeting.videoLink,
                participants: meeting.participants.map(p => p.email),
                organizerName: meeting.createdBy.name,
              },
              reminder.minutesBefore
            );
          } catch (error) {
            console.error(`Failed to send reminder email to ${user.email}:`, error);
          }
        }
        
        // Send push notification
        if (!settings || settings.pushNotificationsEnabled) {
          const timeText = reminder.minutesBefore >= 60
            ? `${Math.floor(reminder.minutesBefore / 60)} hour(s)`
            : `${reminder.minutesBefore} minutes`;
          
          try {
            await pushService.sendToUser(user.id, {
              title: 'Meeting Reminder',
              body: `"${meeting.title}" starts in ${timeText}`,
              data: { meetingId: meeting.id },
            });
          } catch (error) {
            console.error(`Failed to send push notification to ${user.id}:`, error);
          }
        }
      }
      
      // Mark reminder as sent
      await prisma.meetingReminder.update({
        where: { id: reminder.id },
        data: {
          sentAt: new Date(),
          emailSent: true,
          pushSent: true,
          inAppCreated: true,
        },
      });
      
    } catch (error) {
      console.error(`Failed to process reminder ${reminder.id}:`, error);
    }
  }
  
  if (reminders.length > 0) {
    console.log(`Processed ${reminders.length} reminders`);
  }
}

