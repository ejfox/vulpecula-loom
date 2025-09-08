import { computed } from "vue";
import { apiClient } from "../lib/api-client";
import { useActiveUser } from "./useActiveUser-new";
import { logger } from "../lib/logger";
import type {
  Chat,
  ChatHistory,
  ChatMessage,
  ChatMetadata,
  Thread,
  ThreadOptions,
  ChatForkOptions,
  NewChat
} from "../types";

export interface UseApiReturn {
  isConfigured: ComputedRef<boolean>;
  saveChatHistory: (
    history: Omit<ChatHistory, "id" | "created_at" | "updated_at" | "user_id"> & {
      thread?: string;
    }
  ) => Promise<ChatHistory>;
  updateChatHistory: (
    id: string,
    messages: ChatMessage[],
    metadata?: ChatMetadata
  ) => Promise<ChatHistory>;
  loadChatHistory: (id: string) => Promise<ChatHistory>;
  loadChatHistories: (thread?: string) => Promise<ChatHistory[]>;
  deleteChat: (id: string) => Promise<void>;
  deleteAllChats: () => Promise<void>;
  updateChatMetadata: (
    chatId: string,
    metadata: Partial<ChatMetadata>
  ) => Promise<Chat | null>;
  forkChat: (options: ChatForkOptions) => Promise<Chat | null>;
  generateChatSummary: (
    chatId: string,
    messages: ChatMessage[]
  ) => Promise<Chat | null>;
  createThread: (options: ThreadOptions) => Promise<Thread | null>;
  addChatToThread: (chatId: string, threadId: string) => Promise<boolean>;
  getThreadChats: (threadId: string) => Promise<Chat[]>;
  removeChatFromThread: (chatId: string) => Promise<boolean>;
}

