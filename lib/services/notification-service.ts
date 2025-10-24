'use server';

import { db } from '@/lib/db';
import { userNotificationPreferences, notifications, careTasks, plants, users } from '@/lib/db/schema';
import { eq, and, lt, gte, desc } from 'drizzle-orm';
import type { NotificationType, NotificationChannel } from '@/lib/db/types';

/**
 * Check if current time is within user's quiet hours
 */
export async function isWithinQuietHours(
  quietHoursStart: number,
  quietHoursEnd: number,
  currentHour: number = new Date().getHours()
): Promise<boolean> {
  // If quiet hours span midnight (e.g., 21:00 to 9:00)
  if (quietHoursStart > quietHoursEnd) {
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd;
  }
  // Normal range (e.g., 9:00 to 21:00)
  return currentHour >= quietHoursStart && currentHour < quietHoursEnd;
}

/**
 * Check if a user should receive a notification based on their preferences
 */
export async function shouldSendNotification(
  userId: string,
  type: NotificationType,
  channel: NotificationChannel
): Promise<{
  shouldSend: boolean;
  reason?: string;
}> {
  try {
    // Get user preferences
    const [prefs] = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .limit(1);

    if (!prefs) {
      // No preferences set, create defaults and allow notification
      return { shouldSend: true };
    }

    // Check channel-specific settings
    if (channel === 'sms' && !prefs.smsEnabled) {
      return { shouldSend: false, reason: 'SMS notifications disabled' };
    }

    if (channel === 'email' && !prefs.emailEnabled) {
      return { shouldSend: false, reason: 'Email notifications disabled' };
    }

    // Check notification type preferences
    if (type === 'task_due' && !prefs.notifyTaskDue) {
      return { shouldSend: false, reason: 'Task due notifications disabled' };
    }

    if (type === 'task_overdue' && !prefs.notifyTaskOverdue) {
      return { shouldSend: false, reason: 'Overdue task notifications disabled' };
    }

    if (type === 'task_completed' && !prefs.notifyTaskCompleted) {
      return { shouldSend: false, reason: 'Task completion notifications disabled' };
    }

    // Check quiet hours (only for SMS and email, not in-app)
    if (channel !== 'in_app') {
      const currentHour = new Date().getHours();
      const inQuietHours = await isWithinQuietHours(
        prefs.quietHoursStart || 21,
        prefs.quietHoursEnd || 9,
        currentHour
      );

      if (inQuietHours) {
        return { shouldSend: false, reason: 'Within quiet hours' };
      }
    }

    return { shouldSend: true };
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    // Default to allowing notification if there's an error
    return { shouldSend: true };
  }
}

/**
 * Send SMS notification (placeholder for Novu/Twilio integration)
 */
export async function sendSmsNotification(
  phoneNumber: string,
  message: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // TODO: Integrate with Novu or Twilio
    // For now, just log the message
    console.log('📱 SMS Notification:');
    console.log(`  To: ${phoneNumber}`);
    console.log(`  Message: ${message}`);
    console.log('⚠️  SMS sending not yet implemented');

    // Simulate success
    return { success: true };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: 'Failed to send SMS' };
  }
}

/**
 * Send email notification (placeholder for Resend integration)
 */
export async function sendEmailNotification(
  email: string,
  subject: string,
  body: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // TODO: Integrate with Resend
    // For now, just log the email
    console.log('📧 Email Notification:');
    console.log(`  To: ${email}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${body}`);
    console.log('⚠️  Email sending not yet implemented');

    // Simulate success
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send notification through appropriate channel(s)
 */
export async function sendNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: {
    taskId?: string;
    plantId?: string;
    taskName?: string;
    plantName?: string;
    dueDate?: string;
  }
): Promise<{
  success: boolean;
  sentChannels: NotificationChannel[];
  error?: string;
}> {
  const sentChannels: NotificationChannel[] = [];

  try {
    // Get user info
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { success: false, sentChannels, error: 'User not found' };
    }

    // Get user preferences
    const [prefs] = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .limit(1);

    // Always send in-app notification
    const inAppCheck = await shouldSendNotification(userId, type, 'in_app');
    if (inAppCheck.shouldSend) {
      await db.insert(notifications).values({
        userId,
        taskId: metadata?.taskId,
        plantId: metadata?.plantId,
        type,
        channel: 'in_app',
        title,
        message,
        metadata: metadata || {},
        read: false,
        sentAt: new Date(),
      });
      sentChannels.push('in_app');
    }

    // Send SMS if enabled and verified
    if (prefs?.smsEnabled && prefs?.phoneVerified && prefs?.phoneNumber) {
      const smsCheck = await shouldSendNotification(userId, type, 'sms');
      if (smsCheck.shouldSend) {
        const smsResult = await sendSmsNotification(prefs.phoneNumber, `${title}: ${message}`);
        if (smsResult.success) {
          await db.insert(notifications).values({
            userId,
            taskId: metadata?.taskId,
            plantId: metadata?.plantId,
            type,
            channel: 'sms',
            title,
            message,
            metadata: metadata || {},
            read: true, // Mark as read since it was sent via SMS
            sentAt: new Date(),
          });
          sentChannels.push('sms');
        }
      }
    }

    // Send email if enabled
    if (prefs?.emailEnabled) {
      const emailCheck = await shouldSendNotification(userId, type, 'email');
      if (emailCheck.shouldSend) {
        const emailResult = await sendEmailNotification(user.email, title, message);
        if (emailResult.success) {
          await db.insert(notifications).values({
            userId,
            taskId: metadata?.taskId,
            plantId: metadata?.plantId,
            type,
            channel: 'email',
            title,
            message,
            metadata: metadata || {},
            read: true, // Mark as read since it was sent via email
            sentAt: new Date(),
          });
          sentChannels.push('email');
        }
      }
    }

    return { success: true, sentChannels };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, sentChannels, error: 'Failed to send notification' };
  }
}

