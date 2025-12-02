'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useCalendarEvents } from '@/hooks/use-calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Plus, Video, Clock } from 'lucide-react';
import Link from 'next/link';
import type { CalendarEvent } from '@/lib/types';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type ViewType = 'month' | 'week' | 'day';

interface CalendarEventDisplay {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CalendarEvent;
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const start = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    return subMonths(monthStart, 1);
  }, [currentDate]);

  const end = useMemo(() => {
    const monthEnd = endOfMonth(currentDate);
    return addMonths(monthEnd, 1);
  }, [currentDate]);

  const { data: events, isLoading } = useCalendarEvents(start, end);

  const calendarEvents: CalendarEventDisplay[] = useMemo(() => {
    if (!events) return [];
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.startTime),
      end: new Date(event.endTime),
      resource: event,
    }));
  }, [events]);

  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const handleViewChange = useCallback((newView: ViewType) => {
    setView(newView);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEventDisplay) => {
    if (event.resource.source === 'meetme') {
      setSelectedEvent(event.resource);
    }
  }, []);

  const handleSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      const dateStr = format(start, "yyyy-MM-dd'T'HH:mm");
      router.push(`/meetings/new?date=${encodeURIComponent(dateStr)}`);
    },
    [router]
  );

  const eventStyleGetter = useCallback((event: CalendarEventDisplay) => {
    const isGoogle = event.resource.source === 'google';
    const isCancelled = event.resource.isCancelled;

    return {
      style: {
        backgroundColor: isGoogle ? 'hsl(var(--secondary))' : 'hsl(var(--primary))',
        color: isGoogle ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--primary-foreground))',
        borderRadius: '4px',
        border: 'none',
        opacity: isCancelled ? 0.5 : 1,
        textDecoration: isCancelled ? 'line-through' : 'none',
      },
    };
  }, []);

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">View and manage your schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Badge variant="default" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-primary-foreground" />
              MeetMe
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-secondary-foreground" />
              Google
            </Badge>
          </div>
          <Button asChild>
            <Link href="/meetings/new">
              <Plus className="mr-2 h-4 w-4" />
              New Meeting
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="h-[600px] flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <BigCalendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              view={view}
              onView={handleViewChange as (view: string) => void}
              date={currentDate}
              onNavigate={handleNavigate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              eventPropGetter={eventStyleGetter}
              views={['month', 'week', 'day']}
              components={{
                toolbar: (props) => (
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => props.onNavigate('PREV')}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => props.onNavigate('NEXT')}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={() => props.onNavigate('TODAY')}>
                        Today
                      </Button>
                    </div>
                    <h2 className="text-lg font-semibold">{props.label}</h2>
                    <div className="flex items-center gap-1">
                      {(['month', 'week', 'day'] as const).map((v) => (
                        <Button
                          key={v}
                          variant={view === v ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => props.onView(v)}
                        >
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ),
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              {selectedEvent && format(new Date(selectedEvent.startTime), 'PPpp')}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              {selectedEvent.description && (
                <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
              )}
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(selectedEvent.startTime), 'p')} -{' '}
                    {format(new Date(selectedEvent.endTime), 'p')}
                  </span>
                </div>
                {selectedEvent.videoLink && (
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={selectedEvent.videoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Join meeting
                    </a>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link href={`/meetings/${selectedEvent.id}`}>View Details</Link>
                </Button>
                {selectedEvent.videoLink && (
                  <Button variant="outline" asChild>
                    <a href={selectedEvent.videoLink} target="_blank" rel="noopener noreferrer">
                      <Video className="mr-2 h-4 w-4" />
                      Join
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

