<template>
  <div @click="toggleTicker"
    class="fixed bottom-0 left-0 w-8 h-2 bg-black hover:bg-green-900 transition-colors cursor-pointer opacity-30 hover:opacity-70 border-t border-green-900/30"
    title="Toggle debug console">
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

// Function to toggle the ticker
function toggleTicker() {
  // Get current state
  const currentState = localStorage.getItem('logTickerShow')
  // Toggle the state
  const newState = currentState === 'false' ? 'true' : 'false'
  // Save to localStorage
  localStorage.setItem('logTickerShow', newState)

  // Dispatch custom event to notify other components
  const event = new CustomEvent('logticker-visibility-changed', {
    detail: { visible: newState === 'true' }
  })
  window.dispatchEvent(event)
}
</script>