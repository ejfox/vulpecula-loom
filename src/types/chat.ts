export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  model?: string;
  tokens?: {
    total: number;
    prompt: number;
    completion: number;
  };
  cost?: number;
}

export interface ChatForkMetadata {
  parentId?: string;
  forkMessageId?: string;
  forkDepth: number;
  childIds: string[];
}

export interface ChatMetadata {
  lastModel?: string;
  lastUpdated: string;
  summary?: string;
  autoTitle?: string;
  messageCount: number;
  summaryLastUpdated?: string;
  fork?: ChatForkMetadata;
  thread?: {
    name: string;
    description?: string;
  };
}

export interface Chat {
  id: string;
  title: string | null;
  messages: ChatMessage[];
  model: string;
  metadata: ChatMetadata;
  created_at: string;
  updated_at: string;
  user_id?: string;
  thread?: string | null;
}

// Helper type for creating a new chat
export interface NewChat {
  title?: string;
  messages: ChatMessage[];
  model: string;
  metadata: ChatMetadata;
  user_id?: string;
  thread?: string;
}

// Helper type for forking a chat
export interface ChatForkOptions {
  parentId: string;
  forkMessageId: string;
  messages: ChatMessage[];
  newTitle?: string;
}

export interface Thread {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  chat_ids: string[];
}

// Helper type for creating/updating threads
export interface ThreadOptions {
  name: string;
  description?: string;
  chat_ids?: string[];
}
