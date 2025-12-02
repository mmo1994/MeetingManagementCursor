import prisma from '../config/prisma';
import { googleCalendarService } from './google.service';
import { CalendarEvent } from '../types';

export class CalendarService {
  async getEvents(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    
    // Get MeetMe meetings
    const meetings = await prisma.meeting.findMany({
      where: {
        participants: { some: { userId } },
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      orderBy: { startTime: 'asc' },
    });
    
    for (const meeting of meetings) {
      events.push({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description || undefined,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        timezone: meeting.timezone,
        videoLink: meeting.videoLink || undefined,
        source: 'meetme',
        isCancelled: meeting.isCancelled,
        googleCalendarEventId: meeting.googleCalendarEventId || undefined,
      });
    }
    
    // Get Google Calendar events if connected
    const isConnected = await googleCalendarService.isConnected(userId);
    if (isConnected) {
      try {
        const googleEvents = await googleCalendarService.getEvents(
          userId,
          startDate,
          endDate
        );
        
        // Filter out events that are already synced from MeetMe
        const meetmeGoogleIds = new Set(
          meetings
            .filter(m => m.googleCalendarEventId)
            .map(m => m.googleCalendarEventId)
        );
        
        const filteredGoogleEvents = googleEvents.filter(
          event => !meetmeGoogleIds.has(event.id)
        );
        
        events.push(...filteredGoogleEvents.map(event => ({
          ...event,
          isCancelled: false,
        })));
      } catch (error) {
        console.error('Failed to fetch Google Calendar events:', error);
        // Continue without Google events
      }
    }
    
    // Sort by start time
    events.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    
    return events;
  }
  
  async syncGoogleCalendar(userId: string): Promise<void> {
    // This method can be used to trigger a manual sync
    // Currently, events are fetched on-demand, so this is a no-op
    // In a production system, you might want to:
    // 1. Set up Google Calendar webhooks for real-time sync
    // 2. Periodically sync events to a local cache
    
    const isConnected = await googleCalendarService.isConnected(userId);
    if (!isConnected) {
      throw new Error('Google Calendar not connected');
    }
    
    // For now, just verify the connection is valid
    await googleCalendarService.getEvents(
      userId,
      new Date(),
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    );
  }
}

export const calendarService = new CalendarService();

