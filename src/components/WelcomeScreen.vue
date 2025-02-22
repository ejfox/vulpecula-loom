<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useOpenRouter } from '../composables/useOpenRouter'
import { useMagicKeys, useClipboard } from '@vueuse/core'

const props = defineProps<{
  hasValidKey: boolean
  savingKey: boolean
  modelName?: string
  availableModels?: { name: string; description?: string }[]
  currentApiKey?: string
}>()

const emit = defineEmits<{
  'save-api-key': [key: string]
  'start-chat': []
  'open-settings': []
}>()

const openRouter = useOpenRouter()
const apiKeyInput = ref('')
const showApiKey = ref(false)
const { copy } = useClipboard()
const { meta } = useMagicKeys()

const isMac = computed(() => {
  if (typeof navigator === 'undefined') return false
  return navigator.platform.toLowerCase().includes('mac')
})

const settingsKey = computed(() => isMac.value ? '⌘,' : 'Ctrl+,')

const hasActualKey = computed(() => {
  return props.hasValidKey && props.currentApiKey && props.currentApiKey.startsWith('sk-or-')
})

const suggestedModels = computed(() => {
  const preferredModels = [
    {
      name: 'Claude 3 Sonnet',
      description: 'Fast, capable, and cost-effective for most coding tasks'
    },
    {
      name: 'Claude 3 Opus',
      description: 'Most powerful model, best for complex programming challenges'
    },
    {
      name: 'GPT-4 Turbo',
      description: 'Excellent all-around performance with good coding abilities'
    }
  ]

  // If we have actual models, try to match them
  const availableModels = props.availableModels ?? []
  if (availableModels.length > 0) {
    return preferredModels.map(preferred => {
      const match = availableModels.find(m =>
        m.name.toLowerCase().includes(preferred.name.toLowerCase())
      )
      return match || preferred
    })
  }

  return preferredModels
})

const handleSubmit = async () => {
  emit('save-api-key', apiKeyInput.value)
  if (!showApiKey.value) {
    apiKeyInput.value = ''
  }
}

const handleShowApiKey = () => {
  showApiKey.value = true
  // If we have a current key, populate the input
  if (props.currentApiKey) {
    apiKeyInput.value = props.currentApiKey
  }
}

const handleHideApiKey = () => {
  showApiKey.value = false
  apiKeyInput.value = ''
}

const copyApiKey = async () => {
  if (props.currentApiKey) {
    await copy(props.currentApiKey)
  }
}

