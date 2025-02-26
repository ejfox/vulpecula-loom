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
const showUserMenu = ref(false)

const emit = defineEmits(['update:isContextPanelOpen', 'update:isChatSidebarOpen', 'set-model'])

// Handle sign out
const handleSignOut = async () => {
  try {
    await signOut()
    showUserMenu.value = false
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
    if (showUserMenu.value && !e.defaultPrevented) {
      showUserMenu.value = false
    }
  }
  document.addEventListener('click', handleClickOutside)
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>

<template>
  <header class="h-10 drag-handle flex items-center justify-center relative
           border-b transition-all duration-1000
           bg-white dark:bg-gray-950 
           border-gray-200 dark:border-gray-800/50" :class="[
            isLoading
              ? 'animate-gradient-slow bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800/50 dark:via-gray-700/50 dark:to-gray-800/50 bg-200%'
              : isSending
                ? 'animate-gradient-slower bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 dark:from-blue-900/50 dark:via-blue-800/50 dark:to-blue-900/50 bg-200%'
                : 'backdrop-blur-sm'
          ]">
    <!-- Left side (with traffic light spacing) -->
    <div class="absolute left-[70px] flex items-center gap-2">
      <button @click="emit('update:isChatSidebarOpen', !isChatSidebarOpen)"
        class="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        :class="{ 'text-gray-700 dark:text-gray-300': isChatSidebarOpen }">
        <span class="sr-only">Toggle chat sidebar</span>
        <svg class="w-5 h-5 transition-transform duration-200" :class="{ 'rotate-180': !isChatSidebarOpen }" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>

    <!-- Center-aligned content -->
    <div class="flex items-center gap-2 text-xs relative w-48">
      <select :value="currentModel" @change="handleModelChange"
        class="w-full py-1 px-3 pr-6 text-xs bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800
               border border-gray-200 dark:border-gray-700 rounded-md
               text-gray-600 dark:text-gray-400 
               focus:outline-none focus:ring-1 focus:ring-blue-500
               appearance-none cursor-pointer
               transition-colors duration-150">
        <template v-if="availableModels && availableModels.length > 0">
          <optgroup v-for="(models, provider) in groupedModels" :key="provider" :label="provider.toUpperCase()">
            <option v-for="model in models" :key="model.id" :value="model.id">
              {{ model.name || getModelDisplayName(model.id) }}
            </option>
          </optgroup>
        </template>
        <option v-else value="" disabled>Loading models...</option>
      </select>
      <svg class="w-3 h-3 text-gray-400 dark:text-gray-500 pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>

    <!-- Right-aligned content -->
    <div class="absolute right-3 flex items-center gap-2">
      <!-- Context Panel Toggle -->
      <button @click="emit('update:isContextPanelOpen', !isContextPanelOpen)"
        class="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        :class="{ 'text-gray-700 dark:text-gray-300': isContextPanelOpen }">
        <span class="sr-only">Toggle context panel</span>
        <svg class="w-5 h-5 transition-transform duration-200" :class="{ 'rotate-180': isContextPanelOpen }" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- User Menu Button -->
      <div class="relative ml-2">
        <button @click.stop="showUserMenu = !showUserMenu"
          class="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <!-- User Avatar -->
          <span class="text-sm text-gray-700 dark:text-gray-300">
            {{ user?.email || 'User' }}
          </span>
          <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- User Menu Dropdown -->
        <div v-if="showUserMenu"
          class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div class="py-1">
            <!-- User Info -->
            <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ user?.email }}
              </div>
            </div>

            <!-- Logout Button -->
            <button @click="handleSignOut"
              class="w-full px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>