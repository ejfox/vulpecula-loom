import { computed, ComputedRef, Ref, ref, watch, onMounted } from 'vue'
import { useStore } from '../lib/store'

const BASE_URL = 'https://openrouter.ai/api/v1'

export interface ModelConfig {
  name: string
}

export interface ModelConfigs {
  [key: string]: ModelConfig
}

export interface ChatMessage {
  role: string
  content: string
}

export interface ChatOptions {
  model?: string
  stream?: boolean
  temperature?: number
  max_tokens?: number
  [key: string]: any
}

export interface ChatResponse {
  content: string
  [key: string]: any
}

export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface StreamCallbacks {
  onToken?: (token: string) => void
  onComplete?: () => void
  onError?: (error: any) => void
  onUsage?: (usage: TokenUsage) => void
}

export const MODEL_CONFIGS: ModelConfigs = {
  'anthropic/claude-3.5-sonnet:beta': {
    name: 'Claude 3.5 Sonnet (Beta)',
  },
  'google/gemini-flash-1.5-8b': {
    name: 'Gemini Flash 1.5',
  },
  'google/gemini-pro-1.5': {
    name: 'Gemini Pro 1.5',
  },
  'qwen/qwen-2.5-coder-32b-instruct': {
    name: 'Qwen 2.5 Coder',
  },
  'nvidia/llama-3.1-nemotron-70b-instruct': {
    name: 'Nemotron 70B',
  },
  'meta-llama/llama-3.2-3b-instruct:free': {
    name: 'Llama 3.2 3B (Free)',
  },
  'meta-llama/llama-3.2-3b-instruct': {
    name: 'Llama 3.2 3B',
  }
} as const

export interface OpenRouterReturn {
  chat: (messages: ChatMessage[], options?: ChatOptions, streamCallbacks?: StreamCallbacks) => Promise<ChatResponse>
  hasValidKey: ComputedRef<boolean>
  MODEL_CONFIGS: typeof MODEL_CONFIGS
  apiKey: Ref<string>
  setApiKey: (key: string) => Promise<boolean>
}

export function useOpenRouter(): OpenRouterReturn {
  const store = useStore()
  const apiKey = ref('')
  
  // Initialize apiKey from store
  onMounted(async () => {
    const storedKey = await store.get('openrouter-api-key')
    apiKey.value = storedKey || ''
  })
  
  // Watch for changes to save to store
  watch(apiKey, async (newValue) => {
    if (newValue) {
      await store.set('openrouter-api-key', newValue)
    }
  })

  const hasValidKey = computed(() => {
    const key = apiKey.value?.trim()
    return !!key && key.startsWith('sk-or-')
  })

  async function setApiKey(key: string): Promise<boolean> {
    if (!key.trim() || !key.startsWith('sk-or-')) {
      return false
    }
    
    try {
      const response = await fetch(`${BASE_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': window.location.origin,
        }
      })
      
      if (!response.ok) {
        throw new Error('Invalid API key')
      }

      apiKey.value = key.trim()
      return true
    } catch (err) {
      console.error('Error validating API key:', err)
      return false
    }
  }

  async function chat(
    messages: ChatMessage[] = [], 
    options: ChatOptions = {},
    streamCallbacks?: StreamCallbacks
  ): Promise<ChatResponse> {
    if (!hasValidKey.value) {
      throw new Error('No API key found. Please enter your OpenRouter API key in the app.')
    }

    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.value}`,
          'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({
          messages,
          model: options.model || 'openai/gpt-3.5-turbo',
          stream: true,
          ...options,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let content = ''
      let buffer = ''

      if (!reader) {
        throw new Error('No reader available')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue

          const data = trimmedLine.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const token = parsed.choices?.[0]?.delta?.content || ''
            content += token

            if (parsed.usage) {
              const usage = {
                prompt_tokens: parsed.usage.prompt_tokens,
                completion_tokens: parsed.usage.completion_tokens,
                total_tokens: parsed.usage.total_tokens
              }
              streamCallbacks?.onUsage?.(usage)
            }

            streamCallbacks?.onToken?.(token)
          } catch (e) {
            console.error('Error parsing streaming response:', e, 'Data:', data)
            continue
          }
        }
      }

      if (buffer.trim()) {
        try {
          const data = buffer.trim().slice(6)
          if (data && data !== '[DONE]') {
            const parsed = JSON.parse(data)
            const token = parsed.choices?.[0]?.delta?.content || ''
            content += token
            streamCallbacks?.onToken?.(token)
          }
        } catch (e) {
          console.error('Error parsing final buffer:', e)
        }
      }

      streamCallbacks?.onComplete?.()

      return {
        content,
        usage: null
      }

    } catch (error) {
      streamCallbacks?.onError?.(error)
      console.error('Error in OpenRouter chat:', error)
      throw error
    }
  }

  return {
    chat,
    hasValidKey,
    MODEL_CONFIGS,
    apiKey,
    setApiKey
  }
} 