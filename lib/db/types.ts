import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { users, plants, careTasks, taskCompletions, plantMedia, plantNotes, plantLinks, notifications, userNotificationPreferences, plantGroups, plantGroupMembers } from "./schema";

// ============================================
// USER TYPES
// ============================================

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// ============================================
// PLANT TYPES
// ============================================

export type Plant = InferSelectModel<typeof plants>;
export type NewPlant = InferInsertModel<typeof plants>;

// Plant with relations
export type PlantWithTasks = Plant & {
  careTasks: CareTask[];
};

export type PlantWithMedia = Plant & {
  media: PlantMedia[];
};

export type PlantWithNotes = Plant & {
  notes: PlantNote[];
};

export type PlantWithLinks = Plant & {
  links: PlantLink[];
};

export type PlantFull = Plant & {
  careTasks: CareTask[];
  media: PlantMedia[];
  notes: PlantNote[];
  links: PlantLink[];
};

// ============================================
// CARE TASK TYPES
// ============================================

export type CareTask = InferSelectModel<typeof careTasks>;
export type NewCareTask = InferInsertModel<typeof careTasks>;

// Task with relations
export type CareTaskWithPlant = CareTask & {
  plant: Plant;
};

export type CareTaskWithCompletions = CareTask & {
  completions: TaskCompletion[];
};

export type CareTaskFull = CareTask & {
  plant: Plant;
  completions: TaskCompletion[];
};

// ============================================
// TASK COMPLETION TYPES
// ============================================

export type TaskCompletion = InferSelectModel<typeof taskCompletions>;
export type NewTaskCompletion = InferInsertModel<typeof taskCompletions>;

// Completion with relations
export type TaskCompletionWithTask = TaskCompletion & {
  task: CareTask;
};

// ============================================
// ENUMS
// ============================================

export type CareTaskType =
  | "water"
  | "fertilize"
  | "water_fertilize"
  | "mist"
  | "repot_check"
  | "prune"
  | "rotate"
  | "custom";

export type RecurrenceUnit = "days" | "weeks" | "months";

export type RecurrencePattern = {
  frequency: number;
  unit: RecurrenceUnit;
  specificDays?: number[]; // For weekly: [0-6] where 0 = Sunday
};

// Task scheduling modes
export type TaskScheduleMode = "recurring" | "one-time" | "unscheduled";

// ============================================
// UTILITY TYPES
// ============================================

// Task filter types for the filtering requirement
export type TaskFilter = "all" | "pending" | "completed";

// Task status for UI display
export type TaskStatus = "overdue" | "due-soon" | "upcoming" | "completed";

// ============================================
// PLANT MEDIA TYPES
// ============================================

export type PlantMedia = InferSelectModel<typeof plantMedia>;
export type NewPlantMedia = InferInsertModel<typeof plantMedia>;

export type MediaType = "photo" | "video";

// ============================================
// PLANT NOTES TYPES
// ============================================

export type PlantNote = InferSelectModel<typeof plantNotes>;
export type NewPlantNote = InferInsertModel<typeof plantNotes>;

// ============================================
// PLANT LINKS TYPES
// ============================================

export type PlantLink = InferSelectModel<typeof plantLinks>;
export type NewPlantLink = InferInsertModel<typeof plantLinks>;

export type LinkType = "tiktok" | "youtube" | "article" | "instagram" | "other";

// ============================================
// NOTIFICATION TYPES
// ============================================

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;

// Notification with relations
export type NotificationWithTask = Notification & {
  task: CareTask & {
    plant: Plant;
  };
};

export type NotificationWithPlant = Notification & {
  plant: Plant;
};

export type NotificationType =
  | "task_due"
  | "task_overdue"
  | "task_completed"
  | "task_created"
  | "plant_needs_attention";

export type NotificationChannel = "in_app" | "sms" | "email";

// ============================================
// USER NOTIFICATION PREFERENCES TYPES
// ============================================

export type UserNotificationPreferences = InferSelectModel<typeof userNotificationPreferences>;
export type NewUserNotificationPreferences = InferInsertModel<typeof userNotificationPreferences>;

export type EmailDigestFrequency = "daily" | "weekly" | "never";

// ============================================
// PLANT ATTRIBUTE ENUMS
// ============================================

export type LightLevel = "low" | "medium" | "bright-indirect" | "bright-direct";
export type HumidityPreference = "low" | "medium" | "high";
export type GrowthStage = "seedling" | "juvenile" | "mature" | "flowering";
export type GrowthRate = "slow" | "medium" | "fast";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

// ============================================
// PLANT GROUP TYPES
// ============================================

export type PlantGroup = InferSelectModel<typeof plantGroups>;
export type NewPlantGroup = InferInsertModel<typeof plantGroups>;

export type PlantGroupMember = InferSelectModel<typeof plantGroupMembers>;
export type NewPlantGroupMember = InferInsertModel<typeof plantGroupMembers>;

export type PlantGroupRole = "admin" | "member";

// Plant group with relations
export type PlantGroupWithMembers = PlantGroup & {
  members: (PlantGroupMember & { user: User })[];
};

export type PlantGroupWithCreator = PlantGroup & {
  createdBy: User;
};

export type PlantGroupFull = PlantGroup & {
  createdBy: User;
  members: (PlantGroupMember & { user: User })[];
  plants: Plant[];
};
