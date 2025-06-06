import { computed, ref } from "vue";
import { createClient } from "@supabase/supabase-js";
import type { Ref, ComputedRef } from "vue";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Chat,
  ChatHistory,
  ChatMessage,
  ChatMetadata,
  Thread,
  ThreadOptions,
  ChatForkOptions,
  NewChat,
} from "../types";
import { useStore } from "../lib/store";
import { useActiveUser } from "./useActiveUser";
import { logger } from "../lib/logger";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

export interface UseSupabaseReturn {
  supabase: SupabaseClient;
  isConfigured: ComputedRef<boolean>;
  hasValidSupabaseConfig: ComputedRef<boolean>;
  saveChatHistory: (
    history: Omit<
      ChatHistory,
      "id" | "created_at" | "updated_at" | "user_id"
    > & {
      thread?: string;
    }
  ) => Promise<ChatHistory>;
  updateChatHistory: (
    id: string,
    messages: ChatMessage[],
    metadata?: ChatMetadata
  ) => Promise<ChatHistory>;
  loadChatHistory: (id: string) => Promise<ChatHistory>;
  loadChatHistories: () => Promise<ChatHistory[]>;
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

export function useSupabase() {
  const store = useStore();
  const { userId } = useActiveUser();

  const isConfigured = computed(() => {
    const hasUrl = !!import.meta.env.VITE_SUPABASE_URL;
    const hasKey = !!import.meta.env.VITE_SUPABASE_KEY;
    return hasUrl && hasKey;
  });

  const hasValidSupabaseConfig = ref(true);

  async function saveChatHistory(
    history: Omit<
      ChatHistory,
      "id" | "created_at" | "updated_at" | "user_id"
    > & {
      thread?: string;
    }
  ) {
    try {
      if (!userId.value) throw new Error("User not authenticated");

      // Calculate message count
      const messageCount = history.messages.length;
      
      // Calculate token stats
      let promptTokens = 0;
      let completionTokens = 0;
      
      // Sum up tokens from all messages
      history.messages.forEach(msg => {
        if (msg.tokens) {
          promptTokens += msg.tokens.prompt || 0;
          completionTokens += msg.tokens.completion || 0;
        }
      });
      
      // Ensure metadata has stats
      const metadata = {
        ...(history.metadata || {}),
        messageCount,
        lastUpdated: new Date().toISOString(),
        stats: {
          ...(history.metadata?.stats || {}),
          promptTokens,
          completionTokens,
          totalMessages: messageCount,
          total: promptTokens + completionTokens
        }
      };

      const { data, error } = await supabase
        .from("vulpeculachats")
        .insert([
          {
            ...history,
            metadata,
            user_id: userId.value,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            thread: history.thread || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error("Error in saveChatHistory:", error);
      throw error;
    }
  }

  async function updateChatHistory(
    id: string,
    messages: ChatHistory["messages"],
    metadata?: ChatHistory["metadata"]
  ) {
    try {
      if (!userId.value) throw new Error("User not authenticated");

      // Calculate accurate message count
      const messageCount = messages.length;
      
      // Calculate token stats
      let promptTokens = 0;
      let completionTokens = 0;
      
      // Sum up tokens from all messages
      messages.forEach(msg => {
        if (msg.tokens) {
          promptTokens += msg.tokens.prompt || 0;
          completionTokens += msg.tokens.completion || 0;
        }
      });
      
      // Prepare updated metadata
      const updatedMetadata = {
        ...(metadata || {}),
        messageCount,
        lastUpdated: new Date().toISOString(),
        stats: {
          ...(metadata?.stats || {}),
          promptTokens,
          completionTokens,
          totalMessages: messageCount,
          total: promptTokens + completionTokens
        }
      };

      const { data, error } = await supabase
        .from("vulpeculachats")
        .update({
          messages,
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId.value)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error("Error in updateChatHistory:", error);
      throw error;
    }
  }

  async function loadChatHistory(id: string) {
    try {
      if (!userId.value) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("vulpeculachats")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId.value)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error("Error in loadChatHistory:", error);
      throw error;
    }
  }

  async function loadChatHistories(thread?: string) {
    try {
      if (!userId.value) {
        logger.debug("No user ID available for loading chat histories");
        throw new Error("User not authenticated");
      }

      let query = supabase
        .from("vulpeculachats")
        .select("*")
        .eq("user_id", userId.value)
        .order("updated_at", { ascending: false });

      if (thread) {
        query = query.eq("thread", thread);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error("Error in loadChatHistories:", error);
      throw error;
    }
  }

  async function deleteAllChats() {
    try {
      if (!userId.value) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("vulpeculachats")
        .delete()
        .eq("user_id", userId.value);

      if (error) throw error;
    } catch (error) {
      logger.error("Error in deleteAllChats:", error);
      throw error;
    }
  }

  const updateChatMetadata = async (
    chatId: string,
    metadata: Partial<ChatMetadata>
  ) => {
    try {
      if (!userId.value) throw new Error("User not authenticated");

      // First get the current chat to preserve existing metadata
      const { data: currentChat, error: fetchError } = await supabase
        .from("vulpeculachats")
        .select("metadata, messages")
        .eq("id", chatId)
        .eq("user_id", userId.value)
        .single();

      if (fetchError) throw fetchError;

      // Calculate message count from messages
      const messageCount = currentChat.messages.length;
      
      // Calculate token stats if not already in metadata
      let promptTokens = currentChat.metadata?.stats?.promptTokens || 0;
      let completionTokens = currentChat.metadata?.stats?.completionTokens || 0;
      
      // If we don't have token stats, calculate them from messages
      if (promptTokens === 0 && completionTokens === 0) {
        currentChat.messages.forEach(msg => {
          if (msg.tokens) {
            promptTokens += msg.tokens.prompt || 0;
            completionTokens += msg.tokens.completion || 0;
          }
        });
      }
      
      // Merge existing metadata with new metadata
      const updatedMetadata = {
        ...currentChat.metadata,
        ...metadata,
        messageCount: messageCount,
        lastUpdated: new Date().toISOString(),
        stats: {
          ...(currentChat.metadata?.stats || {}),
          ...(metadata.stats || {}),
          promptTokens,
          completionTokens,
          totalMessages: messageCount,
          total: promptTokens + completionTokens
        }
      };

      const { data, error } = await supabase
        .from("vulpeculachats")
        .update({
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", chatId)
        .eq("user_id", userId.value)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error("Error updating chat metadata:", error);
      return null;
    }
  };

  const forkChat = async ({
    parentId,
    forkMessageId,
    messages,
    newTitle,
  }: ChatForkOptions): Promise<Chat | null> => {
    try {
      if (!userId.value) throw new Error("User not authenticated");

      // Get parent chat to update its childIds
      const { data: parentChat } = await supabase
        .from("vulpeculachats")
        .select("*")
        .eq("id", parentId)
        .eq("user_id", userId.value)
        .single();

      if (!parentChat) throw new Error("Parent chat not found");

      // Create new chat with forked messages
      const newChat: NewChat = {
        title: newTitle || `Fork of ${parentChat.title || "Untitled Chat"}`,
        messages,
        model: parentChat.model,
        user_id: userId.value,
        metadata: {
          lastModel: parentChat.metadata.lastModel,
          lastUpdated: new Date().toISOString(),
          messageCount: messages.length,
          fork: {
            parentId,
            forkMessageId,
            forkDepth: (parentChat.metadata.fork?.forkDepth || 0) + 1,
            childIds: [],
          },
        },
      };

      // Insert new chat
      const { data: createdChat, error: insertError } = await supabase
        .from("vulpeculachats")
        .insert(newChat)
        .select()
        .single();

      if (insertError) throw insertError;

      // Update parent chat's childIds
      const updatedParentMetadata = {
        ...parentChat.metadata,
        fork: {
          ...(parentChat.metadata.fork || {}),
          childIds: [
            ...(parentChat.metadata.fork?.childIds || []),
            createdChat.id,
          ],
        },
      };

      await updateChatMetadata(parentId, updatedParentMetadata);

      return createdChat;
    } catch (err) {
      logger.error("Failed to fork chat:", err);
      return null;
    }
  };

  const generateChatSummary = async (
    chatId: string,
    messages: ChatMessage[]
  ) => {
    try {
      // TODO: Call OpenAI/other LLM to generate summary
      const summary = "Generated summary...";
      const now = new Date().toISOString();

      // Create metadata update with only the summary
      const metadataUpdate: Partial<ChatMetadata> = {
        summary,
        summaryLastUpdated: now,
      };

      return await updateChatMetadata(chatId, metadataUpdate);
    } catch (err) {
      logger.error("Failed to generate chat summary:", err);
      return null;
    }
  };

  const createThread = async ({
    name,
    description,
    chat_ids = [],
  }: ThreadOptions): Promise<Thread | null> => {
    try {
      if (!userId.value) throw new Error("User not authenticated");

      const thread: Thread = {
        id: crypto.randomUUID(),
        name,
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        chat_ids,
        user_id: userId.value,
      };

      // Update all chats to be part of this thread
      if (chat_ids.length > 0) {
        const { error: updateError } = await supabase
          .from("vulpeculachats")
          .update({ thread: thread.id })
          .in("id", chat_ids);

        if (updateError) throw updateError;
      }

      return thread;
    } catch (err) {
      logger.error("Failed to create thread:", err);
      return null;
    }
  };

  const addChatToThread = async (chatId: string, threadId: string) => {
    try {
      // Update chat's thread ID
      const { error: updateError } = await supabase
        .from("vulpeculachats")
        .update({ thread: threadId })
        .eq("id", chatId);

      if (updateError) throw updateError;

      // Update chat's metadata
      const { data: thread } = await supabase
        .from("vulpeculachats")
        .select("title, metadata")
        .eq("id", threadId)
        .single();

      if (thread) {
        await updateChatMetadata(chatId, {
          thread: {
            name: thread.title || "Untitled Thread",
            description: thread.metadata?.description,
          },
        });
      }

      return true;
    } catch (err) {
      logger.error("Failed to add chat to thread:", err);
      return false;
    }
  };

  const getThreadChats = async (threadId: string): Promise<Chat[]> => {
    try {
      const { data, error } = await supabase
        .from("vulpeculachats")
        .select("*")
        .eq("thread", threadId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error("Failed to get thread chats:", err);
      return [];
    }
  };

  const removeChatFromThread = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from("vulpeculachats")
        .update({
          thread: null,
          metadata: {
            thread: null,
          },
        })
        .eq("id", chatId);

      if (error) throw error;
      return true;
    } catch (err) {
      logger.error("Failed to remove chat from thread:", err);
      return false;
    }
  };

  async function deleteChat(id: string) {
    try {
      if (!userId.value) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("vulpeculachats")
        .delete()
        .eq("id", id)
        .eq("user_id", userId.value);

      if (error) throw error;
    } catch (error) {
      logger.error("Error in deleteChat:", error);
      throw error;
    }
  }

  return {
    supabase,
    isConfigured,
    hasValidSupabaseConfig,
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
    removeChatFromThread,
  };
}
