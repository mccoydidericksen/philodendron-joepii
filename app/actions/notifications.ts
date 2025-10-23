'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { notifications, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

async function getDbUserId(clerkUserId: string) {
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.clerkUserId, clerkUserId),
  });

  if (!user) {
    throw new Error('User not found in database');
  }

  return user.id;
}

// ============================================
// CREATE NOTIFICATION
// ============================================

export async function createNotification(data: {
  userId: string;
  taskId?: string;
  plantId?: string;
  type: 'task_due' | 'task_overdue' | 'task_completed' | 'task_created' | 'plant_needs_attention';
  channel: 'in_app' | 'sms' | 'email';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}) {
  try {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        taskId: data.taskId || null,
        plantId: data.plantId || null,
        type: data.type,
        channel: data.channel,
        title: data.title,
        message: data.message,
        metadata: data.metadata || {},
        read: false,
        sentAt: new Date(),
      })
      .returning();

    revalidatePath('/dashboard');

    return {
      success: true,
      data: notification,
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create notification',
    };
  }
}

// ============================================
// GET NOTIFICATIONS
// ============================================

export async function getUserNotifications(unreadOnly: boolean = false) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    const whereConditions = unreadOnly
      ? and(
          eq(notifications.userId, dbUserId),
          eq(notifications.read, false),
          eq(notifications.channel, 'in_app')
        )
      : and(
          eq(notifications.userId, dbUserId),
          eq(notifications.channel, 'in_app')
        );

    const userNotifications = await db.query.notifications.findMany({
      where: whereConditions,
      orderBy: [desc(notifications.createdAt)],
      limit: 50,
      with: {
        task: {
          with: {
            plant: true,
          },
        },
        plant: true,
      },
    });

    return {
      success: true,
      data: userNotifications,
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch notifications',
    };
  }
}

// ============================================
// GET UNREAD COUNT
// ============================================

export async function getUnreadNotificationCount() {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    const unreadNotifications = await db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, dbUserId),
        eq(notifications.read, false),
        eq(notifications.channel, 'in_app')
      ),
    });

    return {
      success: true,
      data: unreadNotifications.length,
    };
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch unread count',
    };
  }
}

// ============================================
// MARK AS READ
// ============================================

export async function markNotificationAsRead(notificationId: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify ownership
    const notification = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, dbUserId)
      ),
    });

    if (!notification) {
      return {
        success: false,
        error: 'Notification not found or unauthorized',
      };
    }

    await db
      .update(notifications)
      .set({
        read: true,
        readAt: new Date(),
      })
      .where(eq(notifications.id, notificationId));

    revalidatePath('/dashboard');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark notification as read',
    };
  }
}

// ============================================
// MARK ALL AS READ
// ============================================

export async function markAllNotificationsAsRead() {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    await db
      .update(notifications)
      .set({
        read: true,
        readAt: new Date(),
      })
      .where(and(
        eq(notifications.userId, dbUserId),
        eq(notifications.read, false),
        eq(notifications.channel, 'in_app')
      ));

    revalidatePath('/dashboard');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark all notifications as read',
    };
  }
}

// ============================================
// DELETE NOTIFICATION
// ============================================

export async function deleteNotification(notificationId: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify ownership
    const notification = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, dbUserId)
      ),
    });

    if (!notification) {
      return {
        success: false,
        error: 'Notification not found or unauthorized',
      };
    }

    await db
      .delete(notifications)
      .where(eq(notifications.id, notificationId));

    revalidatePath('/dashboard');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete notification',
    };
  }
}
