import { ref, computed } from "vue";
import type { ChatMessage, Chat } from "../types";

export function useChat() {
  const messages = ref<ChatMessage[]>([]);
  const newMessage = ref("");
  const currentChat = ref<Chat | null>(null);

  const sortedMessages = computed(() => {
    return [...messages.value].sort(
      (a, b) =>
        new Date(a.timestamp || new Date()).getTime() -
        new Date(b.timestamp || new Date()).getTime()
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

  function importMessages(newMessages: ChatMessage[]): Chat {
    // Create a new chat with the imported messages
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: "Imported Chat",
      messages: newMessages,
      model: "openai/gpt-3.5-turbo", // Default model
      metadata: {
        lastUpdated: new Date().toISOString(),
        messageCount: newMessages.length,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Set as current chat
    currentChat.value = newChat;
    messages.value = newMessages;

    return newChat;
  }

  return {
    messages: sortedMessages,
    newMessage,
    currentChat,
    sendMessage,
    formatTimestamp,
    importMessages,
  };
}
