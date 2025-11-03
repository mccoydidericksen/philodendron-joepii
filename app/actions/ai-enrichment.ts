"use server";

import { mastra } from "@/src/mastra";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/server-helpers";

export async function enrichPlantData(speciesType: string, speciesName: string) {
  try {
    if (!speciesType || !speciesName) {
      return createErrorResponse(
        new Error("Missing species information"),
        "Please provide both species type and name"
      );
    }

    // Get workflow instance
    const workflow = mastra.getWorkflow("plantEnrichment");

    // Create workflow run and execute with input data
    const run = await workflow.createRunAsync();
    const result = await run.start({
      inputData: {
        speciesType: speciesType.trim(),
        speciesName: speciesName.trim(),
      },
    });

    // The result should contain the final output from the workflow
    if (result?.status === "success" && result.result) {
      const output = result.result as { enrichedData: any; confidence: number };
      return createSuccessResponse({
        enrichedData: output.enrichedData,
        confidence: output.confidence || 0.85,
      });
    }

    return createErrorResponse(
      new Error("Workflow failed"),
      "Failed to enrich plant data. Please try again."
    );
  } catch (error) {
    return createErrorResponse(
      error,
      "Failed to enrich plant data. The species might not be recognized or there was a connection issue."
    );
  }
}
