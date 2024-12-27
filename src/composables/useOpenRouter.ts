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
    }
  ) => Promise<OpenRouterResponse>;
  validateApiKey: (key: string) => Promise<boolean>;
}

export function useOpenRouter(): UseOpenRouterReturn {
  const store = useStore();
  const apiKey = ref("");
  const messages = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const currentModel = ref("anthropic/claude-3-sonnet:beta");
  const currentChatId = ref<string | null>(null);
  const chatStats = ref<any>({});
  const temperature = ref(0.7);
  const isInitialized = ref(false);

  const modelName = computed(() => {
    const model = availableModels.value.find(
      (m: OpenRouterModel) => m.id === currentModel.value
    );
    return model?.name || currentModel.value;
  });

  const hasValidKey = computed(() => {
    logger.debug("Checking API key validity", {
      hasKey: !!apiKey.value,
      validFormat:
        apiKey.value.startsWith("sk-or-") && apiKey.value.length > 10,
      modelsLoaded: availableModels.value.length > 0,
    });

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

    // For very small numbers (less than 0.01)
    if (cost < 0.01) {
      return `$${cost.toFixed(5)}`;
    }

    // For small numbers (less than 0.1)
    if (cost < 0.1) {
      return `$${cost.toFixed(4)}`;
    }

    // For numbers less than 1
    if (cost < 1) {
      return `$${cost.toFixed(3)}`;
    }

    // For regular numbers
    return `$${cost.toFixed(2)}`;
  }

  // Fetch available models from OpenRouter API
  async function fetchAvailableModels({ includeAll = false } = {}) {
    try {
      logger.debug("Fetching models from OpenRouter API");
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: {
          Authorization: apiKey.value,
          "HTTP-Referer": window.location.origin,
        },
      });

      if (!response.ok) {
        logger.error("Failed to fetch models", {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Map all available models
      const processedModels = data.data
        .filter((model: any) => {
          // Filter out any invalid models - ensure required fields exist
          const isValid =
            model.id &&
            model.context_length &&
            model.pricing?.prompt &&
            model.pricing?.completion;

          if (!isValid) {
            logger.warn("Invalid model filtered out", { id: model.id });
          }
          return isValid;
        })
        .map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description,
          context_length: model.context_length,
          pricing: {
            prompt: String(model.pricing.prompt),
            completion: String(model.pricing.completion),
          },
        }));

      logger.debug("Models processed", {
        total: processedModels.length,
      });

      availableModels.value = processedModels;

      // If we don't have any enabled models yet, enable some defaults
      if (enabledModelIds.value.length === 0) {
        logger.debug("Setting default enabled models");
        enabledModelIds.value = [
          "anthropic/claude-3-sonnet:beta",
          "anthropic/claude-2.1",
          "openai/gpt-4-turbo",
          "openai/gpt-3.5-turbo",
        ];
        await store.set("enabledModelIds", enabledModelIds.value);
      }

      logger.debug("Models initialization complete", {
        total: availableModels.value.length,
        enabled: enabledModelIds.value.length,
      });
    } catch (error) {
      logger.error("Failed to fetch models", error);
      availableModels.value = [];
    }
  }

  // Initialize API key and enabled models
  const initialize = async () => {
    logger.debug("Initializing OpenRouter");
    try {
      isLoading.value = true;
      error.value = null;

      // Load API key
      const storedKey = await store.get("api-key");
      logger.debug("API key loaded", { hasKey: !!storedKey });

      if (storedKey) {
        apiKey.value = storedKey;
        const isValid = await validateApiKey(storedKey);
        logger.debug("API key validated", { isValid });
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

      // Fetch models if we have a key
      if (apiKey.value) {
        await fetchAvailableModels();
      }

      logger.debug("OpenRouter initialization complete");
    } catch (err) {
      logger.error("Failed to initialize OpenRouter", err);
    } finally {
      isLoading.value = false;
    }
  };

  // Call initialize on mount
  onMounted(initialize);

  // Track model usage
  function trackModelUsage(modelId: string) {
    logger.debug("Tracking model usage", { modelId });

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

  // Watch for API key changes to fetch models
  watch(apiKey, async (newKey) => {
    if (newKey) {
      await fetchAvailableModels();
    } else {
      availableModels.value = [];
    }
  });

  // Watch for enabled models changes
  watch(
    enabledModelIds,
    async (newIds) => {
      try {
        await store.set("enabled-model-ids", [...newIds]);
        await store.set("enabledModelIds", [...newIds]);
      } catch (error) {
        console.error("Error saving enabled models:", error);
      }
    },
    { deep: true }
  );

  // Load API key from store
  const loadApiKey = async () => {
    const storedKey = await store.get("api-key");
    if (storedKey) {
      apiKey.value = storedKey;
      await validateApiKey(storedKey);
    }
  };

  // Save API key to store
  const saveApiKey = async (key: string): Promise<boolean> => {
    try {
      const isValid = await validateApiKey(key);
      if (!isValid) {
        logger.warn("API key validation failed");
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

    const messages = [{ role: "user", content: userMessage }];

    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey.value}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
          },
          body: JSON.stringify({
            model: options.model || currentModel.value,
            messages,
            temperature: options.temperature ?? temperature.value,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      trackModelUsage(options.model || currentModel.value);

      return {
        content: data.choices[0].message.content,
        usage: data.usage,
        cost: data.usage
          ? (data.usage.prompt_tokens * getModelCost(currentModel.value)) /
            1000000
          : 0,
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

  return {
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
}
