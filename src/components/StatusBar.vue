<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  modelName: string
  isConnected: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['command'])

const isCommandMode = ref(false)
const commandInput = ref('')
const commandHistory = ref<string[]>([])
const historyIndex = ref(-1)

// Available commands and their descriptions
const commands = {
  'new': 'Create a new chat',
  'fork': 'Fork current chat at last message',
  'thread': 'Create or switch thread',
  'model': 'Change AI model',
  'help': 'Show available commands',
  'clear': 'Clear chat history',
  'quit': 'Close current chat'
} as const

const handleKeydown = (e: KeyboardEvent) => {
  // Enter command mode with ':'
  if (e.key === ':' && !isCommandMode.value) {
    e.preventDefault()
    isCommandMode.value = true
    commandInput.value = ''
    return
  }

  if (!isCommandMode.value) return

  switch (e.key) {
    case 'Escape':
      isCommandMode.value = false
      commandInput.value = ''
      break

    case 'Enter':
      if (commandInput.value) {
        executeCommand(commandInput.value)
        commandHistory.value.push(commandInput.value)
        historyIndex.value = -1
        commandInput.value = ''
        isCommandMode.value = false
      }
      break

    case 'ArrowUp':
      e.preventDefault()
      if (historyIndex.value < commandHistory.value.length - 1) {
        historyIndex.value++
        commandInput.value = commandHistory.value[commandHistory.value.length - 1 - historyIndex.value]
      }
      break

    case 'ArrowDown':
      e.preventDefault()
      if (historyIndex.value > 0) {
        historyIndex.value--
        commandInput.value = commandHistory.value[commandHistory.value.length - 1 - historyIndex.value]
      } else if (historyIndex.value === 0) {
        historyIndex.value = -1
        commandInput.value = ''
      }
      break
  }
}

const executeCommand = (cmd: string) => {
  const [command, ...args] = cmd.trim().split(' ')
  emit('command', { command, args })
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <footer class="flex-shrink-0 h-6 bg-gray-900 dark:bg-gray-950 border-t border-gray-800 dark:border-gray-800/50 
           text-gray-400 dark:text-gray-500 text-xs flex items-center px-2 gap-3 
           group hover:bg-gray-800 dark:hover:bg-gray-900 transition-colors">
    <!-- Command input -->
    <div v-if="isCommandMode" class="flex-1 flex items-center">
      <span class="text-yellow-500 dark:text-yellow-400">:</span>
      <input ref="commandInput" v-model="commandInput" type="text"
        class="flex-1 bg-transparent border-none outline-none px-1 text-white dark:text-gray-200 focus:ring-0"
        placeholder="Type a command..." />
    </div>

    <!-- Normal status display -->
    <template v-else>
      <!-- Left side status items -->
      <div class="flex items-center gap-3">
        <!-- Connection status -->
        <div class="flex items-center gap-1.5">
          <div class="w-2 h-2 rounded-full transition-colors"
            :class="isConnected ? 'bg-green-500 dark:bg-green-600' : 'bg-red-500 dark:bg-red-600'" />
          <span class="transition-opacity hover:text-gray-300 dark:hover:text-gray-400">
            {{ isConnected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>

        <!-- Model name -->
        <div v-if="modelName" class="flex items-center gap-1">
          <span class="text-gray-500 dark:text-gray-600">Model:</span>
          <span class="hover:text-gray-300 dark:hover:text-gray-400 transition-colors">
            {{ modelName.split('/').pop() }}
          </span>
        </div>
      </div>

      <!-- Right side status items -->
      <div class="flex-1 flex items-center justify-end gap-3">
        <span class="text-gray-600 dark:text-gray-500">Press : for commands</span>
      </div>
    </template>
  </footer>
</template>