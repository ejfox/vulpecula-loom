import { ComputedRef, Ref } from 'vue'

interface ModelConfig {
  name: string
}

interface ModelConfigs {
  [key: string]: ModelConfig
}

interface ChatOptions {
  model?: string
  stream?: boolean
  temperature?: number
  max_tokens?: number
  [key: string]: any
}

interface ChatMessage {
  role: string
  content: string
}

interface ChatResponse {
  content: string
  [key: string]: any
}

export interface OpenRouterReturn {
  chat: (messages: ChatMessage[], options?: ChatOptions) => Promise<ChatResponse>
  hasValidKey: ComputedRef<boolean>
  MODEL_CONFIGS: ModelConfigs
  apiKey: Ref<string>
  setApiKey: (key: string) => Promise<boolean>
}

export function useOpenRouter(): OpenRouterReturn 