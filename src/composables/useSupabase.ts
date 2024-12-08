import { computed } from "vue";
import { createClient } from "@supabase/supabase-js";
import type { Ref, ComputedRef } from "vue";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatHistory } from "../types";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

export interface ChatHistory {
  id: string;
  model: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
    tokens?: {
      prompt?: number;
      completion?: number;
      total?: number;
    };
    cost?: number;
    model?: string;
  }>;
  created_at: string;
  updated_at: string;
  title?: string;
  metadata?: {
    lastModel?: string;
    lastUpdated?: string;
    stats?: {
      promptTokens: number;
      completionTokens: number;
      cost: number;
    };
  };
  thread?: string;
}

export interface UseSupabaseReturn {
  supabase: SupabaseClient;
  isConfigured: ComputedRef<boolean>;
  hasValidSupabaseConfig: ComputedRef<boolean>;
  saveChatHistory: (
    history: Omit<ChatHistory, "id" | "created_at" | "updated_at">
  ) => Promise<void>;
  updateChatHistory: (
    id: string,
    messages: any[],
    metadata?: any
  ) => Promise<void>;
  loadChatHistory: (id: string) => Promise<ChatHistory | null>;
  loadChatHistories: () => Promise<ChatHistory[]>;
  deleteChat: (id: string) => Promise<void>;
  deleteAllChats: () => Promise<void>;
}

export function useSupabase() {
  const isConfigured = computed(() => {
    const hasUrl = !!import.meta.env.VITE_SUPABASE_URL;
    const hasKey = !!import.meta.env.VITE_SUPABASE_KEY;
    return hasUrl && hasKey;
  });

  async function saveChatHistory(
    history: Omit<ChatHistory, "id" | "created_at" | "updated_at">
  ) {
    try {
      console.log("Saving chat history:", history);
      const { data, error } = await supabase
        .from("vulpeculachats")
        .insert([
          {
            ...history,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            thread: history.thread || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      console.log("Chat saved successfully:", data);
      return data;
    } catch (error) {
      console.error("Error in saveChatHistory:", error);
      throw error;
    }
  }

  async function updateChatHistory(
    id: string,
    messages: ChatHistory["messages"],
    metadata?: ChatHistory["metadata"]
  ) {
    try {
      console.log("Updating chat history:", { id, messages, metadata });
      const { data, error } = await supabase
        .from("vulpeculachats")
        .update({
          messages,
          metadata: metadata || {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      console.log("Chat updated successfully:", data);
      return data;
    } catch (error) {
      console.error("Error in updateChatHistory:", error);
      throw error;
    }
  }

  async function loadChatHistory(id: string) {
    try {
      console.log("Loading chat history:", id);
      const { data, error } = await supabase
        .from("vulpeculachats")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      console.log("Chat loaded successfully:", data);
      return data;
    } catch (error) {
      console.error("Error in loadChatHistory:", error);
      throw error;
    }
  }

  async function loadChatHistories(thread?: string) {
    try {
      console.group("Loading chat histories");
      console.log("Thread parameter:", thread || "No thread specified");

      let query = supabase
        .from("vulpeculachats")
        .select("*")
        .order("updated_at", { ascending: false });

      if (thread) {
        console.log("Filtering by thread:", thread);
        query = query.eq("thread", thread);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading chats:", error);
        throw error;
      }

      console.log(`Loaded ${data?.length || 0} chats:`, {
        threads: [...new Set(data?.map((chat) => chat.thread))],
        totalMessages: data?.reduce(
          (acc, chat) => acc + chat.messages.length,
          0
        ),
        dateRange: data?.length
          ? {
              oldest: data[data.length - 1].created_at,
              newest: data[0].created_at,
            }
          : null,
      });

      return data;
    } catch (error) {
      console.error("Error in loadChatHistories:", error);
      throw error;
    } finally {
      console.groupEnd();
    }
  }

  async function deleteAllChats() {
    try {
      console.log("Deleting all chats");
      const { error } = await supabase
        .from("vulpeculachats")
        .delete()
        .neq("id", "");

      if (error) throw error;
      console.log("All chats deleted successfully");
    } catch (error) {
      console.error("Error in deleteAllChats:", error);
      throw error;
    }
  }

  return {
    supabase,
    isConfigured,
    saveChatHistory,
    updateChatHistory,
    loadChatHistory,
    loadChatHistories,
    deleteAllChats,
  };
}
