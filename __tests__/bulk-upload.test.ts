import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { BulkUploadResult } from '@/app/actions/bulk-plants';

// Mock modules before imports
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      plants: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/utils/auto-task-generator', () => ({
  createDefaultTasksForPlant: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { bulkUploadPlants } from '@/app/actions/bulk-plants';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { createDefaultTasksForPlant } from '@/lib/utils/auto-task-generator';

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockDb = db as any;
const mockCreateTasks = createDefaultTasksForPlant as ReturnType<typeof vi.fn>;

describe('Bulk Plant Upload', () => {
  const testUserId = 'test-user-123';
  const testDbUserId = 'db-user-uuid';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth to return test user
    mockAuth.mockResolvedValue({ userId: testUserId });

    // Mock user lookup
    mockDb.query.users.findFirst.mockResolvedValue({
      id: testDbUserId,
      clerkUserId: testUserId,
      email: 'test@example.com',
    });

    // Mock task creation
    mockCreateTasks.mockResolvedValue(undefined);
  });

  // Helper to create FormData with CSV file
  function createFormDataWithCSV(csvContent: string): FormData {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const file = new File([blob], 'test.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', file);
    return formData;
  }

  // Helper to load sample CSV
  function loadSampleCSV(): string {
    return readFileSync(join(__dirname, 'fixtures', 'sample-bulk-upload.csv'), 'utf-8');
  }

  it('should correctly map snake_case CSV fields to camelCase DB fields', async () => {
    mockDb.query.plants.findMany.mockResolvedValue([]);

    const capturedInserts: any[] = [];
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockImplementation((vals: any) => {
        capturedInserts.push(...vals);
        return {
          returning: vi.fn().mockResolvedValue(
            vals.map((v: any, i: number) => ({
              ...v,
              id: `plant-${i}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))
          ),
        };
      }),
    });

    const csvContent = loadSampleCSV();
    const formData = createFormDataWithCSV(csvContent);

    const result = await bulkUploadPlants(formData);

    expect(result.success).toBe(true);
    expect(capturedInserts.length).toBeGreaterThan(0);

    // Check first plant has properly mapped fields
    const firstPlant = capturedInserts[0];
    expect(firstPlant).toHaveProperty('speciesType');
    expect(firstPlant).toHaveProperty('speciesName');
    expect(firstPlant).toHaveProperty('dateAcquired');
    expect(firstPlant).toHaveProperty('potSize');
    expect(firstPlant).toHaveProperty('hasDrainage');

    // Verify no snake_case fields leaked through
    expect(firstPlant).not.toHaveProperty('species_type');
    expect(firstPlant).not.toHaveProperty('species_name');
    expect(firstPlant).not.toHaveProperty('date_acquired');
  });

  it('should batch insert 20 new plants in a single query', async () => {
    mockDb.query.plants.findMany.mockResolvedValue([]);

    let batchSize = 0;
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockImplementation((vals: any) => {
        batchSize = vals.length;
        return {
          returning: vi.fn().mockResolvedValue(
            vals.map((v: any, i: number) => ({
              ...v,
              id: `plant-${i}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))
          ),
        };
      }),
    });

    const csvContent = loadSampleCSV();
    const formData = createFormDataWithCSV(csvContent);

    const result = await bulkUploadPlants(formData);

    expect(result.success).toBe(true);
    expect(result.stats?.successfulInserts).toBe(20);
    expect(batchSize).toBe(20); // All 20 plants inserted in single batch
    expect(mockDb.insert).toHaveBeenCalledTimes(1); // Only one batch insert call
  });

  it('should detect and update existing plants from database', async () => {
    // Mock 5 existing plants
    mockDb.query.plants.findMany.mockResolvedValue([
      {
        id: 'existing-1',
        name: 'Shallan',
        speciesType: 'Philodendron',
        location: 'Living Room',
        dateAcquired: new Date('2023-04-28'),
        userId: testDbUserId,
        createdByUserId: testDbUserId,
        createdAt: new Date('2023-04-28'),
      },
      {
        id: 'existing-2',
        name: 'Circe',
        speciesType: 'Alocasia',
        location: 'Living Room',
        dateAcquired: new Date('2025-10-24'),
        userId: testDbUserId,
        createdByUserId: testDbUserId,
        createdAt: new Date('2025-10-24'),
      },
      {
        id: 'existing-3',
        name: 'Nightblood',
        speciesType: 'Philodendron',
        location: 'Living Room',
        dateAcquired: new Date('2025-10-24'),
        userId: testDbUserId,
        createdByUserId: testDbUserId,
        createdAt: new Date('2025-10-24'),
      },
      {
        id: 'existing-4',
        name: 'Victor Vale',
        speciesType: 'Philodendron',
        location: 'Office',
        dateAcquired: new Date('2025-10-24'),
        userId: testDbUserId,
        createdByUserId: testDbUserId,
        createdAt: new Date('2025-10-24'),
      },
      {
        id: 'existing-5',
        name: 'Sazed',
        speciesType: 'Anthurium',
        location: 'Bedroom',
        dateAcquired: new Date('2025-10-24'),
        userId: testDbUserId,
        createdByUserId: testDbUserId,
        createdAt: new Date('2025-10-24'),
      },
    ]);

    let insertCount = 0;
    let updateCount = 0;

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockImplementation((vals: any) => {
        insertCount = vals.length;
        return {
          returning: vi.fn().mockResolvedValue(
            vals.map((v: any, i: number) => ({
              ...v,
              id: `plant-new-${i}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))
          ),
        };
      }),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockImplementation(() => {
            updateCount++;
            return Promise.resolve([
              {
                id: `existing-${updateCount}`,
                name: 'Updated Plant',
                updatedAt: new Date(),
              },
            ]);
          }),
        }),
      }),
    });

    const csvContent = loadSampleCSV();
    const formData = createFormDataWithCSV(csvContent);

    const result = await bulkUploadPlants(formData);

    expect(result.success).toBe(true);
    expect(result.stats?.successfulInserts).toBe(15); // 20 - 5 existing
    expect(result.stats?.updatedPlants).toBe(5); // 5 existing updated
    expect(insertCount).toBe(15);
    expect(updateCount).toBe(5);
  });

  it('should detect and skip intra-CSV duplicates', async () => {
    mockDb.query.plants.findMany.mockResolvedValue([]);

    // CSV with duplicate row
    const csvWithDuplicate = `name,species_type,species_name,location,date_acquired
Test Plant,Philodendron,Pink Princess,Living Room,2024-01-01
Test Plant,Philodendron,Pink Princess,Living Room,2024-01-01`;

    let batchSize = 0;
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockImplementation((vals: any) => {
        batchSize = vals.length;
        return {
          returning: vi.fn().mockResolvedValue(
            vals.map((v: any, i: number) => ({
              ...v,
              id: `plant-${i}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))
          ),
        };
      }),
    });

    const formData = createFormDataWithCSV(csvWithDuplicate);
    const result = await bulkUploadPlants(formData);

    expect(result.success).toBe(true);
    expect(result.stats?.successfulInserts).toBe(1); // Only one inserted
    expect(result.stats?.duplicatesSkipped).toBe(1); // One duplicate skipped
    expect(batchSize).toBe(1); // Only 1 plant in batch
  });

  it('should perform case-insensitive duplicate matching', async () => {
    // Mock existing plant with mixed case
    mockDb.query.plants.findMany.mockResolvedValue([
      {
        id: 'existing-1',
        name: 'SHALLAN',
        speciesType: 'PHILODENDRON',
        location: 'LIVING ROOM',
        dateAcquired: new Date('2023-04-28'),
        userId: testDbUserId,
        createdByUserId: testDbUserId,
        createdAt: new Date('2023-04-28'),
      },
    ]);

    let updateCalled = false;
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockImplementation(() => {
            updateCalled = true;
            return Promise.resolve([
              {
                id: 'existing-1',
                name: 'shallan',
                updatedAt: new Date(),
              },
            ]);
          }),
        }),
      }),
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockImplementation(() => ({
        returning: vi.fn().mockResolvedValue([]),
      })),
    });

    // CSV with lowercase version
    const csvContent = `name,species_type,species_name,location,date_acquired
shallan,philodendron,Pink Princess,living room,2024-01-01`;

    const formData = createFormDataWithCSV(csvContent);
    const result = await bulkUploadPlants(formData);

    expect(result.success).toBe(true);
    expect(updateCalled).toBe(true); // Should trigger update, not insert
    expect(result.stats?.updatedPlants).toBe(1);
    expect(result.stats?.successfulInserts).toBe(0);
  });

  it('should report accurate statistics for mixed operations', async () => {
    // Mock 2 existing plants
    mockDb.query.plants.findMany.mockResolvedValue([
      {
        id: 'existing-1',
        name: 'Shallan',
        speciesType: 'Philodendron',
        location: 'Living Room',
        dateAcquired: new Date(),
        userId: testDbUserId,
        createdByUserId: testDbUserId,
        createdAt: new Date(),
      },
      {
        id: 'existing-2',
        name: 'Circe',
        speciesType: 'Alocasia',
        location: 'Living Room',
        dateAcquired: new Date(),
        userId: testDbUserId,
        createdByUserId: testDbUserId,
        createdAt: new Date(),
      },
    ]);

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockImplementation((vals: any) => ({
        returning: vi.fn().mockResolvedValue(
          vals.map((v: any, i: number) => ({
            ...v,
            id: `plant-new-${i}`,
          }))
        ),
      })),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'updated' }]),
        }),
      }),
    });

    // CSV: 3 new + 2 existing + 1 duplicate
    const csvContent = `name,species_type,species_name,location,date_acquired
Shallan,Philodendron,Pink Princess,Living Room,2024-01-01
Circe,Alocasia,Giant Elephant Ear,Living Room,2024-01-01
New Plant 1,Monstera,Deliciosa,Kitchen,2024-01-01
New Plant 2,Pothos,Golden,Bedroom,2024-01-01
New Plant 3,Syngonium,Arrow,Office,2024-01-01
New Plant 1,Monstera,Deliciosa,Kitchen,2024-01-01`;

    const formData = createFormDataWithCSV(csvContent);
    const result = await bulkUploadPlants(formData);

    expect(result.success).toBe(true);
    expect(result.stats?.successfulInserts).toBe(3);
    expect(result.stats?.updatedPlants).toBe(2);
    expect(result.stats?.duplicatesSkipped).toBe(1);
    expect(result.stats?.totalRows).toBe(6);
  });

  it('should handle validation errors gracefully', async () => {
    mockDb.query.plants.findMany.mockResolvedValue([]);

    // Invalid CSV: missing required fields
    const invalidCSV = `name,species_type,species_name,location,date_acquired
Valid Plant,Philodendron,Pink Princess,Living Room,2024-01-01
,Monstera,Deliciosa,Kitchen,2024-01-01
Invalid Plant,,,,not-a-date`;

    const formData = createFormDataWithCSV(invalidCSV);
    const result = await bulkUploadPlants(formData);

    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.stats?.failedRows).toBeGreaterThan(0);
  });
});
