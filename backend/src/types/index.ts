import { Request } from 'express';
import { User } from '@prisma/client';

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  userId?: string;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MeetingCreateInput {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  videoLink?: string;
  reminderMinutesBefore?: number[];
  participants: {
    email: string;
    userId?: string;
  }[];
  syncToGoogleCalendar?: boolean;
}

export interface MeetingUpdateInput {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  videoLink?: string;
  reminderMinutesBefore?: number[];
  participants?: {
    email: string;
    userId?: string;
  }[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  videoLink?: string;
  source: 'meetme' | 'google';
  isCancelled?: boolean;
  googleCalendarEventId?: string;
}

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedMeetingId?: string;
}

