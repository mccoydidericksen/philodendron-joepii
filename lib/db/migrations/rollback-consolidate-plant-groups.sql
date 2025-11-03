-- Rollback Migration: Revert Plant Group Consolidation
-- This migration removes the single-group constraint

-- Step 1: Remove the unique constraint
ALTER TABLE plant_group_members
DROP CONSTRAINT IF EXISTS unique_user_one_group;

-- Step 2: Drop the index
DROP INDEX IF EXISTS idx_plant_group_members_user_id;

-- Note: We cannot restore deleted memberships or revert plant group assignments
-- Those changes would need to be manually reconstructed from backups if needed
