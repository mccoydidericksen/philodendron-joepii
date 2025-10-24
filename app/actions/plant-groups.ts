'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { plantGroups, plantGroupMembers, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUserId, getDbUserId } from '@/lib/auth/helpers';
import { revalidateGroupPaths, createSuccessResponse, createSuccessResponseNoData, createErrorResponse } from '@/lib/utils/server-helpers';
import { checkGroupMembership as checkGroupMembershipAuth, checkGroupAdmin as checkGroupAdminAuth } from '@/lib/auth/group-auth';

// ============================================
// HELPER FUNCTIONS
// ============================================

async function checkGroupAdmin(groupId: string, clerkUserId: string) {
  const isAdmin = await checkGroupAdminAuth(groupId, clerkUserId);
  return { isAdmin, membership: null };
}

async function checkGroupMember(groupId: string, clerkUserId: string) {
  const membership = await checkGroupMembershipAuth(groupId, clerkUserId);
  return { isMember: !!membership, membership };
}

// ============================================
// CREATE PLANT GROUP
// ============================================

export async function createPlantGroup(name: string, description?: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Create Clerk organization
    const clerk = await clerkClient();
    const organization = await clerk.organizations.createOrganization({
      name,
      createdBy: clerkUserId,
      publicMetadata: {
        description: description || '',
      },
      maxAllowedMemberships: 5, // Free plan limit
    });

    // Create local database record (webhook may also create it, but this is faster for UX)
    try {
      await db.insert(plantGroups).values({
        clerkOrgId: organization.id,
        name: organization.name,
        description: description || null,
        createdByUserId: dbUserId,
        memberCount: 0, // Will be incremented to 1 by organizationMembership.created webhook
      });
    } catch (error: any) {
      // Ignore duplicate errors - webhook may have already created it
      if (error.code !== '23505') {
        throw error;
      }
    }

    revalidateGroupPaths();

    return createSuccessResponse({ id: organization.id, name: organization.name });
  } catch (error) {
    console.error('Error creating plant group:', error);
    return createErrorResponse(error, 'Failed to create plant group');
  }
}

// ============================================
// GET MY PLANT GROUPS
// ============================================

export async function getMyPlantGroups() {
  try {
    const clerkUserId = await getUserId();

    // Get user's organizations from Clerk
    const clerk = await clerkClient();
    const memberships = await clerk.users.getOrganizationMembershipList({
      userId: clerkUserId,
    });

    // Enrich with local database data
    const groupsWithData = await Promise.all(
      memberships.data.map(async (membership) => {
        const localGroup = await db.query.plantGroups.findFirst({
          where: eq(plantGroups.clerkOrgId, membership.organization.id),
        });

        return {
          id: membership.organization.id,
          name: membership.organization.name,
          description: localGroup?.description || null,
          role: membership.role === 'org:admin' ? 'admin' : 'member',
          memberCount: localGroup?.memberCount || 0,
          createdAt: localGroup?.createdAt || new Date(),
        };
      })
    );

    return {
      success: true,
      data: groupsWithData,
    };
  } catch (error) {
    console.error('Error fetching plant groups:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch plant groups',
    };
  }
}

// ============================================
// GET PLANT GROUP
// ============================================

export async function getPlantGroup(groupId: string) {
  try {
    const clerkUserId = await getUserId();

    // Check membership
    const { isMember } = await checkGroupMember(groupId, clerkUserId);
    if (!isMember) {
      return {
        success: false,
        error: 'You are not a member of this group',
      };
    }

    // Get local group data
    const group = await db.query.plantGroups.findFirst({
      where: eq(plantGroups.clerkOrgId, groupId),
      with: {
        createdBy: true,
      },
    });

    if (!group) {
      return {
        success: false,
        error: 'Group not found',
      };
    }

    // Get organization from Clerk for latest data
    const clerk = await clerkClient();
    const organization = await clerk.organizations.getOrganization({
      organizationId: groupId,
    });

    return {
      success: true,
      data: {
        ...group,
        name: organization.name,
      },
    };
  } catch (error) {
    console.error('Error fetching plant group:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch plant group',
    };
  }
}

// ============================================
// UPDATE PLANT GROUP
// ============================================

export async function updatePlantGroup(groupId: string, name: string, description?: string) {
  try {
    const clerkUserId = await getUserId();

    // Check admin
    const { isAdmin } = await checkGroupAdmin(groupId, clerkUserId);
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only admins can update the group',
      };
    }

    // Update Clerk organization
    const clerk = await clerkClient();
    await clerk.organizations.updateOrganization(groupId, {
      name,
      publicMetadata: {
        description: description || '',
      },
    });

    // Update local database
    await db
      .update(plantGroups)
      .set({
        name,
        description: description || null,
        updatedAt: new Date(),
      })
      .where(eq(plantGroups.clerkOrgId, groupId));

    revalidateGroupPaths(groupId);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error updating plant group:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update plant group',
    };
  }
}

// ============================================
// DELETE PLANT GROUP
// ============================================

export async function deletePlantGroup(groupId: string) {
  try {
    const clerkUserId = await getUserId();

    // Check admin
    const { isAdmin } = await checkGroupAdmin(groupId, clerkUserId);
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only admins can delete the group',
      };
    }

    // Delete Clerk organization (webhook will handle local database)
    const clerk = await clerkClient();
    await clerk.organizations.deleteOrganization(groupId);

    revalidateGroupPaths();

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting plant group:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete plant group',
    };
  }
}

// ============================================
// GET GROUP MEMBERS
// ============================================

