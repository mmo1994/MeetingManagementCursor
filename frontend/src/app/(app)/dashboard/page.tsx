'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useMeetings } from '@/hooks/use-meetings';
import { useAuth } from '@/contexts/auth-context';
import { groupMeetingsByDate, formatTime, formatDate, formatDuration, isPast } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Clock, 
  ExternalLink, 
  MoreHorizontal, 
  Plus, 
  Users,
  Video,
  Edit,
  XCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Meeting } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: meetings, isLoading } = useMeetings({ upcoming: true });

  const groupedMeetings = useMemo(() => {
    if (!meetings) return {};
    return groupMeetingsByDate(meetings.filter(m => !m.isCancelled));
  }, [meetings]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="space-y-8 animate-in">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s on your schedule
          </p>
        </div>
        <Button asChild>
          <Link href="/meetings/new">
            <Plus className="mr-2 h-4 w-4" />
            Schedule Meeting
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groupedMeetings['Today']?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(groupedMeetings['Today']?.length || 0) +
                (groupedMeetings['Tomorrow']?.length || 0) +
                (groupedMeetings['This Week']?.length || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meetings?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Meetings List */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Upcoming Meetings</h2>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : Object.keys(groupedMeetings).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No upcoming meetings</h3>
              <p className="text-muted-foreground mb-4">
                Your schedule is clear. Ready to plan something?
              </p>
              <Button asChild>
                <Link href="/meetings/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Meeting
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMeetings).map(([group, groupMeetings]) => (
              <div key={group} className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {group}
                </h3>
                <div className="space-y-3">
                  {groupMeetings.map((meeting) => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const isOwner = useAuth().user?.id === meeting.createdByUserId;
  const startTime = new Date(meeting.startTime);
  const isPastMeeting = isPast(meeting.startTime);

  return (
    <Card className={cn(
      'transition-shadow hover:shadow-md',
      meeting.isCancelled && 'opacity-60'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Time indicator */}
          <div className="flex flex-col items-center justify-center min-w-[60px] py-2 px-3 bg-primary/10 rounded-lg">
            <span className="text-lg font-bold text-primary">
              {formatTime(startTime)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDuration(meeting.startTime, meeting.endTime)}
            </span>
          </div>

          {/* Meeting details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link 
                  href={`/meetings/${meeting.id}`}
                  className="font-semibold hover:text-primary transition-colors line-clamp-1"
                >
                  {meeting.title}
                </Link>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(meeting.startTime)}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {meeting.isCancelled && (
                  <Badge variant="destructive">Cancelled</Badge>
                )}
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
                    {isOwner && !meeting.isCancelled && (
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

            {/* Participants */}
            <div className="flex items-center gap-2 mt-3">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex -space-x-2">
                {meeting.participants.slice(0, 4).map((p, i) => (
                  <div
                    key={p.id}
                    className="h-6 w-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[10px] font-medium"
                    title={p.email}
                  >
                    {p.user?.name?.[0] || p.email[0].toUpperCase()}
                  </div>
                ))}
                {meeting.participants.length > 4 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
                    +{meeting.participants.length - 4}
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

