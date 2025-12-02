export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  themePreference: 'LIGHT' | 'DARK' | 'SYSTEM';
}

export interface UserWithSettings extends User {
  settings: UserSettings | null;
}

export type ParticipantStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';

export interface MeetingParticipant {
  id: string;
  email: string;
  status: ParticipantStatus;
  userId: string | null;
  user: User | null;
}

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  timezone: string;
  videoLink: string | null;
  isCancelled: boolean;
  googleCalendarEventId: string | null;
  reminderMinutesBefore: number[];
  createdByUserId: string;
  createdBy: User;
  participants: MeetingParticipant[];
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'MEETING_CREATED'
  | 'MEETING_UPDATED'
  | 'MEETING_CANCELLED'
  | 'MEETING_INVITATION'
  | 'MEETING_REMINDER'
  | 'PARTICIPANT_RESPONDED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedMeetingId: string | null;
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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface NotificationResponse extends ApiResponse<Notification[]> {
  unreadCount: number;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  name: string;
  timezone?: string;
}

export interface MeetingFormData {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  videoLink?: string;
  reminderMinutesBefore: number[];
  participants: { email: string }[];
  syncToGoogleCalendar: boolean;
}

export interface SettingsFormData {
  name?: string;
  timezone?: string;
  emailNotificationsEnabled?: boolean;
  pushNotificationsEnabled?: boolean;
  inAppNotificationsEnabled?: boolean;
  themePreference?: 'LIGHT' | 'DARK' | 'SYSTEM';
}

