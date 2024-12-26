import { ref, computed } from "vue";
import type { ChatMessage } from "../types";

export function useChat() {
  const messages = ref<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello, how can I help you today?",
      timestamp: new Date("2024-03-20T10:30:00").toISOString(),
    },
    {
      id: "2",
      role: "user",
      content: "I'm looking for information on your services.",
      timestamp: new Date("2024-03-20T10:32:00").toISOString(),
    },
  ]);

  const newMessage = ref("");

  const sortedMessages = computed(() => {
    return [...messages.value].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  });

  function formatTimestamp(date: string) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(new Date(date));
  }

  function sendMessage(content: string) {
    if (!content.trim()) return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    messages.value.push(message);
    newMessage.value = ""; // Clear input
  }

  return {
    messages: sortedMessages,
    newMessage,
    sendMessage,
    formatTimestamp,
  };
}
