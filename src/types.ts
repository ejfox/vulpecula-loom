export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: number;
    completion: number;
  };
}

export interface ChatHistory {
  id: string;
  created_at: string;
  updated_at: string;
  messages: any[];
  metadata?: {
    title?: string;
    thread?: string;
  };
}
