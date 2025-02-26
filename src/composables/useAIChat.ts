import { ref, computed, shallowRef } from "vue";
import { useOpenRouter } from "./useOpenRouter";
import { useSupabase } from "./useSupabase";
import { useActiveUser } from "./useActiveUser";
import { useStore } from "../lib/store";
import logger from "../lib/logger";
import type { ChatMessage, ChatStats, IncludedFile, Chat } from "../types";
import { useEventBus } from "@vueuse/core";
import { useDebounceFn } from "@vueuse/core";
import {
  processCommands,
  addCommandsToSystemMessage,
  COMMAND_TAGS,
  parseModelCommands as parseModelCommandsFromLibrary,
  type ParsedCommands,
} from "../lib/aiCommands";

// Create event bus for chat updates
const chatBus = useEventBus("chat-updates");

// State
const messages = ref<ChatMessage[]>([]);
const isLoading = ref(false);
const isSending = ref(false);
const error = ref<string | null>(null);
const currentModel = ref<string>("anthropic/claude-3-sonnet");
const currentChatId = ref<string | null>(null);
const temperature = ref(0.7);

// Compute stats directly from messages
const chatStats = ref<any>({
  promptTokens: 0,
  completionTokens: 0,
  cost: 0,
  totalMessages: 0,
});

// Calculate chat stats from messages
const calculateChatStats = (chatMessages: ChatMessage[]): ChatStats => {
  // Start with default values
  const stats = {
    promptTokens: 0,
    completionTokens: 0,
    cost: 0,
    totalMessages: chatMessages.length,
    responseTime: 0,
  };

  // Iterate through all messages to accumulate stats
  chatMessages.forEach((message) => {
    // Add token counts if available
    if (message.tokens) {
      stats.promptTokens += message.tokens.prompt || 0;
      stats.completionTokens += message.tokens.completion || 0;
    }

    // Add cost if available
    if (message.cost) {
      stats.cost += message.cost;
    }
  });

  return stats;
};

// Models known not to support streaming
const NON_STREAMING_MODELS = ["meta/llama-2-70b-chat", "meta/llama-2-13b-chat"];

// Command regex patterns
const RENAME_CHAT_REGEX = /<rename-chat\s+newname="([^"]+)"\s*\/>/i;

// Parse model commands from content
const parseModelCommands = parseModelCommandsFromLibrary;

// Check if chat needs auto-titling
const shouldAutoGenerateTitle = (messages: ChatMessage[]) => {
  return (
    messages.length === 5 ||
    messages.length === 10 ||
    messages.length % 20 === 0
  );
};

