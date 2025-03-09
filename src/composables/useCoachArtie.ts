import { ref, computed } from "vue";
import { useStore } from "../lib/store";
import logger from "../lib/logger";
import type { Ref, ComputedRef } from "vue";
import type { ChatMessage, OpenRouterResponse } from "../types";

// Define the Coach Artie API response type
interface CoachArtieResponse {
  message: string;
  thread_id: number;
  memories_used: number;
  had_capabilities: boolean;
}

export interface UseCoachArtieReturn {
  isAvailable: Ref<boolean>;
  isConnected: ComputedRef<boolean>;
  checkConnection: () => Promise<boolean>;
  sendMessage: (
    content: string,
    options: {
      userId?: string;
      context?: unknown;
      conversationHistory?: ChatMessage[];
      onToken?: (token: string) => void;
    }
  ) => Promise<OpenRouterResponse>;
}

// Singleton instance
let instance: UseCoachArtieReturn | null = null;

export function useCoachArtie(): UseCoachArtieReturn {
  // Return existing instance if already initialized
  if (instance) return instance;

  const store = useStore();
  const isAvailable = ref(false);

  // Check if Coach Artie is available (running on localhost:9991)
  const checkConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch("http://localhost:9991/health", {
        method: "GET",
        headers: {
          Authorization: "Bearer room302",
        },
        // Set a short timeout to avoid hanging
        signal: AbortSignal.timeout(2000),
      });

      isAvailable.value = response.ok;
      logger.debug("Coach Artie connection check:", {
        available: isAvailable.value,
      });
      return isAvailable.value;
    } catch (error) {
      logger.debug("Coach Artie not available:", error);
      isAvailable.value = false;
      return false;
    }
  };

  // Computed property to check if Coach Artie is connected
  const isConnected = computed(() => isAvailable.value);

  // Send a message to Coach Artie
  const sendMessage = async (
    content: string,
    options: {
      userId?: string;
      context?: unknown;
      conversationHistory?: ChatMessage[];
      onToken?: (token: string) => void;
    }
  ): Promise<OpenRouterResponse> => {
    if (!isAvailable.value) {
      // Try to connect first
      const available = await checkConnection();
      if (!available) {
        throw new Error("Coach Artie is not available");
      }
    }

    try {
      // Prepare the request payload
      const payload = {
        message: content,
        userId: options.userId || "anonymous",
        context: options.context,
        respond_to: {
          channel: "chat",
          details: {
            type: "chat",
            channelId: "vulpecula-loom",
          },
        },
        channelInfo: {
          channelType: "app",
        },
      };

      // Make the request to Coach Artie
      const response = await fetch("http://localhost:9991/chat", {
        method: "POST",
        headers: {
          Authorization: "Bearer room302",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse the response
      const data: CoachArtieResponse = await response.json();

      // Convert to OpenRouterResponse format for compatibility
      return {
        content: data.message,
        usage: {
          prompt_tokens: 0, // We don't have this info from Coach Artie
          completion_tokens: 0,
          total_tokens: 0,
        },
        cost: 0, // Coach Artie is free
        model: "coach-artie", // Use a consistent ID
        thread_id: data.thread_id,
        memories_used: data.memories_used,
        had_capabilities: data.had_capabilities,
      };
    } catch (error) {
      logger.error("Failed to send message to Coach Artie:", error);
      throw error;
    }
  };

  // Create the instance
  instance = {
    isAvailable,
    isConnected,
    checkConnection,
    sendMessage,
  };

  // Check connection on initialization
  checkConnection();

  return instance;
}
