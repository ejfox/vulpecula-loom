import { ref, computed } from "vue";
import { useOpenRouter } from "./useOpenRouter";
import { useSupabase } from "./useSupabase";
import type {
  ChatMessage,
  TokenUsage,
  ChatStats,
  MessageWithFiles,
} from "../types";

// Initialize composables
const openRouter = useOpenRouter();
const { supabase, updateChatHistory } = useSupabase();

// State
const messages = ref<ChatMessage[]>([]);
const isLoading = ref(false);
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

// Computed
const modelName = computed(() => currentModel.value.split("/").pop() || "");
const hasValidKey = computed(() => {
  console.log("useAIChat: Checking hasValidKey:", {
    openRouterHasKey: openRouter.hasValidKey.value,
    apiKey: openRouter.apiKey.value,
  });
  return openRouter.hasValidKey.value;
});
const availableModels = computed(() => openRouter.availableModels.value);
const enabledModels = computed(() => openRouter.enabledModels.value);

// Send a message and get a response
const sendMessage = async (message: string | MessageWithFiles) => {
  const content = typeof message === "string" ? message : message.content;
  const includedFiles =
    typeof message === "string" ? undefined : message.includedFiles;

  console.log("🔄 useAIChat: Sending message:", {
    content,
    includedFiles: includedFiles?.map((f) => ({
      title: f.title,
      path: f.path,
      contentPreview: f.content?.slice(0, 100) + "...", // Just show first 100 chars
    })),
    model: currentModel.value,
    temperature: temperature.value,
    hasValidKey: hasValidKey.value,
  });

  try {
    isLoading.value = true;

    // Create user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
      model: currentModel.value,
      tokens: {
        prompt: 0,
        completion: 0,
        total: 0,
      },
      includedFiles,
    };

    console.log("📝 useAIChat: Adding user message:", {
      ...userMessage,
      includedFiles: userMessage.includedFiles?.map((f) => ({
        title: f.title,
        path: f.path,
        contentPreview: f.content?.slice(0, 100) + "...",
      })),
    });
    messages.value.push(userMessage);

    // Get AI response using OpenRouter
    console.log("🤖 useAIChat: Requesting AI response...");
    const response = await openRouter.sendMessage(content, {
      model: currentModel.value,
      temperature: temperature.value,
      includedFiles,
    });

    console.log("✅ useAIChat: Got AI response:", {
      contentLength: response.content.length,
      usage: response.usage,
      cost: response.cost,
    });

    // Create assistant message
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: response.content,
      timestamp: new Date().toISOString(),
      model: currentModel.value,
      tokens: response.usage
        ? {
            prompt: response.usage.prompt_tokens || 0,
            completion: response.usage.completion_tokens || 0,
            total: response.usage.total_tokens || 0,
          }
        : {
            prompt: 0,
            completion: 0,
            total: 0,
          },
      cost: response.cost || 0,
    };

    console.log("📝 useAIChat: Adding assistant message:", assistantMessage);
    messages.value.push(assistantMessage);

    // Update chat stats
    if (response.usage) {
      console.log("📊 useAIChat: Updating chat stats...");
      chatStats.value.promptTokens += response.usage.prompt_tokens || 0;
      chatStats.value.completionTokens += response.usage.completion_tokens || 0;
      chatStats.value.cost += response.cost || 0;
      chatStats.value.totalMessages = messages.value.length;
      console.log("✅ useAIChat: Updated chat stats:", chatStats.value);
    }

    // Save to Supabase if configured
    if (supabase && currentChatId.value) {
      console.log("💾 useAIChat: Saving to Supabase...");
      await updateChatHistory(currentChatId.value, messages.value);
      console.log("✅ useAIChat: Saved to Supabase");
    }

    return assistantMessage;
  } catch (err) {
    console.error("❌ useAIChat: Error sending message:", err);
    error.value = err instanceof Error ? err.message : "Unknown error";
    throw err;
  } finally {
    isLoading.value = false;
  }
};

// Chat management functions
const clearChat = () => {
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
  if (availableModels.value.find((m) => m.id === modelId)) {
    currentModel.value = modelId;
  }
};

const updateTemperature = (value: number) => {
  temperature.value = value;
};

const loadChat = async (id: string) => {
  try {
    isLoading.value = true;
    currentChatId.value = id;

    // Load chat history from Supabase
    const { data: chat, error: dbError } = await supabase
      .from("vulpeculachats")
      .select("*")
      .eq("id", id)
      .single();

    if (dbError) throw dbError;

    // Update state
    messages.value = chat.messages.map((m: ChatMessage) => ({
      ...m,
      timestamp: m.timestamp || new Date().toISOString(),
    }));
    currentModel.value = chat.metadata?.lastModel || currentModel.value;
    chatStats.value = chat.metadata?.stats || {
      promptTokens: 0,
      completionTokens: 0,
      cost: 0,
      totalMessages: messages.value.length,
    };

    return chat;
  } catch (err) {
    console.error("Error loading chat:", err);
    error.value = "Failed to load chat";
    throw err;
  } finally {
    isLoading.value = false;
  }
};

const exportChat = () => {
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

// Exports
export function useAIChat() {
  return {
    // State
    messages,
    isLoading,
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
  };
}
