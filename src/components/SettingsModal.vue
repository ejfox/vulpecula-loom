<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { OpenRouterModel } from '../types'
import { useStore } from '../lib/store'
import { useOpenRouter } from '../composables/useOpenRouter'
import ModelSettings from './ModelSettings.vue'
import { useActiveUser } from '../composables/useActiveUser'

// Add this near the top of the script section
const { shell, ipc } = window.electron || {}

// Add this near the top of the script section
const { user, loading: authLoading, signOut } = useActiveUser()

// Add currentTab state
const currentTab = ref('general')

const props = defineProps<{
  modelValue: boolean
  theme: string
  showProgressBar: boolean
  showOnlyPinnedModels: boolean
  availableModels: OpenRouterModel[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:theme': [value: string]
  'update:showProgressBar': [value: boolean]
  'validate-api-key': [key: string]
  'update:showOnlyPinnedModels': [value: boolean]
}>()

const store = useStore()
const { apiKey, saveApiKey } = useOpenRouter()

// Initialize preferences with loading state
const preferences = ref({
  rememberWindowState: true,
  minimizeToTray: false,
  showNotifications: true,
  playSounds: true,
  showBadgeCount: true,
  showProgressBar: true,
  showOnlyPinnedModels: false
})

const tempApiKey = ref('')
const error = ref<string | null>(null)
const isLoading = ref(true)
const obsidianVaultPath = ref('')
const isSelectingVault = ref(false)

// Load preferences from store with retry mechanism
const loadPreferences = async () => {
  try {
    const [
      rememberWindowState,
      minimizeToTray,
      showNotifications,
      playSounds,
      showBadgeCount,
      showProgressBar,
      showOnlyPinnedModels,
      storedKey,
      vaultPath
    ] = await Promise.all([
      store.get('remember-window-state'),
      store.get('minimize-to-tray'),
      store.get('show-notifications'),
      store.get('play-sounds'),
      store.get('show-badge-count'),
      store.get('show-progress-bar'),
      store.get('show-only-pinned-models'),
      store.get('api-key'),
      store.get('obsidian-vault-path')
    ])

    preferences.value = {
      rememberWindowState: Boolean(rememberWindowState ?? true),
      minimizeToTray: Boolean(minimizeToTray ?? false),
      showNotifications: Boolean(showNotifications ?? true),
      playSounds: Boolean(playSounds ?? true),
      showBadgeCount: Boolean(showBadgeCount ?? true),
      showProgressBar: Boolean(showProgressBar ?? true),
      showOnlyPinnedModels: Boolean(showOnlyPinnedModels ?? false)
    }

    // Cast the stored key to string since we know it should be a string
    tempApiKey.value = (storedKey as string) || ''
    obsidianVaultPath.value = (vaultPath as string) || ''
  } catch (err) {
    console.error('Error loading preferences:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load preferences'
  } finally {
    isLoading.value = false
  }
}

// Initial load with retry
onMounted(() => {
  const tryLoad = () => {
    if (window.electron?.store) {
      loadPreferences()
    } else {
      const checkInterval = setInterval(() => {
        if (window.electron?.store) {
          clearInterval(checkInterval)
          loadPreferences()
        }
      }, 100)

      // Clear interval after 5 seconds if electron is still not available
      setTimeout(() => {
        clearInterval(checkInterval)
        if (!window.electron?.store) {
          error.value = 'Electron store not available after timeout'
          isLoading.value = false
        }
      }, 5000)
    }
  }

  tryLoad()
})

// Load preferences on mount
onMounted(async () => {
  try {
    const showOnlyPinnedModels = await store.get('show-only-pinned-models')
    preferences.value.showOnlyPinnedModels = Boolean(showOnlyPinnedModels)
  } catch (err) {
    console.error('Failed to load preferences:', err)
  }
})

// Save preferences when they change
watch(() => preferences.value.showOnlyPinnedModels, async (newValue) => {
  try {
    await store.set('show-only-pinned-models', newValue)
    emit('update:showOnlyPinnedModels', newValue)
  } catch (err) {
    console.error('Failed to save preference:', err)
  }
}, { immediate: true })

function close() {
  emit('update:modelValue', false)
}

async function handleApiKeyChange(event: Event) {
  try {
    const key = (event.target as HTMLInputElement).value
    tempApiKey.value = key

    // Save to store first
    await store.set('api-key', key)

    // Then validate and update the OpenRouter composable
    await emit('validate-api-key', key)
    await saveApiKey(key)
  } catch (err) {
    console.error('Failed to save API key:', err)
    error.value = 'Failed to save API key'
  }
}

const selectObsidianVault = async () => {
  try {
    isSelectingVault.value = true;

    if (!window.electron?.ipc) {
      throw new Error("IPC not available");
    }

    const result = await window.electron.ipc.invoke("select-folder");

    if (result.canceled || !result.filePaths?.[0]) {
      return;
    }

    const vaultPath = result.filePaths[0];
    obsidianVaultPath.value = vaultPath;

    // Add logging to debug store setting
    console.log('Setting vault path:', vaultPath);
    await store.set("obsidian-vault-path", vaultPath);
    console.log('Vault path set successfully');

  } catch (err) {
    console.error("Failed to select Obsidian vault:", err);
    error.value = err instanceof Error ? err.message : "Failed to select vault";
  } finally {
    isSelectingVault.value = false;
  }
};

// Watch for modal opening
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    console.log('Settings modal opened')
    console.log('Available models:', props.availableModels)
    console.log('Available models length:', props.availableModels?.length)
  }
}, { immediate: true })

