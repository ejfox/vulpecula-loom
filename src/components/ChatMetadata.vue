<template>
  <div class="px-4 py-2.5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
    <div class="flex items-center justify-between">
      <!-- Stats Group -->
      <div class="flex items-center divide-x divide-gray-300 dark:divide-gray-700">
        <!-- Total Tokens -->
        <div class="pr-4">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/30">
              <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Total Tokens</div>
              <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {{ (stats?.promptTokens || 0) + (stats?.completionTokens || 0) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Input/Output Group -->
        <div class="px-4 flex items-center gap-4">
          <!-- Input Tokens -->
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-md bg-purple-50 dark:bg-purple-900/30">
              <svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Input</div>
              <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {{ stats?.promptTokens || 0 }}
              </div>
            </div>
          </div>

          <!-- Output Tokens -->
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-md bg-green-50 dark:bg-green-900/30">
              <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Output</div>
              <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {{ stats?.completionTokens || 0 }}
              </div>
            </div>
          </div>
        </div>

        <!-- Cost -->
        <div class="px-4">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-md bg-amber-50 dark:bg-amber-900/30">
              <svg class="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Cost</div>
              <div class="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {{ stats?.cost ? formatModelCost('', stats.cost) : '$0.0000' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <button @click="$emit('export')" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm
                       text-gray-700 dark:text-gray-300 
                       hover:text-gray-900 dark:hover:text-white
                       hover:bg-gray-100 dark:hover:bg-gray-700/50
                       rounded-md transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Chat
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ChatStats {
  promptTokens: number
  completionTokens: number
  cost?: number
}

const props = withDefaults(defineProps<{
  stats: ChatStats
}>(), {
  stats: () => ({
    promptTokens: 0,
    completionTokens: 0,
    cost: 0
  })
})

defineEmits<{
  export: []
}>()

import { useOpenRouter } from '../composables/useOpenRouter'

const { formatModelCost } = useOpenRouter()
</script>