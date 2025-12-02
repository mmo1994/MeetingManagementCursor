import { google, calendar_v3 } from 'googleapis';
import prisma from '../config/prisma';
import { config } from '../config';
import { AppError } from '../middlewares/errorHandler';

interface CalendarEventInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  attendees?: string[];
  videoLink?: string;
}

interface GoogleCalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  videoLink?: string;
  source: 'google';
}

export class GoogleCalendarService {
  private oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );
  
  getAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      state,
      prompt: 'consent',
    });
  }
  
  async handleCallback(code: string, userId: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    // Delete existing token if any
    await prisma.googleOAuthToken.deleteMany({
      where: { userId },
    });
    
    // Store new tokens
    await prisma.googleOAuthToken.create({
      data: {
        userId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: tokens.scope?.split(' ') || [],
      },
    });
  }
  
  async disconnect(userId: string): Promise<void> {
    const token = await prisma.googleOAuthToken.findUnique({
      where: { userId },
    });
    
    if (token) {
      // Revoke token
      try {
        this.oauth2Client.setCredentials({
          access_token: token.accessToken,
          refresh_token: token.refreshToken,
        });
        await this.oauth2Client.revokeToken(token.accessToken);
      } catch (error) {
        console.error('Failed to revoke Google token:', error);
      }
      
      // Delete from database
      await prisma.googleOAuthToken.delete({
        where: { userId },
      });
    }
  }
  
  async isConnected(userId: string): Promise<boolean> {
    const token = await prisma.googleOAuthToken.findUnique({
      where: { userId },
    });
    return !!token;
  }
  
  async getCalendar(userId: string): Promise<calendar_v3.Calendar> {
    const token = await prisma.googleOAuthToken.findUnique({
      where: { userId },
    });
    
    if (!token) {
      throw new AppError('Google Calendar not connected', 400);
    }
    
    this.oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
    });
    
    // Set up token refresh handler
    this.oauth2Client.on('tokens', async (newTokens) => {
      if (newTokens.access_token) {
        await prisma.googleOAuthToken.update({
          where: { userId },
          data: {
            accessToken: newTokens.access_token,
            expiryDate: newTokens.expiry_date ? new Date(newTokens.expiry_date) : undefined,
          },
        });
      }
    });
    
    // Check if token needs refresh
    if (token.expiryDate && token.expiryDate < new Date()) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(credentials);
      } catch (error) {
        // Token refresh failed, user needs to reconnect
        await prisma.googleOAuthToken.delete({ where: { userId } });
        throw new AppError('Google Calendar authorization expired. Please reconnect.', 401);
      }
    }
    
    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }
  
  async createEvent(userId: string, input: CalendarEventInput): Promise<string | null> {
    try {
      const calendar = await this.getCalendar(userId);
      
      const event: calendar_v3.Schema$Event = {
        summary: input.title,
        description: input.description,
        start: {
          dateTime: input.startTime.toISOString(),
          timeZone: input.timezone,
        },
        end: {
          dateTime: input.endTime.toISOString(),
          timeZone: input.timezone,
        },
        attendees: input.attendees?.map(email => ({ email })),
      };
      
      // Add video link to description or as conference data
      if (input.videoLink) {
        event.description = `${event.description || ''}\n\nVideo Link: ${input.videoLink}`.trim();
      }
      
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all',
      });
      
      return response.data.id || null;
    } catch (error) {
      console.error('Failed to create Google Calendar event:', error);
      return null;
    }
  }
  
  async updateEvent(
    userId: string,
    eventId: string,
    input: CalendarEventInput
  ): Promise<void> {
    try {
      const calendar = await this.getCalendar(userId);
      
      const event: calendar_v3.Schema$Event = {
        summary: input.title,
        description: input.description,
        start: {
          dateTime: input.startTime.toISOString(),
          timeZone: input.timezone,
        },
        end: {
          dateTime: input.endTime.toISOString(),
          timeZone: input.timezone,
        },
        attendees: input.attendees?.map(email => ({ email })),
      };
      
      if (input.videoLink) {
        event.description = `${event.description || ''}\n\nVideo Link: ${input.videoLink}`.trim();
      }
      
      await calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: event,
        sendUpdates: 'all',
      });
    } catch (error) {
      console.error('Failed to update Google Calendar event:', error);
      throw error;
    }
  }
  
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    try {
      const calendar = await this.getCalendar(userId);
      
      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all',
      });
    } catch (error) {
      console.error('Failed to delete Google Calendar event:', error);
      // Don't throw - event might already be deleted
    }
  }
  
  async getEvents(
    userId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<GoogleCalendarEvent[]> {
    try {
      const calendar = await this.getCalendar(userId);
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
      });
      
      const events = response.data.items || [];
      
      return events
        .filter(event => event.start?.dateTime && event.end?.dateTime)
        .map(event => ({
          id: event.id!,
          title: event.summary || 'Untitled Event',
          description: event.description || undefined,
          startTime: event.start!.dateTime!,
          endTime: event.end!.dateTime!,
          timezone: event.start!.timeZone || 'UTC',
          videoLink: event.hangoutLink || this.extractVideoLink(event.description),
          source: 'google' as const,
        }));
    } catch (error) {
      console.error('Failed to fetch Google Calendar events:', error);
      return [];
    }
  }
  
  private extractVideoLink(description?: string | null): string | undefined {
    if (!description) return undefined;
    
    const urlMatch = description.match(
      /https?:\/\/[^\s]*(zoom|meet\.google|teams\.microsoft|webex)[^\s]*/i
    );
    return urlMatch?.[0];
  }
}

export const googleCalendarService = new GoogleCalendarService();