const openExternalLink = (event: MouseEvent) => {
  event.preventDefault()
  // Use window.electron.shell.openExternal if available
  if (window.electron?.shell?.openExternal) {
    window.electron.shell.openExternal('https://openrouter.ai/keys')
  } else {
    // Fallback to regular window.open
    window.open('https://openrouter.ai/keys', '_blank')
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div class="min-h-full flex flex-col items-center justify-center p-8">
        <!-- Welcome Message -->
        <div class="max-w-2xl mx-auto mb-8 flex-shrink-0">
          <div class="flex items-center justify-center mb-6">
            <Icon icon="carbon:chat-bot" class="w-16 h-16 text-blue-500 dark:text-blue-400" />
          </div>
          <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Vulpecula
          </h1>
          <p class="text-lg text-gray-600 dark:text-gray-400">
            Your intelligent coding companion, powered by {{ props.modelName || 'state-of-the-art AI models' }} through
            OpenRouter.
          </p>
        </div>

        <!-- Main Setup Area -->
        <div class="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 flex-shrink-0">
          <!-- Left Column: API Key Setup -->
          <div class="space-y-6">
            <!-- API Key Section -->
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="[
                  hasActualKey
                    ? 'bg-green-100 dark:bg-green-900'
                    : 'bg-blue-100 dark:bg-blue-900'
                ]">
                  <Icon :icon="hasActualKey ? 'carbon:checkmark' : 'carbon:key'" class="w-4 h-4" :class="[
                    hasActualKey
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-blue-600 dark:text-blue-400'
                  ]" />
                </div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ hasActualKey ? 'API Key Set' : 'Set up your OpenRouter API key' }}
                </h2>
              </div>

              <template v-if="!hasActualKey || showApiKey">
                <p class="text-gray-600 dark:text-gray-400 mb-6">
                  {{ hasActualKey
                    ? 'You can view or update your API key below.'
                    : 'To get started, you\'ll need an OpenRouter API key.'
                  }}
                </p>

                <div class="space-y-4">
                  <div class="flex flex-col gap-2">
                    <div class="flex gap-2">
                      <div class="flex-1 relative">
                        <input v-model="apiKeyInput" :type="showApiKey ? 'text' : 'password'" id="api-key"
                          placeholder="sk-or-..."
                          class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 pr-20" />
                        <div class="absolute inset-y-0 right-0 flex items-center gap-1 px-2">
                          <button v-if="hasActualKey" @click="copyApiKey" type="button"
                            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Copy API Key">
                            <Icon icon="carbon:copy" class="w-4 h-4" />
                          </button>
                          <button @click="showApiKey = !showApiKey" type="button"
                            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            :title="showApiKey ? 'Hide API Key' : 'Show API Key'">
                            <Icon :icon="showApiKey ? 'carbon:view-off' : 'carbon:view'" class="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <button @click="handleSubmit"
                        :disabled="!apiKeyInput || savingKey || (apiKeyInput === props.currentApiKey)"
                        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white rounded-md font-medium transition-colors flex items-center gap-2 whitespace-nowrap">
                        <Icon v-if="savingKey" icon="eos-icons:loading" class="animate-spin" />
                        <span>{{ savingKey ? 'Saving...' : (hasActualKey ? 'Update' : 'Save') }}</span>
                      </button>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Icon icon="carbon:information" class="w-4 h-4" />
                    <span>API keys should start with <code
                        class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">sk-or-</code></span>
                  </div>

                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Don't have a key yet?
                    <a href="#" @click="openExternalLink" class="text-blue-500 hover:text-blue-400 underline">
                      Get one from OpenRouter
                    </a>
                  </p>
                </div>
              </template>
              <template v-else>
                <div class="space-y-4">
                  <div class="flex items-center gap-2">
                    <p class="text-gray-600 dark:text-gray-400">
                      Your OpenRouter API key is set up and ready to go.
                    </p>
                    <Icon icon="carbon:checkmark-filled" class="w-4 h-4 text-green-500" />
                  </div>
                  <div class="flex items-center gap-4">
                    <button @click="handleShowApiKey" class="text-sm text-blue-500 hover:text-blue-400 underline">
                      Show/Edit API Key
                    </button>
                    <button @click="copyApiKey"
                      class="text-sm text-blue-500 hover:text-blue-400 underline flex items-center gap-1">
                      <Icon icon="carbon:copy" class="w-4 h-4" />
                      Copy Key
                    </button>
                  </div>
                </div>
              </template>
            </div>

            <!-- Keyboard Shortcuts -->
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                  <Icon icon="carbon:keyboard" class="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  Quick Tips
                </h2>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <span class="text-gray-600 dark:text-gray-400">Open Settings</span>
                  <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded text-sm">{{ settingsKey }}</kbd>
                </div>
                <div class="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <span class="text-gray-600 dark:text-gray-400">New Chat</span>
                  <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded text-sm">{{ isMac ? '⌘N' : 'Ctrl+N'
                    }}</kbd>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Models & Start -->
          <div class="space-y-6">
            <!-- Recommended Models -->
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700"
              :class="{ 'opacity-50 pointer-events-none': !hasActualKey }">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Icon icon="carbon:machine-learning-model" class="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  Recommended Models
                </h2>
              </div>

              <div class="space-y-3">
                <div v-for="model in suggestedModels" :key="model.name"
                  class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <div class="flex items-start gap-3">
                    <div class="flex-shrink-0 mt-1">
                      <Icon icon="carbon:ai-status-complete" class="w-4 h-4 text-purple-500 dark:text-purple-400" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <h3 class="font-medium text-gray-900 dark:text-white truncate">{{ model.name }}</h3>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words">
                        {{ model.description }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  More models available in
                  <button @click="$emit('open-settings')" class="text-blue-500 hover:text-blue-400 underline">
                    settings
                  </button>
                </p>
              </div>
            </div>

            <!-- Start Chat -->
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700"
              :class="{ 'opacity-50 pointer-events-none': !hasActualKey }">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Icon icon="carbon:chat" class="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  Ready to Start?
                </h2>
              </div>

              <div class="space-y-3">
                <button
                  class="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 dark:disabled:bg-green-800 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                  :disabled="!hasActualKey" @click="$emit('start-chat')">
                  <Icon icon="carbon:chat" class="w-5 h-5" />
                  <span>Start a New Chat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>