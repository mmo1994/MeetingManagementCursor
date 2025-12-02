'use client';

import { useNotifications } from '@/hooks/use-notifications';
import { formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  Calendar,
  Check,
  CheckCheck,
  Mail,
  UserPlus,
  XCircle,
  Clock,
  Edit,
} from 'lucide-react';
import Link from 'next/link';
import type { NotificationType, Notification } from '@/lib/types';

const notificationIcons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  MEETING_CREATED: Calendar,
  MEETING_UPDATED: Edit,
  MEETING_CANCELLED: XCircle,
  MEETING_INVITATION: UserPlus,
  MEETING_REMINDER: Clock,
  PARTICIPANT_RESPONDED: Check,
};

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={() => markAllAsRead()}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No notifications</h3>
            <p className="text-muted-foreground">
              You&apos;re all caught up! Check back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={() => markAsRead(notification.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationCard({
  notification,
  onMarkAsRead,
}: {
  notification: Notification;
  onMarkAsRead: () => void;
}) {
  const Icon = notificationIcons[notification.type] || Bell;

  return (
    <Card
      className={cn(
        'transition-colors cursor-pointer hover:bg-muted/50',
        !notification.isRead && 'bg-primary/5 border-primary/20'
      )}
      onClick={() => {
        if (!notification.isRead) {
          onMarkAsRead();
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
              notification.isRead ? 'bg-muted' : 'bg-primary/10'
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5',
                notification.isRead ? 'text-muted-foreground' : 'text-primary'
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={cn('font-medium', !notification.isRead && 'text-foreground')}>
                  {notification.title}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
              </div>
              {!notification.isRead && (
                <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground">
                {formatDate(notification.createdAt)}
              </span>
              {notification.relatedMeetingId && (
                <Link
                  href={`/meetings/${notification.relatedMeetingId}`}
                  className="text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View meeting →
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

