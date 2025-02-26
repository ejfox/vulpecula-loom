<template>
  <div class="px-2 py-1 border-b dark:border-gray-700 bg-gray-100 dark:bg-gray-900 font-mono text-xs">
    <div class="flex items-center justify-between">
      <!-- Stats Group -->
      <div class="flex items-center space-x-4">
        <!-- Token Stats -->
        <div class="flex items-center space-x-1">
          <div class="flex items-baseline">
            <span class="text-gray-500 dark:text-gray-400 mr-1">TOKENS</span>
            <span class="font-bold tabular-nums text-gray-900 dark:text-gray-100">{{ (stats?.promptTokens || 0) + (stats?.completionTokens || 0) }}</span>
          </div>
          <div class="flex items-center space-x-1 text-xxs">
            <span class="px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded tabular-nums">
              IN:{{ stats?.promptTokens || 0 }}
            </span>
            <span class="px-1 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded tabular-nums">
              OUT:{{ stats?.completionTokens || 0 }}
            </span>
          </div>
        </div>

        <!-- Cost Stats -->
        <div class="flex items-center space-x-1">
          <div class="flex items-baseline">
            <span class="text-gray-500 dark:text-gray-400 mr-1">COST</span>
            <span class="font-bold tabular-nums text-amber-600 dark:text-amber-400">{{ stats?.cost ? formatModelCost('', stats.cost) : '$0.0000' }}</span>
          </div>
          <div class="flex items-center space-x-1 text-xxs">
            <span class="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded tabular-nums">
              {{ formatTokenCost() }}
            </span>
          </div>
        </div>
      </div>

      <!-- Right Stats and Actions -->
      <div class="flex items-center space-x-3">
        <!-- Time Stats (if available) -->
        <div v-if="stats?.responseTime" class="hidden md:flex items-center space-x-1">
          <span class="text-gray-500 dark:text-gray-400">TIME</span>
          <span class="font-bold tabular-nums text-gray-900 dark:text-gray-100">{{ formatResponseTime(stats.responseTime) }}</span>
          <span class="text-xxs text-gray-500 dark:text-gray-400">SEC</span>
        </div>

        <!-- Export Button -->
        <button @click="$emit('export')" class="flex items-center gap-1 px-2 py-0.5 
                     text-gray-700 dark:text-gray-300 
                     hover:text-gray-900 dark:hover:text-white
                     hover:bg-gray-200 dark:hover:bg-gray-800
                     border border-gray-300 dark:border-gray-700
                     rounded transition-colors">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="hidden sm:inline">EXPORT</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useOpenRouter } from '../composables/useOpenRouter'
import type { ChatStats } from '../types'

const props = withDefaults(defineProps<{
  stats: ChatStats
}>(), {
  stats: () => ({
    promptTokens: 0,
    completionTokens: 0,
    cost: 0,
    totalMessages: 0,
    responseTime: 0
  })
})

defineEmits<{
  export: []
}>()

const { formatModelCost } = useOpenRouter()

// Calculate token cost
const formatTokenCost = () => {
  const totalTokens = (props.stats?.promptTokens || 0) + (props.stats?.completionTokens || 0)
  const cost = props.stats?.cost || 0
  
  if (totalTokens === 0 || cost === 0) return '0.0¢/GTok'
  
  const costPerToken = cost / totalTokens
  
  if (costPerToken >= 0.01) {
    return `$${costPerToken.toFixed(2)}/tok`
  } else if (costPerToken >= 0.0001) {
    return `${(costPerToken * 100).toFixed(1)}¢/tok`
  } else if (costPerToken >= 0.0000001) {
    return `${(costPerToken * 100000).toFixed(1)}¢/KTok`
  } else {
    return `${(costPerToken * 100000000).toFixed(1)}¢/GTok`
  }
}

// Format response time
const formatResponseTime = (ms: number) => {
  return (ms / 1000).toFixed(2)
}
</script>

<style scoped>
.text-xxs {
  font-size: 0.65rem;
  line-height: 1rem;
}

/* For better tabular number alignment */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>