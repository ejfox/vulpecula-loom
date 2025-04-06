<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useActiveUser } from '../composables/useActiveUser'
import { useCoachArtie } from '../composables/useCoachArtie'
import type { OpenRouterModel } from '../types'

const props = defineProps({
  modelName: {
    type: String,
    default: ''
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  isSending: {
    type: Boolean,
    default: false
  },
  isContextPanelOpen: {
    type: Boolean,
    default: false
  },
  isChatSidebarOpen: {
    type: Boolean,
    default: true
  },
  isMobile: {
    type: Boolean,
    default: false
  },
  currentModel: {
    type: String,
    default: ''
  },
  availableModels: {
    type: Array as () => OpenRouterModel[],
    default: () => []
  },
  tokenCount: {
    type: Object,
    default: () => ({
      prompt: 0,
      completion: 0,
      total: 0
    })
  }
})

const { user, signOut } = useActiveUser()
const coachArtie = useCoachArtie()
const isUserMenuOpen = ref(false)

const emit = defineEmits(['update:isContextPanelOpen', 'update:isChatSidebarOpen', 'set-model', 'open-settings', 'open-api-keys'])

// Add state for debug console visibility
const isDebugConsoleVisible = ref(localStorage.getItem('logTickerShow') !== 'false')

// Listen for changes to debug console visibility
const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'logTickerShow') {
    isDebugConsoleVisible.value = e.newValue !== 'false'
  }
}

// Handle sign out
const handleSignOut = async () => {
  try {
    await signOut()
    isUserMenuOpen.value = false
  } catch (error) {
    console.error('Failed to sign out:', error)
  }
}

// Handle model change
const handleModelChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  if (target) {
    emit('set-model', target.value)
  }
}

// Group models by provider
const groupedModels = computed(() => {
  const groups: Record<string, OpenRouterModel[]> = {}

  props.availableModels.forEach(model => {
    const provider = model.id.split('/')[0]
    if (!groups[provider]) {
      groups[provider] = []
    }
    groups[provider].push(model)
  })

  return groups
})

// Get model display name
const getModelDisplayName = (modelId: string): string => {
  const model = props.availableModels.find(m => m.id === modelId)
  return model?.name || modelId.split('/').pop() || modelId
}

// Handle click outside with proper type casting
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (isUserMenuOpen.value && !target.closest('#user-menu')) {
    isUserMenuOpen.value = false
  }
}

// Add computed property to check if Coach Artie is available
const isCoachArtieConnected = computed(() => coachArtie.isConnected.value)

onMounted(() => {
  // ... existing code ...

  // Add storage listener
  window.addEventListener('storage', handleStorageChange)

  // Listen for custom event
  window.addEventListener('logticker-visibility-changed', ((e: Event) => {
    const customEvent = e as CustomEvent
    isDebugConsoleVisible.value = customEvent.detail?.visible || false
  }) as EventListener)

  // Add click event listener 
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // ... existing code ...

  // Remove storage listener
  window.removeEventListener('storage', handleStorageChange)

  // Remove custom event listener
  window.removeEventListener('logticker-visibility-changed', (() => { }) as EventListener)

  // Remove click event listener
  document.removeEventListener('click', handleClickOutside)
})

// Expose window controls for Electron
const electronWindow = {
  close: () => {
    // If using Electron
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.ipc.invoke('close-window')
    }
  },
  minimize: () => {
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.ipc.invoke('minimize-window')
    }
  },
  maximize: () => {
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.ipc.invoke('maximize-window')
    }
  }
}

// Handle opening settings
const openSettings = () => {
  emit('open-settings')
  isUserMenuOpen.value = false
}

// Handle opening API keys
const openApiKeys = () => {
  emit('open-api-keys')
  isUserMenuOpen.value = false
}

// If there's a function to toggle the debug console in the window object, we'll use it
const toggleDebugConsole = () => {
  // @ts-ignore - accessing a property that might not exist
  if (typeof window.toggleDebugConsole === 'function') {
    // @ts-ignore
    window.toggleDebugConsole();
  } else {
    // Fallback if the global function isn't available
    const currentShow = localStorage.getItem('logTickerShow');
    const newShow = currentShow === 'false' ? 'true' : 'false';
    localStorage.setItem('logTickerShow', newShow);

    // Dispatch event to notify components
    const event = new CustomEvent('logticker-visibility-changed', {
      detail: { visible: newShow === 'true' }
    });
    window.dispatchEvent(event);
  }
}

// Handle opening user menu
const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

// Format number with compact notation
const formatNumber = (num: number): string => {
  if (num === 0) return '0';
  
  if (num < 1000) return num.toString();
  
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(num);
}
</script>

