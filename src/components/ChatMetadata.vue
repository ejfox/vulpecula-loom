<template>
  <div class="border-b dark:border-gray-700 bg-gray-100 dark:bg-gray-900 font-mono text-xs">
    <!-- Main Grid Layout -->
    <div class="grid grid-cols-12 h-9">
      <!-- Token Count -->
      <div
        class="col-span-2 flex items-center px-4 border-r dark:border-gray-800 relative overflow-hidden group/tokens">
        <span
          class="absolute left-0 opacity-0 px-4 text-gray-400 dark:text-gray-500 uppercase transform -translate-x-full group-hover/tokens:opacity-100 group-hover/tokens:translate-x-0 transition-all duration-300 ease-out">Tokens</span>
        <span
          class="tabular-nums font-medium transform group-hover/tokens:translate-x-16 transition-all duration-300 ease-out">{{
            totalTokenCount }}</span>
      </div>

      <!-- Token Distribution -->
      <div class="col-span-3 flex items-center px-4 border-r dark:border-gray-800 relative overflow-hidden group/dist">
        <div
          class="flex absolute left-0 opacity-0 px-4 transform -translate-x-full group-hover/dist:opacity-100 group-hover/dist:translate-x-0 transition-all duration-300 ease-out">
          <span class="text-gray-400 dark:text-gray-500">IN/OUT</span>
        </div>
        <div class="flex items-center transform group-hover/dist:translate-x-14 transition-all duration-300 ease-out">
          <span class="text-gray-400 dark:text-gray-500">{{ stats.promptTokens }}</span>
          <span class="text-gray-400 dark:text-gray-500 mx-1">:</span>
          <span class="text-gray-400 dark:text-gray-500">{{ stats.completionTokens }}</span>
        </div>
      </div>

      <!-- Total Cost -->
      <div class="col-span-3 flex items-center px-4 border-r dark:border-gray-800 relative overflow-hidden group/cost">
        <span
          class="absolute left-0 opacity-0 px-4 text-gray-400 dark:text-gray-500 uppercase transform -translate-x-full group-hover/cost:opacity-100 group-hover/cost:translate-x-0 transition-all duration-300 ease-out">Cost</span>
        <span class="tabular-nums transform group-hover/cost:translate-x-12 transition-all duration-300 ease-out">{{
          stats.cost ? formatModelCost('', stats.cost) : '0.0¢/GTok' }}</span>
      </div>

      <!-- Token Rate -->
      <div class="col-span-3 flex items-center px-4 border-r dark:border-gray-800 relative overflow-hidden group/rate">
        <span
          class="absolute left-0 opacity-0 px-4 text-gray-400 dark:text-gray-500 uppercase transform -translate-x-full group-hover/rate:opacity-100 group-hover/rate:translate-x-0 transition-all duration-300 ease-out">Rate</span>
        <span class="tabular-nums transform group-hover/rate:translate-x-12 transition-all duration-300 ease-out">{{
          formattedTokenCost || "0.0¢/GTok" }}</span>
      </div>

      <!-- Export Icon Button (replacing text button with minimal icon) -->
      <div class="col-span-1 flex items-center justify-center overflow-hidden">
        <button @click="$emit('export')" class="h-full w-full flex items-center justify-center
                       text-gray-300 dark:text-gray-600 
                       hover:text-gray-600 dark:hover:text-gray-300
                       transition-colors duration-300 ease-out 
                       hover:bg-gray-200 dark:hover:bg-gray-800">
          <!-- Simple download icon using Unicode -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M12 4v8m0 0l-4-4m4 4l4-4m-4 12H6a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2h-2" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

// Computed properties to determine what to show
const totalTokenCount = computed(() => (props.stats?.promptTokens || 0) + (props.stats?.completionTokens || 0))
const hasTotalTokens = computed(() => totalTokenCount.value > 0)
const hasCost = computed(() => (props.stats?.cost || 0) > 0)
const hasTokenCost = computed(() => hasTotalTokens.value && hasCost.value)

// Calculate token cost
const formatTokenCost = () => {
  const totalTokens = totalTokenCount.value
  const cost = props.stats?.cost || 0

  if (totalTokens === 0 || cost === 0) return ''

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

const formattedTokenCost = computed(() => formatTokenCost())

// Format response time
const formatResponseTime = (ms: number) => {
  return (ms / 1000).toFixed(2)
}
</script>

<style scoped>
/* For better tabular number alignment */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* Custom easing function for more elegant transitions */
.ease-out {
  transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1.0);
  /* This is a quadratic ease-out curve */
}
</style>