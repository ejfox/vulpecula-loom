import { ref, computed, watch, onMounted } from "vue";
import { useStore } from "../lib/store";
import logger from "../lib/logger";
import type { Ref, ComputedRef } from "vue";
import type {
  OpenRouterModel,
  ChatMessage,
  ChatHistory,
  OpenRouterResponse,
  IncludedFile,
  StoreSchema,
} from "../types";
import { useSupabase } from "./useSupabase";

export interface UseOpenRouterReturn {
  apiKey: Ref<string>;
  setApiKey: (key: string) => Promise<boolean>;
  hasValidKey: ComputedRef<boolean>;
  messages: Ref<any[]>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  currentModel: Ref<string>;
  modelName: ComputedRef<string>;
  availableModels: Ref<OpenRouterModel[]>;
  enabledModels: ComputedRef<OpenRouterModel[]>;
  recentModels: ComputedRef<OpenRouterModel[]>;
  saveApiKey: (key: string) => Promise<boolean>;
  trackModelUsage: (modelId: string) => void;
  fetchAvailableModels: (options?: { includeAll?: boolean }) => Promise<void>;
  getModelCost: (modelId: string) => number;
  formatModelCost: (modelId: string, rawCost?: number) => string;
  setModel: (modelId: string) => void;
  currentChatId: Ref<string | null>;
  loadChat: (id: string) => Promise<void>;
  clearChat: () => void;
  chatStats: Ref<any>;
  temperature: Ref<number>;
  updateTemperature: (value: number) => void;
  exportChat: () => void;
  sendMessage: (
    content: string,
    options: {
      model?: string;
      temperature?: number;
      includedFiles?: IncludedFile[];
      conversationHistory?: ChatMessage[];
      onToken?: (token: string) => void;
    }
  ) => Promise<OpenRouterResponse>;
  validateApiKey: (key: string) => Promise<boolean>;
}

// Singleton instance
let instance: UseOpenRouterReturn | null = null;

