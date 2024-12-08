export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: number;
    completion: number;
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: string;
  model?: string;
  tokens?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  cost?: number;
  includedFiles?: Array<{
    title: string;
    path: string;
    content: string;
  }>;
}

export interface ChatMetadata {
  lastModel?: string;
  lastUpdated?: string;
  title?: string;
  thread?: string;
  stats?: {
    promptTokens: number;
    completionTokens: number;
    cost: number;
  };
}

export interface ChatHistory {
  id: string;
  created_at: string;
  updated_at: string;
  model: string;
  messages: ChatMessage[];
  metadata?: ChatMetadata;
  thread?: string;
}
