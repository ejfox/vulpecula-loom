<template>
  <div v-if="isVisible"
    class="fixed top-16 inset-x-0 flex justify-center items-start z-50 px-4 pt-2 pointer-events-none">
    <div
      class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-lg p-4 max-w-md w-full flex items-center justify-between pointer-events-auto animate-slide-down">
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <div>
          <p class="font-medium">{{ model }} suggested a new title:</p>
          <p class="text-white/90 font-bold mt-1">"{{ suggestedTitle }}"</p>
        </div>
      </div>
      <div class="flex items-center gap-2 ml-4">
        <button @click="acceptTitle"
          class="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1 rounded transition-colors text-sm">
          Apply
        </button>
        <button @click="dismiss" class="text-white/70 hover:text-white p-1 rounded">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEventBus } from '@vueuse/core'
import { useSupabase } from '../composables/useSupabase'
import logger from '../lib/logger'

const chatBus = useEventBus('chat-updates')
const isVisible = ref(false)
const chatId = ref<string | null>(null)
const suggestedTitle = ref('')
const model = ref('The AI')
const { supabase } = useSupabase()

// Show the banner with suggested title
const showBanner = (params: { chatId: string, title: string, model?: string }) => {
  chatId.value = params.chatId
  suggestedTitle.value = params.title
  model.value = params.model || 'The AI'
  isVisible.value = true

  // Auto-hide after 15 seconds
  setTimeout(() => {
    isVisible.value = false
  }, 15000)
}

// Accept the title
const acceptTitle = async () => {
  if (!chatId.value) return

  try {
    // Update the chat title in Supabase
    const { data, error } = await supabase
      .from('vulpeculachats')
      .update({ title: suggestedTitle.value })
      .eq('id', chatId.value)

    if (error) throw error

    // Emit event for UI update
    chatBus.emit('chat-title-updated', {
      chatId: chatId.value,
      title: suggestedTitle.value
    })

    // Hide banner
    isVisible.value = false
    logger.debug('Chat title updated', { chatId: chatId.value, title: suggestedTitle.value })
  } catch (error) {
    logger.error('Failed to update chat title', error)
  }
}

// Dismiss the banner
const dismiss = () => {
  isVisible.value = false
}

// Listen for auto-title events
onMounted(() => {
  // Listen for auto-generated titles
  chatBus.on((event, params) => {
    if (event === 'auto-title-generated' && params) {
      showBanner(params)
    }
  })

  // Listen for model-suggested titles
  chatBus.on((event, params) => {
    if (event === 'model-rename-chat' && params) {
      showBanner({
        chatId: params.chatId,
        title: params.newName,
        model: 'The AI'
      })
    }
  })
})
</script>

<style scoped>
.animate-slide-down {
  animation: slide-down 0.3s ease-out forwards;
}

@keyframes slide-down {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>