'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useSettings,
  useUpdateSettings,
  useGoogleStatus,
  useGoogleConnect,
  useGoogleDisconnect,
} from '@/hooks/use-settings';
import { getTimezoneOptions, getUserTimezone } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, Loader2, Moon, Sun, User, Check, X, ExternalLink } from 'lucide-react';

const settingsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  timezone: z.string().min(1, 'Timezone is required'),
  emailNotificationsEnabled: z.boolean(),
  pushNotificationsEnabled: z.boolean(),
  inAppNotificationsEnabled: z.boolean(),
  themePreference: z.enum(['LIGHT', 'DARK', 'SYSTEM']),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: googleStatus, isLoading: loadingGoogle } = useGoogleStatus();
  const connectGoogle = useGoogleConnect();
  const disconnectGoogle = useGoogleDisconnect();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      timezone: getUserTimezone(),
      emailNotificationsEnabled: true,
      pushNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
      themePreference: 'SYSTEM',
    },
  });

  // Handle Google OAuth callback
  useEffect(() => {
    const googleConnected = searchParams.get('google_connected');
    const googleError = searchParams.get('google_error');

    if (googleConnected) {
      toast({
        title: 'Google Calendar connected',
        description: 'Your Google Calendar is now synced with MeetMe.',
        variant: 'success',
      });
      // Clean URL
      window.history.replaceState({}, '', '/settings');
    }

    if (googleError) {
      toast({
        title: 'Connection failed',
        description: 'Failed to connect Google Calendar. Please try again.',
        variant: 'destructive',
      });
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams, toast]);

  // Load settings into form
  useEffect(() => {
    if (settings) {
      reset({
        name: settings.name,
        timezone: settings.timezone,
        emailNotificationsEnabled: settings.settings?.emailNotificationsEnabled ?? true,
        pushNotificationsEnabled: settings.settings?.pushNotificationsEnabled ?? true,
        inAppNotificationsEnabled: settings.settings?.inAppNotificationsEnabled ?? true,
        themePreference: settings.settings?.themePreference ?? 'SYSTEM',
      });
    }
  }, [settings, reset]);

  const onSubmit = async (data: SettingsFormData) => {
    try {
      await updateSettings.mutateAsync(data);
      toast({
        title: 'Settings saved',
        description: 'Your preferences have been updated.',
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={settings?.email || ''} disabled />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={watch('timezone')}
                    onValueChange={(value) => setValue('timezone', value, { shouldDirty: true })}
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="h-5 w-5" />
                  Appearance
                </CardTitle>
                <CardDescription>Customize the look of the app</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={watch('themePreference')}
                    onValueChange={(value: 'LIGHT' | 'DARK' | 'SYSTEM') =>
                      setValue('themePreference', value, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LIGHT">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="DARK">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="SYSTEM">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={watch('emailNotificationsEnabled')}
                    onCheckedChange={(checked) =>
                      setValue('emailNotificationsEnabled', checked, { shouldDirty: true })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive browser push notifications
                    </p>
                  </div>
                  <Switch
                    checked={watch('pushNotificationsEnabled')}
                    onCheckedChange={(checked) =>
                      setValue('pushNotificationsEnabled', checked, { shouldDirty: true })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications in the app
                    </p>
                  </div>
                  <Switch
                    checked={watch('inAppNotificationsEnabled')}
                    onCheckedChange={(checked) =>
                      setValue('inAppNotificationsEnabled', checked, { shouldDirty: true })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Google Calendar
                </CardTitle>
                <CardDescription>
                  Sync your meetings with Google Calendar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingGoogle ? (
                  <Skeleton className="h-10 w-32" />
                ) : googleStatus?.isConnected ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="gap-1">
                        <Check className="h-3 w-3" />
                        Connected
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Your calendar is synced
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => disconnectGoogle.mutate()}
                      disabled={disconnectGoogle.isPending}
                    >
                      {disconnectGoogle.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Not connected
                    </span>
                    <Button
                      type="button"
                      onClick={() => connectGoogle.mutate()}
                      disabled={connectGoogle.isPending}
                    >
                      {connectGoogle.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Connect Google Calendar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isDirty && (
            <div className="flex justify-end gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                disabled={updateSettings.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </Tabs>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Card>
        <CardContent className="pt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

