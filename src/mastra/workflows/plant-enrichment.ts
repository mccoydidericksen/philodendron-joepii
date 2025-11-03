import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// Input schema for the workflow
const enrichmentInputSchema = z.object({
  speciesType: z.string().describe("Plant species type (genus)"),
  speciesName: z.string().describe("Plant species name"),
});

// Output schema for enriched data
const enrichedDataSchema = z.object({
  lightLevel: z.enum(["low", "medium", "bright-indirect", "bright-direct"]).nullable(),
  humidityPreference: z.enum(["low", "medium", "high"]).nullable(),
  minTemperatureF: z.number().nullable(),
  maxTemperatureF: z.number().nullable(),
  growthRate: z.enum(["slow", "medium", "fast"]).nullable(),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]).nullable(),
  toxicity: z.string().nullable(),
  nativeRegion: z.string().nullable(),
  soilType: z.string().nullable(),
  commonNames: z.array(z.string()).nullable(),
});

// Step 1: Look up comprehensive plant information
const lookupPlantInfo = createStep({
  id: "lookup-plant-info",
  description: "Look up comprehensive plant care information using AI",

  inputSchema: enrichmentInputSchema,

  outputSchema: z.object({
    plantData: z.object({
      commonNames: z.array(z.string()),
      lightNeeds: z.string(),
      humidityNeeds: z.string(),
      temperatureRange: z.string(),
      growthRate: z.string(),
      careLevel: z.string(),
      toxicityInfo: z.string(),
      nativeRegion: z.string(),
      soilType: z.string(),
    }),
  }),

  execute: async ({ inputData }) => {
    const fullSpecies = `${inputData.speciesType} ${inputData.speciesName}`;

    const prompt = `You are a botanical expert. Provide comprehensive care information for the plant species: ${fullSpecies}

Return ONLY a JSON object with these exact fields (no markdown, no code blocks):
{
  "commonNames": ["list of common names"],
  "lightNeeds": "specific light requirements description",
  "humidityNeeds": "specific humidity needs description",
  "temperatureRange": "temperature range in Fahrenheit with numbers",
  "growthRate": "growth rate description",
  "careLevel": "beginner, intermediate, or advanced",
  "toxicityInfo": "toxicity information for pets and humans",
  "nativeRegion": "native region or origin",
  "soilType": "preferred soil type description"
}`;

    const result = await generateText({
      model: openai("gpt-5-mini"),
      prompt,
      temperature: 0.3,
    });

    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedText = result.text.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/```\n?/g, "");
      }

      const plantData = JSON.parse(cleanedText);
      return { plantData };
    } catch (error) {
      throw new Error("Failed to parse plant information from AI response");
    }
  },
});

// Step 2: Structure the data for database
const structureData = createStep({
  id: "structure-data",
  description: "Convert raw plant information into structured database format",

  inputSchema: z.object({
    plantData: z.object({
      commonNames: z.array(z.string()),
      lightNeeds: z.string(),
      humidityNeeds: z.string(),
      temperatureRange: z.string(),
      growthRate: z.string(),
      careLevel: z.string(),
      toxicityInfo: z.string(),
      nativeRegion: z.string(),
      soilType: z.string(),
    }),
  }),

  outputSchema: z.object({
    enrichedData: enrichedDataSchema,
    confidence: z.number(),
  }),

  execute: async ({ inputData }) => {
    const { plantData } = inputData;

    // Helper functions to map string descriptions to enum values
    function mapLightLevel(
      description: string
    ): "low" | "medium" | "bright-indirect" | "bright-direct" | null {
      const lower = description.toLowerCase();
      if (lower.includes("direct sun") || lower.includes("full sun")) return "bright-direct";
      if (lower.includes("bright") || lower.includes("indirect")) return "bright-indirect";
      if (lower.includes("medium") || lower.includes("moderate")) return "medium";
      if (lower.includes("low") || lower.includes("shade")) return "low";
      return "bright-indirect"; // Default for most houseplants
    }

    function mapHumidity(description: string): "low" | "medium" | "high" | null {
      const lower = description.toLowerCase();
      if (lower.includes("high") || lower.includes("tropical") || lower.includes("moist"))
        return "high";
      if (lower.includes("low") || lower.includes("dry") || lower.includes("arid")) return "low";
      return "medium";
    }

    function parseTemperatureRange(description: string): {
      min: number | null;
      max: number | null;
    } {
      // Extract numbers from string like "65-75°F" or "60 to 80 degrees"
      const numbers = description.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        return {
          min: parseInt(numbers[0]),
          max: parseInt(numbers[1]),
        };
      }
      // Default temperature range for most houseplants
      return { min: 60, max: 80 };
    }

    function mapGrowthRate(description: string): "slow" | "medium" | "fast" | null {
      const lower = description.toLowerCase();
      if (lower.includes("fast") || lower.includes("rapid") || lower.includes("quick"))
        return "fast";
      if (lower.includes("slow")) return "slow";
      return "medium";
    }

    function mapDifficulty(careLevel: string): "beginner" | "intermediate" | "advanced" | null {
      const lower = careLevel.toLowerCase();
      if (lower.includes("beginner") || lower.includes("easy") || lower.includes("simple"))
        return "beginner";
      if (
        lower.includes("advanced") ||
        lower.includes("difficult") ||
        lower.includes("expert")
      )
        return "advanced";
      return "intermediate";
    }

    // Map all fields
    const lightLevel = mapLightLevel(plantData.lightNeeds);
    const humidityPreference = mapHumidity(plantData.humidityNeeds);
    const tempRange = parseTemperatureRange(plantData.temperatureRange);
    const growthRate = mapGrowthRate(plantData.growthRate);
    const difficultyLevel = mapDifficulty(plantData.careLevel);

    return {
      enrichedData: {
        lightLevel,
        humidityPreference,
        minTemperatureF: tempRange.min,
        maxTemperatureF: tempRange.max,
        growthRate,
        difficultyLevel,
        toxicity: plantData.toxicityInfo || null,
        nativeRegion: plantData.nativeRegion || null,
        soilType: plantData.soilType || null,
        commonNames: plantData.commonNames.length > 0 ? plantData.commonNames : null,
      },
      confidence: 0.85, // High confidence for GPT-4 responses
    };
  },
});

// Create and export the workflow
export const plantEnrichmentWorkflow = createWorkflow({
  id: "plant-enrichment",
  inputSchema: enrichmentInputSchema,
  outputSchema: z.object({
    enrichedData: enrichedDataSchema,
    confidence: z.number(),
  }),
})
  .then(lookupPlantInfo)
  .then(structureData)
  .commit();
