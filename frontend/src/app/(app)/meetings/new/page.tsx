'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateMeeting } from '@/hooks/use-meetings';
import { useGoogleStatus } from '@/hooks/use-settings';
import { ApiRequestError } from '@/lib/api';
import { getUserTimezone, getTimezoneOptions } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Plus, X, Calendar, Video } from 'lucide-react';
import Link from 'next/link';

const meetingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  videoLink: z.string().url('Invalid URL').optional().or(z.literal('')),
  reminderMinutesBefore: z.array(z.number()),
  syncToGoogleCalendar: z.boolean(),
});

type MeetingFormData = z.infer<typeof meetingSchema>;

const reminderOptions = [
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

export default function NewMeetingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createMeeting = useCreateMeeting();
  const { data: googleStatus } = useGoogleStatus();
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState('');

  const defaultDate = new Date();
  defaultDate.setHours(defaultDate.getHours() + 1);
  defaultDate.setMinutes(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      timezone: getUserTimezone(),
      reminderMinutesBefore: [15],
      syncToGoogleCalendar: false,
      date: defaultDate.toISOString().split('T')[0],
      startTime: defaultDate.toTimeString().slice(0, 5),
      endTime: new Date(defaultDate.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5),
    },
  });

  const selectedReminders = watch('reminderMinutesBefore');
  const syncToGoogle = watch('syncToGoogleCalendar');

  const addParticipant = () => {
    const email = newParticipant.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !participants.includes(email)) {
      setParticipants([...participants, email]);
      setNewParticipant('');
    }
  };

  const removeParticipant = (email: string) => {
    setParticipants(participants.filter((p) => p !== email));
  };

  const toggleReminder = (value: number) => {
    const current = selectedReminders || [];
    if (current.includes(value)) {
      setValue(
        'reminderMinutesBefore',
        current.filter((v) => v !== value)
      );
    } else {
      setValue('reminderMinutesBefore', [...current, value]);
    }
  };

  const onSubmit = async (data: MeetingFormData) => {
    try {
      const startDateTime = new Date(`${data.date}T${data.startTime}`);
      const endDateTime = new Date(`${data.date}T${data.endTime}`);

      if (endDateTime <= startDateTime) {
        toast({
          title: 'Invalid time',
          description: 'End time must be after start time',
          variant: 'destructive',
        });
        return;
      }

      await createMeeting.mutateAsync({
        title: data.title,
        description: data.description,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        timezone: data.timezone,
        videoLink: data.videoLink || undefined,
        reminderMinutesBefore: data.reminderMinutesBefore,
        participants: participants.map((email) => ({ email })),
        syncToGoogleCalendar: data.syncToGoogleCalendar,
      });

      toast({
        title: 'Meeting created',
        description: 'Your meeting has been scheduled successfully.',
        variant: 'success',
      });

      router.push('/dashboard');
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : 'Failed to create meeting';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Schedule Meeting</h1>
          <p className="text-muted-foreground">Create a new meeting</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meeting Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Weekly Team Standup"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add meeting agenda or notes..."
                rows={3}
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input type="date" id="date" {...register('date')} />
                {errors.date && (
                  <p className="text-sm text-destructive">{errors.date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input type="time" id="startTime" {...register('startTime')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input type="time" id="endTime" {...register('endTime')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={watch('timezone')}
                onValueChange={(value) => setValue('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {getTimezoneOptions().slice(0, 50).map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoLink" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video Link
              </Label>
              <Input
                id="videoLink"
                placeholder="https://meet.google.com/abc-defg-hij"
                {...register('videoLink')}
              />
              {errors.videoLink && (
                <p className="text-sm text-destructive">{errors.videoLink.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Participants</CardTitle>
            <CardDescription>Add people to invite to this meeting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="email@example.com"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addParticipant();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={addParticipant}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {participants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {participants.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1 pr-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeParticipant(email)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reminders</CardTitle>
            <CardDescription>Get notified before the meeting starts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {reminderOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={selectedReminders?.includes(option.value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleReminder(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {googleStatus?.isConnected && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="syncToGoogle"
                  checked={syncToGoogle}
                  onCheckedChange={(checked) =>
                    setValue('syncToGoogleCalendar', checked as boolean)
                  }
                />
                <Label htmlFor="syncToGoogle" className="cursor-pointer">
                  Sync to Google Calendar
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button type="button" variant="outline" asChild className="flex-1">
            <Link href="/dashboard">Cancel</Link>
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Meeting
          </Button>
        </div>
      </form>
    </div>
  );
}

