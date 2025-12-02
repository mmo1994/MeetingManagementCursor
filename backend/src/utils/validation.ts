import { z } from 'zod';

// Auth validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  timezone: z.string().optional().default('UTC'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Meeting validation schemas
export const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  startTime: z.string().datetime('Invalid start time'),
  endTime: z.string().datetime('Invalid end time'),
  timezone: z.string().min(1, 'Timezone is required'),
  videoLink: z.string().url('Invalid video link').optional().or(z.literal('')),
  reminderMinutesBefore: z.array(z.number().min(0).max(10080)).optional().default([15]),
  participants: z.array(z.object({
    email: z.string().email('Invalid participant email'),
    userId: z.string().optional(),
  })).optional().default([]),
  syncToGoogleCalendar: z.boolean().optional().default(false),
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const updateMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  description: z.string().max(5000, 'Description too long').optional(),
  startTime: z.string().datetime('Invalid start time').optional(),
  endTime: z.string().datetime('Invalid end time').optional(),
  timezone: z.string().min(1, 'Timezone is required').optional(),
  videoLink: z.string().url('Invalid video link').optional().or(z.literal('')),
  reminderMinutesBefore: z.array(z.number().min(0).max(10080)).optional(),
  participants: z.array(z.object({
    email: z.string().email('Invalid participant email'),
    userId: z.string().optional(),
  })).optional(),
});

export const updateMeetingTimeSchema = z.object({
  startTime: z.string().datetime('Invalid start time'),
  endTime: z.string().datetime('Invalid end time'),
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const inviteParticipantsSchema = z.object({
  participants: z.array(z.object({
    email: z.string().email('Invalid email'),
    userId: z.string().optional(),
  })).min(1, 'At least one participant required'),
});

// Settings validation schema
export const updateSettingsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  timezone: z.string().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
  pushNotificationsEnabled: z.boolean().optional(),
  inAppNotificationsEnabled: z.boolean().optional(),
  themePreference: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
});

// Push subscription schema
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url('Invalid endpoint'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key required'),
    auth: z.string().min(1, 'auth key required'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

