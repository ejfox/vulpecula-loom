<template>
  <div v-if="show" class="popup-container">
    <div class="popup">
      <div class="header">
        <div>Insert Link to Obsidian Note</div>
        <button @click="close" class="close-button">
          ×
        </button>
      </div>

      <!-- Message when no vault is configured -->
      <div v-if="!hasVault" class="no-vault-message">
        <div class="text-lg font-medium">No Obsidian vault configured</div>
        <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Configure your Obsidian vault in settings to enable this feature.
        </div>
      </div>

      <!-- Message when vault is configured but can't be accessed -->
      <div v-else-if="!pathExists" class="no-vault-message">
        <div class="text-lg font-medium">Obsidian vault inaccessible</div>
        <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          <div>Path: {{ path }}</div>
          <div class="mt-1">This path exists but can't be accessed. If using iCloud, try moving your vault outside of
            iCloud.</div>
        </div>
      </div>

      <!-- Search results -->
      <div v-else class="results-container">
        <div v-if="isSearching" class="searching-indicator">
          <span class="loading-text">⟳</span>
          <span class="ml-2">Searching...</span>
        </div>
        <div v-else-if="results.length === 0" class="no-results-message">
          No matching files found
        </div>
        <div v-else class="results-list">
          <button v-for="(result, index) in results" :key="index" @click="select(result)" class="result-item">
            <div class="result-title">{{ result.title }}</div>
            <div v-if="result.preview" class="result-preview">{{ result.preview }}</div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import type { ObsidianFile } from '../types';

const props = defineProps<{
  show: boolean;
  results: ObsidianFile[];
  isSearching: boolean;
  hasVault: boolean;
  path: string;
  pathExists?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', result: ObsidianFile): void;
  (e: 'close'): void;
}>();

const select = (result: ObsidianFile) => {
  emit('select', result);
  emit('close');
};

const close = () => {
  emit('close');
};
</script>

<style scoped>
/* Existing styles */
.popup-container {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  z-index: 20;
  padding-bottom: 8px;
}

.popup {
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  max-height: 400px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 500;
}

.close-button {
  color: #a0aec0;
  transition: color 0.15s;
  font-size: 24px;
  line-height: 1;
  padding: 0 5px;
}

.close-button:hover {
  color: #718096;
}

.results-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.no-results-message,
.searching-indicator {
  padding: 16px;
  color: #718096;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-vault-message {
  padding: 20px;
  color: #1a202c;
  text-align: center;
}

.results-list {
  display: flex;
  flex-direction: column;
}

.result-item {
  padding: 12px 16px;
  text-align: left;
  transition: background-color 0.15s;
  border-left: 3px solid transparent;
}

.result-item:hover {
  background-color: #f7fafc;
  border-left-color: #6366f1;
}

.result-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.result-preview {
  font-size: 0.875rem;
  color: #718096;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Dark mode */
:global(.dark) .popup {
  background-color: #1a202c;
  border-color: #4a5568;
}

:global(.dark) .header {
  border-color: #4a5568;
}

:global(.dark) .no-vault-message {
  color: #e2e8f0;
}

:global(.dark) .result-item:hover {
  background-color: #2d3748;
}

:global(.dark) .result-preview {
  color: #a0aec0;
}

.loading-text {
  display: inline-block;
  animation: spin 1s linear infinite;
  font-size: 18px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>