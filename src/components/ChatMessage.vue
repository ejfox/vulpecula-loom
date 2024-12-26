<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import type { ChatMessageProps } from '../types'
import ChatCodeblock from './ChatCodeblock.vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps<{
  message: {
    id?: string
    role: 'system' | 'user' | 'assistant'
    content: string
    timestamp: string
    model?: string
    tokens?: any
    cost?: any
    includedFiles?: any[]
  }
  modelName: string
  index: number
  currentChatId: string | null
  isLoading?: boolean
  showActions?: boolean
  formatModelCost?: (cost: any) => string
}>()

const emit = defineEmits<{
  (e: 'copy', message: any): void
  (e: 'delete', message: any): void
  (e: 'fork', message: any): void
  (e: 'open-actions', message: any): void
}>()

// Process markdown content to separate regular content and code blocks
const processedContent = computed(() => {
  console.log('Original message content:', props.message.content)

  // Create a custom tokenizer
  const tokens = marked.lexer(props.message.content)
  const parts = []

  for (const token of tokens) {
    if (token.type === 'code') {
      parts.push({
        type: 'code',
        code: token.text,
        language: token.lang || ''
      })
    } else {
      const html = marked.parser([token])
      parts.push({
        type: 'content',
        html: DOMPurify.sanitize(html, {
          ADD_ATTR: ['onclick'],
          ADD_TAGS: ['button'],
        })
      })
    }
  }

  console.log('Final processed parts:', parts)
  return parts
})

// Add keyboard shortcut handling
const handleKeydown = (e: KeyboardEvent) => {
  // Alt/Option + F to fork at current message
  if (e.key === 'f' && (e.altKey || e.metaKey)) {
    e.preventDefault()
    emit('fork', props.message)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div :class="[
    'max-w-[85%]',
    'group relative',
    message.role === 'user' ? 'ml-auto' : ''
  ]">
    <!-- Message Metadata -->
    <div class="flex items-center justify-between text-[10px] leading-tight text-gray-400 dark:text-gray-500 mb-0.5">
      <div class="flex items-center gap-1.5 min-w-0">
        <template v-if="message.role === 'assistant'">
          <span class="font-medium flex-shrink-0">AI</span>
          <span class="flex-shrink-0">·</span>
          <span class="font-mono truncate">{{ message.model || modelName }}</span>
          <span v-if="message.tokens" class="flex items-center gap-1.5 flex-shrink-0">
            <span>·</span>
            <span class="font-mono">{{ message.tokens.total }}tok</span>
            <span v-if="message.cost" class="text-blue-500 dark:text-blue-400 font-mono">
              (${{ Number(message.cost).toFixed(4) }})
            </span>
          </span>
        </template>
      </div>
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <time class="font-mono">{{ new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }) }}</time>

        <!-- Message Actions -->
        <div class="flex items-center -mr-1">
          <button title="Fork chat from here (⌥F)"
            class="p-0.5 rounded opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-800"
            @click.stop.prevent="$emit('fork', message)">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          <button class="p-0.5 rounded opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-800"
            @click.stop.prevent="$emit('copy', message)">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button v-if="message.role === 'user'"
            class="p-0.5 rounded opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-800"
            @click.stop.prevent="$emit('delete', message)">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Message Content -->
    <div class="p-1.5 sm:p-2 rounded-md prose prose-sm max-w-none" :class="message.role === 'user'
      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-900 dark:text-white'
      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'">
      <template v-for="(part, index) in processedContent" :key="index">
        <!-- Regular content -->
        <div v-if="part.type === 'content'" v-html="part.html" class="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
        <!-- Code block -->
        <ChatCodeblock v-else :code="String(part.code)" :language="part.language" class="my-2" />
      </template>
    </div>
  </div>
</template>

<style scoped>
:deep(.prose) {
  font-size: 0.875rem;
  line-height: 1.5;
}

:deep(.prose pre) {
  margin: 0;
  padding: 0;
}

:deep(.prose p) {
  margin: 0.5rem 0;
}

:deep(.prose ul),
:deep(.prose ol) {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
}

:deep(.prose li) {
  margin: 0.25rem 0;
}

:deep(.prose code:not(pre code)) {
  font-size: 0.8125rem;
  padding: 0.125rem 0.25rem;
}
</style>