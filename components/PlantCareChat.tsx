"use client";

import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "@/app/actions/ai-chat";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Leaf } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function PlantCareChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your plant care assistant. I can help you with questions about watering, light, fertilizing, pests, and more. I can also check on your specific plants! What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);

    try {
      const result = await sendChatMessage(userMessage, messages);

      if (result.success && result.data) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.data.message },
        ]);
      } else {
        throw new Error(!result.success ? (result as any).error || "Failed to get response" : "Failed to get response");
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm sorry, I encountered an error processing your message. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      // Refocus input after response
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const quickQuestions = [
    "What plants do I have?",
    "How often should I water?",
    "My plant has yellow leaves",
    "How do I increase humidity?",
  ];

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[600px] max-w-3xl mx-auto border-2 border-sage rounded-lg bg-white shadow-lg">
      {/* Header */}
      <div className="p-4 border-b-2 border-sage bg-gradient-to-r from-moss to-moss-light text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5" />
          <div>
            <h3 className="text-lg font-semibold">Plant Care Assistant</h3>
            <p className="text-sm opacity-90">Ask me anything about your plants!</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                msg.role === "user"
                  ? "bg-moss text-white"
                  : "bg-sage/20 text-moss-dark border border-sage"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-sage/20 text-moss-dark rounded-lg p-3 border border-sage">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Thinking...</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Questions (show only at start) */}
        {messages.length <= 1 && !isLoading && (
          <div className="space-y-2">
            <p className="text-xs text-soil text-center">Try asking:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickQuestion(question)}
                  className="text-xs px-3 py-1.5 rounded-full bg-sage/30 text-moss-dark hover:bg-sage/50 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t-2 border-sage bg-sage/5">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about watering, light, problems..."
            className="flex-1 rounded-md border-2 border-sage px-4 py-2 text-moss-dark focus:border-moss focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-moss hover:bg-moss-light text-white px-6"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
