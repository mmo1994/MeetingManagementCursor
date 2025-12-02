import nodemailer from 'nodemailer';
import { config } from '../config';
import { formatInTimeZone } from 'date-fns-tz';

interface MeetingEmailData {
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  timezone: string;
  videoLink?: string | null;
  participants: string[];
  organizerName: string;
}

interface NotificationEmailData {
  title: string;
  message: string;
  meeting?: MeetingEmailData;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  
  constructor() {
    if (config.smtp.host && config.smtp.user) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
    }
  }
  
  async sendMeetingNotification(
    to: string,
    data: NotificationEmailData
  ): Promise<void> {
    if (!this.transporter) {
      console.log(`[Email] Would send to ${to}: ${data.title}`);
      return;
    }
    
    const html = this.buildMeetingEmailHtml(data);
    
    await this.transporter.sendMail({
      from: config.smtp.from,
      to,
      subject: data.title,
      html,
    });
  }
  
  async sendMeetingInvitation(
    to: string,
    meeting: MeetingEmailData
  ): Promise<void> {
    if (!this.transporter) {
      console.log(`[Email] Would send invitation to ${to}: ${meeting.title}`);
      return;
    }
    
    const html = this.buildInvitationEmailHtml(meeting);
    
    await this.transporter.sendMail({
      from: config.smtp.from,
      to,
      subject: `Meeting Invitation: ${meeting.title}`,
      html,
    });
  }
  
  async sendMeetingReminder(
    to: string,
    meeting: MeetingEmailData,
    minutesBefore: number
  ): Promise<void> {
    if (!this.transporter) {
      console.log(`[Email] Would send reminder to ${to}: ${meeting.title}`);
      return;
    }
    
    const timeText = minutesBefore >= 60 
      ? `${Math.floor(minutesBefore / 60)} hour(s)` 
      : `${minutesBefore} minutes`;
    
    const html = this.buildReminderEmailHtml(meeting, timeText);
    
    await this.transporter.sendMail({
      from: config.smtp.from,
      to,
      subject: `Reminder: ${meeting.title} starts in ${timeText}`,
      html,
    });
  }
  
  private buildMeetingEmailHtml(data: NotificationEmailData): string {
    let meetingSection = '';
    
    if (data.meeting) {
      const m = data.meeting;
      const startFormatted = formatInTimeZone(
        m.startTime,
        m.timezone,
        'EEEE, MMMM d, yyyy h:mm a'
      );
      const endFormatted = formatInTimeZone(m.endTime, m.timezone, 'h:mm a');
      
      meetingSection = `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin: 0 0 15px 0; color: #1a1a1a;">${m.title}</h2>
          ${m.description ? `<p style="color: #666; margin-bottom: 15px;">${m.description}</p>` : ''}
          <p style="margin: 5px 0;"><strong>When:</strong> ${startFormatted} - ${endFormatted} (${m.timezone})</p>
          <p style="margin: 5px 0;"><strong>Organizer:</strong> ${m.organizerName}</p>
          ${m.videoLink ? `
            <p style="margin: 15px 0;">
              <a href="${m.videoLink}" style="display: inline-block; background: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Join Meeting
              </a>
            </p>
          ` : ''}
        </div>
      `;
    }
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #F97316; margin: 0;">MeetMe</h1>
          </div>
          
          <h2 style="color: #1a1a1a; margin-bottom: 10px;">${data.title}</h2>
          <p style="color: #666;">${data.message}</p>
          
          ${meetingSection}
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent by MeetMe. You can manage your notification preferences in settings.
          </p>
        </body>
      </html>
    `;
  }
  
  private buildInvitationEmailHtml(meeting: MeetingEmailData): string {
    const startFormatted = formatInTimeZone(
      meeting.startTime,
      meeting.timezone,
      'EEEE, MMMM d, yyyy h:mm a'
    );
    const endFormatted = formatInTimeZone(meeting.endTime, meeting.timezone, 'h:mm a');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #F97316; margin: 0;">MeetMe</h1>
          </div>
          
          <h2 style="color: #1a1a1a; margin-bottom: 10px;">You're Invited!</h2>
          <p style="color: #666;">${meeting.organizerName} has invited you to a meeting.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1a1a1a;">${meeting.title}</h3>
            ${meeting.description ? `<p style="color: #666; margin-bottom: 15px;">${meeting.description}</p>` : ''}
            <p style="margin: 5px 0;"><strong>When:</strong> ${startFormatted} - ${endFormatted}</p>
            <p style="margin: 5px 0;"><strong>Timezone:</strong> ${meeting.timezone}</p>
            <p style="margin: 5px 0;"><strong>Organizer:</strong> ${meeting.organizerName}</p>
            
            ${meeting.participants.length > 0 ? `
              <p style="margin: 15px 0 5px 0;"><strong>Attendees:</strong></p>
              <ul style="margin: 0; padding-left: 20px; color: #666;">
                ${meeting.participants.slice(0, 5).map(p => `<li>${p}</li>`).join('')}
                ${meeting.participants.length > 5 ? `<li>...and ${meeting.participants.length - 5} more</li>` : ''}
              </ul>
            ` : ''}
            
            ${meeting.videoLink ? `
              <p style="margin: 20px 0 0 0;">
                <a href="${meeting.videoLink}" style="display: inline-block; background: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Join Meeting
                </a>
              </p>
            ` : ''}
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent by MeetMe. You can manage your notification preferences in settings.
          </p>
        </body>
      </html>
    `;
  }
  
  private buildReminderEmailHtml(meeting: MeetingEmailData, timeText: string): string {
    const startFormatted = formatInTimeZone(
      meeting.startTime,
      meeting.timezone,
      'EEEE, MMMM d, yyyy h:mm a'
    );
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #F97316; margin: 0;">MeetMe</h1>
          </div>
          
          <h2 style="color: #1a1a1a; margin-bottom: 10px;">⏰ Meeting Reminder</h2>
          <p style="color: #666; font-size: 18px;"><strong>"${meeting.title}"</strong> starts in ${timeText}</p>
          
          <div style="background: #fff8f5; border-left: 4px solid #F97316; padding: 15px 20px; margin: 20px 0;">
            <p style="margin: 0 0 5px 0;"><strong>When:</strong> ${startFormatted}</p>
            <p style="margin: 0;"><strong>Timezone:</strong> ${meeting.timezone}</p>
          </div>
          
          ${meeting.videoLink ? `
            <p style="margin: 20px 0;">
              <a href="${meeting.videoLink}" style="display: inline-block; background: #F97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Join Meeting Now
              </a>
            </p>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent by MeetMe. You can manage your notification preferences in settings.
          </p>
        </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();

