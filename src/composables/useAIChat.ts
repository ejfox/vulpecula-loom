import { ref, computed, shallowRef } from "vue";
import { useOpenRouter } from "./useOpenRouter";
import { useSupabase } from "./useSupabase";
import { useActiveUser } from "./useActiveUser";
import { useStore } from "../lib/store";
import logger from "../lib/logger";
import type { ChatMessage, ChatStats, IncludedFile, Chat } from "../types";
import { useEventBus } from "@vueuse/core";
import { useDebounceFn } from "@vueuse/core";

// Create event bus for chat updates
const chatBus = useEventBus("chat-updates");

// State
const messages = shallowRef<ChatMessage[]>([]);
const isLoading = ref(false);
const isSending = ref(false);
const error = ref<string | null>(null);
const currentModel = ref<string>("anthropic/claude-3-sonnet");
const currentChatId = ref<string | null>(null);
const temperature = ref(0.7);
const chatStats = ref<ChatStats>({
  promptTokens: 0,
  completionTokens: 0,
  cost: 0,
  totalMessages: 0,
});

// Models known not to support streaming
const NON_STREAMING_MODELS = ["meta/llama-2-70b-chat", "meta/llama-2-13b-chat"];

// Exports
export function useAIChat() {
  // Initialize composables
  const openRouter = useOpenRouter();
  const { supabase, saveChatHistory, updateChatHistory } = useSupabase();
  const { isAuthenticated } = useActiveUser();
  const store = useStore();

  // Add debounced save function inside the composable
  const debouncedSaveToSupabase = useDebounceFn(
    async (chatId: string, msgs: ChatMessage[]) => {
      try {
        await updateChatHistory(chatId, msgs);
      } catch (err) {
        logger.error("Failed to save chat history:", err);
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
      chatStats.value = chat.metadata?.stats || {
        promptTokens: 0,
        completionTokens: 0,
        cost: 0,
        totalMessages: 0,
      };

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
    includedFiles?: IncludedFile[]
  ) => {
    checkAuth();

    try {
      isSending.value = true;
      const supportsStreaming = !NON_STREAMING_MODELS.includes(
        currentModel.value
      );

      // Create messages array copy for manipulation
      const currentMessages = [...messages.value];

      // Add user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
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
      });

      // Update final message state
      const finalMessages = [...messages.value];
      const finalMessageIndex = finalMessages.findIndex(
        (m) => m.id === assistantMessage.id
      );
      if (finalMessageIndex !== -1) {
        finalMessages[finalMessageIndex] = {
          ...finalMessages[finalMessageIndex],
          content: response.content,
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
        chatStats.value = {
          promptTokens:
            chatStats.value.promptTokens + (response.usage.prompt_tokens || 0),
          completionTokens:
            chatStats.value.completionTokens +
            (response.usage.completion_tokens || 0),
          cost: chatStats.value.cost + (response.cost || 0),
          totalMessages: messages.value.length,
        };
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
    chatStats.value = {
      promptTokens: 0,
      completionTokens: 0,
      cost: 0,
      totalMessages: 0,
    };
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
    chatBus,
  };
}
