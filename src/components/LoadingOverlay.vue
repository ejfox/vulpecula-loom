<script setup lang="ts">
import type { LoadingStep } from '../composables/useLoadingSequence'
import LoadingState from './LoadingState.vue'

defineProps<{
  steps: LoadingStep[]
}>()
</script>

<template>
  <div class="absolute inset-0 bg-white/90 dark:bg-oled-black/90 flex items-center justify-center backdrop-blur-sm">
    <div class="w-full max-w-sm flex flex-col gap-3 p-6">
      <LoadingState v-for="step in steps" :key="step.id" v-bind="step" />
    </div>
  </div>
</template>