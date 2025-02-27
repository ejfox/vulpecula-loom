<template>
  <div>
    <!-- Main Ticker Component -->
    <div v-if="show"
      class="log-ticker fixed bottom-0 left-0 right-0 bg-black text-green-500 border-t border-gray-800 z-[100] shadow-lg overflow-hidden font-mono text-xs"
      :class="{ 'h-14': !minimized, 'h-5': minimized }">
      <!-- Header Bar with Simple Controls -->
      <div class="ticker-header h-5 bg-black border-b border-gray-800 flex items-center px-2">
        <div class="ticker-title flex-grow font-mono text-xs">
          <span class="text-green-500 mr-1">$</span>console.log
          <span class="text-gray-500 text-xs ml-2">[Alt+L]</span>
        </div>
        <button @click="toggleMinimize" class="text-gray-500 hover:text-green-500 focus:outline-none px-1 font-mono"
          title="Minimize ticker">
          _
        </button>
        <button @click="toggleShow" class="text-gray-500 hover:text-green-500 focus:outline-none px-1 font-mono"
          title="Close ticker">
          x
        </button>
      </div>

      <!-- Scrolling Content -->
      <div v-if="!minimized" class="ticker-content h-8 flex items-center overflow-hidden bg-black">
        <div class="whitespace-nowrap flex items-center animate-scroll">
          <span v-for="(log, index) in displayLogs" :key="index" class="mx-3 flex items-center">
            <span :class="getLogTypeClass(log.type)" class="min-w-[40px] mr-2 font-mono">
              {{ log.type.slice(0, 4) }}:
            </span>
            <span class="font-mono text-gray-300">{{ truncateMessage(log.message) }}</span>
            <span class="mx-4 text-gray-600">|</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Ultra Minimal Restore Button - Shows when ticker is hidden -->
    <div v-if="!show" @click="restoreTicker"
      class="fixed bottom-0 right-0 w-8 h-2 bg-black hover:bg-green-900 transition-colors cursor-pointer opacity-30 hover:opacity-70"
      title="Restore debug console">
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface LogEntry {
  type: 'info' | 'warn' | 'error' | 'debug'
  message: string
  timestamp: number
}

const props = defineProps({
  maxLogs: {
    type: Number,
    default: 50
  },
  initialShow: {
    type: Boolean,
    default: true
  }
})

const logs = ref<LogEntry[]>([])
const show = ref(props.initialShow)
const minimized = ref(false)

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug
}

// Compute logs to display in ticker
const displayLogs = ref<LogEntry[]>([])

// Custom event dispatcher for visibility change
const dispatchVisibilityEvent = (visible: boolean) => {
  const event = new CustomEvent('logticker-visibility-changed', {
    detail: { visible }
  })
  window.dispatchEvent(event)
}

// Watch for show changes and dispatch events
watch(show, (newValue) => {
  dispatchVisibilityEvent(newValue)
})

function getLogTypeClass(type: string) {
  switch (type) {
    case 'error': return 'text-red-500'
    case 'warn': return 'text-yellow-500'
    case 'debug': return 'text-blue-500'
    default: return 'text-green-500'
  }
}

function truncateMessage(message: string) {
  return message.length > 150 ? message.substring(0, 150) + '...' : message
}

function toggleShow() {
  show.value = !show.value
  // Store preference in localStorage
  localStorage.setItem('logTickerShow', String(show.value))
}

function restoreTicker() {
  show.value = true
  localStorage.setItem('logTickerShow', 'true')
}

function toggleMinimize() {
  minimized.value = !minimized.value
  // Store preference in localStorage
  localStorage.setItem('logTickerMinimized', String(minimized.value))
}

// Function to intercept console methods
function interceptConsole() {
  console.log = (...args) => {
    addLog('info', args)
    originalConsole.log(...args)
  }

  console.warn = (...args) => {
    addLog('warn', args)
    originalConsole.warn(...args)
  }

  console.error = (...args) => {
    addLog('error', args)
    originalConsole.error(...args)
  }

  console.debug = (...args) => {
    addLog('debug', args)
    originalConsole.debug(...args)
  }
}

// Add log to our collection
function addLog(type: 'info' | 'warn' | 'error' | 'debug', args: any[]) {
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg)
      } catch (e) {
        return String(arg)
      }
    }
    return String(arg)
  }).join(' ')

  logs.value.push({
    type,
    message,
    timestamp: Date.now()
  })

  // Limit number of logs
  if (logs.value.length > props.maxLogs) {
    logs.value = logs.value.slice(-props.maxLogs)
  }

  // Update display logs
  displayLogs.value = [...logs.value]
}

// Restore original console methods
function restoreConsole() {
  console.log = originalConsole.log
  console.warn = originalConsole.warn
  console.error = originalConsole.error
  console.debug = originalConsole.debug
}

// Keyboard shortcut handler
function handleKeyDown(e: KeyboardEvent) {
  // Make Alt+L case insensitive and also capture Alt+Shift+L
  if (e.altKey && (e.key === 'l' || e.key === 'L')) {
    e.preventDefault(); // Prevent any default browser behavior
    toggleShow();
    console.log('Alt+L pressed - toggling debug console');
  }
}

onMounted(() => {
  // Check localStorage for ticker visibility preference
  const storedShow = localStorage.getItem('logTickerShow')
  if (storedShow !== null) {
    show.value = storedShow === 'true'
  }

  // Check localStorage for ticker minimized state
  const storedMinimized = localStorage.getItem('logTickerMinimized')
  if (storedMinimized !== null) {
    minimized.value = storedMinimized === 'true'
  }

  // Add keyboard shortcut listener - using keydown for faster response
  document.addEventListener('keydown', handleKeyDown, { capture: true })

  interceptConsole()

  // Add a welcome message
  addLog('info', ['🎭 LogTicker initialized! Console logs will appear here. (Alt+L to toggle)'])

  // Dispatch initial visibility state
  dispatchVisibilityEvent(show.value)

  // Register a global window function for external toggling
  // @ts-ignore - adding a property to window
  window.toggleDebugConsole = () => {
    toggleShow()
    console.log('Debug console toggled via global function')
    return show.value
  }
})

onUnmounted(() => {
  restoreConsole()
  document.removeEventListener('keydown', handleKeyDown, { capture: true })

  // Remove global function
  // @ts-ignore - removing a property from window
  delete window.toggleDebugConsole
})
</script>

<style scoped>
.log-ticker {
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
  transition: height 0.2s ease;
}

.ticker-content {
  width: 100%;
  overflow: hidden;
}

.animate-scroll {
  animation: scroll 60s linear infinite;
}

@keyframes scroll {
  0% {
    transform: translateX(100%);
  }

  100% {
    transform: translateX(-100%);
  }
}
</style>