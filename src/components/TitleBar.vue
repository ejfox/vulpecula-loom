<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useActiveUser } from '../composables/useActiveUser'
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
  }
})

const { user, signOut } = useActiveUser()
const isUserMenuOpen = ref(false)

const emit = defineEmits(['update:isContextPanelOpen', 'update:isChatSidebarOpen', 'set-model', 'open-settings', 'open-api-keys'])

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

// Close menu when clicking outside
onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (isUserMenuOpen.value && !e.target.closest('.user-menu')) {
      isUserMenuOpen.value = false
    }
  }
  document.addEventListener('click', handleClickOutside)
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
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
</script>

<template>
  <header class="title-bar drag-handle">
    <!-- macOS window controls -->
    <div class="flex space-x-2 mr-4 self-center">
      <button class="w-3 h-3 rounded-full bg-red-500 hover:brightness-110" @click="electronWindow.close()" />
      <button class="w-3 h-3 rounded-full bg-yellow-500 hover:brightness-110" @click="electronWindow.minimize()" />
      <button class="w-3 h-3 rounded-full bg-green-500 hover:brightness-110" @click="electronWindow.maximize()" />
    </div>

    <!-- Title -->
    <h1 class="text-center font-semibold text-sm text-macos-gray-900 dark:text-ayu-dark-editor-fg">
      Vulpecula
    </h1>

    <!-- Model Selector -->
    <div class="relative mx-auto">
      <select :value="currentModel" @change="handleModelChange" class="appearance-none bg-transparent border border-macos-gray-200 dark:border-ayu-dark-line 
               rounded-md px-3 py-1 text-xs focus:ring-1 focus:ring-macos-blue focus:border-macos-blue
               text-macos-gray-900 dark:text-ayu-dark-editor-fg focus:outline-none">
        <template v-if="groupedModels && Object.keys(groupedModels).length">
          <optgroup v-for="(models, provider) in groupedModels" :key="provider" :label="provider">
            <option v-for="model in models" :key="model.id" :value="model.id">
              {{ model.name || model.id.split('/').pop() }}
            </option>
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
        <button @click="isUserMenuOpen = !isUserMenuOpen"
          class="rounded-full w-6 h-6 bg-macos-blue dark:bg-ayu-dark-entity flex items-center justify-center text-white text-xs font-medium">
          EF
        </button>

        <!-- User Menu Dropdown -->
        <div v-if="isUserMenuOpen"
          class="absolute right-0 mt-1 w-48 bg-white/80 dark:bg-ayu-dark-panel backdrop-blur-md rounded-md shadow-lg border border-macos-gray-200 dark:border-ayu-dark-line z-10">
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