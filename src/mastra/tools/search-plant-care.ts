import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// This tool provides general plant care knowledge
// In production, this could connect to a RAG system or vector database

export const searchPlantCareTool = createTool({
  id: "search-plant-care",
  description: "Search general plant care knowledge and best practices. Use this for general questions about watering, light, fertilizing, pests, diseases, or other plant care topics.",

  inputSchema: z.object({
    query: z.string().describe("The plant care question or topic to search"),
    plantType: z.string().optional().describe("Specific plant type if relevant (e.g., 'tropical', 'succulent', 'fern')"),
  }),

  outputSchema: z.object({
    information: z.string().describe("Relevant plant care information"),
    tips: z.array(z.string()).optional().describe("Additional helpful tips"),
  }),

  execute: async ({ context }) => {
    // Knowledge base of common plant care topics
    const knowledgeBase: Record<string, { info: string; tips: string[] }> = {
      watering: {
        info: "Most houseplants prefer soil that is moist but not waterlogged. The general rule is to water when the top 1-2 inches of soil feels dry to the touch. Overwatering is the #1 cause of houseplant death, as it leads to root rot. Different plants have different needs: succulents prefer to dry out completely between waterings, while tropical plants like ferns prefer consistently moist (but not soggy) soil.",
        tips: [
          "Stick your finger into the soil to check moisture before watering",
          "Water thoroughly until water drains from the bottom, then discard excess",
          "Reduce watering frequency in winter when plants are dormant",
          "Use room temperature water to avoid shocking plant roots",
        ],
      },
      light: {
        info: "Light requirements vary significantly by plant species. 'Bright indirect light' means near a window (within 2-3 feet) but not in direct sun rays. 'Low light' plants can survive 4-6 feet from a window or in a room with minimal natural light. 'Bright direct light' means full sun exposure for several hours. Most tropical houseplants prefer bright indirect light. South-facing windows provide the most light, followed by west, east, and north.",
        tips: [
          "Rotate plants weekly for even growth",
          "Watch for signs: stretched stems = too little light, brown scorched leaves = too much direct sun",
          "Use sheer curtains to diffuse intense direct sunlight",
          "Supplement with grow lights in winter or dark spaces",
        ],
      },
      fertilizing: {
        info: "Fertilize during the growing season (spring through summer) every 2-4 weeks with a balanced liquid fertilizer. Reduce or stop fertilizing in fall and winter when most plants are dormant. Always dilute fertilizer to half the recommended strength to avoid burning roots. Use a balanced formula (equal N-P-K ratio like 10-10-10) for most houseplants, or specialized formulas for specific needs.",
        tips: [
          "Never fertilize dry soil - water first, then fertilize",
          "Less is more - over-fertilizing causes brown leaf tips and salt buildup",
          "Flush soil monthly by watering thoroughly to remove salt buildup",
          "Look for slow-release pellets for low-maintenance feeding",
        ],
      },
      humidity: {
        info: "Most tropical houseplants prefer 40-60% humidity, which is higher than typical indoor environments (usually 20-40%). Signs of low humidity include brown leaf tips, crispy edges, and leaf drop. Increase humidity by grouping plants together, using a humidifier, placing plants on pebble trays with water, or misting (though misting provides only temporary relief).",
        tips: [
          "Group plants together to create a micro-humidity zone",
          "Place plants in naturally humid rooms like bathrooms or kitchens",
          "Use a hygrometer to monitor humidity levels",
          "Avoid placing plants near heating/cooling vents that dry the air",
        ],
      },
      pests: {
        info: "Common houseplant pests include spider mites, mealybugs, scale, fungus gnats, and aphids. Inspect plants regularly, especially new additions before bringing them near other plants. Most pests can be controlled with insecticidal soap, neem oil, or by wiping leaves with rubbing alcohol. For fungus gnats, allow soil to dry out more between waterings and use sticky traps.",
        tips: [
          "Quarantine new plants for 2 weeks before integrating with your collection",
          "Wipe leaves regularly to prevent pest infestations",
          "Check undersides of leaves where pests often hide",
          "Act quickly at first sign of pests to prevent spread",
        ],
      },
      repotting: {
        info: "Most houseplants need repotting every 1-2 years when they become rootbound (roots circling the pot or growing through drainage holes). Spring is the best time to repot. Choose a pot only 1-2 inches larger in diameter than the current pot. Use fresh, well-draining potting mix appropriate for your plant type. Don't water immediately after repotting - wait 24-48 hours to allow roots to heal.",
        tips: [
          "Look for roots coming through drainage holes as a sign it's time to repot",
          "Gently loosen the root ball when repotting to encourage new growth",
          "Add fresh soil even if not upsizing the pot (called 'top dressing')",
          "Don't fertilize for 4-6 weeks after repotting - fresh soil has nutrients",
        ],
      },
      problems: {
        info: "Common plant problems and their causes: Yellow leaves = overwatering, underwatering, or natural aging. Brown crispy tips = low humidity, fluoride in water, or fertilizer burn. Drooping leaves = underwatering or root damage. Leaf drop = temperature shock, drafts, or major environmental change. Pale/leggy growth = insufficient light. Black mushy stems = root rot from overwatering.",
        tips: [
          "Diagnose the problem by considering all recent changes in care or environment",
          "Remove dead or dying leaves to redirect energy to healthy growth",
          "Adjust one variable at a time to identify the cause",
          "Be patient - plants take time to recover from stress",
        ],
      },
    };

    // Search for relevant knowledge
    const query = context.query.toLowerCase();
    let matchedTopic: { info: string; tips: string[] } | null = null;

    // Check for keyword matches
    for (const [keyword, content] of Object.entries(knowledgeBase)) {
      if (query.includes(keyword) || keyword.includes(query.split(' ')[0])) {
        matchedTopic = content;
        break;
      }
    }

    // Check for specific terms
    if (!matchedTopic) {
      if (query.includes('yellow') || query.includes('brown') || query.includes('dying') || query.includes('sick')) {
        matchedTopic = knowledgeBase.problems;
      } else if (query.includes('pot') || query.includes('container') || query.includes('transplant')) {
        matchedTopic = knowledgeBase.repotting;
      } else if (query.includes('bug') || query.includes('insect') || query.includes('spider') || query.includes('mite')) {
        matchedTopic = knowledgeBase.pests;
      }
    }

    if (matchedTopic) {
      return {
        information: matchedTopic.info,
        tips: matchedTopic.tips,
      };
    }

    // Default general response
    return {
      information: "General plant care principles: Provide appropriate light for your specific plant species, water when the top inch of soil is dry (adjust based on plant needs), maintain adequate humidity for tropical plants, fertilize during the growing season, and monitor regularly for pests or problems. Each plant species has unique requirements, so research the specific needs of your plants.",
      tips: [
        "Consistency is key - plants thrive on routine",
        "Observe your plants regularly to catch problems early",
        "When in doubt, underwater rather than overwater",
        "Research the specific needs of each plant species you own",
      ],
    };
  },
});
