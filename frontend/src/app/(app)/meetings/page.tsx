'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMeetings } from '@/hooks/use-meetings';
import { useAuth } from '@/contexts/auth-context';
import { formatDate, formatTime, formatDuration, isPast, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  ExternalLink,
  MoreHorizontal,
  Plus,
  Users,
  Video,
  Edit,
  XCircle,
  Search,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { Meeting } from '@/lib/types';

export default function MeetingsPage() {
  const [search, setSearch] = useState('');
  const { data: upcomingMeetings, isLoading: loadingUpcoming } = useMeetings({ upcoming: true });
  const { data: pastMeetings, isLoading: loadingPast } = useMeetings({ past: true });

  const filterMeetings = (meetings: Meeting[] | undefined) => {
    if (!meetings) return [];
    if (!search) return meetings;
    const searchLower = search.toLowerCase();
    return meetings.filter(
      (m) =>
        m.title.toLowerCase().includes(searchLower) ||
        m.description?.toLowerCase().includes(searchLower)
    );
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">Manage your scheduled meetings</p>
        </div>
        <Button asChild>
          <Link href="/meetings/new">
            <Plus className="mr-2 h-4 w-4" />
            New Meeting
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search meetings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-6">
          {loadingUpcoming ? (
            <MeetingsListSkeleton />
          ) : (
            <MeetingsList meetings={filterMeetings(upcomingMeetings)} emptyMessage="No upcoming meetings" />
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-6">
          {loadingPast ? (
            <MeetingsListSkeleton />
          ) : (
            <MeetingsList meetings={filterMeetings(pastMeetings)} emptyMessage="No past meetings" isPast />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MeetingsList({
  meetings,
  emptyMessage,
  isPast: isPastList = false,
}: {
  meetings: Meeting[];
  emptyMessage: string;
  isPast?: boolean;
}) {
  const { user } = useAuth();

  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => {
        const isOwner = user?.id === meeting.createdByUserId;
        const isPastMeeting = isPast(meeting.startTime);

        return (
          <Card
            key={meeting.id}
            className={cn(
              'transition-shadow hover:shadow-md',
              meeting.isCancelled && 'opacity-60'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center justify-center min-w-[70px] py-2 px-3 bg-primary/10 rounded-lg">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(meeting.startTime, { weekday: undefined, month: 'short' })}
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {formatTime(meeting.startTime)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/meetings/${meeting.id}`}
                        className="font-semibold hover:text-primary transition-colors line-clamp-1"
                      >
                        {meeting.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(meeting.startTime, meeting.endTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {meeting.participants.length}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {meeting.isCancelled && <Badge variant="destructive">Cancelled</Badge>}
                      {meeting.videoLink && !meeting.isCancelled && !isPastMeeting && (
                        <Button size="sm" asChild>
                          <a href={meeting.videoLink} target="_blank" rel="noopener noreferrer">
                            <Video className="mr-2 h-3.5 w-3.5" />
                            Join
                          </a>
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/meetings/${meeting.id}`}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View details
                            </Link>
                          </DropdownMenuItem>
                          {isOwner && !meeting.isCancelled && !isPastList && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/meetings/${meeting.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {meeting.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {meeting.description}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MeetingsListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-[70px] rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

