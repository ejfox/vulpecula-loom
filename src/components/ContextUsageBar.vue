<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{
  totalTokens: number
  modelContextSize: number
  isContextPanelOpen: boolean
}>()

const emit = defineEmits<{
  'update:isContextPanelOpen': [value: boolean]
}>()

// Animation state
const isAnimating = ref(false)

// Percentage of context window used
const percentUsed = computed(() => {
  return Math.min(100, Math.round((props.totalTokens / props.modelContextSize) * 100))
})

// Number of squares to show (using 20 squares total by default)
const filledSquares = computed(() => {
  return Math.ceil((props.totalTokens / props.modelContextSize) * 20)
})

// Handle toggle context panel
const toggleContextPanel = () => {
  emit('update:isContextPanelOpen', !props.isContextPanelOpen)
}

// Generate appropriate color class based on usage percentage
const getColorClass = (percent: number) => {
  if (percent >= 90) return 'from-red-500 to-red-600'
  if (percent >= 75) return 'from-amber-500 to-amber-600'
  if (percent >= 50) return 'from-yellow-500 to-yellow-600'
  return 'from-blue-500 to-purple-600'
}

// Animation on mount or model change
onMounted(() => {
  isAnimating.value = true
  setTimeout(() => {
    isAnimating.value = false
  }, 800)
})
</script>

<template>
  <div @click="toggleContextPanel"
    class="relative flex items-center px-3 h-8 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800/70 transition-colors"
    :class="{ 'refresh-flash': isAnimating }">
    <!-- Context Usage Title -->
    <div class="flex items-center">
      <svg class="w-3.5 h-3.5 mr-1.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24"
        stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span class="text-xs font-medium text-gray-600 dark:text-gray-400 transition-all duration-300"
        :class="{ 'scale-110': isAnimating }">Context Window</span>
    </div>

    <!-- Context Usage Bar -->
    <div class="flex-1 px-2">
      <div class="flex gap-0.5 justify-center h-4">
        <div v-for="i in 20" :key="i" class="w-1 h-full rounded-sm transition-all duration-500" :class="[
          i <= filledSquares
            ? getColorClass(percentUsed) + ' scale-y-100 bg-gradient-to-b opacity-100'
            : 'bg-gray-200 dark:bg-gray-700 scale-y-50 opacity-40',
          isAnimating ? 'animate-pulse-quick scale-y-bounce' : ''
        ]">
        </div>
      </div>
    </div>

    <!-- Percentage Display -->
    <div class="text-xs font-medium tabular-nums text-gray-600 dark:text-gray-400 transition-all duration-300"
      :class="{ 'scale-110': isAnimating }">
      <span :class="{ 'animate-pulse-once': isAnimating }">{{ percentUsed }}% of {{ (props.modelContextSize /
        1000).toFixed(0) }}K</span>
      <svg class="inline-block w-3 h-3 ml-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" :class="{ 'rotate-180': props.isContextPanelOpen }">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.animate-pulse-quick {
  animation: pulse-quick 1s cubic-bezier(0.4, 0, 0.6, 1);
}

.animate-pulse-once {
  animation: pulse-once 1s cubic-bezier(0.4, 0, 0.6, 1);
}

.scale-y-bounce {
  animation: bounce-bar 0.8s ease-in-out;
}

.refresh-flash {
  position: relative;
}

.refresh-flash::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: flash-effect 1s ease-out;
}

.dark .refresh-flash::after {
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.05), transparent);
}

@keyframes pulse-quick {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }
}

@keyframes pulse-once {
  0% {
    opacity: 0.3;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 1;
  }
}

@keyframes bounce-bar {
  0% {
    transform: scaleY(0.5);
  }

  50% {
    transform: scaleY(1.2);
  }

  70% {
    transform: scaleY(0.9);
  }

  100% {
    transform: scaleY(1);
  }
}

@keyframes flash-effect {
  0% {
    left: -100%;
  }

  100% {
    left: 100%;
  }
}
</style>