import { ref, computed, watch } from "vue";
import { useStore } from "../lib/store";
import type { Ref, ComputedRef } from "vue";
import type { OpenRouterModel } from "../types";
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
  fetchAvailableModels: () => Promise<void>;
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
  sendMessage: (content: string, includedFiles?: any[]) => Promise<void>;
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

  const modelName = computed(() => {
    const model = availableModels.value.find(
      (m: OpenRouterModel) => m.id === currentModel.value
    );
    return model?.name || currentModel.value;
  });

  const hasValidKey = computed(() => apiKey.value.length > 0);
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
  async function fetchAvailableModels() {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey.value}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      availableModels.value = data.data.map((model: OpenRouterModel) => ({
        id: model.id,
        name: model.name,
        description: model.description,
        context_length: model.context_length,
        pricing: {
          prompt: model.pricing.prompt,
          completion: model.pricing.completion,
        },
      }));
    } catch (error) {
      console.error("Failed to fetch models:", error);
      availableModels.value = [];
    }
  }

  // Initialize API key and enabled models
  Promise.all([
    store.get("openrouter-api-key"),
    store.get("enabledModelIds"),
    store.get("recentModelIds"),
  ]).then(async ([key, modelIds, recentIds]) => {
    apiKey.value = key || "";
    if (Array.isArray(modelIds) && modelIds.length > 0) {
      enabledModelIds.value = modelIds;
    }
    if (Array.isArray(recentIds)) {
      recentModelIds.value = recentIds;
    }

    // Fetch models if we have an API key
    if (key) {
      await fetchAvailableModels();
    }
  });

  // Track model usage
  function trackModelUsage(modelId: string) {
    // Remove if exists and add to front
    recentModelIds.value = [
      modelId,
      ...recentModelIds.value.filter((id) => id !== modelId),
    ];
    // Keep only last 10
    if (recentModelIds.value.length > 10) {
      recentModelIds.value = recentModelIds.value.slice(0, 10);
    }
    // Save to store
    store.set("recentModelIds", recentModelIds.value);
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
        await store.set("enabledModelIds", [...newIds]);
      } catch (error) {
        console.error("Error saving enabled models:", error);
      }
    },
    { deep: true }
  );

  // Save API key
  async function setApiKey(key: string): Promise<boolean> {
    try {
      await store.set("openrouter-api-key", key);
      apiKey.value = key;
      return true;
    } catch (error) {
      console.error("Failed to save API key:", error);
      return false;
    }
  }

  // Set current model
  function setModel(modelId: string) {
    if (availableModels.value.find((m: OpenRouterModel) => m.id === modelId)) {
      currentModel.value = modelId;
    }
  }

  // Get enabled models
  const enabledModels = computed(() => {
    return availableModels.value
      .filter((model: OpenRouterModel) =>
        enabledModelIds.value.includes(model.id)
      )
      .sort((a: OpenRouterModel, b: OpenRouterModel) => {
        const costA = (a.pricing.prompt + a.pricing.completion) / 2;
        const costB = (b.pricing.prompt + b.pricing.completion) / 2;
        // Free models go to the bottom
        if (costA === 0 && costB !== 0) return 1;
        if (costB === 0 && costA !== 0) return -1;
        return costB - costA;
      });
  });

  async function sendMessage(content: string, includedFiles: any[] = []) {
    if (!content.trim()) return;
    isLoading.value = true;
    error.value = null;

    try {
      // Add user message
      const userMessage = {
        role: "user",
        content,
        timestamp: new Date().toISOString(),
        includedFiles,
      };
      messages.value = [...messages.value, userMessage];

      // Prepare API call
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey.value}`,
            "HTTP-Referer": window.location.origin,
          },
          body: JSON.stringify({
            model: currentModel.value,
            messages: messages.value.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            temperature: temperature.value,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Add AI response
      const assistantMessage = {
        role: "assistant",
        content: data.choices[0].message.content,
        timestamp: new Date().toISOString(),
        model: currentModel.value,
      };
      messages.value = [...messages.value, assistantMessage];

      // Save to Supabase if configured
      const { supabase } = useSupabase();
      if (supabase) {
        const chatId = currentChatId.value || crypto.randomUUID();
        const { error: saveError } = await supabase
          .from("vulpeculachats")
          .upsert({
            id: chatId,
            model: currentModel.value,
            messages: messages.value,
            metadata: {
              title: messages.value[0]?.content.slice(0, 100) || "New Chat",
              lastModel: currentModel.value,
              stats: chatStats.value,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (saveError) throw saveError;

        // Update current chat ID if this is a new chat
        if (!currentChatId.value) {
          currentChatId.value = chatId;
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      error.value = "Failed to send message";
    } finally {
      isLoading.value = false;
    }
  }

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
      messages.value = chat.messages.map((m) => ({
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
    setApiKey,
    hasValidKey,
    messages,
    isLoading,
    error,
    currentModel,
    modelName,
    availableModels,
    enabledModels,
    recentModels,
    saveApiKey: setApiKey,
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
  };
}