/**
 * Find tasks that need notifications (due within advance notice period)
 */
export async function findTasksNeedingNotification(): Promise<Array<{
  taskId: string;
  userId: string;
  plantId: string;
  taskTitle: string;
  plantName: string;
  nextDueDate: Date;
  advanceNoticeHours: number;
}>> {
  try {
    const now = new Date();

    // Get all users with their notification preferences
    const usersWithPrefs = await db
      .select({
        userId: users.id,
        advanceNoticeHours: userNotificationPreferences.advanceNoticeHours,
      })
      .from(users)
      .leftJoin(
        userNotificationPreferences,
        eq(users.id, userNotificationPreferences.userId)
      );

    const tasksNeedingNotification: Array<{
      taskId: string;
      userId: string;
      plantId: string;
      taskTitle: string;
      plantName: string;
      nextDueDate: Date;
      advanceNoticeHours: number;
    }> = [];

    // For each user, check their tasks
    for (const { userId, advanceNoticeHours } of usersWithPrefs) {
      const hoursAhead = advanceNoticeHours || 24;
      const notifyByTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

      // Find tasks due within the advance notice period
      const tasks = await db
        .select({
          taskId: careTasks.id,
          plantId: careTasks.plantId,
          taskTitle: careTasks.title,
          nextDueDate: careTasks.nextDueDate,
          plantName: plants.name,
        })
        .from(careTasks)
        .innerJoin(plants, eq(careTasks.plantId, plants.id))
        .where(
          and(
            eq(careTasks.userId, userId),
            gte(careTasks.nextDueDate, now),
            lt(careTasks.nextDueDate, notifyByTime)
          )
        );

      // Check if we've already sent a notification for each task recently
      for (const task of tasks) {
        // Skip tasks without due dates (should already be filtered, but be safe)
        if (!task.nextDueDate) continue;

        const recentNotifications = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.taskId, task.taskId),
              eq(notifications.type, 'task_due'),
              gte(notifications.createdAt, new Date(now.getTime() - hoursAhead * 60 * 60 * 1000))
            )
          )
          .orderBy(desc(notifications.createdAt))
          .limit(1);

        // Only include if we haven't notified recently
        if (recentNotifications.length === 0) {
          tasksNeedingNotification.push({
            taskId: task.taskId,
            userId,
            plantId: task.plantId,
            taskTitle: task.taskTitle,
            plantName: task.plantName,
            nextDueDate: task.nextDueDate,
            advanceNoticeHours: hoursAhead,
          });
        }
      }
    }

    return tasksNeedingNotification;
  } catch (error) {
    console.error('Error finding tasks needing notification:', error);
    return [];
  }
}

/**
 * Process and send notifications for tasks that are due
 */
export async function processTaskNotifications(): Promise<{
  success: boolean;
  notificationsSent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let notificationsSent = 0;

  try {
    const tasksToNotify = await findTasksNeedingNotification();

    console.log(`Found ${tasksToNotify.length} tasks needing notification`);

    for (const task of tasksToNotify) {
      const dueDate = new Date(task.nextDueDate);
      const timeUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60));

      const title = `Plant Care Reminder`;
      const message = `Your plant "${task.plantName}" needs: ${task.taskTitle} (due in ${timeUntilDue} hours)`;

      const result = await sendNotification(
        task.userId,
        'task_due',
        title,
        message,
        {
          taskId: task.taskId,
          plantId: task.plantId,
          taskName: task.taskTitle,
          plantName: task.plantName,
          dueDate: dueDate.toISOString(),
        }
      );

      if (result.success) {
        notificationsSent += result.sentChannels.length;
        console.log(`✅ Sent notification for task "${task.taskTitle}" via: ${result.sentChannels.join(', ')}`);
      } else {
        const errorMsg = `Failed to send notification for task "${task.taskTitle}": ${result.error}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    return { success: true, notificationsSent, errors };
  } catch (error) {
    console.error('Error processing task notifications:', error);
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    return { success: false, notificationsSent, errors };
  }
}
