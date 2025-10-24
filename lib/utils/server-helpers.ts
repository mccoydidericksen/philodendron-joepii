import { revalidatePath } from 'next/cache';

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T) {
  return { success: true as const, data };
}

/**
 * Create a standardized success response without data
 */
export function createSuccessResponseNoData() {
  return { success: true as const };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: unknown, fallback = 'Operation failed') {
  return {
    success: false as const,
    error: error instanceof Error ? error.message : fallback,
  };
}

/**
 * Revalidate common paths used throughout the app
 * Always revalidates /dashboard and /plants, plus any additional paths provided
 */
export function revalidateCommonPaths(...extraPaths: string[]) {
  revalidatePath('/dashboard');
  revalidatePath('/plants');
  extraPaths.forEach(path => revalidatePath(path));
}

/**
 * Revalidate plant-specific paths
 */
export function revalidatePlantPaths(plantId: string) {
  revalidatePath('/dashboard');
  revalidatePath('/plants');
  revalidatePath(`/plants/${plantId}`);
}

/**
 * Revalidate group-specific paths
 */
export function revalidateGroupPaths(groupId?: string) {
  revalidatePath('/dashboard');
  revalidatePath('/groups');
  if (groupId) {
    revalidatePath(`/groups/${groupId}`);
  }
}