export function useOpenRouter(): UseOpenRouterReturn {
  // Return existing instance if already initialized
  if (instance) return instance;

  const store = useStore();
  const apiKey = ref("");
  const messages = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isInitialized = ref(false);
  const currentModel = ref("anthropic/claude-3-sonnet:beta");
  const currentChatId = ref<string | null>(null);
  const chatStats = ref<any>({});
  const temperature = ref(0.7);

  const modelName = computed(() => {
    const model = availableModels.value.find(
      (m: OpenRouterModel) => m.id === currentModel.value
    );
    return model?.name || currentModel.value;
  });

  const hasValidKey = computed(() => {
    return apiKey.value.startsWith("sk-or-") && apiKey.value.length > 10;
  });
  const availableModels = ref<OpenRouterModel[]>([]);
  const enabledModelIds = ref<string[]>([
    "anthropic/claude-3-sonnet:beta",
    "anthropic/claude-2.1",
    "openai/gpt-4-turbo",
    "openai/gpt-3.5-turbo",
  ]);
  const recentModelIds = ref<string[]>([]);

  // Get cost per 1M tokens for a model
  function getModelCost(modelId: string): number {
    const model = availableModels.value.find(
      (m: OpenRouterModel) => m.id === modelId
    );
    if (!model?.pricing) return 0;
    // Average of prompt and completion cost per 1M tokens
    const promptCost = Number(model.pricing.prompt) || 0;
    const completionCost = Number(model.pricing.completion) || 0;
    return (promptCost + completionCost) / 2;
  }

  // Format model cost to appropriate decimal places
  function formatModelCost(modelId: string, rawCost?: number): string {
    const cost = rawCost ?? getModelCost(modelId);

    if (cost === 0) return "$0.00";

    // For costs that are $0.01 or more per token
    if (cost >= 0.01) {
      return `$${cost.toFixed(2)}/tok`;
    }

    // For costs around a penny or less, show in cents per token
    if (cost >= 0.0001) {
      return `${(cost * 100).toFixed(1)}¢/tok`;
    }

    // For smaller costs, show in cents per KTok
    const perKTok = cost * 1000 * 100; // Convert to cents per 1000 tokens
    if (perKTok >= 0.01) {
      return `${perKTok.toFixed(1)}¢/KTok`;
    }

    // For tiny costs, show in cents per GTok (million tokens)
    const perGTok = cost * 1000000 * 100; // Convert to cents per million tokens
    return `${perGTok.toFixed(1)}¢/GTok`;
  }

  // Fetch available models from OpenRouter API
  async function fetchAvailableModels({ includeAll = false } = {}) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: {
          Authorization: apiKey.value,
          "HTTP-Referer": window.location.origin,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Map all available models
      const processedModels = data.data
        .filter((model: any) => {
          const isValid =
            model.id &&
            model.context_length &&
            model.pricing?.prompt &&
            model.pricing?.completion;
          return isValid;
        })
        .map(
          (model: any): OpenRouterModel => ({
            id: model.id,
            name: model.name || model.id,
            description: model.description,
            context_length: model.context_length,
            pricing: {
              prompt: String(model.pricing.prompt),
              completion: String(model.pricing.completion),
            },
            capabilities: {
              vision: Boolean(model.capabilities?.vision),
              tools: Boolean(model.capabilities?.tools),
              function_calling: Boolean(model.capabilities?.function_calling),
            },
            provider: model.id.split("/")[0],
          })
        );

      availableModels.value = processedModels;

      // Set default enabled models if none exist
      if (enabledModelIds.value.length === 0) {
        enabledModelIds.value = [
          "anthropic/claude-3-sonnet:beta",
          "anthropic/claude-2.1",
          "openai/gpt-4-turbo",
          "openai/gpt-3.5-turbo",
        ];
        await store.set("enabledModelIds", enabledModelIds.value);
      }

      // Set default vision model if none exists
      let storedVisionModel = null;
      try {
        // Initialize with null if not set
        const visionModelKey = "preferred-vision-model" as keyof StoreSchema;
        if (!(await store.get(visionModelKey))) {
          await store.set(visionModelKey, null);
        }
        storedVisionModel = await store.get(visionModelKey);
      } catch (error) {
        logger.error("Failed to get preferred vision model:", error);
        // Ensure we have a valid initial state
        await store.set("preferred-vision-model" as keyof StoreSchema, null);
      }

      // Only set a default if we don't have a valid model ID stored
      if (!storedVisionModel) {
        // Find the first model with vision capabilities
        const defaultVisionModel = processedModels.find(
          (m: OpenRouterModel) => m.capabilities?.vision
        );
        if (defaultVisionModel) {
          try {
            await store.set(
              "preferred-vision-model" as keyof StoreSchema,
              defaultVisionModel.id
            );
          } catch (error) {
            logger.error("Failed to set default vision model:", error);
          }
        }
      }
    } catch (error) {
      logger.error("Failed to fetch models:", error);
      availableModels.value = [];
    }
  }

  // Initialize API key and enabled models
  const initialize = async () => {
    try {
      isLoading.value = true;
      error.value = null;

      // Load API key
      const storedKey = await store.get("api-key");
      if (storedKey) {
        apiKey.value = storedKey;
        await validateApiKey(storedKey);
      }

      // Load enabled models
      const storedEnabledIds =
        (await store.get("enabled-model-ids")) ||
        (await store.get("enabledModelIds"));
      if (storedEnabledIds) {
        enabledModelIds.value = storedEnabledIds;
      }

      // Load recent models
      const storedRecentIds =
        (await store.get("recent-model-ids")) ||
        (await store.get("recentModelIds"));
      if (storedRecentIds) {
        recentModelIds.value = storedRecentIds;
      }

      // Only fetch models once during initialization if we have a valid key
      if (apiKey.value && apiKey.value.startsWith("sk-or-")) {
        await fetchAvailableModels();
      }
    } catch (err) {
      logger.error("Failed to initialize OpenRouter:", err);
    } finally {
      isLoading.value = false;
    }
  };

  // Call initialize on mount
  onMounted(() => {
    if (!isInitialized.value) {
      initialize();
      isInitialized.value = true;
    }
  });

  // Track model usage
  function trackModelUsage(modelId: string) {
    const updatedIds = [
      modelId,
      ...Array.from(recentModelIds.value.filter((id) => id !== modelId)),
    ];
    const trimmedIds = updatedIds.slice(0, 10);
    recentModelIds.value = trimmedIds;

    // Save to store
    store.set("recent-model-ids", Array.from(trimmedIds));
    store.set("recentModelIds", Array.from(trimmedIds));
  }

  // Get recent models
  const recentModels = computed(() => {
    return recentModelIds.value
      .map((id) =>
        availableModels.value.find((m: OpenRouterModel) => m.id === id)
      )
      .filter((m): m is OpenRouterModel => m !== undefined);
  });

  // Remove the redundant watch on apiKey that was re-fetching models
  // Only fetch models when explicitly saving a new API key
  const saveApiKey = async (key: string): Promise<boolean> => {
    try {
      const isValid = await validateApiKey(key);
      if (!isValid) {
        error.value = "Invalid API key";
        return false;
      }

      await store.set("api-key", key);
      apiKey.value = key;
      await fetchAvailableModels();

      return true;
    } catch (err) {
      logger.error("Failed to save API key", err);
      error.value = "Failed to save API key";
      return false;
    }
  };

  const validateApiKey = async (key: string): Promise<boolean> => {
    try {
      if (!key.startsWith("sk-or-") || key.length < 10) {
        logger.warn("Invalid API key format");
        error.value = "Invalid API key format";
        return false;
      }

      const response = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: {
          Authorization: key,
          "HTTP-Referer": window.location.origin,
        },
      });

      if (!response.ok) {
        logger.warn("API key test failed", { status: response.status });
        error.value = "Invalid API key";
        return false;
      }

      return true;
    } catch (err) {
      logger.error("Error validating API key", err);
      error.value = "Failed to validate API key";
      return false;
    }
  };

  // Set current model
  function setModel(modelId: string) {
    if (availableModels.value.find((m: OpenRouterModel) => m.id === modelId)) {
      currentModel.value = modelId;
    }
  }

  // Get enabled models
  const enabledModels = computed(() => {
    if (!availableModels.value?.length) return [];

    return [...availableModels.value].sort((a, b) => {
      // First priority: Recent usage
      const aRecentIndex = recentModelIds.value.indexOf(a.id);
      const bRecentIndex = recentModelIds.value.indexOf(b.id);

      // If either is in recent models, sort by recency
      if (aRecentIndex !== -1 || bRecentIndex !== -1) {
        // If both are recent, use their order
        if (aRecentIndex !== -1 && bRecentIndex !== -1) {
          return aRecentIndex - bRecentIndex;
        }
        // If only one is recent, it goes first
        return aRecentIndex !== -1 ? -1 : 1;
      }

      // For non-recent models, sort by cost then name
      const costA = (model: OpenRouterModel) =>
        model.pricing
          ? (Number(model.pricing.prompt) + Number(model.pricing.completion)) /
            2
          : 0;
      const costB = (model: OpenRouterModel) =>
        model.pricing
          ? (Number(model.pricing.prompt) + Number(model.pricing.completion)) /
            2
          : 0;
      const modelCostA = costA(a);
      const modelCostB = costB(b);
      if (modelCostA !== modelCostB) return modelCostB - modelCostA;
      return (a.name || a.id).localeCompare(b.name || b.id);
    });
  });

  const sendMessage = async (
    content: string,
    options: {
      model?: string;
      temperature?: number;
      includedFiles?: IncludedFile[];
      conversationHistory?: ChatMessage[];
      onToken?: (token: string) => void;
    }
  ): Promise<OpenRouterResponse> => {
    if (!hasValidKey.value) {
      throw new Error("No valid API key");
    }

    let userMessage = content;

    // Process included files
    if (options.includedFiles?.length) {
      logger.debug("Processing included files", {
        count: options.includedFiles.length,
      });

      for (const file of options.includedFiles) {
        const mentionPattern = new RegExp(`@${file.title}\\b`);
        userMessage = userMessage.replace(
          mentionPattern,
          `@${file.title}\n\nContent of ${file.title}:\n\`\`\`\n${file.content}\n\`\`\`\n\n`
        );
      }
    }

    // Build messages array with conversation history
    const messages = options.conversationHistory
      ? [...options.conversationHistory, { role: "user", content: userMessage }]
      : [{ role: "user", content: userMessage }];

    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey.value}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            model: options.model || currentModel.value,
            messages,
            temperature: options.temperature ?? temperature.value,
            stream: !!options.onToken,
            // Add vision: true if the message contains images
            vision: userMessage.includes("data:image/"),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      if (options.onToken) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let content = "";
        let totalTokens = 0;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (!line.trim() || !line.startsWith("data: ")) continue;

              const data = line.slice(5).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const token = parsed.choices?.[0]?.delta?.content;
                if (token) {
                  content += token;
                  totalTokens++;
                  options.onToken(token);
                }
              } catch (e) {
                logger.debug("Failed to parse streaming response line:", {
                  line,
                  error: e,
                  data,
                });
                // Don't throw on parse errors, just skip invalid lines
                continue;
              }
            }
          }
        }

        // Calculate approximate cost for streaming response using the specified model
        const modelId = options.model || currentModel.value;
        const modelCost = getModelCost(modelId);
        const estimatedPromptTokens = messages.reduce(
          (sum, msg) => sum + (msg.content?.length || 0) / 4,
          0
        );

        return {
          content,
          usage: {
            prompt_tokens: Math.ceil(estimatedPromptTokens),
            completion_tokens: totalTokens,
            total_tokens: Math.ceil(estimatedPromptTokens) + totalTokens,
          },
          cost: ((estimatedPromptTokens + totalTokens) * modelCost) / 1000000,
          model: modelId, // Add model to response for accurate cost tracking
        };
      }

      // Handle non-streaming response
      const data = await response.json();
      const modelId = options.model || currentModel.value;
      trackModelUsage(modelId);
      const modelCost = getModelCost(modelId);

      return {
        content: data.choices[0].message.content,
        usage: data.usage,
        cost: data.usage
          ? ((data.usage.prompt_tokens + data.usage.completion_tokens) *
              modelCost) /
            1000000
          : 0,
        model: modelId,
      };
    } catch (err) {
      logger.error("Failed to send message", err);
      throw err;
    }
  };

  async function loadChat(id: string) {
    try {
      isLoading.value = true;
      currentChatId.value = id;

      const { supabase } = useSupabase();
      const { data: chat, error: chatError } = await supabase
        .from("vulpeculachats")
        .select("*")
        .eq("id", id)
        .single();

      if (chatError) throw chatError;

      messages.value = chat.messages.map((m: ChatMessage) => ({
        ...m,
        timestamp: m.timestamp || new Date().toISOString(),
      }));
      currentModel.value = chat.metadata?.lastModel || currentModel.value;
      chatStats.value = chat.metadata?.stats || {};

      return chat;
    } catch (err) {
      logger.error("Error loading chat", err);
      error.value = "Failed to load chat";
    } finally {
      isLoading.value = false;
    }
  }

  function clearChat() {
    messages.value = [];
    currentChatId.value = null;
    chatStats.value = {};
  }

  function updateTemperature(value: number) {
    temperature.value = value;
  }

  function exportChat() {
    // Implementation
  }

  // Create singleton instance
  instance = {
    apiKey,
    setApiKey: saveApiKey,
    hasValidKey,
    messages,
    isLoading,
    error,
    currentModel,
    modelName,
    availableModels,
    enabledModels,
    recentModels,
    saveApiKey,
    trackModelUsage,
    fetchAvailableModels,
    getModelCost,
    formatModelCost,
    setModel,
    currentChatId,
    loadChat,
    clearChat,
    chatStats,
    temperature,
    updateTemperature,
    exportChat,
    sendMessage,
    validateApiKey,
  };

  return instance;
}
