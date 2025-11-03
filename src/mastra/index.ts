import { Mastra } from "@mastra/core";
import { plantCareAgent } from "./agents/plant-care-agent";
import { plantEnrichmentWorkflow } from "./workflows/plant-enrichment";

export const mastra = new Mastra({
  agents: { plantCareAgent },
  workflows: { plantEnrichment: plantEnrichmentWorkflow },
});
