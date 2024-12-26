/// <reference lib="dom" />
import type { ComputedRef, Ref } from "vue";

// OpenRouter Types
export interface OpenRouterModel {
  id: string;
  name?: string;
  description?: string;
  context_length: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

export interface OpenRouterConfig {
  name: string;
}

export interface OpenRouterConfigs {
  [key: string]: OpenRouterConfig;
}

export interface OpenRouterChatOptions {
  model?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  [key: string]: any;
}

export interface OpenRouterReturn {
  chat: (
    messages: ChatMessage[],
    options?: OpenRouterChatOptions
  ) => Promise<ChatResponse>;
  hasValidKey: ComputedRef<boolean>;
  MODEL_CONFIGS: OpenRouterConfigs;
  apiKey: Ref<string>;
  setApiKey: (key: string) => Promise<boolean>;
}

export interface OpenRouterResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost?: number;
}

// Chat Types
export interface ChatMessage {
  id?: string;
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: string;
  model?: string;
  tokens?: any;
  cost?: any;
  includedFiles?: IncludedFile[];
}

export interface MessageWithFiles {
  content: string;
  includedFiles: IncludedFile[];
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
  fork?: any;
  thread?: any;
}

export interface Chat {
  id: string;
  title: string | null;
  messages: any[];
  model: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  user_id?: string;
  thread?: any;
}

export interface NewChat {
  title?: string;
  messages: ChatMessage[];
  model: string;
  metadata: ChatMetadata;
  user_id?: string;
  thread?: string;
}

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

export interface ThreadOptions {
  name: string;
  description?: string;
  chat_ids?: string[];
}

export interface ChatResponse {
  content: string;
  [key: string]: any;
}

// File Handling Types
export interface IncludedFile {
  title: string;
  path: string;
  content: string;
}

export interface Mention {
  startIndex: number;
  endIndex: number;
  file: {
    title: string;
    path: string;
  };
}

// UI Types
export interface UIPreferences {
  showOnlyPinnedModels: boolean;
  theme: "light" | "dark" | "system";
  showProgressBar: boolean;
}

// Store Types
export interface StoreSchema {
  "api-key": string;
  theme: "light" | "dark" | "system";
  "show-progress-bar": boolean;
  "show-only-pinned-models": boolean;
  "pinned-models": string[];
  "enabled-model-ids": string[];
  "recent-model-ids": string[];
  "remember-window-state": boolean;
  "minimize-to-tray": boolean;
  "show-notifications": boolean;
  "play-sounds": boolean;
  "show-badge-count": boolean;
  "obsidian-vault-path": string;
  enabledModelIds: string[];
  recentModelIds: string[];
}

// Electron IPC Types
export interface IpcChannels {
  "store-get": (
    key: keyof StoreSchema
  ) => Promise<StoreSchema[keyof StoreSchema] | null>;
  "store-set": (
    key: keyof StoreSchema,
    value: StoreSchema[keyof StoreSchema]
  ) => Promise<void>;
  "store-clear": () => Promise<void>;
  "open-external": (url: string) => Promise<void>;
  "get-vault-path": () => Promise<string>;
  "get-obsidian-file-content": (params: {
    vaultPath: string;
    filePath: string;
  }) => Promise<{ content: string }>;
  "select-folder": () => Promise<{ canceled: boolean; filePaths: string[] }>;
  "search-obsidian-files": (
    options: ObsidianSearchOptions
  ) => Promise<ObsidianFile[]>;
  "show-save-dialog": (
    options: any
  ) => Promise<{ canceled: boolean; filePath: string }>;
  "write-file": (path: string, content: string) => Promise<void>;
  "main-process-message": (message: string) => void;
  "auth-callback": (data: any) => void;
}

