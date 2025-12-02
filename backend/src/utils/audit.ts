import prisma from '../config/prisma';
import { Request } from 'express';
import { Prisma } from '@prisma/client';

export interface AuditLogData {
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  details?: Record<string, unknown>;
  req?: Request;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        userId: data.userId,
        details: data.details as Prisma.InputJsonValue | undefined,
        ipAddress: data.req?.ip || data.req?.socket?.remoteAddress,
        userAgent: data.req?.headers['user-agent'],
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break main flow
  }
}

// Common audit actions
export const AuditActions = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_UPDATED: 'USER_UPDATED',
  TOKEN_REFRESHED: 'TOKEN_REFRESHED',
  MEETING_CREATED: 'MEETING_CREATED',
  MEETING_UPDATED: 'MEETING_UPDATED',
  MEETING_CANCELLED: 'MEETING_CANCELLED',
  MEETING_DELETED: 'MEETING_DELETED',
  PARTICIPANT_INVITED: 'PARTICIPANT_INVITED',
  PARTICIPANT_RESPONDED: 'PARTICIPANT_RESPONDED',
  GOOGLE_CONNECTED: 'GOOGLE_CONNECTED',
  GOOGLE_DISCONNECTED: 'GOOGLE_DISCONNECTED',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
} as const;

