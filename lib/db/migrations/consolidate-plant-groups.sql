-- Migration: Consolidate Plant Groups to Single Group Per User
-- This migration ensures each user can only be in one plant group
-- and auto-assigns all plants to their group if they're a member

-- Step 1: For users in multiple groups, keep only the most recent group membership
-- Delete older memberships
WITH user_group_rankings AS (
  SELECT
    id,
    user_id,
    plant_group_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY joined_at DESC) as rn
  FROM plant_group_members
)
DELETE FROM plant_group_members
WHERE id IN (
  SELECT id FROM user_group_rankings WHERE rn > 1
);

-- Step 2: Update member counts for groups after consolidation
UPDATE plant_groups
SET member_count = (
  SELECT COUNT(*)
  FROM plant_group_members
  WHERE plant_group_id = plant_groups.id
);

-- Step 3: Auto-assign all plants to their owner's group (if owner is in a group)
UPDATE plants
SET plant_group_id = (
  SELECT pgm.plant_group_id
  FROM plant_group_members pgm
  WHERE pgm.user_id = plants.user_id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM plant_group_members pgm
  WHERE pgm.user_id = plants.user_id
);

-- Step 4: Add unique constraint to prevent multiple group memberships per user
-- First, ensure we don't have any duplicates (should be handled by Step 1)
ALTER TABLE plant_group_members
ADD CONSTRAINT unique_user_one_group UNIQUE (user_id);

-- Step 5: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_plant_group_members_user_id
ON plant_group_members(user_id);

-- Step 6: Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_user_one_group ON plant_group_members IS
'Ensures each user can only be a member of one plant group at a time';
