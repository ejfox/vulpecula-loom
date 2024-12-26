<script setup lang="ts">
import { ref } from 'vue'
import { useOpenRouter } from '../composables/useOpenRouter'

const openRouter = useOpenRouter()
const { hasValidKey } = openRouter
const apiKeyInput = ref('')

const emit = defineEmits(['save-api-key'])

const handleSubmit = async () => {
  console.log('ApiKeyWarning: Submitting API key')
  emit('save-api-key', apiKeyInput.value)
  apiKeyInput.value = ''
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
  <div v-if="!hasValidKey" class="api-key-warning">
    <div class="flex items-center justify-between p-4 bg-amber-800 text-white">
      <div class="flex items-center gap-2">
        <span>Please set your OpenRouter API key:</span>
        <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
          class="text-amber-200 hover:text-amber-100 underline" @click="openExternalLink">
          Get a key
        </a>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="apiKeyInput" type="password"
          class="px-2 py-1 bg-amber-900 text-white border border-amber-700 rounded" placeholder="sk-or-..." />
        <button @click="handleSubmit" class="px-3 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded">
          Save
        </button>
      </div>
    </div>
  </div>
</template>