export interface ElectronAPI {
  ipc: {
    invoke: <T extends keyof IpcChannels>(
      channel: T,
      ...args: Parameters<IpcChannels[T]>
    ) => ReturnType<IpcChannels[T]>;
  };
  store: {
    get: <T extends keyof StoreSchema>(key: T) => Promise<StoreSchema[T]>;
    set: <T extends keyof StoreSchema>(
      key: T,
      value: StoreSchema[T]
    ) => Promise<void>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  ipcRenderer: {
    on: <T extends keyof IpcChannels>(
      channel: T,
      listener: (event: any, ...args: any[]) => void
    ) => void;
  };
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

// Animation Types
export interface ScrollConfig {
  container: HTMLElement;
  enter?: string;
  leave?: string;
  sync?: "smooth" | "linear";
  repeat?: boolean;
  debug?: boolean;
}

export interface StaggerConfig {
  value: number;
  from: "first" | "last" | "center";
}

export interface AnimationConfig {
  scroll?: ScrollConfig;
  stagger?: StaggerConfig;
  duration?: string | number;
}

// Token Types
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Chat History Types
export interface ChatHistory {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  metadata: ChatMetadata;
  created_at: string;
  updated_at: string;
}

// Stats Types
export interface ChatStats {
  promptTokens: number;
  completionTokens: number;
  cost: number;
  totalMessages: number;
}

// Component Props Types
export interface ChatInputProps {
  isLoading: boolean;
  hasValidKey: boolean;
  showMentionPopup: boolean;
  isSearchingFiles: boolean;
  hasObsidianVault: boolean;
  obsidianSearchResults: ObsidianFile[];
}

export interface ChatMessageProps {
  message: any;
  modelName: string;
  index: number;
  currentChatId: string | null;
  formatModelCost: (cost: any) => string;
}

export interface ApiKeyWarningProps {
  hasValidKey: boolean;
  savingKey: boolean;
}

export interface ChatSidebarProps {
  chatHistory: any[];
  currentChatId: string | null;
  currentModel: string;
  availableModels: any[];
  showOnlyPinnedModels: boolean;
}

export interface ModelSettingsProps {
  availableModels: any[];
  showOnlyPinnedModels: boolean;
}

export interface StatusBarProps {
  isLoading: boolean;
  isSending: boolean;
  modelName: string;
}

// Composable Return Types
export interface TokenCallback {
  onToken: (token: string) => void;
  onUsage: (usage: TokenUsage) => void;
  onError: (err: Error) => void;
}

export interface UseSupabaseReturn {
  saveChatHistory: (chat: any) => Promise<any>;
  updateChatHistory: (
    id: string,
    messages: any[],
    metadata: any
  ) => Promise<void>;
  loadChatHistory: (id: string) => Promise<any>;
  loadChatHistories: () => Promise<any[]>;
  deleteChat: (id: string) => Promise<void>;
  isConfigured: boolean;
}

export interface UseOpenRouterReturn {
  apiKey: Ref<string>;
  hasValidKey: ComputedRef<boolean>;
  messages: Ref<any[]>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  currentModel: Ref<string>;
  modelName: ComputedRef<string>;
  sendMessage: (content: string) => Promise<void>;
  setModel: (model: string) => void;
  currentChatId: Ref<string | null>;
  loadChat: (id: string) => Promise<void>;
  clearChat: () => void;
  chatStats: Ref<any>;
  exportChat: () => Promise<void>;
  validateApiKey: (key: string) => Promise<boolean>;
  formatModelCost: (cost: any) => string;
  availableModels: Ref<any[]>;
}

export interface ShortcutHandlers {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFind?: () => void;
  onNewChat?: () => void;
  onSettings?: () => void;
}

// Anime.js type definitions
export interface AnimeInstance {
  play?: () => void;
  pause?: () => void;
  restart?: () => void;
  seek?: (time: number) => void;
  reverse?: () => void;
  complete?: () => void;
  finished?: Promise<void>;
  [key: string]: any;
}

export interface AnimeParams {
  targets?: any;
  duration?: number;
  delay?: any;
  endDelay?: number;
  elasticity?: number;
  round?: number | boolean;
  keyframes?: any[];
  autoplay?: any;
  loop?: number | boolean;
  direction?: "normal" | "reverse" | "alternate";
  easing?: string;
  [property: string]: any;
}

export interface ScrollObserverParams {
  container?: any;
  target?: any;
  enter?: any;
  leave?: any;
  sync?: any;
  debug?: boolean;
  axis?: "x" | "y";
  repeat?: boolean;
  onEnter?: (observer: any) => void;
  onLeave?: (observer: any) => void;
  onUpdate?: (observer: any) => void;
}

export interface StaggerOptions {
  from?: any;
  grid?: [number, number];
  axis?: "x" | "y";
  start?: number;
}

export type AnimatableInstance = {
  [key: string]: (value: any) => void;
};

// Obsidian types
export interface ObsidianLinkParams {
  file: {
    title: string;
    path: string;
  };
  mentionStartIndex: number;
  messageIncludedFiles: Ref<IncludedFile[]>;
  mentions: Ref<Mention[]>;
  newMessage: string;
}

export interface ObsidianFile {
  title: string;
  path: string;
  content: string;
  lastModified: number;
  preview?: string;
  slug?: string;
}

export interface ObsidianSearchOptions {
  path: string;
  searchTerm: string;
}
