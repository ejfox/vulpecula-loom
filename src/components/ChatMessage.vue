<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { marked } from 'marked'
import { formatDistanceToNow } from 'date-fns'
import DOMPurify from 'dompurify'
import type { ChatMessage } from '../types'

const props = defineProps<{
  message: ChatMessage;
  modelName: string;
  formatModelCost: (modelId: string, cost: number) => string;
}>()

const renderedContent = computed(() => {
  const content = props.message.content || ''
  const html = marked.parse(content)
  return DOMPurify.sanitize(String(html))
})

const formatTimeAgo = (date: string | undefined) => {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

// Get the display name for the model from the full model ID
const messageModelName = computed(() => {
  if (props.message.role !== 'assistant' || !props.message.model) {
    return props.modelName
  }

  // Check if this is a Coach Artie message
  if (props.message.model === 'coach-artie') {
    return '🤖 Coach Artie'
  }

  // Extract the model name from the full model ID (e.g., "anthropic/claude-3-sonnet" -> "claude-3-sonnet")
  return props.message.model.split('/').pop() || props.modelName
})

// Check if this message is from Coach Artie
const isCoachArtieMessage = computed(() => {
  return props.message.model === 'coach-artie'
})
</script>

<template>
  <div class="group relative flex gap-3 py-3" :class="{
    'opacity-50': message.isStreaming,
    'coach-artie-message': isCoachArtieMessage && message.role === 'assistant'
  }">
    <!-- Role Icon -->
    <div class="flex h-8 w-8 flex-none items-center justify-center rounded-lg" :class="{
      'bg-blue-500/10 text-blue-400': message.role === 'assistant' && !isCoachArtieMessage,
      'bg-indigo-500/10 text-indigo-400': message.role === 'assistant' && isCoachArtieMessage,
      'bg-gray-500/10 text-gray-400': message.role === 'user'
    }">
      <Icon v-if="message.role === 'assistant' && isCoachArtieMessage" icon="mdi:robot" class="h-5 w-5" />
      <Icon v-else-if="message.role === 'assistant'" icon="carbon:bot" class="h-5 w-5" />
      <Icon v-else icon="carbon:user" class="h-5 w-5" />
    </div>

    <!-- Message Content -->
    <div class="flex-1 space-y-2 overflow-hidden">
      <!-- Role & Timestamp -->
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium dark:text-white/90">
          {{ message.role === 'assistant' ? messageModelName : 'You' }}
        </span>
        <span class="text-xs dark:text-white/40">
          {{ formatTimeAgo(message.timestamp) }}
        </span>
      </div>

      <!-- Content -->
      <div class="prose prose-sm dark:prose-invert max-w-none">
        <div v-html="renderedContent"></div>
      </div>

      <!-- Streaming Indicator -->
      <div v-if="message.isStreaming" class="flex items-center gap-2 text-xs text-white/40">
        <div class="animate-pulse">Generating response...</div>
        <div class="flex space-x-1">
          <div class="h-1.5 w-1.5 rounded-full bg-white/40 animate-[bounce_1s_infinite]"></div>
          <div class="h-1.5 w-1.5 rounded-full bg-white/40 animate-[bounce_1s_infinite_0.2s]"></div>
          <div class="h-1.5 w-1.5 rounded-full bg-white/40 animate-[bounce_1s_infinite_0.4s]"></div>
        </div>
      </div>

      <!-- Message Stats -->
      <div class="flex items-center gap-4 text-xs text-white/40">
        <span>{{ message.tokens?.total || Math.ceil(message.content.length / 4) }} tokens</span>
        <span>{{ formatModelCost(message.model || 'anthropic/claude-3-sonnet', message.cost ||
          (Math.ceil(message.content.length / 4) * 0.000001)) }}</span>
      </div>

      <!-- Included Files -->
      <div v-if="message.includedFiles?.length" class="mt-2 space-y-2">
        <div v-for="file in message.includedFiles" :key="file.path" class="rounded bg-white/5 px-3 py-2 text-sm">
          <div class="flex items-center justify-between">
            <span class="font-medium text-white/80">{{ file.title }}</span>
            <span class="text-xs text-white/40">{{ file.path }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions Menu -->
    <div class="absolute right-0 top-3">
      <button v-if="!message.isStreaming" @click="$emit('open-actions')"
        class="p-1 text-white/40 hover:text-white/60 transition-colors opacity-0 group-hover:opacity-100">
        <Icon icon="carbon:overflow-menu-horizontal" class="h-5 w-5" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Add styles for Coach Artie messages */
.coach-artie-message {
  position: relative;
}

.coach-artie-message::before {
  content: '';
  position: absolute;
  left: -0.5rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, rgba(79, 70, 229, 0.5), rgba(79, 70, 229, 0.1));
  border-radius: 1px;
}

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