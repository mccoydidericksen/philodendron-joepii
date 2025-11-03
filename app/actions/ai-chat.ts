"use server";

import { mastra } from "@/src/mastra";
import { getUserId, getDbUserId } from "@/lib/auth/helpers";
import { getUserSingleGroupId } from "@/lib/auth/group-auth";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/server-helpers";
import { setUserContext } from "@/lib/ai/user-context";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function sendChatMessage(
  message: string,
  conversationHistory: ChatMessage[] = []
) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);
    const userGroupId = await getUserSingleGroupId(clerkUserId);

    // Set the context for tools to access
    setUserContext({
      userId: dbUserId,
      clerkUserId: clerkUserId,
      userGroupId: userGroupId,
    });

    const agent = mastra.getAgent("plantCareAgent");

    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message },
    ];

    // Generate response
    const result = await agent.generate(messages as any, {
      resourceId: dbUserId,
    });

    return createSuccessResponse({
      message: result.text,
      steps: result.steps?.map((step: any) => ({
        type: step.type,
        text: step.text,
        toolCalls: step.toolCalls,
      })),
    });
  } catch (error) {
    return createErrorResponse(error, "Failed to send message. Please try again.");
  } finally {
    // Clean up context
    setUserContext(null);
  }
}
