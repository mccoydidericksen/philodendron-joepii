'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { userNotificationPreferences, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { UserNotificationPreferences } from '@/lib/db/types';

/**
 * Get user's notification preferences, creating defaults if none exist
 */
export async function getUserNotificationPreferences(): Promise<{
  success: boolean;
  data?: UserNotificationPreferences;
  error?: string;
}> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get the internal user ID
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Try to get existing preferences
    let [preferences] = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, user.id))
      .limit(1);

    // If no preferences exist, create defaults
    if (!preferences) {
      [preferences] = await db
        .insert(userNotificationPreferences)
        .values({
          userId: user.id,
          // Defaults are set in schema
        })
        .returning();
    }

    return { success: true, data: preferences };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return { success: false, error: 'Failed to get notification preferences' };
  }
}

/**
 * Update user's notification preferences
 */
export async function updateNotificationPreferences(updates: Partial<{
  emailEnabled: boolean;
  emailDigestFrequency: string;
  quietHoursStart: number;
  quietHoursEnd: number;
  notifyTaskDue: boolean;
  notifyTaskOverdue: boolean;
  notifyTaskCompleted: boolean;
  advanceNoticeHours: number;
}>): Promise<{
  success: boolean;
  data?: UserNotificationPreferences;
  error?: string;
}> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get the internal user ID
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get or create preferences
    const prefsResult = await getUserNotificationPreferences();
    if (!prefsResult.success || !prefsResult.data) {
      return { success: false, error: 'Failed to get preferences' };
    }

    // Update preferences
    const [updatedPreferences] = await db
      .update(userNotificationPreferences)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(userNotificationPreferences.userId, user.id))
      .returning();

    revalidatePath('/settings');
    return { success: true, data: updatedPreferences };
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return { success: false, error: 'Failed to update notification preferences' };
  }
}

/**
 * Request phone verification - sends SMS with code
 */
export async function requestPhoneVerification(phoneNumber: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate phone number format (basic E.164 check)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return { success: false, error: 'Invalid phone number format. Use E.164 format (+1234567890)' };
    }

    // Get the internal user ID
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Get or create preferences
    const prefsResult = await getUserNotificationPreferences();
    if (!prefsResult.success) {
      return { success: false, error: 'Failed to get preferences' };
    }

    // Update with phone and verification code
    await db
      .update(userNotificationPreferences)
      .set({
        phoneNumber,
        phoneVerified: false,
        phoneVerificationCode: verificationCode,
        phoneVerificationExpiry: expiryTime,
        updatedAt: new Date(),
      })
      .where(eq(userNotificationPreferences.userId, user.id));

    // TODO: Send SMS with verification code via Novu/Twilio
    // For now, just log it (we'll implement SMS sending in the next step)
    console.log(`Verification code for ${phoneNumber}: ${verificationCode}`);
    console.log('⚠️  SMS sending not yet implemented - code logged to console');

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error requesting phone verification:', error);
    return { success: false, error: 'Failed to send verification code' };
  }
}

/**
 * Verify phone number with code
 */
export async function verifyPhoneNumber(code: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get the internal user ID
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get preferences
    const [preferences] = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, user.id))
      .limit(1);

    if (!preferences) {
      return { success: false, error: 'No verification request found' };
    }

    // Check if code matches and hasn't expired
    if (preferences.phoneVerificationCode !== code) {
      return { success: false, error: 'Invalid verification code' };
    }

    if (!preferences.phoneVerificationExpiry || preferences.phoneVerificationExpiry < new Date()) {
      return { success: false, error: 'Verification code has expired' };
    }

    // Mark phone as verified
    await db
      .update(userNotificationPreferences)
      .set({
        phoneVerified: true,
        phoneVerificationCode: null,
        phoneVerificationExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(userNotificationPreferences.userId, user.id));

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error verifying phone number:', error);
    return { success: false, error: 'Failed to verify phone number' };
  }
}

/**
 * Enable SMS notifications (requires verified phone)
 */
export async function enableSmsNotifications(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get the internal user ID
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get preferences
    const [preferences] = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, user.id))
      .limit(1);

    if (!preferences) {
      return { success: false, error: 'Preferences not found' };
    }

    if (!preferences.phoneVerified) {
      return { success: false, error: 'Phone number must be verified first' };
    }

    // Enable SMS notifications
    await db
      .update(userNotificationPreferences)
      .set({
        smsEnabled: true,
        smsOptInAt: new Date(),
        smsOptOutAt: null,
        updatedAt: new Date(),
      })
      .where(eq(userNotificationPreferences.userId, user.id));

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error enabling SMS notifications:', error);
    return { success: false, error: 'Failed to enable SMS notifications' };
  }
}

/**
 * Disable SMS notifications
 */
export async function disableSmsNotifications(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get the internal user ID
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Disable SMS notifications
    await db
      .update(userNotificationPreferences)
      .set({
        smsEnabled: false,
        smsOptOutAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userNotificationPreferences.userId, user.id));

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error disabling SMS notifications:', error);
    return { success: false, error: 'Failed to disable SMS notifications' };
  }
}
