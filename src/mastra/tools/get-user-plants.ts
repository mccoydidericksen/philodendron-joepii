import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/lib/db";
import { plants } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getUserContext } from "@/lib/ai/user-context";

export const getUserPlantsTool = createTool({
  id: "get-user-plants",
  description: "Fetches the current user's plant collection with care details. Use this to see what plants the user owns.",

  inputSchema: z.object({
    includeArchived: z.boolean().default(false).describe("Include archived plants"),
  }),

  outputSchema: z.object({
    plants: z.array(z.object({
      id: z.string(),
      name: z.string(),
      speciesType: z.string(),
      speciesName: z.string(),
      location: z.string(),
      lightLevel: z.string().nullable(),
      humidityPreference: z.string().nullable(),
      difficultyLevel: z.string().nullable(),
      toxicity: z.string().nullable(),
      lastWateredAt: z.string().nullable(),
      lastFertilizedAt: z.string().nullable(),
    })),
    count: z.number(),
  }),

  execute: async ({ context, runId }) => {
    // Get user from runtime context
    const userContext = getUserContext();

    if (!userContext) {
      throw new Error("User context not available");
    }

    const { userId, userGroupId } = userContext;

    // Fetch plants accessible to the user (personal + group)
    const whereConditions = userGroupId
      ? or(
          eq(plants.userId, userId),
          eq(plants.plantGroupId, userGroupId)
        )
      : eq(plants.userId, userId);

    const userPlants = await db.query.plants.findMany({
      where: and(
        whereConditions,
        context?.includeArchived ? undefined : eq(plants.isArchived, false)
      ),
      columns: {
        id: true,
        name: true,
        speciesType: true,
        speciesName: true,
        location: true,
        lightLevel: true,
        humidityPreference: true,
        difficultyLevel: true,
        toxicity: true,
        lastWateredAt: true,
        lastFertilizedAt: true,
      },
      orderBy: (plants, { desc }) => [desc(plants.createdAt)],
      limit: 20, // Limit to most recent 20 plants
    });

    return {
      plants: userPlants.map(plant => ({
        ...plant,
        lastWateredAt: plant.lastWateredAt?.toISOString() || null,
        lastFertilizedAt: plant.lastFertilizedAt?.toISOString() || null,
      })),
      count: userPlants.length,
    };
  },
});
