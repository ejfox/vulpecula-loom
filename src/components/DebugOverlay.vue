<template>
  <Transition name="fade">
    <div v-if="isVisible" ref="debugWindow"
      class="fixed z-[100] p-4 bg-gray-900/90 text-white rounded-lg shadow-xl border border-gray-700/50 backdrop-blur-sm"
      :style="{ left: x + 'px', top: y + 'px', minWidth: '300px' }" @pointerdown="startDrag">
      <div class="flex items-center justify-between mb-3 select-none cursor-move">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <h3 class="text-sm font-medium">Debug Info</h3>
        </div>
        <div class="text-xs text-gray-400">Press Ctrl/⌘ + D to toggle</div>
      </div>

      <!-- Debug Stats -->
      <div class="space-y-2 text-sm">
        <!-- Authentication -->
        <div class="flex items-center justify-between">
          <span class="text-gray-400">Auth Status:</span>
          <span :class="isAuthenticated ? 'text-green-400' : 'text-red-400'">
            {{ isAuthenticated ? 'Authenticated' : 'Not Authenticated' }}
          </span>
        </div>

        <!-- User ID -->
        <div v-if="isAuthenticated" class="flex items-center justify-between">
          <span class="text-gray-400">User ID:</span>
          <span class="font-mono text-xs">{{ userId }}</span>
        </div>

        <!-- Chat Stats -->
        <div class="flex items-center justify-between">
          <span class="text-gray-400">Chat History:</span>
          <span class="font-mono">{{ chatHistory.length }} chats</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-gray-400">Current Chat:</span>
          <span class="font-mono text-xs">{{ currentChatId || 'None' }}</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-gray-400">Messages:</span>
          <span class="font-mono">{{ messages.length }}</span>
        </div>

        <!-- Model Info -->
        <div class="flex items-center justify-between">
          <span class="text-gray-400">Current Model:</span>
          <span class="font-mono text-xs">{{ currentModel || 'None' }}</span>
        </div>

        <!-- Token Stats -->
        <template v-if="chatStats">
          <div v-if="chatStats.promptTokens > 0" class="flex items-center justify-between">
            <span class="text-gray-400">Prompt Tokens:</span>
            <span class="font-mono">{{ chatStats.promptTokens }}</span>
          </div>
          <div v-if="chatStats.completionTokens > 0" class="flex items-center justify-between">
            <span class="text-gray-400">Completion Tokens:</span>
            <span class="font-mono">{{ chatStats.completionTokens }}</span>
          </div>
          <div v-if="chatStats.cost > 0" class="flex items-center justify-between">
            <span class="text-gray-400">Total Cost:</span>
            <span class="font-mono">${{ chatStats.cost.toFixed(4) }}</span>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDraggable, useKeyModifier, useToggle } from '@vueuse/core'
import type { ChatStats } from '../types'

const props = defineProps<{
  isAuthenticated: boolean
  userId?: string | null
  chatHistory: any[]
  currentChatId: string | null
  messages: any[]
  currentModel: string | null
  chatStats?: ChatStats
}>()

// Initial position (centered)
const x = ref(window.innerWidth / 2 - 150)
const y = ref(window.innerHeight / 2 - 200)

const debugWindow = ref<HTMLElement | null>(null)

// Make the window draggable
const { style, position } = useDraggable(debugWindow, {
  initialValue: { x: x.value, y: y.value },
})

// Update position refs when dragged
watch(position, (pos) => {
  x.value = pos.x
  y.value = pos.y
})

const startDrag = (e: PointerEvent) => {
  const target = e.target as HTMLElement
  if (target.closest('.cursor-move')) {
    position.value = { x: x.value, y: y.value }
  }
}

// Toggle visibility with Cmd/Ctrl + D
const cmdKey = useKeyModifier('Meta')
const ctrlKey = useKeyModifier('Control')
const dKey = useKeyModifier('d' as any)

const [isVisible, toggleVisible] = useToggle(false)

// Watch for keyboard shortcut
watch([cmdKey, ctrlKey, dKey], ([cmd, ctrl, d]) => {
  if ((cmd || ctrl) && d) {
    toggleVisible()
  }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>