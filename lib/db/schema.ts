import { pgTable, text, timestamp, boolean, jsonb, uuid, pgEnum, integer, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// USERS TABLE
// ============================================

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  timezone: text("timezone").default("America/Los_Angeles"),
  preferences: jsonb("preferences").$type<{
    emailNotifications?: boolean;
    theme?: "light" | "dark";
  }>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// PLANT ENUMS
// ============================================

export const lightLevelEnum = pgEnum("light_level", ["low", "medium", "bright-indirect", "bright-direct"]);
export const humidityPreferenceEnum = pgEnum("humidity_preference", ["low", "medium", "high"]);
export const growthStageEnum = pgEnum("growth_stage", ["seedling", "juvenile", "mature", "flowering"]);
export const growthRateEnum = pgEnum("growth_rate", ["slow", "medium", "fast"]);
export const difficultyLevelEnum = pgEnum("difficulty_level", ["beginner", "intermediate", "advanced"]);

// ============================================
// PLANTS TABLE
// ============================================

export const plants = pgTable("plants", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Core attributes
  name: text("name").notNull(),
  speciesType: text("species_type").notNull(),
  speciesName: text("species_name").notNull(),
  location: text("location").notNull(),
  dateAcquired: timestamp("date_acquired", { withTimezone: true }).notNull(),

  // Physical attributes
  potSize: text("pot_size"),
  potType: text("pot_type"),
  potColor: text("pot_color"),
  soilType: text("soil_type"),
  hasDrainage: boolean("has_drainage").default(true),
  currentHeightIn: decimal("current_height_in", { precision: 10, scale: 2 }),
  currentWidthIn: decimal("current_width_in", { precision: 10, scale: 2 }),

  // Care requirements
  lightLevel: lightLevelEnum("light_level"),
  humidityPreference: humidityPreferenceEnum("humidity_preference"),
  minTemperatureF: decimal("min_temperature_f", { precision: 5, scale: 2 }),
  maxTemperatureF: decimal("max_temperature_f", { precision: 5, scale: 2 }),
  fertilizerType: text("fertilizer_type"),
  growthStage: growthStageEnum("growth_stage"),

  // Additional info
  toxicity: text("toxicity"),
  nativeRegion: text("native_region"),
  growthRate: growthRateEnum("growth_rate"),
  difficultyLevel: difficultyLevelEnum("difficulty_level"),
  purchaseLocation: text("purchase_location"),
  purchasePriceCents: integer("purchase_price_cents"),
  parentPlantId: uuid("parent_plant_id").references((): any => plants.id),

  // Media
  primaryPhotoUrl: text("primary_photo_url"),

  // Last care dates (for auto-task generation and tracking)
  lastWateredAt: timestamp("last_watered_at", { withTimezone: true }),
  lastFertilizedAt: timestamp("last_fertilized_at", { withTimezone: true }),
  lastMistedAt: timestamp("last_misted_at", { withTimezone: true }),
  lastRepottedAt: timestamp("last_repotted_at", { withTimezone: true }),

  // Legacy field (kept for backward compatibility, use plant_notes table instead)
  notes: text("notes"),

  // Metadata for extensibility
  metadata: jsonb("metadata").$type<{
    [key: string]: any;
  }>().default({}),

  isArchived: boolean("is_archived").default(false).notNull(),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  favoritedAt: timestamp("favorited_at", { withTimezone: true }),

  // Group and assignment
  plantGroupId: uuid("plant_group_id").references((): any => plantGroups.id, { onDelete: "set null" }),
  assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),

  // Audit trail (createdByUserId nullable for migration, will be backfilled)
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "cascade" }),
  lastModifiedByUserId: uuid("last_modified_by_user_id").references(() => users.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// CARE TASK TYPE ENUM
// ============================================

export const careTaskTypeEnum = pgEnum("care_task_type", [
  "water",
  "fertilize",
  "water_fertilize",
  "mist",
  "repot_check",
  "prune",
  "rotate",
  "custom",
]);

// ============================================
// CARE TASKS TABLE
// ============================================

export const careTasks = pgTable("care_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  plantId: uuid("plant_id")
    .notNull()
    .references(() => plants.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: careTaskTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  // Recurrence pattern: { frequency: number, unit: 'days' | 'weeks' | 'months', specificDays?: number[] }
  recurrencePattern: jsonb("recurrence_pattern").$type<{
    frequency: number;
    unit: "days" | "weeks" | "months";
    specificDays?: number[]; // For weekly: [0-6] where 0 = Sunday
  }>(),
  nextDueDate: timestamp("next_due_date", { withTimezone: true }), // Nullable to support unscheduled tasks
  lastCompletedAt: timestamp("last_completed_at", { withTimezone: true }),

  // Assignment and audit trail (createdByUserId nullable for migration, will be backfilled)
  assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "cascade" }),
  lastModifiedByUserId: uuid("last_modified_by_user_id").references(() => users.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// TASK COMPLETIONS TABLE
// ============================================

export const taskCompletions = pgTable("task_completions", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => careTasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  skipped: boolean("skipped").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// PLANT MEDIA TABLE
// ============================================

export const mediaTypeEnum = pgEnum("media_type", ["photo", "video"]);

export const plantMedia = pgTable("plant_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  plantId: uuid("plant_id")
    .notNull()
    .references(() => plants.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: mediaTypeEnum("type").notNull(),
  url: text("url").notNull(), // Vercel Blob URL
  blobKey: text("blob_key").notNull(), // For deletion from Blob storage
  fileSize: integer("file_size"), // Bytes
  mimeType: text("mime_type"), // e.g., image/jpeg, video/mp4
  width: integer("width"), // Image/video dimensions
  height: integer("height"),
  duration: integer("duration"), // Video length in seconds
  caption: text("caption"),
  isPrimary: boolean("is_primary").default(false).notNull(),
  orderIndex: integer("order_index").default(0).notNull(),
  takenAt: timestamp("taken_at", { withTimezone: true }), // When photo was taken
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// PLANT NOTES TABLE
// ============================================

export const plantNotes = pgTable("plant_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  plantId: uuid("plant_id")
    .notNull()
    .references(() => plants.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(), // Markdown content
  contentHtml: text("content_html"), // Rendered HTML (cached)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// PLANT LINKS TABLE
// ============================================

export const linkTypeEnum = pgEnum("link_type", ["tiktok", "youtube", "article", "instagram", "other"]);

export const plantLinks = pgTable("plant_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  plantId: uuid("plant_id")
    .notNull()
    .references(() => plants.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"), // Open Graph image
  linkType: linkTypeEnum("link_type").default("other").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// NOTIFICATIONS TABLE
// ============================================

export const notificationTypeEnum = pgEnum("notification_type", [
  "task_due",
  "task_overdue",
  "task_completed",
  "task_created",
  "plant_needs_attention",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "sms",
  "email",
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => careTasks.id, { onDelete: "cascade" }),
  plantId: uuid("plant_id").references(() => plants.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  channel: notificationChannelEnum("channel").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type<{
    taskName?: string;
    plantName?: string;
    dueDate?: string;
    [key: string]: any;
  }>().default({}),
  read: boolean("read").default(false).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// USER NOTIFICATION PREFERENCES TABLE
// ============================================

export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  // SMS preferences
  phoneNumber: text("phone_number"), // E.164 format: +1234567890
  phoneVerified: boolean("phone_verified").default(false).notNull(),
  phoneVerificationCode: text("phone_verification_code"),
  phoneVerificationExpiry: timestamp("phone_verification_expiry", { withTimezone: true }),
  smsEnabled: boolean("sms_enabled").default(false).notNull(),
  smsOptInAt: timestamp("sms_opt_in_at", { withTimezone: true }),
  smsOptOutAt: timestamp("sms_opt_out_at", { withTimezone: true }),

  // Email preferences
  emailEnabled: boolean("email_enabled").default(true).notNull(),
  emailDigestFrequency: text("email_digest_frequency").default("daily"), // 'daily', 'weekly', 'never'

  // Notification timing
  quietHoursStart: integer("quiet_hours_start").default(21), // 21 = 9pm (0-23)
  quietHoursEnd: integer("quiet_hours_end").default(9), // 9 = 9am (0-23)

  // Notification types
  notifyTaskDue: boolean("notify_task_due").default(true).notNull(),
  notifyTaskOverdue: boolean("notify_task_overdue").default(true).notNull(),
  notifyTaskCompleted: boolean("notify_task_completed").default(false).notNull(),

  // Advance notice (in hours)
  advanceNoticeHours: integer("advance_notice_hours").default(24).notNull(), // Notify 24 hours before

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ one, many }) => ({
  plants: many(plants, { relationName: "userPlants" }),
  careTasks: many(careTasks, { relationName: "userCareTasks" }),
  taskCompletions: many(taskCompletions),
  plantMedia: many(plantMedia),
  plantNotes: many(plantNotes),
  plantLinks: many(plantLinks),
  notifications: many(notifications),
  notificationPreferences: one(userNotificationPreferences),
  plantGroupMemberships: many(plantGroupMembers),
  createdPlantGroups: many(plantGroups),
  assignedPlants: many(plants, { relationName: "assignedPlants" }),
  createdPlants: many(plants, { relationName: "createdPlants" }),
  lastModifiedPlants: many(plants, { relationName: "lastModifiedPlants" }),
  assignedCareTasks: many(careTasks, { relationName: "assignedCareTasks" }),
  createdCareTasks: many(careTasks, { relationName: "createdCareTasks" }),
  lastModifiedCareTasks: many(careTasks, { relationName: "lastModifiedCareTasks" }),
}));

export const plantsRelations = relations(plants, ({ one, many }) => ({
  user: one(users, {
    fields: [plants.userId],
    references: [users.id],
    relationName: "userPlants",
  }),
  parentPlant: one(plants, {
    fields: [plants.parentPlantId],
    references: [plants.id],
  }),
  plantGroup: one(plantGroups, {
    fields: [plants.plantGroupId],
    references: [plantGroups.id],
  }),
  assignedUser: one(users, {
    fields: [plants.assignedUserId],
    references: [users.id],
    relationName: "assignedPlants",
  }),
  createdBy: one(users, {
    fields: [plants.createdByUserId],
    references: [users.id],
    relationName: "createdPlants",
  }),
  lastModifiedBy: one(users, {
    fields: [plants.lastModifiedByUserId],
    references: [users.id],
    relationName: "lastModifiedPlants",
  }),
  careTasks: many(careTasks),
  media: many(plantMedia),
  notes: many(plantNotes),
  links: many(plantLinks),
  notifications: many(notifications),
}));

export const careTasksRelations = relations(careTasks, ({ one, many }) => ({
  plant: one(plants, {
    fields: [careTasks.plantId],
    references: [plants.id],
  }),
  user: one(users, {
    fields: [careTasks.userId],
    references: [users.id],
    relationName: "userCareTasks",
  }),
  assignedUser: one(users, {
    fields: [careTasks.assignedUserId],
    references: [users.id],
    relationName: "assignedCareTasks",
  }),
  createdBy: one(users, {
    fields: [careTasks.createdByUserId],
    references: [users.id],
    relationName: "createdCareTasks",
  }),
  lastModifiedBy: one(users, {
    fields: [careTasks.lastModifiedByUserId],
    references: [users.id],
    relationName: "lastModifiedCareTasks",
  }),
  completions: many(taskCompletions),
  notifications: many(notifications),
}));

export const taskCompletionsRelations = relations(taskCompletions, ({ one }) => ({
  task: one(careTasks, {
    fields: [taskCompletions.taskId],
    references: [careTasks.id],
  }),
  user: one(users, {
    fields: [taskCompletions.userId],
    references: [users.id],
  }),
}));

export const plantMediaRelations = relations(plantMedia, ({ one }) => ({
  plant: one(plants, {
    fields: [plantMedia.plantId],
    references: [plants.id],
  }),
  user: one(users, {
    fields: [plantMedia.userId],
    references: [users.id],
  }),
}));

export const plantNotesRelations = relations(plantNotes, ({ one }) => ({
  plant: one(plants, {
    fields: [plantNotes.plantId],
    references: [plants.id],
  }),
  user: one(users, {
    fields: [plantNotes.userId],
    references: [users.id],
  }),
}));

export const plantLinksRelations = relations(plantLinks, ({ one }) => ({
  plant: one(plants, {
    fields: [plantLinks.plantId],
    references: [plants.id],
  }),
  user: one(users, {
    fields: [plantLinks.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  task: one(careTasks, {
    fields: [notifications.taskId],
    references: [careTasks.id],
  }),
  plant: one(plants, {
    fields: [notifications.plantId],
    references: [plants.id],
  }),
}));

export const userNotificationPreferencesRelations = relations(userNotificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userNotificationPreferences.userId],
    references: [users.id],
  }),
}));

// ============================================
// PLANT GROUPS TABLE
// ============================================

export const plantGroupRoleEnum = pgEnum("plant_group_role", ["admin", "member"]);

export const plantGroups = pgTable("plant_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkOrgId: text("clerk_org_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  memberCount: integer("member_count").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// PLANT GROUP MEMBERS TABLE
// ============================================

export const plantGroupMembers = pgTable("plant_group_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  plantGroupId: uuid("plant_group_id")
    .notNull()
    .references(() => plantGroups.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clerkMembershipId: text("clerk_membership_id").notNull(),
  role: plantGroupRoleEnum("role").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueMembership: { columns: [table.plantGroupId, table.userId], name: "unique_plant_group_membership" }
}));

// ============================================
// PLANT GROUPS RELATIONS
// ============================================

export const plantGroupsRelations = relations(plantGroups, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [plantGroups.createdByUserId],
    references: [users.id],
  }),
  members: many(plantGroupMembers),
  plants: many(plants),
}));

export const plantGroupMembersRelations = relations(plantGroupMembers, ({ one }) => ({
  plantGroup: one(plantGroups, {
    fields: [plantGroupMembers.plantGroupId],
    references: [plantGroups.id],
  }),
  user: one(users, {
    fields: [plantGroupMembers.userId],
    references: [users.id],
  }),
}));
