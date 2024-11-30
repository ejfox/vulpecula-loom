<template>
  <aside class="flex flex-col h-full overflow-hidden text-sm">
    <!-- Header with App Name - Fixed -->
    <div class="px-4 py-3 bg-gray-800 dark:bg-gray-900 text-white flex-shrink-0">
      <h1 class="font-medium">狐狸座 AI Chat</h1>
      <p class="text-xs text-gray-400 mt-0.5">Powered by OpenRouter</p>
    </div>

    <!-- Scrollable Content Area -->
    <div class="flex-1 bg-gray-100 dark:bg-gray-800 overflow-y-auto">
      <!-- Scrollable Container -->
      <div class="p-3">
        <!-- New Chat Button - Fixed at Top -->
        <div class="sticky top-0 bg-gray-100 dark:bg-gray-800 pb-3">
          <button @click="clearChat" class="w-full px-3 py-2 flex items-center gap-2 
                         bg-blue-500 hover:bg-blue-600 active:bg-blue-700
                         text-white rounded-lg transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span class="font-medium">New Chat</span>
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="space-y-4">
          <!-- Chat History Section -->
          <div class="space-y-1">
            <h2 class="px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Recent Chats
            </h2>
            <div class="space-y-0.5">
              <button v-for="chat in chatHistory" :key="chat.id" @click="loadChat(chat.id)" :class="[
                'text-left w-full px-3 py-2 rounded-md text-sm',
                'flex items-center gap-2 transition-colors',
                'hover:bg-gray-200 dark:hover:bg-gray-700',
                currentChatId === chat.id
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300'
              ]">
                <svg class="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span class="truncate">{{ chat.title || 'Untitled Chat' }}</span>
              </button>
            </div>
          </div>

          <!-- Models Section -->
          <div class="space-y-1">
            <h2 class="px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              AI Models
            </h2>
            <div class="space-y-0.5">
              <button v-for="(config, id) in MODEL_CONFIGS" :key="id" @click="setModel(id)" :class="[
                'text-left w-full px-3 py-2 rounded-md',
                'flex items-center gap-2 transition-colors text-sm',
                'hover:bg-gray-200 dark:hover:bg-gray-700',
                currentModel === id
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300'
              ]">
                <!-- Custom icon per model type -->
                <div class="w-4 h-4 opacity-60 flex-shrink-0">
                  <svg v-if="id.includes('claude')" class="w-4 h-4" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <svg v-else-if="id.includes('gpt-4')" class="w-4 h-4" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium truncate">{{ config.name }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {{ getModelDescription(id, config) }}
                  </div>
                </div>
                <!-- Cost indicator -->
                <div class="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {{ getModelCost(id) }}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer with Version - Fixed -->
    <div class="px-4 py-2 bg-gray-200 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
      <span>v1.0.0</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  chatHistory: any[]
  currentChatId: string | null
  currentModel: string
  MODEL_CONFIGS: Record<string, any>
}>()

const emit = defineEmits<{
  'clear-chat': []
  'load-chat': [id: string]
  'set-model': [id: string]
}>()

const clearChat = () => emit('clear-chat')
const loadChat = (id: string) => emit('load-chat', id)
const setModel = (id: string) => emit('set-model', id)

function getModelDescription(id: string, config: any): string {
  if (id.includes('claude-3')) {
    return 'Latest Claude - Most capable for analysis and coding'
  }
  if (id.includes('claude-2')) {
    return 'Reliable model for general tasks and coding'
  }
  if (id.includes('gpt-4')) {
    return 'Advanced reasoning and complex tasks'
  }
  if (id.includes('gpt-3.5')) {
    return 'Fast and efficient for simpler tasks'
  }
  if (config.description) {
    return config.description
  }
  return 'General purpose AI model'
}

function getModelCost(id: string): string {
  const costs: Record<string, string> = {
    'anthropic/claude-3-opus': '$15/M',
    'anthropic/claude-3-sonnet': '$8/M',
    'anthropic/claude-2': '$8/M',
    'openai/gpt-4': '$30/M',
    'openai/gpt-3.5-turbo': '$2/M'
  }
  return costs[id] || '$$'
}
</script>

<style scoped>
/* Custom scrollbar for chat history */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 2px;
}
</style>