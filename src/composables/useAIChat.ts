import { ref, computed } from "vue";
import { useLocalStorage } from "@vueuse/core";
import { useOpenRouter, type OpenRouterModel } from "./useOpenRouter";
import { useSupabase } from "./useSupabase";
import type { ChatHistory } from "./useSupabase";

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  model?: string;
  tokens?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  cost?: number;
}

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface StoredMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  model?: string;
  tokens?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  cost?: number;
}

export function useAIChat() {
  const {
    apiKey,
    hasValidKey: hasValidOpenRouterKey,
    availableModels,
    enabledModels,
  } = useOpenRouter();
  const {
    saveChatHistory,
    updateChatHistory,
    isConfigured: hasValidSupabaseConfig,
  } = useSupabase();

  const messages = ref<AIMessage[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const currentModel = useLocalStorage(
    "ai-chat-model",
    "anthropic/claude-3-sonnet:beta"
  );
  const currentChatId = ref<string | null>(null);
  const temperature = ref(0.7);
  const chatStats = ref({
    promptTokens: 0,
    completionTokens: 0,
    cost: 0,
    totalMessages: 0,
  });

  const modelName = computed(() => {
    const model = availableModels.value.find(
      (m) => m.id === currentModel.value
    );
    return model?.name ?? "Unknown Model";
  });

  const formattedMessages = computed(() =>
    messages.value.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
    }))
  );

  function recalculateStats() {
    const stats = {
      promptTokens: 0,
      completionTokens: 0,
      cost: 0,
      totalMessages: messages.value.length,
    };

    messages.value.forEach((message) => {
      if (message.tokens) {
        if (message.tokens.prompt) {
          stats.promptTokens += message.tokens.prompt;
        }
        if (message.tokens.completion) {
          stats.completionTokens += message.tokens.completion;
        }

        const messageCost = calculateCost(
          {
            prompt_tokens: message.tokens.prompt || 0,
            completion_tokens: message.tokens.completion || 0,
            total_tokens: message.tokens.total || 0,
          },
          message.model
        );

        stats.cost += messageCost;
      }
    });

    chatStats.value = stats;
  }

  async function sendMessage(content: string) {
    if (!content.trim() || isLoading.value) return;
    error.value = null;

    try {
      isLoading.value = true;

      // Add user message with current model
      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
        model: currentModel.value,
        tokens: {
          prompt: 0, // Will be updated when we get the response
          completion: 0,
          total: 0,
        },
      };
      messages.value.push(userMessage);

      // Create assistant message placeholder
      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        model: currentModel.value,
        tokens: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
      };
      messages.value.push(assistantMessage);

      // Get AI response with streaming
      const response = await chat(
        formattedMessages.value,
        {
          model: currentModel.value,
          temperature: temperature.value,
          max_tokens: 1000,
        },
        {
          onToken: (token) => {
            assistantMessage.content += token;
            messages.value = [...messages.value];
          },
          onUsage: (usage) => {
            // Update both user and assistant message tokens
            userMessage.tokens = {
              prompt: usage.prompt_tokens,
              completion: 0,
              total: usage.prompt_tokens,
            };
            userMessage.cost = calculateCost(
              {
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: 0,
                total_tokens: usage.prompt_tokens,
              },
              userMessage.model
            );

            assistantMessage.tokens = {
              prompt: 0,
              completion: usage.completion_tokens,
              total: usage.completion_tokens,
            };
            assistantMessage.cost = calculateCost(
              {
                prompt_tokens: 0,
                completion_tokens: usage.completion_tokens,
                total_tokens: usage.completion_tokens,
              },
              assistantMessage.model
            );

            // Recalculate total stats
            recalculateStats();

            messages.value = [...messages.value];
          },
          onComplete: () => {
            saveToSupabase(assistantMessage);
          },
          onError: (err) => {
            error.value = "Error during streaming response";
            console.error("Streaming error:", err);
          },
        }
      );
    } catch (err: unknown) {
      const messageError = err as Error;
      console.error("Error sending message:", messageError);
      error.value = "Failed to send message";
    } finally {
      isLoading.value = false;
    }
  }

  async function saveToSupabase(assistantMessage: AIMessage) {
    console.group("Saving to Supabase");
    console.log("Current chat ID:", currentChatId.value);
    console.log("Assistant message:", assistantMessage);

    if (!hasValidSupabaseConfig.value) {
      console.error("Supabase not configured properly");
      error.value = "Supabase connection error";
      console.groupEnd();
      return;
    }

    try {
      // Include token and cost data in the messages
      const formattedMessagesWithMetadata = messages.value.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        model: msg.model,
        tokens: msg.tokens, // Include token data
        cost: msg.cost, // Include cost data
      }));

      const metadata = {
        lastModel: currentModel.value,
        lastUpdated: new Date().toISOString(),
        stats: {
          promptTokens: chatStats.value.promptTokens,
          completionTokens: chatStats.value.completionTokens,
          cost: chatStats.value.cost,
        },
      };
      console.log("Saving with metadata:", metadata);
      console.log(
        "Saving messages with token data:",
        formattedMessagesWithMetadata
      );

      if (currentChatId.value) {
        console.log("Updating existing chat");
        await updateChatHistory(
          currentChatId.value,
          formattedMessagesWithMetadata,
          metadata
        );
      } else {
        console.log("Creating new chat");
        const savedChat = await saveChatHistory({
          model: currentModel.value,
          messages: formattedMessagesWithMetadata,
          title: messages.value[0].content.slice(0, 50) + "...",
          metadata,
        });
        currentChatId.value = savedChat.id;
        console.log("New chat created with ID:", savedChat.id);
      }
    } catch (err: unknown) {
      console.error("Supabase operation failed:", err);
      error.value = "Failed to save chat history";
    } finally {
      console.groupEnd();
    }
  }

  async function loadChat(chatId: string) {
    console.group("Loading Chat:", chatId);
    const { loadChatHistory } = useSupabase();

    try {
      const history = await loadChatHistory(chatId);
      console.log("Raw history from Supabase:", history);

      // Convert stored messages to AIMessages with proper types and dates
      messages.value = history.messages.map((msg: StoredMessage) => {
        console.log("Processing message:", {
          role: msg.role,
          originalTokens: msg.tokens,
          originalCost: msg.cost,
          model: msg.model || history.model,
        });

        // Use stored token data if available, otherwise calculate
        const tokens = msg.tokens || {
          prompt: msg.role === "user" ? 0 : 0,
          completion: msg.role === "assistant" ? 0 : 0,
          total: 0,
        };

        // Use stored cost if available, otherwise calculate
        const cost =
          msg.cost ||
          calculateCost(
            {
              prompt_tokens: tokens.prompt || 0,
              completion_tokens: tokens.completion || 0,
              total_tokens: tokens.total || 0,
            },
            msg.model || history.model
          );

        console.log("Using tokens:", tokens);
        console.log("Using cost:", cost);

        return {
          id: crypto.randomUUID(),
          ...msg,
          timestamp: new Date(msg.timestamp),
          model: msg.model || history.model,
          tokens,
          cost,
        };
      });

      currentChatId.value = chatId;

      // Recalculate total stats
      recalculateStats();
    } catch (error) {
      console.error("Error loading chat:", error);
    } finally {
      console.groupEnd();
    }
  }

  function clearChat() {
    messages.value = [];
    currentChatId.value = null;
    chatStats.value = {
      promptTokens: 0,
      completionTokens: 0,
      cost: 0,
      totalMessages: 0,
    };
  }

  function setModel(modelId: string) {
    if (availableModels.value.find((m) => m.id === modelId)) {
      currentModel.value = modelId;
    }
  }

  function calculateCost(usage: TokenUsage, model: string | undefined): number {
    const pricing: Record<string, { input: number; output: number }> = {
      "anthropic/claude-3.5-sonnet:beta": {
        input: 0.000015,
        output: 0.000015,
      },
    };

    // Use current model as fallback if message model is undefined
    const modelToUse = model || currentModel.value;
    const modelPricing = pricing[modelToUse] || { input: 0, output: 0 };

    return (
      usage.prompt_tokens * modelPricing.input +
      usage.completion_tokens * modelPricing.output
    );
  }

  function generateMarkdown(): string {
    const lines: string[] = [];

    // Add YAML frontmatter
    lines.push("---");
    lines.push(`title: "${messages.value[0]?.content.slice(0, 50)}..."`);
    lines.push(`date: ${new Date().toISOString()}`);
    lines.push(`model: ${modelName.value}`);
    lines.push(`stats:`);
    lines.push(
      `  total_tokens: ${
        chatStats.value.promptTokens + chatStats.value.completionTokens
      }`
    );
    lines.push(`  prompt_tokens: ${chatStats.value.promptTokens}`);
    lines.push(`  completion_tokens: ${chatStats.value.completionTokens}`);
    lines.push(`  cost: ${chatStats.value.cost.toFixed(4)}`);
    lines.push(`messages_count: ${messages.value.length}`);
    lines.push(`temperature: ${temperature.value}`);
    if (currentChatId.value) {
      lines.push(`chat_id: ${currentChatId.value}`);
    }
    lines.push(`models_used:`);
    // Get unique models used in conversation
    const uniqueModels = [...new Set(messages.value.map((msg) => msg.model))];
    uniqueModels.forEach((model) => {
      if (model) lines.push(`  - ${model}`);
    });
    lines.push("---");
    lines.push("");

    // Add messages
    messages.value.forEach((msg) => {
      const role = msg.role === "user" ? "👤 User" : "🤖 Assistant";
      const timestamp = msg.timestamp.toISOString();
      lines.push(`### ${role} (${timestamp})`);
      lines.push("");
      lines.push(msg.content);
      lines.push("");
      lines.push("<details><summary>Message Metadata</summary>");
      lines.push("");
      lines.push("```yaml");
      lines.push(`role: ${msg.role}`);
      lines.push(`model: ${msg.model}`);
      lines.push(`timestamp: ${timestamp}`);
      if (msg.tokens) {
        lines.push("tokens:");
        lines.push(`  prompt: ${msg.tokens.prompt || 0}`);
        lines.push(`  completion: ${msg.tokens.completion || 0}`);
        lines.push(`  total: ${msg.tokens.total || 0}`);
      }
      if (msg.cost) {
        lines.push(`cost: ${msg.cost.toFixed(4)}`);
      }
      lines.push("```");
      lines.push("</details>");
      lines.push("");
      lines.push("---");
      lines.push("");
    });

    return lines.join("\n");
  }

  async function exportChat() {
    try {
      const markdown = generateMarkdown();
      const result = await window.electron.ipcRenderer.invoke(
        "export-markdown",
        markdown
      );
      if (result.success) {
        console.log("Chat exported successfully to:", result.path);
      }
    } catch (err) {
      console.error("Failed to export chat:", err);
      error.value = "Failed to export chat";
    }
  }

  async function chat(messages: any[], options: any = {}, callbacks: any = {}) {
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
          messages,
          model: options.model || "anthropic/claude-3-sonnet:beta",
          stream: true,
          ...options,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let content = "";
    let buffer = "";

    if (!reader) {
      throw new Error("No reader available");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;

        const data = trimmedLine.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content || "";
          content += token;

          if (parsed.usage) {
            callbacks.onUsage?.(parsed.usage);
          }

          callbacks.onToken?.(token);
        } catch (e) {
          console.error("Error parsing streaming response:", e, "Data:", data);
          continue;
        }
      }
    }

    callbacks.onComplete?.();

    return {
      content,
      usage: null,
    };
  }

  return {
    messages,
    isLoading,
    error,
    currentModel,
    modelName,
    hasValidKey: hasValidOpenRouterKey,
    hasValidSupabaseConfig,
    currentChatId,
    availableModels,
    enabledModels,
    sendMessage,
    clearChat,
    setModel,
    loadChat,
    temperature,
    chatStats,
    updateTemperature: (value: number) => (temperature.value = value),
    exportChat,
  };
}
