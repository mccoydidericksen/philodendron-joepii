'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { plants, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Get the current authenticated Clerk user ID
 * @throws Error if user is not authenticated
 */
export async function getUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

/**
 * Get the database user ID from a Clerk user ID
 * @throws Error if user not found in database
 */
export async function getDbUserId(clerkUserId: string): Promise<string> {
  let user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  // Auto-sync user if not found (for local development)
  if (!user) {
    try {
      const { clerkClient } = await import('@clerk/nextjs/server');
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(clerkUserId);

      const primaryEmail = clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId
      );

      if (primaryEmail) {
        // Create user in database (or ignore if already exists)
        const [newUser] = await db.insert(users).values({
          clerkUserId: clerkUserId,
          email: primaryEmail.emailAddress,
          timezone: 'America/Los_Angeles',
          preferences: {},
        }).onConflictDoNothing().returning();

        if (newUser) {
          console.log(`[Auto-sync] User ${clerkUserId} synced to database`);
          return newUser.id;
        } else {
          // User was just created by another request, fetch it
          const existingUser = await db.query.users.findFirst({
            where: eq(users.clerkUserId, clerkUserId),
          });
          if (existingUser) {
            console.log(`[Auto-sync] User ${clerkUserId} found after conflict`);
            return existingUser.id;
          }
        }
      }
    } catch (error) {
      console.error('[Auto-sync] Failed to sync user:', error);
    }

    throw new Error('User not found in database');
  }

  return user.id;
}

/**
 * Get both Clerk and database user IDs for the current user
 * Convenience function that combines getUserId and getDbUserId
 */
export async function getCurrentUser(): Promise<{ clerkUserId: string; dbUserId: string }> {
  const clerkUserId = await getUserId();
  const dbUserId = await getDbUserId(clerkUserId);
  return { clerkUserId, dbUserId };
}

/**
 * Verify that a user owns a specific plant
 * @throws Error if plant not found or user doesn't own it
 * @returns The plant if verification succeeds
 */
export async function verifyPlantOwnership(plantId: string, userId: string) {
  const plant = await db.query.plants.findFirst({
    where: and(eq(plants.id, plantId), eq(plants.userId, userId)),
  });

  if (!plant) {
    throw new Error('Plant not found or unauthorized');
  }

  return plant;
}
