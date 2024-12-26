import { ref, computed, watch, onMounted } from "vue";
import { useStore } from "../lib/store";
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
    console.log("useOpenRouter: Checking hasValidKey:", {
      apiKey: apiKey.value ? "Key exists" : "No key",
      keyFormat: apiKey.value.startsWith("sk-or-") && apiKey.value.length > 10,
      modelsLoaded: availableModels.value.length > 0,
    });

    // Only require the key format check since models may not be loaded yet
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
    if (!model) return 0;
    // Average of prompt and completion cost per 1M tokens
    const promptCost = model.pricing.prompt || 0;
    const completionCost = model.pricing.completion || 0;
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
      console.log("Raw OpenRouter response:", data);

      // Map all available models
      availableModels.value = data.data
        .filter((model: any) => {
          // Filter out any invalid models
          return model.id && model.name && model.pricing;
        })
        .map((model: any) => ({
          id: model.id,
          name: model.name,
          description: model.description,
          context_length: model.context_length,
          pricing: {
            prompt: Number(model.pricing.prompt),
            completion: Number(model.pricing.completion),
          },
        }));

      // If we don't have any enabled models yet, enable some defaults
      if (enabledModelIds.value.length === 0) {
        enabledModelIds.value = [
          "anthropic/claude-3-sonnet:beta",
          "anthropic/claude-2.1",
          "openai/gpt-4-turbo",
          "openai/gpt-3.5-turbo",
        ];
        await store.set("enabledModelIds", enabledModelIds.value);
      }

      console.log("Processed models:", {
        total: availableModels.value.length,
        enabled: enabledModelIds.value.length,
        models: availableModels.value,
      });
    } catch (error) {
      console.error("Failed to fetch models:", error);
      availableModels.value = [];
    }
  }

  // Initialize API key and enabled models
  const initialize = async () => {
    console.log("🔄 Initializing OpenRouter...");
    try {
      isLoading.value = true;
      error.value = null;

      // Load API key
      console.log("🔍 Loading API key from store...");
      const storedKey = await store.get("api-key");
      console.log(
        "📥 Loaded API key:",
        storedKey ? "Found key" : "No key found"
      );

      if (storedKey) {
        console.log("🔑 Setting API key and validating...");
        apiKey.value = storedKey;
        await validateApiKey(storedKey);
      }

      // Load enabled models (try both formats)
      console.log("📥 Loading enabled models...");
      const storedEnabledIds =
        (await store.get("enabled-model-ids")) ||
        (await store.get("enabledModelIds"));
      if (storedEnabledIds) {
        console.log("✅ Found enabled models:", storedEnabledIds);
        enabledModelIds.value = storedEnabledIds;
      }

      // Load recent models (try both formats)
      console.log("📥 Loading recent models...");
      const storedRecentIds =
        (await store.get("recent-model-ids")) ||
        (await store.get("recentModelIds"));
      if (storedRecentIds) {
        console.log("✅ Found recent models:", storedRecentIds);
        recentModelIds.value = storedRecentIds;
      }

      // Fetch models if we have a key
      if (apiKey.value) {
        console.log("🔄 Fetching available models...");
        await fetchAvailableModels();
      }

      console.log("✅ OpenRouter initialization complete");
      isInitialized.value = true;
    } catch (err) {
      console.error("❌ Failed to initialize OpenRouter:", err);
      error.value = "Failed to initialize OpenRouter";
    } finally {
      isLoading.value = false;
    }
  };

  // Call initialize on mount
  onMounted(initialize);

  // Track model usage
  function trackModelUsage(modelId: string) {
    console.log("Tracking usage for model:", modelId);
    console.log("Before update:", recentModelIds.value);

    // Create a new plain array with the updated model IDs
    const updatedIds = [
      modelId,
      ...Array.from(recentModelIds.value.filter((id) => id !== modelId)),
    ];

    // Keep only last 10
    const trimmedIds = updatedIds.slice(0, 10);

    // Update the ref
    recentModelIds.value = trimmedIds;

    console.log("After update:", recentModelIds.value);

    // Save plain array to store (both formats)
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
    console.log("🔑 Attempting to save API key");
    try {
      // First validate the key
      console.log("🔍 Validating API key...");
      const isValid = await validateApiKey(key);
      if (!isValid) {
        console.warn("⚠️ API key validation failed");
        error.value = "Invalid API key";
        return false;
      }
      console.log("✅ API key validation successful");

      // Then save it
      console.log("💾 Saving API key to store...");
      await store.set("api-key", key);
      apiKey.value = key;
      console.log("✅ API key saved to store");

      // Fetch models to verify the key works
      console.log("🔄 Fetching models to verify key...");
      await fetchAvailableModels();
      console.log("✅ Models fetched successfully");

      return true;
    } catch (err) {
      console.error("❌ Failed to save API key:", err);
      error.value = "Failed to save API key";
      return false;
    }
  };

  const validateApiKey = async (key: string): Promise<boolean> => {
    console.log("🔍 Validating API key format and access...");
    try {
      // Basic format validation
      if (!key.startsWith("sk-or-") || key.length < 10) {
        console.warn("⚠️ Invalid API key format");
        error.value = "Invalid API key format";
        return false;
      }
      console.log("✅ API key format is valid");

      // Test the key by trying to fetch models
      console.log("🔄 Testing API key with models endpoint...");
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: {
          Authorization: key,
          "HTTP-Referer": window.location.origin,
        },
      });

      if (!response.ok) {
        console.warn("⚠️ API key test failed:", response.status);
        error.value = "Invalid API key";
        return false;
      }

      console.log("✅ API key test successful");
      return true;
    } catch (err) {
      console.error("❌ Error validating API key:", err);
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
      const costA = (a.pricing.prompt + a.pricing.completion) / 2;
      const costB = (b.pricing.prompt + b.pricing.completion) / 2;
      if (costA !== costB) return costB - costA;
      return a.name.localeCompare(b.name);
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

    // Replace @mentions with actual file contents
    if (options.includedFiles?.length) {
      console.log(
        "📎 useOpenRouter: Processing included files:",
        options.includedFiles.map((f) => ({
          title: f.title,
          path: f.path,
          contentPreview: f.content?.slice(0, 100) + "...",
        }))
      );

      for (const file of options.includedFiles) {
        const mentionPattern = new RegExp(`@${file.title}\\b`);
        userMessage = userMessage.replace(
          mentionPattern,
          `@${file.title}\n\nContent of ${file.title}:\n\`\`\`\n${file.content}\n\`\`\`\n\n`
        );
      }

      console.log(
        "📝 useOpenRouter: Created user message with embedded files:",
        userMessage.slice(0, 200) + "..."
      );
    }

    // Build the messages array - no system message needed now
    const messages = [{ role: "user", content: userMessage }];

    try {
      console.log(
        "🚀 useOpenRouter: Sending request with messages:",
        messages.map((m) => ({
          role: m.role,
          contentPreview: m.content.slice(0, 100) + "...",
        }))
      );

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
      console.log("OpenRouter response:", data);

      // Track model usage
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
      console.error("Failed to send message:", err);
      throw err;
    }
  };

  async function loadChat(id: string) {
    try {
      isLoading.value = true;
      currentChatId.value = id;

      // Load chat history from Supabase
      const { supabase } = useSupabase();
      const { data: chat, error } = await supabase
        .from("vulpeculachats")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Update state with basic message format
      messages.value = chat.messages.map((m: ChatMessage) => ({
        ...m,
        timestamp: m.timestamp || new Date().toISOString(),
      }));
      currentModel.value = chat.metadata?.lastModel || currentModel.value;
      chatStats.value = chat.metadata?.stats || {};

      return chat;
    } catch (err) {
      console.error("Error loading chat:", err);
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
