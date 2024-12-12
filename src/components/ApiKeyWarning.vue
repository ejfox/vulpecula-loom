<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  hasValidKey: boolean
  savingKey: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['save-api-key'])

const tempApiKey = ref('')

const handleSubmit = () => {
  if (!tempApiKey.value.trim()) return
  emit('save-api-key', tempApiKey.value.trim())
  tempApiKey.value = ''
}
</script>

<template>
  <div v-if="!hasValidKey"
    class="flex-shrink-0 p-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100">
    <div class="flex items-center flex-1">
      <div class="flex items-center gap-2">
        <span>Please set your OpenRouter API key:</span>
        <a href="https://openrouter.ai/keys" target="_blank"
          class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm underline">
          Get a key
        </a>
      </div>
      <form @submit.prevent="handleSubmit" class="flex items-center ml-2 flex-1">
        <input v-model="tempApiKey" type="password"
          class="p-1 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-1 max-w-md"
          placeholder="sk-or-..." />
        <button type="submit" :disabled="!tempApiKey.trim()"
          class="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50">
          {{ savingKey ? 'Saving...' : 'Save' }}
        </button>
      </form>
    </div>
  </div>
</template>