// Exports
export function useAIChat() {
  // Initialize composables
  const openRouter = useOpenRouter();
  const { supabase, saveChatHistory, updateChatHistory } = useSupabase();
  const { isAuthenticated } = useActiveUser();
  const store = useStore();

  // Update chat stats from messages and save to Supabase
  const updateChatStats = async (
    chatId: string | null,
    chatMessages: ChatMessage[]
  ) => {
    if (!chatId) return;

    try {
      // Calculate stats from messages
      const newStats = calculateChatStats(chatMessages);

      // Update local state
      chatStats.value = newStats;

      // Get current metadata from Supabase
      const { data: chat } = await supabase
        .from("vulpeculachats")
        .select("metadata")
        .eq("id", chatId)
        .single();

      // Create updated metadata with new stats
      const updatedMetadata = {
        ...(chat?.metadata || {}),
        lastUpdated: new Date().toISOString(),
        stats: newStats,
      };

      // Save to Supabase
      await updateChatHistory(chatId, chatMessages, updatedMetadata);

      logger.debug("Chat stats updated:", {
        chatId,
        promptTokens: newStats.promptTokens,
        completionTokens: newStats.completionTokens,
        cost: newStats.cost,
      });
    } catch (error) {
      logger.error("Failed to update chat stats:", error);
    }
  };

  // Add debounced save function inside the composable
  const debouncedSaveToSupabase = useDebounceFn(
    async (chatId: string, messages: ChatMessage[]) => {
      try {
        const { data, error } = await supabase
          .from("vulpeculachats")
          .update({
            messages,
            metadata: {
              lastModel: currentModel.value,
              lastUpdated: new Date().toISOString(),
              messageCount: messages.length,
            },
          })
          .eq("id", chatId);

        if (error) throw error;

        // Emit chat update event
        chatBus.emit("chat-updated", { chatId, messages });
      } catch (err) {
        logger.error("Failed to save chat to Supabase:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to save chat";
        throw new Error(errorMessage);
      }
    },
    1000
  );

  // Computed
  const modelName = computed(() => currentModel.value.split("/").pop() || "");
  const hasValidKey = computed(() => openRouter.hasValidKey.value);
  const availableModels = computed(() => openRouter.availableModels.value);
  const enabledModels = computed(() => openRouter.enabledModels.value);

  // Helper function to check auth
  const checkAuth = () => {
    if (!isAuthenticated.value) {
      const err = new Error("User not authenticated");
      error.value = err.message;
      throw err;
    }
  };

  // Methods to manage chat state
  const createNewChat = async () => {
    try {
      checkAuth();

      // Clear current chat state
      messages.value = [];
      currentChatId.value = null;

      // Ensure we have a model set
      if (!currentModel.value && availableModels.value.length > 0) {
        currentModel.value = availableModels.value[0].id;
      }

      // Create new chat history entry
      const newChat = {
        title: "New Chat",
        messages: [],
        model: currentModel.value,
        metadata: {
          lastModel: currentModel.value,
          lastUpdated: new Date().toISOString(),
          messageCount: 0,
          stats: chatStats.value,
        },
      };

      // Save to Supabase
      const savedChat = await saveChatHistory(newChat);
      currentChatId.value = savedChat.id;

      // Emit chat update event
      chatBus.emit("chat-created", savedChat);

      // Update UI state
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        await store.set("uiState", { chatSidebarOpen: false });
      }

      return savedChat;
    } catch (err) {
      logger.error("Failed to create new chat:", err);
      error.value =
        err instanceof Error ? err.message : "Failed to create new chat";
      throw err;
    }
  };

  const loadChat = async (id: string) => {
    try {
      const { data: chat, error: chatError } = await supabase
        .from("vulpeculachats")
        .select("*")
        .eq("id", id)
        .single();

      if (chatError) throw chatError;

      // Update local state
      messages.value = chat.messages;
      currentChatId.value = chat.id;
      currentModel.value = chat.metadata?.lastModel || currentModel.value;

      // First try to load stats from metadata
      if (chat.metadata?.stats) {
        chatStats.value = chat.metadata.stats;
        logger.debug("Loaded chat stats from metadata", chatStats.value);
      } else {
        // If no stats in metadata, calculate and save them
        await updateChatStats(chat.id, chat.messages);
      }

      return chat;
    } catch (err) {
      logger.error("Failed to load chat:", err);
      error.value = err instanceof Error ? err.message : "Failed to load chat";
      throw err;
    }
  };

  // Send a message and get a response
  const sendMessage = async (
    content: string,
    includedFiles?: IncludedFile[],
    images?: File[]
  ) => {
    if (isSending.value) return;
    isSending.value = true;

    try {
      checkAuth();

      const currentMessages = messages.value;
      const supportsStreaming = !NON_STREAMING_MODELS.includes(
        currentModel.value
      );

      // Process images if provided
      let imageContent = "";
      if (images && images.length > 0) {
        for (const image of images) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(image);
          });

          // Add image markdown to content
          imageContent += `\n![${image.name}](${base64})\n`;
        }
      }

      // Create user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: content + imageContent, // Append images to content
        timestamp: new Date().toISOString(),
        model: currentModel.value,
        includedFiles,
      };

      // Update UI immediately with user message
      messages.value = [...currentMessages, userMessage];

      // Save user message to Supabase
      if (currentChatId.value) {
        debouncedSaveToSupabase(currentChatId.value, messages.value);
      }

      // Add placeholder assistant message
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        model: currentModel.value,
        isStreaming: supportsStreaming,
      };

      // Update UI with placeholder
      messages.value = [...messages.value, assistantMessage];

      let streamedContent = "";
      let lastSaveTime = Date.now();

      // Get AI response
      const response = await openRouter.sendMessage(content, {
        model: currentModel.value,
        temperature: temperature.value,
        includedFiles,
        conversationHistory: currentMessages,
        stream: supportsStreaming,
        onToken: supportsStreaming
          ? (token: string) => {
              streamedContent += token;

              // Update UI less frequently to reduce jank
              const now = Date.now();
              if (now - lastSaveTime > 50) {
                // Only update every 50ms
                const updatedMessages = [...messages.value];
                const messageIndex = updatedMessages.findIndex(
                  (m) => m.id === assistantMessage.id
                );
                if (messageIndex !== -1) {
                  updatedMessages[messageIndex] = {
                    ...updatedMessages[messageIndex],
                    content: streamedContent,
                  };
                  messages.value = updatedMessages;
                  lastSaveTime = now;
                }
              }
            }
          : undefined,
      } as any);

      // Check for model commands in the response
      const parsedCommands = parseModelCommands(response.content);
      let finalContent = parsedCommands.originalContent;

      // Process all commands using the helper function
      processCommands(parsedCommands, currentChatId.value, chatBus);

      // Update final message state
      const finalMessages = [...messages.value];
      const finalMessageIndex = finalMessages.findIndex(
        (m) => m.id === assistantMessage.id
      );
      if (finalMessageIndex !== -1) {
        finalMessages[finalMessageIndex] = {
          ...finalMessages[finalMessageIndex],
          content: finalContent,
          tokens: response.usage
            ? {
                prompt: response.usage.prompt_tokens || 0,
                completion: response.usage.completion_tokens || 0,
                total: response.usage.total_tokens || 0,
              }
            : undefined,
          cost: response.cost,
          isStreaming: false,
        };
        messages.value = finalMessages;
      }

      // Update chat stats
      if (response.usage) {
        await updateChatStats(currentChatId.value, messages.value);
      }

      // Check if we should auto-generate a title based on message count
      if (shouldAutoGenerateTitle(messages.value) && currentChatId.value) {
        // Fetch chat to check its title
        const { data: chat } = await supabase
          .from("vulpeculachats")
          .select("title")
          .eq("id", currentChatId.value)
          .single();

        const defaultTitles = ["new chat", "untitled chat", "untitled", ""];
        if (
          chat &&
          (!chat.title || defaultTitles.includes(chat.title.toLowerCase()))
        ) {
          // Emit event to suggest generating a title
          chatBus.emit("suggest-auto-title", { chatId: currentChatId.value });
        }
      }

      // Save final state to Supabase
      if (currentChatId.value) {
        debouncedSaveToSupabase(currentChatId.value, messages.value);
      }

      return assistantMessage;
    } catch (err) {
      logger.error("Failed to send message:", err);
      error.value =
        err instanceof Error ? err.message : "Failed to send message";
      throw err;
    } finally {
      isSending.value = false;
    }
  };

  const clearChat = () => {
    checkAuth();
    messages.value = [];
    currentChatId.value = null;
  };

  const setModel = (modelId: string) => {
    checkAuth();
    if (availableModels.value.find((m) => m.id === modelId)) {
      currentModel.value = modelId;
    }
  };

  const updateTemperature = (value: number) => {
    checkAuth();
    temperature.value = value;
  };

  const exportChat = () => {
    checkAuth();
    const exportData = {
      messages: messages.value,
      model: currentModel.value,
      stats: chatStats.value,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Add chat history sync
  const syncChatHistory = async () => {
    try {
      const { data: chats, error: chatError } = await supabase
        .from("vulpeculachats")
        .select("*")
        .order("created_at", { ascending: false });

      if (chatError) throw chatError;
      return chats || [];
    } catch (err) {
      logger.error("Failed to sync chat history:", err);
      throw err;
    }
  };

  // Generate a title for a chat
  const generateChatTitle = async (chatId: string): Promise<string | null> => {
    try {
      // Load chat to get messages
      const { data: chat } = await supabase
        .from("vulpeculachats")
        .select("*")
        .eq("id", chatId)
        .single();

      if (!chat || !chat.messages || chat.messages.length < 3) {
        return null;
      }

      // Get first few messages (up to 10)
      const messagesToUse = chat.messages.slice(
        0,
        Math.min(chat.messages.length, 10)
      );

      // Generate title using the cheap Gemini model
      const titlePrompt = `
        Please create a very brief title (max 40 characters) for this conversation.
        Make it descriptive but concise.

        ${messagesToUse
          .map(
            (m: ChatMessage) =>
              `${m.role}: ${m.content.substring(0, 150)}${
                m.content.length > 150 ? "..." : ""
              }`
          )
          .join("\n\n")}
      `;

      const model = "google/gemini-2.0-flash-lite-001";

      // Use OpenRouter to generate the title
      const response = await openRouter.sendMessage(titlePrompt, {
        model,
        temperature: 0.3,
      });

      if (response && response.content) {
        const suggestedTitle = response.content.trim();

        // Emit event for UI to handle
        chatBus.emit("auto-title-generated", {
          chatId,
          title: suggestedTitle,
        });

        return suggestedTitle;
      }

      return null;
    } catch (error) {
      logger.error("Failed to generate chat title", error);
      return null;
    }
  };

  return {
    // State
    messages,
    isLoading,
    isSending,
    error,
    currentModel,
    modelName,
    currentChatId,
    temperature,
    chatStats,
    hasValidKey,
    availableModels,
    enabledModels,

    // Methods
    sendMessage,
    clearChat,
    setModel,
    loadChat,
    updateTemperature,
    exportChat,
    createNewChat,
    syncChatHistory,
    generateChatTitle,
    chatBus,
  };
}