export function useApi(): UseApiReturn {
  const { userId, isAuthenticated } = useActiveUser();

  const isConfigured = computed(() => {
    return isAuthenticated.value && !!userId.value;
  });

  async function saveChatHistory(
    history: Omit<ChatHistory, "id" | "created_at" | "updated_at" | "user_id"> & {
      thread?: string;
    }
  ): Promise<ChatHistory> {
    try {
      if (!userId.value) throw new Error("User not authenticated");

      const chat = await apiClient.saveChat({
        title: history.title,
        messages: history.messages,
        model: history.model,
        metadata: {
          ...history.metadata,
          messageCount: history.messages.length,
          lastUpdated: new Date().toISOString()
        },
        threadId: history.thread || undefined
      });

      // Transform to ChatHistory format for compatibility
      return {
        id: chat.id,
        title: chat.title,
        messages: chat.messages,
        model: chat.model,
        metadata: chat.metadata,
        user_id: chat.userId,
        created_at: chat.createdAt.toISOString(),
        updated_at: chat.updatedAt.toISOString(),
        thread: chat.threadId || null
      };
    } catch (error) {
      logger.error("Error in saveChatHistory:", error);
      throw error;
    }
  }

  async function updateChatHistory(
    id: string,
    messages: ChatMessage[],
    metadata?: ChatMetadata
  ): Promise<ChatHistory> {
    try {
      if (!userId.value) throw new Error("User not authenticated");

      const chat = await apiClient.updateChat(id, {
        messages,
        metadata: {
          ...metadata,
          messageCount: messages.length,
          lastUpdated: new Date().toISOString()
        }
      });

      return {
        id: chat.id,
        title: chat.title,
        messages: chat.messages,
        model: chat.model,
        metadata: chat.metadata,
        user_id: chat.userId,
        created_at: chat.createdAt.toISOString(),
        updated_at: chat.updatedAt.toISOString(),
        thread: chat.threadId || null
      };
    } catch (error) {
      logger.error("Error in updateChatHistory:", error);
      throw error;
    }
  }

  async function loadChatHistory(id: string): Promise<ChatHistory> {
    try {
      if (!userId.value) throw new Error("User not authenticated");

      const chat = await apiClient.loadChat(id);

      return {
        id: chat.id,
        title: chat.title,
        messages: chat.messages,
        model: chat.model,
        metadata: chat.metadata,
        user_id: chat.userId,
        created_at: chat.createdAt.toISOString(),
        updated_at: chat.updatedAt.toISOString(),
        thread: chat.threadId || null
      };
    } catch (error) {
      logger.error("Error in loadChatHistory:", error);
      throw error;
    }
  }

  async function loadChatHistories(thread?: string): Promise<ChatHistory[]> {
    try {
      if (!userId.value) {
        logger.debug("No user ID available for loading chat histories");
        throw new Error("User not authenticated");
      }

      const chats = await apiClient.loadChats(thread);

      return chats.map(chat => ({
        id: chat.id,
        title: chat.title,
        messages: chat.messages,
        model: chat.model,
        metadata: chat.metadata,
        user_id: chat.userId,
        created_at: chat.createdAt.toISOString(),
        updated_at: chat.updatedAt.toISOString(),
        thread: chat.threadId || null
      }));
    } catch (error) {
      logger.error("Error in loadChatHistories:", error);
      throw error;
    }
  }

  async function deleteChat(id: string): Promise<void> {
    try {
      if (!userId.value) throw new Error("User not authenticated");
      
      await apiClient.deleteChat(id);
    } catch (error) {
      logger.error("Error in deleteChat:", error);
      throw error;
    }
  }

  async function deleteAllChats(): Promise<void> {
    try {
      if (!userId.value) throw new Error("User not authenticated");
      
      await apiClient.deleteAllChats();
    } catch (error) {
      logger.error("Error in deleteAllChats:", error);
      throw error;
    }
  }

  async function updateChatMetadata(
    chatId: string,
    metadata: Partial<ChatMetadata>
  ): Promise<Chat | null> {
    try {
      if (!userId.value) throw new Error("User not authenticated");
      
      return await apiClient.updateChatMetadata(chatId, metadata);
    } catch (error) {
      logger.error("Error updating chat metadata:", error);
      return null;
    }
  }

  async function forkChat(options: ChatForkOptions): Promise<Chat | null> {
    try {
      if (!userId.value) throw new Error("User not authenticated");
      
      return await apiClient.forkChat(options);
    } catch (error) {
      logger.error("Failed to fork chat:", error);
      return null;
    }
  }

  async function generateChatSummary(
    chatId: string,
    messages: ChatMessage[]
  ): Promise<Chat | null> {
    try {
      return await apiClient.generateChatSummary(chatId, messages);
    } catch (error) {
      logger.error("Failed to generate chat summary:", error);
      return null;
    }
  }

  async function createThread(options: ThreadOptions): Promise<Thread | null> {
    try {
      if (!userId.value) throw new Error("User not authenticated");
      
      return await apiClient.createThread(options);
    } catch (error) {
      logger.error("Failed to create thread:", error);
      return null;
    }
  }

  async function addChatToThread(chatId: string, threadId: string): Promise<boolean> {
    try {
      return await apiClient.addChatToThread(chatId, threadId);
    } catch (error) {
      logger.error("Failed to add chat to thread:", error);
      return false;
    }
  }

  async function getThreadChats(threadId: string): Promise<Chat[]> {
    try {
      return await apiClient.getThreadChats(threadId);
    } catch (error) {
      logger.error("Failed to get thread chats:", error);
      return [];
    }
  }

  async function removeChatFromThread(chatId: string): Promise<boolean> {
    try {
      // We need to find which thread the chat belongs to first
      const chat = await apiClient.loadChat(chatId);
      if (!chat.threadId) return true; // Already not in a thread
      
      return await apiClient.removeChatFromThread(chatId, chat.threadId);
    } catch (error) {
      logger.error("Failed to remove chat from thread:", error);
      return false;
    }
  }

  return {
    isConfigured,
    saveChatHistory,
    updateChatHistory,
    loadChatHistory,
    loadChatHistories,
    deleteChat,
    deleteAllChats,
    updateChatMetadata,
    forkChat,
    generateChatSummary,
    createThread,
    addChatToThread,
    getThreadChats,
    removeChatFromThread
  };
}