<template>
  <header class="title-bar drag-handle">
    <!-- Window title only - no controls (they're in the sidebar) -->

    <!-- Title -->
    <h1 class="text-center font-semibold text-sm text-macos-gray-900 dark:text-ayu-dark-editor-fg">
      Vulpecula
    </h1>

    <!-- Coach Artie Status Indicator -->
    <div v-if="isCoachArtieConnected" class="flex items-center mr-2">
      <span
        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
        <span class="w-2 h-2 mr-1 bg-indigo-500 rounded-full animate-pulse"></span>
        🤖 Coach Artie
      </span>
    </div>

    <!-- Model Selector -->
    <div class="relative mx-auto">
      <select :value="currentModel" @change="handleModelChange" class="appearance-none bg-transparent border border-macos-gray-200 dark:border-ayu-dark-line 
               rounded-md px-3 py-1 text-xs focus:ring-1 focus:ring-macos-blue focus:border-macos-blue
               text-macos-gray-900 dark:text-ayu-dark-editor-fg focus:outline-none">
        <!-- Coach Artie at the top (if available) -->
        <option v-if="availableModels.some(m => m.id === 'coach-artie')" value="coach-artie" class="font-bold">
          🤖 Coach Artie
        </option>

        <!-- Divider if Coach Artie is available -->
        <option v-if="availableModels.some(m => m.id === 'coach-artie')" disabled>──────────</option>

        <template v-if="groupedModels && Object.keys(groupedModels).length">
          <optgroup v-for="(models, provider) in groupedModels" :key="provider" :label="provider">
            <template v-for="model in models" :key="model.id">
              <option v-if="model.id !== 'coach-artie'" :value="model.id">
                {{ model.name || model.id.split('/').pop() }}
              </option>
            </template>
          </optgroup>
        </template>
        <template v-else>
          <!-- Fallback options -->
          <optgroup label="OpenAI">
            <option value="openai/gpt-4o">GPT-4o</option>
            <option value="openai/gpt-4">GPT-4</option>
            <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </optgroup>
          <optgroup label="Anthropic">
            <option value="anthropic/claude-3-opus">Claude 3 Opus</option>
            <option value="anthropic/claude-3-sonnet">Claude 3 Sonnet</option>
            <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
          </optgroup>
          <optgroup label="Local">
            <option value="local/llama-3-70b">Llama 3 70B</option>
            <option value="local/mixtral-8x7b">Mixtral 8x7B</option>
          </optgroup>
        </template>
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-macos-gray-500">
        <svg class="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
      
      <!-- Token Counter -->
      <div v-if="tokenCount.total > 0" class="ml-2 text-xs flex items-center space-x-1 bg-gray-100 dark:bg-ayu-dark-line px-2 py-0.5 rounded">
        <span class="font-mono text-gray-600 dark:text-gray-300">{{ formatNumber(tokenCount.total) }}</span>
        <span class="text-gray-400 dark:text-gray-500">tokens</span>
      </div>
    </div>

    <!-- Right Aligned Content -->
    <div class="ml-auto flex items-center space-x-2">
      <!-- Toggle Context Panel -->
      <button @click="$emit('update:isContextPanelOpen', !props.isContextPanelOpen)"
        class="rounded-full p-1.5 hover:bg-macos-gray-100 dark:hover:bg-ayu-dark-line text-macos-gray-600 dark:text-ayu-dark-editor-fg">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      <!-- User Menu -->
      <div class="relative user-menu">
        <!-- User Menu Toggle -->
        <button @click="toggleUserMenu"
          class="px-2 py-1 ml-1 rounded-md hover:bg-gray-200 dark:hover:bg-ayu-dark-line relative user-menu-toggle"
          id="user-menu-toggle">
          <svg class="w-5 h-5 text-gray-600 dark:text-ayu-dark-comment" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span v-if="user && user.email" class="sr-only">{{ user.email }}</span>
        </button>

        <!-- User Menu Dropdown -->
        <div v-if="isUserMenuOpen"
          class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-ayu-dark-bg border border-gray-300 dark:border-ayu-dark-line rounded-md shadow-lg z-10"
          id="user-menu">
          <div class="py-1">
            <a href="#" @click.prevent="openSettings"
              class="block px-4 py-2 text-sm text-macos-gray-700 dark:text-ayu-dark-editor-fg hover:bg-macos-gray-100 dark:hover:bg-ayu-dark-line">
              Settings
            </a>
            <a href="#" @click.prevent="openApiKeys"
              class="block px-4 py-2 text-sm text-macos-gray-700 dark:text-ayu-dark-editor-fg hover:bg-macos-gray-100 dark:hover:bg-ayu-dark-line">
              API Keys
            </a>
            <a href="#" @click.prevent="handleSignOut"
              class="block px-4 py-2 text-sm text-red-600 dark:text-ayu-dark-error hover:bg-macos-gray-100 dark:hover:bg-ayu-dark-line">
              Logout
            </a>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.drag-handle {
  -webkit-app-region: drag;
}

button,
select,
a {
  -webkit-app-region: no-drag;
}
</style>