// Add sign out handler
const handleSignOut = async () => {
  try {
    await signOut()
    emit('update:modelValue', false)
  } catch (err) {
    console.error('Failed to sign out:', err)
    error.value = 'Failed to sign out'
  }
}
</script>

<template>
  <div v-if="modelValue"
    class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="flex-shrink-0 px-6 py-4 border-b dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button @click="close" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <span class="sr-only">Close</span>
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex space-x-4 border-b dark:border-gray-700 -mb-4">
          <button @click="currentTab = 'general'" class="px-4 py-2 text-sm font-medium transition-colors relative"
            :class="[
              currentTab === 'general'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            ]">
            General
          </button>
          <button @click="currentTab = 'models'" class="px-4 py-2 text-sm font-medium transition-colors relative"
            :class="[
              currentTab === 'models'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            ]">
            Models
          </button>
          <button @click="currentTab = 'account'" class="px-4 py-2 text-sm font-medium transition-colors relative"
            :class="[
              currentTab === 'account'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            ]">
            Account
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 px-6 py-6 overflow-y-auto">
        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-100 dark:bg-red-900 p-6 rounded-lg">
          <p class="text-red-800 dark:text-red-200">{{ error }}</p>
          <button @click="loadPreferences"
            class="mt-4 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
            Try Again
          </button>
        </div>

        <!-- Settings Content (only show when not loading and no error) -->
        <template v-else>
          <!-- General Tab -->
          <div v-if="currentTab === 'general'" class="space-y-8">
            <!-- API Keys Section -->
            <section class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">API Keys</h3>

              <!-- OpenRouter API Key -->
              <div class="space-y-3">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  OpenRouter API Key
                </label>
                <input :value="tempApiKey" @input="handleApiKeyChange" type="password" class="input-base" />
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Get your API key from <a href="#" @click.prevent="shell?.openExternal?.('https://openrouter.ai/keys')"
                    class="text-blue-500 hover:text-blue-400">openrouter.ai/keys</a>
                </p>
              </div>
            </section>

            <!-- Obsidian Integration -->
            <section class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Obsidian Integration</h3>
              <div class="space-y-3">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Vault Location
                </label>
                <div class="flex gap-2">
                  <input :value="obsidianVaultPath" readonly type="text"
                    placeholder="Select your Obsidian vault folder..." class="input-base" />
                  <button @click="selectObsidianVault" :disabled="isSelectingVault"
                    class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {{ isSelectingVault ? 'Selecting...' : 'Select Folder' }}
                  </button>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Select your Obsidian vault folder to enable file linking and search
                </p>
              </div>
            </section>

            <!-- Theme Section -->
            <section class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Appearance</h3>
              <div class="space-y-3">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Theme
                </label>
                <select :value="theme" @change="$emit('update:theme', ($event.target as HTMLSelectElement).value)"
                  class="select-base">
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </section>

            <!-- Interface Options -->
            <section class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Interface</h3>
              <div class="space-y-3">
                <div class="flex items-center">
                  <input :checked="showProgressBar"
                    @change="$emit('update:showProgressBar', ($event.target as HTMLInputElement).checked)"
                    type="checkbox" class="checkbox-base" />
                  <label class="ml-2 block text-sm text-gray-900 dark:text-white">
                    Show Progress Bar
                  </label>
                </div>
              </div>
            </section>

            <!-- Model Selection -->
            <section class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Model Selection</h3>
              <div class="space-y-3">
                <div class="flex items-center">
                  <input :checked="preferences.showOnlyPinnedModels"
                    @change="preferences.showOnlyPinnedModels = ($event.target as HTMLInputElement).checked"
                    type="checkbox" class="checkbox-base" />
                  <label class="ml-2 block text-sm text-gray-900 dark:text-white">
                    Show only pinned models in chat sidebar
                  </label>
                  <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    (Shows all models if none are pinned)
                  </span>
                </div>
              </div>
            </section>
          </div>

          <!-- Models Tab -->
          <div v-if="currentTab === 'models'" class="space-y-8">
            <!-- Token Cost Notation Explainer -->
            <div class="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-sm">
              <h4 class="font-medium text-blue-700 dark:text-blue-300 mb-2">Understanding Token Cost Notation</h4>
              <div class="space-y-2 text-blue-600 dark:text-blue-400">
                <p><code class="font-mono">$0.02/tok</code> - Cost in dollars per token (for costs ≥ $0.01)</p>
                <p><code class="font-mono">0.5¢/tok</code> - Cost in cents per token (for costs ≥ $0.0001)</p>
                <p><code class="font-mono">2.5¢/KTok</code> - Cost in cents per thousand tokens (for smaller costs)</p>
                <p><code class="font-mono">1.2¢/GTok</code> - Cost in cents per million tokens (for tiny costs)</p>
              </div>
            </div>

            <div class="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {{ availableModels.length }} models available
            </div>
            <ModelSettings :available-models="availableModels"
              :show-only-pinned-models="preferences.showOnlyPinnedModels"
              @update:show-only-pinned-models="(value) => preferences.showOnlyPinnedModels = value" />
          </div>

          <!-- Account Tab -->
          <div v-if="currentTab === 'account'" class="space-y-8">
            <!-- User Profile Section -->
            <section class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Profile</h3>

              <!-- Loading State -->
              <div v-if="authLoading" class="flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>

              <!-- User Info -->
              <div v-else-if="user" class="space-y-6">
                <div class="flex items-center space-x-4">
                  <!-- User Avatar -->
                  <img v-if="user.user_metadata?.avatar_url" :src="user.user_metadata.avatar_url"
                    :alt="user.user_metadata?.full_name || 'User avatar'"
                    class="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-700" />

                  <!-- User Details -->
                  <div class="space-y-1">
                    <h4 class="text-lg font-medium text-gray-900 dark:text-white">
                      {{ user.user_metadata?.full_name || 'User' }}
                    </h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ user.email }}
                    </p>
                    <div class="flex items-center space-x-2">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        <svg class="w-3 h-3 mr-1" viewBox="0 0 71 55" fill="currentColor">
                          <path
                            d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" />
                        </svg>
                        Discord
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Account Actions -->
                <div class="space-y-4">
                  <div class="border-t dark:border-gray-700 pt-4">
                    <button @click="handleSignOut"
                      class="w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors">
                      Sign out
                    </button>
                  </div>
                </div>
              </div>

              <!-- Not Signed In State -->
              <div v-else class="text-center py-8">
                <p class="text-gray-500 dark:text-gray-400">
                  Not signed in
                </p>
              </div>
            </section>

            <!-- Privacy Section -->
            <section class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Privacy & Security</h3>
              <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  Your data is securely stored and isolated from other users. All chat histories and settings are
                  private to your account.
                </p>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  <p class="font-medium mb-1">Data we store:</p>
                  <ul class="list-disc list-inside space-y-1">
                    <li>Basic Discord profile information</li>
                    <li>Chat histories and settings</li>
                    <li>Application preferences</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for the settings content */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(75, 85, 99, 0.7);
}

/* Dark mode scrollbar */
:deep(.dark) .overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.5);
}

:deep(.dark) .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(75, 85, 99, 0.7);
}

/* Input Styles */
.input-base {
  @apply w-full px-3 py-2;
  @apply bg-white dark:bg-gray-800/50;
  @apply border border-gray-300 dark:border-gray-700;
  @apply rounded-md shadow-sm;
  @apply text-gray-900 dark:text-gray-100;
  @apply placeholder-gray-500 dark:placeholder-gray-400;
  @apply focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply transition-colors duration-200;
}

.select-base {
  @apply input-base;
  @apply pr-8;
  /* Extra padding for the dropdown arrow */
  @apply appearance-none;
  @apply bg-no-repeat bg-right;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-size: 1.5em 1.5em;
}

.checkbox-base {
  @apply h-4 w-4;
  @apply rounded;
  @apply border-gray-300 dark:border-gray-600;
  @apply text-blue-500 dark:text-blue-400;
  @apply bg-white dark:bg-gray-800/50;
  @apply focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply transition-colors duration-200;
}
</style>