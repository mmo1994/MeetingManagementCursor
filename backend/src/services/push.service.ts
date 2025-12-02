import webPush from 'web-push';
import prisma from '../config/prisma';
import { config } from '../config';

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, string>;
}

export class PushService {
  private isConfigured: boolean = false;
  
  constructor() {
    if (config.vapid.publicKey && config.vapid.privateKey) {
      webPush.setVapidDetails(
        config.vapid.subject,
        config.vapid.publicKey,
        config.vapid.privateKey
      );
      this.isConfigured = true;
    }
  }
  
  async subscribe(
    userId: string,
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }
  ): Promise<void> {
    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });
    
    if (existing) {
      // Update user if different
      if (existing.userId !== userId) {
        await prisma.pushSubscription.update({
          where: { id: existing.id },
          data: { userId },
        });
      }
      return;
    }
    
    // Create new subscription
    await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }
  
  async unsubscribe(endpoint: string): Promise<void> {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
  }
  
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.isConfigured) {
      console.log(`[Push] Would send to user ${userId}: ${payload.title}`);
      return;
    }
    
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });
    
    const notification = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      data: payload.data,
    });
    
    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          notification
        )
      )
    );
    
    // Clean up failed subscriptions (likely unsubscribed)
    const failedEndpoints: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const error = result.reason as { statusCode?: number };
        if (error.statusCode === 404 || error.statusCode === 410) {
          failedEndpoints.push(subscriptions[index].endpoint);
        }
      }
    });
    
    if (failedEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: failedEndpoints } },
      });
    }
  }
  
  getPublicKey(): string {
    return config.vapid.publicKey;
  }
}

export const pushService = new PushService();

