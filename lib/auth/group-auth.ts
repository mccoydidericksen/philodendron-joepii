import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { plants, plantGroups, plantGroupMembers, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// ============================================
// GROUP MEMBERSHIP CHECKS
// ============================================

export async function checkGroupMembership(groupId: string, clerkUserId: string) {
  try {
    const clerk = await clerkClient();
    const memberships = await clerk.users.getOrganizationMembershipList({
      userId: clerkUserId,
    });

    const membership = memberships.data.find((m) => m.organization.id === groupId);

    return membership || null;
  } catch (error) {
    console.error('Error checking group membership:', error);
    return null;
  }
}

export async function checkGroupAdmin(groupId: string, clerkUserId: string) {
  const membership = await checkGroupMembership(groupId, clerkUserId);
  return membership?.role === 'org:admin';
}

export async function getActiveOrganization() {
  try {
    const { orgId } = await auth();
    return orgId || null;
  } catch (error) {
    console.error('Error getting active organization:', error);
    return null;
  }
}

// ============================================
// PLANT ACCESS CHECKS
// ============================================

export async function canAccessPlant(plantId: string, clerkUserId: string): Promise<boolean> {
  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

    if (!dbUser) {
      return false;
    }

    const plant = await db.query.plants.findFirst({
      where: eq(plants.id, plantId),
    });

    if (!plant) {
      return false;
    }

    // Personal plant - only owner can access
    if (!plant.plantGroupId) {
      return plant.userId === dbUser.id;
    }

    // Group plant - check membership
    const group = await db.query.plantGroups.findFirst({
      where: eq(plantGroups.id, plant.plantGroupId),
    });

    if (!group) {
      return false;
    }

    const membership = await checkGroupMembership(group.clerkOrgId, clerkUserId);
    return !!membership;
  } catch (error) {
    console.error('Error checking plant access:', error);
    return false;
  }
}

export async function canEditPlant(plantId: string, clerkUserId: string): Promise<boolean> {
  // For now, if you can access it, you can edit it (group members have equal permissions)
  return canAccessPlant(plantId, clerkUserId);
}

export async function canDeletePlant(plantId: string, clerkUserId: string): Promise<boolean> {
  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

    if (!dbUser) {
      return false;
    }

    const plant = await db.query.plants.findFirst({
      where: eq(plants.id, plantId),
    });

    if (!plant) {
      return false;
    }

    // Personal plant - only owner can delete
    if (!plant.plantGroupId) {
      return plant.userId === dbUser.id;
    }

    // Group plant - only admins can delete
    const group = await db.query.plantGroups.findFirst({
      where: eq(plantGroups.id, plant.plantGroupId),
    });

    if (!group) {
      return false;
    }

    return await checkGroupAdmin(group.clerkOrgId, clerkUserId);
  } catch (error) {
    console.error('Error checking plant delete permission:', error);
    return false;
  }
}

// ============================================
// HELPER TO GET USER'S GROUP IDS
// ============================================

export async function getUserGroupIds(clerkUserId: string): Promise<string[]> {
  try {
    const clerk = await clerkClient();
    const memberships = await clerk.users.getOrganizationMembershipList({
      userId: clerkUserId,
    });

    return memberships.data.map((m) => m.organization.id);
  } catch (error) {
    console.error('Error getting user group IDs:', error);
    return [];
  }
}

// ============================================
// GET USER'S DB ID FROM CLERK ID
// ============================================

export async function getDbUserId(clerkUserId: string): Promise<string | null> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

    return user?.id || null;
  } catch (error) {
    console.error('Error getting DB user ID:', error);
    return null;
  }
}
