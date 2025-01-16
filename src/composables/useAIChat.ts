import { ref, computed } from "vue";
import { useOpenRouter } from "./useOpenRouter";
import { useSupabase } from "./useSupabase";
import { useActiveUser } from "./useActiveUser";
import type {
  ChatMessage,
  TokenUsage,
  ChatStats,
  MessageWithFiles,
} from "../types";

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

// Exports
export function useAIChat() {
  // Initialize composables
  const openRouter = useOpenRouter();
  const { supabase, updateChatHistory } = useSupabase();
  const { isAuthenticated } = useActiveUser();

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

  // Helper function to check auth
  const checkAuth = () => {
    if (!isAuthenticated.value) {
      const err = new Error("User not authenticated");
      error.value = err.message;
      throw err;
    }
  };

  // Send a message and get a response
  const sendMessage = async (message: string | MessageWithFiles) => {
    checkAuth(); // Check auth before proceeding

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

      // Create user message with guaranteed tokens and cost
      const estimatedTokens = Math.ceil(content.length / 4);
      const estimatedCost =
        (estimatedTokens * openRouter.getModelCost(currentModel.value)) /
        1000000;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date().toISOString(),
        model: currentModel.value,
        tokens: {
          prompt: estimatedTokens,
          completion: 0,
          total: estimatedTokens,
        },
        cost: estimatedCost,
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

      // Create placeholder assistant message for streaming
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        model: currentModel.value,
        tokens: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
        isStreaming: true,
      };
      messages.value.push(assistantMessage);

      // Get AI response using OpenRouter
      console.log("🤖 useAIChat: Requesting AI response...");
      const response = await openRouter.sendMessage(content, {
        model: currentModel.value,
        temperature: temperature.value,
        includedFiles,
        conversationHistory: messages.value.slice(0, -1), // Exclude the placeholder message
        onToken: (token) => {
          // Update the streaming message content
          const messageIndex = messages.value.findIndex(
            (m) => m.id === assistantMessage.id
          );
          if (messageIndex !== -1) {
            const updatedMessage = { ...messages.value[messageIndex] };
            updatedMessage.content += token;
            messages.value[messageIndex] = updatedMessage;
            // Force Vue to update the UI
            messages.value = [...messages.value];
          }
        },
      });

      console.log("✅ useAIChat: Got AI response:", {
        contentLength: response.content.length,
        usage: response.usage,
        cost: response.cost,
      });

      // Update the assistant message with final content and metadata
      const finalMessageIndex = messages.value.findIndex(
        (m) => m.id === assistantMessage.id
      );
      if (finalMessageIndex !== -1) {
        const finalMessage = { ...messages.value[finalMessageIndex] };
        finalMessage.content = response.content;
        finalMessage.tokens = response.usage
          ? {
              prompt: response.usage.prompt_tokens || 0,
              completion: response.usage.completion_tokens || 0,
              total: response.usage.total_tokens || 0,
            }
          : {
              prompt: 0,
              completion: 0,
              total: 0,
            };
        finalMessage.cost = response.cost || 0;
        finalMessage.isStreaming = false;
        messages.value[finalMessageIndex] = finalMessage;
        // Force Vue to update the UI with final message
        messages.value = [...messages.value];
      }

      // Update chat stats with user message tokens
      const newUserStats = {
        promptTokens: chatStats.value.promptTokens + estimatedTokens,
        completionTokens: chatStats.value.completionTokens,
        cost: chatStats.value.cost + estimatedCost,
        totalMessages: messages.value.length,
      };
      chatStats.value = newUserStats;

      // Update chat stats with AI response
      if (response.usage) {
        console.log("📊 useAIChat: Updating chat stats with response:", {
          usage: response.usage,
          cost: response.cost,
          currentStats: chatStats.value,
        });

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
    checkAuth(); // Check auth before proceeding
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
    checkAuth(); // Check auth before proceeding
    if (availableModels.value.find((m) => m.id === modelId)) {
      currentModel.value = modelId;
    }
  };

  const updateTemperature = (value: number) => {
    checkAuth(); // Check auth before proceeding
    temperature.value = value;
  };

  const loadChat = async (id: string) => {
    checkAuth(); // Check auth before proceeding
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

      // Update state with proper cost preservation
      messages.value = chat.messages.map((m: ChatMessage) => ({
        ...m,
        timestamp: m.timestamp || new Date().toISOString(),
        model: m.model || currentModel.value, // Ensure model is preserved
        tokens: m.tokens || {
          prompt: 0,
          completion: 0,
          total: 0,
        },
        cost: m.cost || 0,
      }));

      // Recalculate chat stats from actual message data
      const stats = messages.value.reduce(
        (acc, msg) => {
          // Get the correct cost for this message's model
          const modelCost = openRouter.getModelCost(
            msg.model || currentModel.value
          );
          const msgCost = msg.tokens?.total
            ? (msg.tokens.total * modelCost) / 1000000
            : msg.cost || 0;

          return {
            promptTokens: acc.promptTokens + (msg.tokens?.prompt || 0),
            completionTokens:
              acc.completionTokens + (msg.tokens?.completion || 0),
            cost: acc.cost + msgCost,
            totalMessages: acc.totalMessages + 1,
          };
        },
        {
          promptTokens: 0,
          completionTokens: 0,
          cost: 0,
          totalMessages: 0,
        }
      );

      currentModel.value = chat.metadata?.lastModel || currentModel.value;
      chatStats.value = stats;

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
    checkAuth(); // Check auth before proceeding
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
