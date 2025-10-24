import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, plantGroups, plantGroupMembers } from '@/lib/db/schema';

export async function POST(req: Request) {
  // Get the Clerk webhook secret
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local');
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  // Handle the webhook event
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, created_at } = evt.data;

    const primaryEmail = email_addresses.find((email) => email.id === evt.data.primary_email_address_id);

    if (!primaryEmail) {
      return new Response('No primary email found', { status: 400 });
    }

    try {
      // Create user in database
      await db.insert(users).values({
        clerkUserId: id,
        email: primaryEmail.email_address,
        timezone: 'America/Los_Angeles', // Default timezone
        preferences: {},
      });

      console.log(`User ${id} synced to database`);
    } catch (error) {
      console.error('Error syncing user to database:', error);
      return new Response('Error syncing user', { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses } = evt.data;

    const primaryEmail = email_addresses.find((email) => email.id === evt.data.primary_email_address_id);

    if (primaryEmail) {
      try {
        // Update user email in database
        await db
          .update(users)
          .set({
            email: primaryEmail.email_address,
            updatedAt: new Date(),
          })
          .where(eq(users.clerkUserId, id));

        console.log(`User ${id} updated in database`);
      } catch (error) {
        console.error('Error updating user in database:', error);
        return new Response('Error updating user', { status: 500 });
      }
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    try {
      // Delete user from database (cascade will handle related data)
      await db.delete(users).where(eq(users.clerkUserId, id as string));

      console.log(`User ${id} deleted from database`);
    } catch (error) {
      console.error('Error deleting user from database:', error);
      return new Response('Error deleting user', { status: 500 });
    }
  }

  // ============================================
  // ORGANIZATION EVENTS
  // ============================================

  if (eventType === 'organization.created') {
    const { id, name, created_by } = evt.data;

    if (!created_by) {
      console.error('No creator ID provided for organization creation');
      return new Response('Creator ID missing', { status: 400 });
    }

    try {
      // Get the creator's database user ID
      const creator = await db.query.users.findFirst({
        where: eq(users.clerkUserId, created_by),
      });

      if (!creator) {
        console.error(`Creator user ${created_by} not found in database`);
        return new Response('Creator user not found', { status: 400 });
      }

      try {
        // Create plant group in database
        await db.insert(plantGroups).values({
          clerkOrgId: id,
          name: name,
          description: (evt.data as any).public_metadata?.description || null,
          createdByUserId: creator.id,
          memberCount: 0, // Will be incremented by organizationMembership.created webhook
        });

        console.log(`Plant group ${id} synced to database`);
      } catch (insertError: any) {
        // Ignore duplicate key errors (23505) - group may already exist from server action
        if (insertError.code === '23505') {
          console.log(`Plant group ${id} already exists (idempotent)`);
          return new Response('Webhook processed successfully', { status: 200 });
        }
        throw insertError;
      }
    } catch (error: any) {
      console.error('Error syncing plant group to database:', error);
      return new Response('Error syncing plant group', { status: 500 });
    }
  }

  if (eventType === 'organization.updated') {
    const { id, name } = evt.data;

    try {
      // Update plant group in database
      await db
        .update(plantGroups)
        .set({
          name: name,
          description: (evt.data as any).public_metadata?.description || null,
          updatedAt: new Date(),
        })
        .where(eq(plantGroups.clerkOrgId, id));

      console.log(`Plant group ${id} updated in database`);
    } catch (error) {
      console.error('Error updating plant group in database:', error);
      return new Response('Error updating plant group', { status: 500 });
    }
  }

  if (eventType === 'organization.deleted') {
    const { id } = evt.data;

    try {
      // Delete plant group from database (cascade will handle members)
      await db.delete(plantGroups).where(eq(plantGroups.clerkOrgId, id as string));

      console.log(`Plant group ${id} deleted from database`);
    } catch (error) {
      console.error('Error deleting plant group from database:', error);
      return new Response('Error deleting plant group', { status: 500 });
    }
  }

  // ============================================
  // ORGANIZATION MEMBERSHIP EVENTS
  // ============================================

  if (eventType === 'organizationMembership.created') {
    const { id, organization, public_user_data, role } = evt.data;

    try {
      // Get the plant group
      const plantGroup = await db.query.plantGroups.findFirst({
        where: eq(plantGroups.clerkOrgId, organization.id),
      });

      if (!plantGroup) {
        console.error(`Plant group ${organization.id} not found`);
        return new Response('Plant group not found', { status: 400 });
      }

      // Get the user
      const user = await db.query.users.findFirst({
        where: eq(users.clerkUserId, public_user_data.user_id),
      });

      if (!user) {
        console.error(`User ${public_user_data.user_id} not found`);
        return new Response('User not found', { status: 400 });
      }

      // Map Clerk role to our role
      const memberRole = role === 'org:admin' ? 'admin' : 'member';

      try {
        // Create membership
        await db.insert(plantGroupMembers).values({
          plantGroupId: plantGroup.id,
          userId: user.id,
          clerkMembershipId: id,
          role: memberRole,
        });

        // Update member count
        await db
          .update(plantGroups)
          .set({
            memberCount: plantGroup.memberCount + 1,
            updatedAt: new Date(),
          })
          .where(eq(plantGroups.id, plantGroup.id));

        console.log(`Membership ${id} created for plant group ${organization.id}`);
      } catch (insertError: any) {
        // Ignore duplicate key errors (23505) - membership may already exist
        if (insertError.code === '23505') {
          console.log(`Membership ${id} already exists (idempotent)`);
          return new Response('Webhook processed successfully', { status: 200 });
        }
        throw insertError;
      }
    } catch (error: any) {
      console.error('Error creating membership:', error);
      return new Response('Error creating membership', { status: 500 });
    }
  }

  if (eventType === 'organizationMembership.deleted') {
    const { id, organization } = evt.data;

    try {
      // Get the plant group
      const plantGroup = await db.query.plantGroups.findFirst({
        where: eq(plantGroups.clerkOrgId, organization.id),
      });

      if (!plantGroup) {
        console.error(`Plant group ${organization.id} not found`);
        return new Response('Plant group not found', { status: 400 });
      }

      // Delete membership
      await db
        .delete(plantGroupMembers)
        .where(eq(plantGroupMembers.clerkMembershipId, id as string));

      // Update member count
      await db
        .update(plantGroups)
        .set({
          memberCount: Math.max(0, plantGroup.memberCount - 1),
          updatedAt: new Date(),
        })
        .where(eq(plantGroups.id, plantGroup.id));

      console.log(`Membership ${id} deleted for plant group ${organization.id}`);
    } catch (error) {
      console.error('Error deleting membership:', error);
      return new Response('Error deleting membership', { status: 500 });
    }
  }

  return new Response('Webhook processed successfully', { status: 200 });
}
