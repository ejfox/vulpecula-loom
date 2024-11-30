import { ref, computed, watch } from "vue";
import { useStore } from "../lib/store";

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: number;
    completion: number;
  };
}

export function useOpenRouter() {
  const store = useStore();
  const apiKey = ref("");
  const hasValidKey = computed(() => apiKey.value.length > 0);
  const availableModels = ref<OpenRouterModel[]>([]);
  const enabledModelIds = ref<string[]>([
    "anthropic/claude-3-sonnet:beta",
    "anthropic/claude-2.1",
    "openai/gpt-4-turbo",
    "openai/gpt-3.5-turbo",
  ]);
  const recentModelIds = ref<string[]>([]);

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
      .map((id) => availableModels.value.find((m) => m.id === id))
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
  async function saveApiKey(key: string) {
    try {
      await store.set("openrouter-api-key", key);
      apiKey.value = key;
      return true;
    } catch (error) {
      console.error("Failed to save API key:", error);
      return false;
    }
  }

  // Fetch available models from OpenRouter API
  async function fetchAvailableModels() {
    if (!hasValidKey.value) return;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey.value}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      availableModels.value = data.data.map((model: any) => ({
        id: model.id,
        name: model.name,
        description: model.description,
        context_length: model.context_length,
        pricing: {
          prompt: (parseFloat(model.pricing.prompt) || 0) * 1000,
          completion: (parseFloat(model.pricing.completion) || 0) * 1000,
        },
      }));
    } catch (error) {
      console.error("Failed to fetch models:", error);
      availableModels.value = [];
    }
  }

  // Computed property to get just the enabled models
  const enabledModels = computed(() => {
    return availableModels.value
      .filter((model) => enabledModelIds.value.includes(model.id))
      .sort((a, b) => {
        const costA = (a.pricing.prompt + a.pricing.completion) / 2;
        const costB = (b.pricing.prompt + b.pricing.completion) / 2;
        // Free models go to the bottom
        if (costA === 0 && costB !== 0) return 1;
        if (costB === 0 && costA !== 0) return -1;
        // Sort by cost descending (most expensive first)
        return costB - costA;
      });
  });

  // Get sorted models for settings display
  const sortedAvailableModels = computed(() => {
    return [...availableModels.value].sort((a, b) => {
      const costA = (a.pricing.prompt + a.pricing.completion) / 2;
      const costB = (b.pricing.prompt + b.pricing.completion) / 2;
      // Free models go to the bottom
      if (costA === 0 && costB !== 0) return 1;
      if (costB === 0 && costA !== 0) return -1;
      // Sort by cost descending (most expensive first)
      return costB - costA;
    });
  });

  // Get cost per 1M tokens for a model
  function getModelCost(modelId: string): number {
    const model = availableModels.value.find((m) => m.id === modelId);
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

  return {
    apiKey,
    hasValidKey,
    availableModels,
    sortedAvailableModels,
    enabledModels,
    enabledModelIds,
    recentModels,
    trackModelUsage,
    saveApiKey,
    fetchAvailableModels,
    getModelCost,
    formatModelCost,
  };
}
