import { PrismaClient, ParticipantStatus, NotificationType, ThemePreference } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.googleOAuthToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.meetingReminder.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.user.deleteMany();

  console.log('📝 Creating users...');

  // Create test users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const user1 = await prisma.user.create({
    data: {
      email: 'john@example.com',
      name: 'John Doe',
      passwordHash,
      timezone: 'America/New_York',
      settings: {
        create: {
          emailNotificationsEnabled: true,
          pushNotificationsEnabled: true,
          inAppNotificationsEnabled: true,
          themePreference: ThemePreference.SYSTEM,
        },
      },
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      passwordHash,
      timezone: 'America/Los_Angeles',
      settings: {
        create: {
          emailNotificationsEnabled: true,
          pushNotificationsEnabled: false,
          inAppNotificationsEnabled: true,
          themePreference: ThemePreference.DARK,
        },
      },
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob Wilson',
      passwordHash,
      timezone: 'Europe/London',
      settings: {
        create: {
          emailNotificationsEnabled: false,
          pushNotificationsEnabled: true,
          inAppNotificationsEnabled: true,
          themePreference: ThemePreference.LIGHT,
        },
      },
    },
  });

  console.log('📅 Creating meetings...');

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Meeting 1: Today in 2 hours
  const meeting1Start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const meeting1End = new Date(meeting1Start.getTime() + 60 * 60 * 1000);

  const meeting1 = await prisma.meeting.create({
    data: {
      title: 'Weekly Team Standup',
      description: 'Regular weekly sync to discuss progress and blockers',
      startTime: meeting1Start,
      endTime: meeting1End,
      timezone: 'America/New_York',
      videoLink: 'https://meet.google.com/abc-defg-hij',
      createdByUserId: user1.id,
      reminderMinutesBefore: [15, 5],
      participants: {
        create: [
          { email: user1.email, userId: user1.id, status: ParticipantStatus.ACCEPTED },
          { email: user2.email, userId: user2.id, status: ParticipantStatus.ACCEPTED },
          { email: user3.email, userId: user3.id, status: ParticipantStatus.TENTATIVE },
        ],
      },
    },
  });

  // Meeting 2: Tomorrow
  const meeting2Start = new Date(today.getTime() + 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000);
  const meeting2End = new Date(meeting2Start.getTime() + 30 * 60 * 1000);

  const meeting2 = await prisma.meeting.create({
    data: {
      title: 'Project Review',
      description: 'Review Q4 project milestones and deliverables',
      startTime: meeting2Start,
      endTime: meeting2End,
      timezone: 'America/New_York',
      videoLink: 'https://zoom.us/j/123456789',
      createdByUserId: user1.id,
      reminderMinutesBefore: [60, 15],
      participants: {
        create: [
          { email: user1.email, userId: user1.id, status: ParticipantStatus.ACCEPTED },
          { email: user2.email, userId: user2.id, status: ParticipantStatus.INVITED },
          { email: 'external@client.com', status: ParticipantStatus.INVITED },
        ],
      },
    },
  });

  // Meeting 3: Next week
  const meeting3Start = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000);
  const meeting3End = new Date(meeting3Start.getTime() + 2 * 60 * 60 * 1000);

  const meeting3 = await prisma.meeting.create({
    data: {
      title: 'Quarterly Planning',
      description: 'Plan goals and objectives for the next quarter',
      startTime: meeting3Start,
      endTime: meeting3End,
      timezone: 'America/New_York',
      videoLink: 'https://teams.microsoft.com/l/meetup-join/abc123',
      createdByUserId: user2.id,
      reminderMinutesBefore: [60],
      participants: {
        create: [
          { email: user1.email, userId: user1.id, status: ParticipantStatus.INVITED },
          { email: user2.email, userId: user2.id, status: ParticipantStatus.ACCEPTED },
          { email: user3.email, userId: user3.id, status: ParticipantStatus.DECLINED },
        ],
      },
    },
  });

  // Meeting 4: Cancelled meeting
  const meeting4Start = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000);
  const meeting4End = new Date(meeting4Start.getTime() + 45 * 60 * 1000);

  await prisma.meeting.create({
    data: {
      title: 'Design Review (Cancelled)',
      description: 'Review new UI designs - CANCELLED due to scheduling conflict',
      startTime: meeting4Start,
      endTime: meeting4End,
      timezone: 'America/New_York',
      isCancelled: true,
      createdByUserId: user3.id,
      reminderMinutesBefore: [15],
      participants: {
        create: [
          { email: user1.email, userId: user1.id, status: ParticipantStatus.ACCEPTED },
          { email: user3.email, userId: user3.id, status: ParticipantStatus.ACCEPTED },
        ],
      },
    },
  });

  console.log('🔔 Creating notifications...');

  // Create notifications for user1
  await prisma.notification.createMany({
    data: [
      {
        userId: user1.id,
        type: NotificationType.MEETING_INVITATION,
        title: 'New Meeting Invitation',
        message: `You've been invited to "Quarterly Planning" by Jane Smith`,
        isRead: false,
        relatedMeetingId: meeting3.id,
      },
      {
        userId: user1.id,
        type: NotificationType.MEETING_REMINDER,
        title: 'Meeting Reminder',
        message: `"Weekly Team Standup" starts in 15 minutes`,
        isRead: true,
        relatedMeetingId: meeting1.id,
      },
      {
        userId: user1.id,
        type: NotificationType.PARTICIPANT_RESPONDED,
        title: 'Response Received',
        message: `Jane Smith accepted your invitation to "Project Review"`,
        isRead: false,
        relatedMeetingId: meeting2.id,
      },
    ],
  });

  // Create notifications for user2
  await prisma.notification.createMany({
    data: [
      {
        userId: user2.id,
        type: NotificationType.MEETING_CREATED,
        title: 'Meeting Created',
        message: `Your meeting "Quarterly Planning" has been created`,
        isRead: true,
        relatedMeetingId: meeting3.id,
      },
      {
        userId: user2.id,
        type: NotificationType.MEETING_INVITATION,
        title: 'New Meeting Invitation',
        message: `You've been invited to "Project Review" by John Doe`,
        isRead: false,
        relatedMeetingId: meeting2.id,
      },
    ],
  });

  console.log('📊 Creating audit logs...');

  await prisma.auditLog.createMany({
    data: [
      {
        action: 'USER_REGISTERED',
        entity: 'User',
        entityId: user1.id,
        userId: user1.id,
        details: { email: user1.email },
      },
      {
        action: 'USER_LOGIN',
        entity: 'User',
        entityId: user1.id,
        userId: user1.id,
        details: { method: 'password' },
      },
      {
        action: 'MEETING_CREATED',
        entity: 'Meeting',
        entityId: meeting1.id,
        userId: user1.id,
        details: { title: meeting1.title },
      },
    ],
  });

  console.log('✅ Seed completed!');
  console.log('');
  console.log('Test accounts created:');
  console.log('  Email: john@example.com | Password: Password123!');
  console.log('  Email: jane@example.com | Password: Password123!');
  console.log('  Email: bob@example.com  | Password: Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

