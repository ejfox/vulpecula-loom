export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  model?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  includedFiles?: IncludedFile[];
  isStreaming?: boolean;
}

export interface ChatMetadata {
  lastModel?: string;
  lastUpdated?: string;
  messageCount?: number;
  summary?: string;
  autoTitle?: string;
  summaryLastUpdated?: string;
  stats?: ChatStats;
  fork?: {
    parentId: string;
    forkMessageId: string;
    forkDepth: number;
    childIds: string[];
  };
  thread?: {
    name: string;
    description?: string;
  };
}

export interface ChatStats {
  promptTokens: number;
  completionTokens: number;
  cost: number;
  totalMessages: number;
  responseTime?: number;
}

export interface IncludedFile {
  path: string;
  content: string;
  type?: string;
  title: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string | null;
  messages: ChatMessage[];
  model: string;
  metadata: ChatMetadata;
  thread?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatHistory extends Chat {
  user_id: string;
}

export interface Thread {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  chat_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface ThreadOptions {
  name: string;
  description?: string;
  chat_ids?: string[];
}

export interface ChatForkOptions {
  parentId: string;
  forkMessageId: string;
  messages: ChatMessage[];
  newTitle?: string;
}

export interface NewChat {
  title: string | null;
  messages: ChatMessage[];
  model: string;
  user_id: string;
  metadata: ChatMetadata;
  thread?: string | null;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  capabilities?: {
    vision?: boolean;
    tools?: boolean;
    function_calling?: boolean;
  };
  provider?: string;
}

export interface ElectronAPI {
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  ipc?: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
  };
  store?: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export interface ChatInputProps {
  modelValue: string;
  isLoading: boolean;
  hasValidKey: boolean;
  showMentionPopup: boolean;
  isSearchingFiles: boolean;
  hasObsidianVault: boolean;
  obsidianSearchResults: ObsidianFile[];
}

export interface Mention {
  startIndex: number;
  endIndex: number;
  file: {
    title: string;
    path: string;
  };
}

export interface ObsidianFile {
  title: string;
  path: string;
  content?: string;
}

export interface OpenRouterResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost?: number;
  model?: string;
}

export interface StoreSchema {
  "api-key": string;
  "enabled-model-ids": string[];
  "recent-model-ids": string[];
  enabledModelIds: string[];
  recentModelIds: string[];
  "preferred-vision-model": string | null;
}
