'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';
import { db } from '@/lib/db';
import { plantMedia, plants } from '@/lib/db/schema';
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

async function verifyPlantOwnership(plantId: string, userId: string) {
  const plant = await db.query.plants.findFirst({
    where: and(
      eq(plants.id, plantId),
      eq(plants.userId, userId)
    ),
  });

  if (!plant) {
    throw new Error('Plant not found or unauthorized');
  }

  return plant;
}

// ============================================
// UPLOAD PHOTO
// ============================================

export async function uploadPlantPhoto(plantId: string, formData: FormData) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify plant ownership
    await verifyPlantOwnership(plantId, dbUserId);

    // Check current photo count (limit to 20)
    const existingPhotos = await db
      .select()
      .from(plantMedia)
      .where(
        and(
          eq(plantMedia.plantId, plantId),
          eq(plantMedia.type, 'photo')
        )
      );

    if (existingPhotos.length >= 20) {
      return {
        success: false,
        error: 'Maximum of 20 photos per plant reached',
      };
    }

    const file = formData.get('file') as File;
    if (!file) {
      return {
        success: false,
        error: 'No file provided',
      };
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
      };
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size exceeds 5MB limit',
      };
    }

    // Upload to Vercel Blob
    const blob = await put(`plants/${plantId}/${Date.now()}-${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Get next order index
    const maxOrderIndex = existingPhotos.length > 0
      ? Math.max(...existingPhotos.map(p => p.orderIndex))
      : -1;

    // Check if this should be the primary photo (if it's the first one)
    const isPrimary = existingPhotos.length === 0;

    // Save metadata to database
    const [newMedia] = await db
      .insert(plantMedia)
      .values({
        plantId,
        userId: dbUserId,
        type: 'photo',
        url: blob.url,
        blobKey: blob.pathname,
        fileSize: file.size,
        mimeType: file.type,
        isPrimary,
        orderIndex: maxOrderIndex + 1,
      })
      .returning();

    // If this is the primary photo, update the plant's primaryPhotoUrl
    if (isPrimary) {
      await db
        .update(plants)
        .set({ primaryPhotoUrl: blob.url })
        .where(eq(plants.id, plantId));
    }

    revalidatePath(`/plants/${plantId}`);
    revalidatePath('/plants');

    return {
      success: true,
      data: newMedia,
    };
  } catch (error) {
    console.error('Error uploading photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload photo',
    };
  }
}

// ============================================
// DELETE PHOTO
// ============================================

export async function deletePlantPhoto(photoId: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Get photo details
    const photo = await db.query.plantMedia.findFirst({
      where: and(
        eq(plantMedia.id, photoId),
        eq(plantMedia.userId, dbUserId)
      ),
    });

    if (!photo) {
      return {
        success: false,
        error: 'Photo not found or unauthorized',
      };
    }

    // Delete from Vercel Blob
    try {
      await del(photo.blobKey);
    } catch (blobError) {
      console.error('Error deleting from Blob:', blobError);
      // Continue with DB deletion even if Blob deletion fails
    }

    // Delete from database
    await db
      .delete(plantMedia)
      .where(eq(plantMedia.id, photoId));

    // If this was the primary photo, set another photo as primary
    if (photo.isPrimary) {
      const remainingPhotos = await db.query.plantMedia.findMany({
        where: and(
          eq(plantMedia.plantId, photo.plantId),
          eq(plantMedia.type, 'photo')
        ),
        orderBy: [desc(plantMedia.orderIndex)],
        limit: 1,
      });

      if (remainingPhotos.length > 0) {
        const newPrimary = remainingPhotos[0];
        await db
          .update(plantMedia)
          .set({ isPrimary: true })
          .where(eq(plantMedia.id, newPrimary.id));

        await db
          .update(plants)
          .set({ primaryPhotoUrl: newPrimary.url })
          .where(eq(plants.id, photo.plantId));
      } else {
        // No photos left, clear primary photo
        await db
          .update(plants)
          .set({ primaryPhotoUrl: null })
          .where(eq(plants.id, photo.plantId));
      }
    }

    revalidatePath(`/plants/${photo.plantId}`);
    revalidatePath('/plants');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete photo',
    };
  }
}

// ============================================
// SET PRIMARY PHOTO
// ============================================

export async function setPrimaryPhoto(photoId: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Get photo details
    const photo = await db.query.plantMedia.findFirst({
      where: and(
        eq(plantMedia.id, photoId),
        eq(plantMedia.userId, dbUserId)
      ),
    });

    if (!photo) {
      return {
        success: false,
        error: 'Photo not found or unauthorized',
      };
    }

    // Unset current primary photo for this plant
    await db
      .update(plantMedia)
      .set({ isPrimary: false })
      .where(
        and(
          eq(plantMedia.plantId, photo.plantId),
          eq(plantMedia.isPrimary, true)
        )
      );

    // Set new primary photo
    await db
      .update(plantMedia)
      .set({ isPrimary: true })
      .where(eq(plantMedia.id, photoId));

    // Update plant's primaryPhotoUrl
    await db
      .update(plants)
      .set({ primaryPhotoUrl: photo.url })
      .where(eq(plants.id, photo.plantId));

    revalidatePath(`/plants/${photo.plantId}`);
    revalidatePath('/plants');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error setting primary photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set primary photo',
    };
  }
}

// ============================================
// REORDER PHOTOS
// ============================================

export async function reorderPhotos(plantId: string, photoIds: string[]) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify plant ownership
    await verifyPlantOwnership(plantId, dbUserId);

    // Update order index for each photo
    for (let i = 0; i < photoIds.length; i++) {
      await db
        .update(plantMedia)
        .set({ orderIndex: i })
        .where(
          and(
            eq(plantMedia.id, photoIds[i]),
            eq(plantMedia.plantId, plantId),
            eq(plantMedia.userId, dbUserId)
          )
        );
    }

    revalidatePath(`/plants/${plantId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error reordering photos:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder photos',
    };
  }
}
