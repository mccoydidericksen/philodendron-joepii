import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/lib/db";
import { plants } from "@/lib/db/schema";
import { eq, gte, or, isNull } from "drizzle-orm";

export const getPlantInfoTool = createTool({
  id: "get-plant-info",
  description: "Get detailed information about a specific plant including care history and upcoming tasks. Use when the user asks about a specific plant by name.",

  inputSchema: z.object({
    plantId: z.string().describe("The ID of the plant to get information about"),
  }),

  outputSchema: z.object({
    plant: z.object({
      name: z.string(),
      species: z.string(),
      location: z.string(),
      careRequirements: z.object({
        lightLevel: z.string().nullable(),
        humidity: z.string().nullable(),
        minTemp: z.number().nullable(),
        maxTemp: z.number().nullable(),
      }),
      lastCare: z.object({
        watered: z.string().nullable(),
        fertilized: z.string().nullable(),
        misted: z.string().nullable(),
      }),
      upcomingTasks: z.array(z.object({
        type: z.string(),
        title: z.string(),
        dueDate: z.string().nullable(),
      })),
    }).nullable(),
  }),

  execute: async ({ context, runId }) => {
    const plant = await db.query.plants.findFirst({
      where: eq(plants.id, context?.plantId),
      with: {
        careTasks: {
          where: (careTasks, { or, isNull, gte }) =>
            or(
              isNull(careTasks.nextDueDate),
              gte(careTasks.nextDueDate, new Date())
            ),
          limit: 5,
          orderBy: (careTasks, { asc }) => [asc(careTasks.nextDueDate)],
        },
      },
    });

    if (!plant) {
      return { plant: null };
    }

    return {
      plant: {
        name: plant.name,
        species: `${plant.speciesType} ${plant.speciesName}`,
        location: plant.location,
        careRequirements: {
          lightLevel: plant.lightLevel,
          humidity: plant.humidityPreference,
          minTemp: plant.minTemperatureF ? parseFloat(plant.minTemperatureF) : null,
          maxTemp: plant.maxTemperatureF ? parseFloat(plant.maxTemperatureF) : null,
        },
        lastCare: {
          watered: plant.lastWateredAt?.toISOString() || null,
          fertilized: plant.lastFertilizedAt?.toISOString() || null,
          misted: plant.lastMistedAt?.toISOString() || null,
        },
        upcomingTasks: plant.careTasks.map(task => ({
          type: task.type,
          title: task.title,
          dueDate: task.nextDueDate?.toISOString() || null,
        })),
      },
    };
  },
});
