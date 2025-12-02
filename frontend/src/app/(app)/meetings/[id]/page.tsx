'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMeeting, useCancelMeeting, useRespondToMeeting } from '@/hooks/use-meetings';
import { useAuth } from '@/contexts/auth-context';
import { formatDate, formatTime, formatDuration, isPast, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  Globe,
  Loader2,
  Users,
  Video,
  XCircle,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import type { ParticipantStatus } from '@/lib/types';

const statusColors: Record<ParticipantStatus, string> = {
  ACCEPTED: 'text-green-600 dark:text-green-400',
  DECLINED: 'text-red-600 dark:text-red-400',
  TENTATIVE: 'text-yellow-600 dark:text-yellow-400',
  INVITED: 'text-muted-foreground',
};

const statusIcons: Record<ParticipantStatus, React.ComponentType<{ className?: string }>> = {
  ACCEPTED: Check,
  DECLINED: X,
  TENTATIVE: HelpCircle,
  INVITED: Clock,
};

export default function MeetingDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: meeting, isLoading } = useMeeting(id);
  const cancelMeeting = useCancelMeeting();
  const respondToMeeting = useRespondToMeeting();

  if (isLoading) {
    return <MeetingDetailSkeleton />;
  }

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Meeting not found</h2>
        <p className="text-muted-foreground mb-4">This meeting may have been deleted.</p>
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const isOwner = user?.id === meeting.createdByUserId;
  const isPastMeeting = isPast(meeting.startTime);
  const currentUserParticipant = meeting.participants.find((p) => p.userId === user?.id);

  const handleCancel = async () => {
    try {
      await cancelMeeting.mutateAsync(meeting.id);
      toast({
        title: 'Meeting cancelled',
        description: 'Participants have been notified.',
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to cancel meeting',
        variant: 'destructive',
      });
    }
  };

  const handleRespond = async (status: ParticipantStatus) => {
    try {
      await respondToMeeting.mutateAsync({ id: meeting.id, status });
      toast({
        title: 'Response recorded',
        description: `You have ${status.toLowerCase()} the invitation.`,
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update response',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{meeting.title}</h1>
            {meeting.isCancelled && <Badge variant="destructive">Cancelled</Badge>}
            {meeting.googleCalendarEventId && (
              <Badge variant="secondary">Synced to Google</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Created by {meeting.createdBy.name}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {meeting.videoLink && !meeting.isCancelled && !isPastMeeting && (
          <Button asChild size="lg">
            <a href={meeting.videoLink} target="_blank" rel="noopener noreferrer">
              <Video className="mr-2 h-4 w-4" />
              Join Meeting
            </a>
          </Button>
        )}
        {isOwner && !meeting.isCancelled && !isPastMeeting && (
          <>
            <Button variant="outline" asChild>
              <Link href={`/meetings/${meeting.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Meeting
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this meeting?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will notify all participants that the meeting has been cancelled.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Meeting</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {cancelMeeting.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Cancel Meeting
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>

      {/* Response buttons for non-owner */}
      {!isOwner && currentUserParticipant && !meeting.isCancelled && !isPastMeeting && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-3">
              Your response: <span className={cn('font-medium', statusColors[currentUserParticipant.status])}>
                {currentUserParticipant.status}
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                variant={currentUserParticipant.status === 'ACCEPTED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRespond('ACCEPTED')}
                disabled={respondToMeeting.isPending}
              >
                <Check className="mr-2 h-4 w-4" />
                Accept
              </Button>
              <Button
                variant={currentUserParticipant.status === 'TENTATIVE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRespond('TENTATIVE')}
                disabled={respondToMeeting.isPending}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Maybe
              </Button>
              <Button
                variant={currentUserParticipant.status === 'DECLINED' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => handleRespond('DECLINED')}
                disabled={respondToMeeting.isPending}
              >
                <X className="mr-2 h-4 w-4" />
                Decline
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Meeting Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {formatDate(meeting.startTime, { weekday: 'long' })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Duration</p>
                <p className="text-sm text-muted-foreground">
                  {formatDuration(meeting.startTime, meeting.endTime)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Timezone</p>
                <p className="text-sm text-muted-foreground">{meeting.timezone}</p>
              </div>
            </div>
            {meeting.videoLink && (
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium">Video Link</p>
                  <a
                    href={meeting.videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate block"
                  >
                    {meeting.videoLink}
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants ({meeting.participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {meeting.participants.map((participant) => {
                const StatusIcon = statusIcons[participant.status];
                return (
                  <div key={participant.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {participant.user?.name?.[0] || participant.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {participant.user?.name || participant.email}
                          {participant.userId === meeting.createdByUserId && (
                            <span className="text-muted-foreground ml-1">(organizer)</span>
                          )}
                        </p>
                        {participant.user && (
                          <p className="text-xs text-muted-foreground">{participant.email}</p>
                        )}
                      </div>
                    </div>
                    <div className={cn('flex items-center gap-1', statusColors[participant.status])}>
                      <StatusIcon className="h-4 w-4" />
                      <span className="text-xs">{participant.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {meeting.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{meeting.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Reminders */}
      {meeting.reminderMinutesBefore.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {meeting.reminderMinutesBefore.map((minutes) => (
                <Badge key={minutes} variant="secondary">
                  {minutes >= 60
                    ? `${Math.floor(minutes / 60)} hour${minutes >= 120 ? 's' : ''} before`
                    : `${minutes} minutes before`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MeetingDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