export async function getGroupMembers(groupId: string) {
  try {
    const clerkUserId = await getUserId();

    // Check membership
    const { isMember } = await checkGroupMember(groupId, clerkUserId);
    if (!isMember) {
      return {
        success: false,
        error: 'You are not a member of this group',
      };
    }

    // Get members from Clerk
    const clerk = await clerkClient();
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: groupId,
    });

    // Enrich with local user data
    const membersWithData = await Promise.all(
      memberships.data.map(async (membership) => {
        if (!membership.publicUserData) {
          return null;
        }

        const localUser = await db.query.users.findFirst({
          where: eq(users.clerkUserId, membership.publicUserData.userId),
        });

        return {
          id: membership.id,
          userId: membership.publicUserData.userId,
          email: membership.publicUserData.identifier,
          firstName: membership.publicUserData.firstName,
          lastName: membership.publicUserData.lastName,
          imageUrl: membership.publicUserData.imageUrl,
          role: membership.role === 'org:admin' ? 'admin' : 'member',
          joinedAt: localUser ? localUser.createdAt : new Date(),
        };
      })
    ).then((members) => members.filter((m) => m !== null));

    return {
      success: true,
      data: membersWithData,
    };
  } catch (error) {
    console.error('Error fetching group members:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch group members',
    };
  }
}

// ============================================
// INVITE MEMBER TO GROUP
// ============================================

export async function inviteMemberToGroup(groupId: string, email: string) {
  try {
    const clerkUserId = await getUserId();

    // Check admin
    const { isAdmin } = await checkGroupAdmin(groupId, clerkUserId);
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only admins can invite members',
      };
    }

    // Check member count
    const group = await db.query.plantGroups.findFirst({
      where: eq(plantGroups.clerkOrgId, groupId),
    });

    if (group && group.memberCount >= 5) {
      return {
        success: false,
        error: 'Group is full (maximum 5 members)',
      };
    }

    // Create invitation in Clerk
    const clerk = await clerkClient();
    await clerk.organizations.createOrganizationInvitation({
      organizationId: groupId,
      inviterUserId: clerkUserId,
      emailAddress: email,
      role: 'org:member',
    });

    revalidateGroupPaths(groupId);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error inviting member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to invite member',
    };
  }
}

// ============================================
// GET PENDING INVITATIONS
// ============================================

export async function getPendingInvitations(groupId: string) {
  try {
    const clerkUserId = await getUserId();

    // Check admin
    const { isAdmin } = await checkGroupAdmin(groupId, clerkUserId);
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only admins can view invitations',
      };
    }

    // Get invitations from Clerk
    const clerk = await clerkClient();
    const invitations = await clerk.organizations.getOrganizationInvitationList({
      organizationId: groupId,
      status: ['pending'],
    });

    return {
      success: true,
      data: invitations.data.map((inv) => ({
        id: inv.id,
        email: inv.emailAddress,
        role: inv.role,
        createdAt: inv.createdAt,
        status: inv.status,
      })),
    };
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invitations',
    };
  }
}

// ============================================
// REVOKE INVITATION
// ============================================

export async function revokeInvitation(groupId: string, invitationId: string) {
  try {
    const clerkUserId = await getUserId();

    // Check admin
    const { isAdmin } = await checkGroupAdmin(groupId, clerkUserId);
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only admins can revoke invitations',
      };
    }

    // Revoke invitation in Clerk
    const clerk = await clerkClient();
    await clerk.organizations.revokeOrganizationInvitation({
      organizationId: groupId,
      invitationId,
      requestingUserId: clerkUserId,
    });

    revalidateGroupPaths(groupId);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke invitation',
    };
  }
}

// ============================================
// REMOVE MEMBER
// ============================================

export async function removeMember(groupId: string, memberUserId: string) {
  try {
    const clerkUserId = await getUserId();

    // Check admin
    const { isAdmin } = await checkGroupAdmin(groupId, clerkUserId);
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only admins can remove members',
      };
    }

    // Cannot remove yourself
    if (memberUserId === clerkUserId) {
      return {
        success: false,
        error: 'Cannot remove yourself. Use "Leave Group" instead.',
      };
    }

    // Get memberships to find the membership ID
    const clerk = await clerkClient();
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: groupId,
    });

    const membershipToRemove = memberships.data.find(
      (m) => m.publicUserData?.userId === memberUserId
    );

    if (!membershipToRemove) {
      return {
        success: false,
        error: 'Member not found',
      };
    }

    // Delete membership in Clerk (webhook will handle local database)
    await clerk.organizations.deleteOrganizationMembership({
      organizationId: groupId,
      userId: memberUserId,
    });

    revalidateGroupPaths(groupId);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error removing member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove member',
    };
  }
}

// ============================================
// LEAVE GROUP
// ============================================

export async function leaveGroup(groupId: string) {
  try {
    const clerkUserId = await getUserId();

    // Check if admin
    const { isAdmin } = await checkGroupAdmin(groupId, clerkUserId);
    const clerk = await clerkClient();

    if (isAdmin) {
      // Check if this is the last admin
      const memberships = await clerk.organizations.getOrganizationMembershipList({
        organizationId: groupId,
      });

      const adminCount = memberships.data.filter((m) => m.role === 'org:admin').length;

      if (adminCount === 1) {
        return {
          success: false,
          error: 'You are the last admin. Please delete the group or promote another member to admin first.',
        };
      }
    }

    // Delete membership in Clerk
    await clerk.organizations.deleteOrganizationMembership({
      organizationId: groupId,
      userId: clerkUserId,
    });

    revalidateGroupPaths();

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error leaving group:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to leave group',
    };
  }
}
