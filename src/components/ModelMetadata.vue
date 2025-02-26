<template>
  <div class="model-metadata" :class="{ 'compact': compact }">
    <!-- Provider Badge -->
    <div class="provider-badge">
      <div :class="getProviderIcon(model.id)" class="provider-icon" />
      <span class="provider-name">{{ getProviderName(model.id) }}</span>
    </div>

    <!-- Model Name and Context -->
    <div class="model-header">
      <h3 :class="[getModelColor(model.id), 'model-name']">
        {{ model.name || getModelDisplayName(model.id) }}
      </h3>
      <div class="context-length">
        <span class="context-value">{{ formatContextLength(model.context_length) }}</span>
        <span class="context-label">context</span>
      </div>
    </div>

    <!-- Model Description (if available and not in compact mode) -->
    <p v-if="model.description && !compact" class="model-description">
      {{ model.description }}
    </p>

    <!-- Pricing Information -->
    <div class="pricing-section">
      <div class="pricing-header">
        <span class="pricing-label">Input</span>
        <span class="pricing-label">Output</span>
      </div>
      <div class="pricing-values">
        <span class="pricing-value" :class="{ 'free': isPricingFree(model.pricing?.prompt) }">
          {{ formatSinglePrice(model.pricing?.prompt) }}
        </span>
        <span class="pricing-value" :class="{ 'free': isPricingFree(model.pricing?.completion) }">
          {{ formatSinglePrice(model.pricing?.completion) }}
        </span>
      </div>
    </div>

    <!-- Capabilities -->
    <div v-if="hasCapabilities && !compact" class="capabilities-section">
      <div class="capability" v-if="model.capabilities?.vision">
        <div class="i-carbon-camera capability-icon vision" />
        <span class="capability-label">Vision</span>
      </div>
      <div class="capability" v-if="model.capabilities?.tools">
        <div class="i-carbon-tools capability-icon tools" />
        <span class="capability-label">Tools</span>
      </div>
      <div class="capability" v-if="model.capabilities?.function_calling">
        <div class="i-carbon-function capability-icon function" />
        <span class="capability-label">Function Calling</span>
      </div>
    </div>

    <!-- Capability Pills (compact mode) -->
    <div v-if="hasCapabilities && compact" class="capability-pills">
      <span v-if="model.capabilities?.vision" class="pill vision">Vision</span>
      <span v-if="model.capabilities?.tools" class="pill tools">Tools</span>
      <span v-if="model.capabilities?.function_calling" class="pill function">Function</span>
    </div>

    <!-- Latency and Throughput (if provided) -->
    <div v-if="latency || throughput" class="performance-metrics">
      <div v-if="latency" class="metric">
        <span class="metric-label">Latency</span>
        <span class="metric-value">{{ latency }}</span>
      </div>
      <div v-if="throughput" class="metric">
        <span class="metric-label">Throughput</span>
        <span class="metric-value">{{ throughput }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { OpenRouterModel } from '../types';

interface Props {
  model: OpenRouterModel;
  compact?: boolean;
  latency?: string;
  throughput?: string;
}

const props = defineProps<Props>();

// Computed property to check if the model has any capabilities
const hasCapabilities = computed(() => {
  const caps = props.model.capabilities;
  return caps && (caps.vision || caps.tools || caps.function_calling);
});

// Helper function to get the provider name from the model ID
const getProviderName = (modelId: string): string => {
  const [provider] = modelId.split('/');
  // Capitalize the first letter
  return provider.charAt(0).toUpperCase() + provider.slice(1);
};

// Helper function to get the model display name
const getModelDisplayName = (modelId: string): string => {
  const modelName = modelId.split('/').pop() || '';
  return modelName.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

// Helper function to get the provider icon class
const getProviderIcon = (modelId: string): string => {
  const [provider] = modelId.split('/');
  switch (provider.toLowerCase()) {
    case 'anthropic':
      return 'i-simple-icons-anthropic';
    case 'openai':
      return 'i-simple-icons-openai';
    case 'google':
      return 'i-simple-icons-google';
    case 'meta':
      return 'i-simple-icons-meta';
    case 'amazon':
      return 'i-simple-icons-amazon';
    case 'huggingface':
      return 'i-simple-icons-huggingface';
    case 'microsoft':
      return 'i-simple-icons-microsoft';
    default:
      return 'i-carbon-machine-learning-model';
  }
};

// Helper function to get the model color class
const getModelColor = (modelId: string): string => {
  if (modelId.includes('claude-3')) return 'text-violet-600 dark:text-violet-400';
  if (modelId.includes('claude')) return 'text-purple-600 dark:text-purple-400';
  if (modelId.includes('gpt-4')) return 'text-emerald-600 dark:text-emerald-400';
  if (modelId.includes('gpt-3')) return 'text-blue-600 dark:text-blue-400';
  if (modelId.includes('gemini')) return 'text-amber-600 dark:text-amber-400';
  if (modelId.includes('llama')) return 'text-orange-600 dark:text-orange-400';
  if (modelId.includes('mistral')) return 'text-cyan-600 dark:text-cyan-400';
  return 'text-gray-600 dark:text-gray-400';
};

// Helper function to format the context length
const formatContextLength = (length: number): string => {
  if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`;
  if (length >= 1000) return `${(length / 1000).toFixed(0)}K`;
  return `${length}`;
};

// Helper function to check if pricing is free
const isPricingFree = (price?: string): boolean => {
  if (!price) return false;
  const numPrice = parseFloat(price);
  return numPrice === 0;
};

// Helper function to format a single price
const formatSinglePrice = (price?: string): string => {
  if (!price) return '-';
  
  const numPrice = parseFloat(price);
  
  if (isNaN(numPrice)) return '-';
  
  // If price is 0, show as FREE
  if (numPrice === 0) {
    return 'FREE';
  }
  
  // For costs that are $0.01 or more per token
  if (numPrice >= 0.01) {
    return `$${numPrice.toFixed(2)}`;
  }
  
  // For costs around a penny or less, show in cents per token
  if (numPrice >= 0.0001) {
    return `${(numPrice * 100).toFixed(1)}¢`;
  }
  
  // For smaller costs, show in dollars per 1M tokens
  const perMillion = numPrice * 1000000;
  return `$${perMillion.toFixed(2)}/M`;
};
</script>

<style scoped>
.model-metadata {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.dark .model-metadata {
  background-color: #1a1a1a;
  border-color: rgba(255, 255, 255, 0.1);
}

.provider-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  background-color: rgba(0, 0, 0, 0.05);
  width: fit-content;
}

.dark .provider-badge {
  background-color: rgba(255, 255, 255, 0.1);
}

.provider-icon {
  width: 1rem;
  height: 1rem;
}

.provider-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: #666;
}

.dark .provider-name {
  color: #aaa;
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-name {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.context-length {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.context-value {
  font-size: 0.875rem;
  font-weight: 600;
  font-family: monospace;
}

.context-label {
  font-size: 0.75rem;
  color: #666;
}

.dark .context-label {
  color: #aaa;
}

.model-description {
  font-size: 0.875rem;
  color: #666;
  margin: 0;
  line-height: 1.4;
}

.dark .model-description {
  color: #aaa;
}

.pricing-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 0.375rem;
}

.dark .pricing-section {
  background-color: rgba(255, 255, 255, 0.05);
}

.pricing-header {
  display: flex;
  justify-content: space-between;
}

.pricing-label {
  font-size: 0.75rem;
  color: #666;
  font-weight: 500;
}

.dark .pricing-label {
  color: #aaa;
}

.pricing-values {
  display: flex;
  justify-content: space-between;
}

.pricing-value {
  font-size: 0.875rem;
  font-weight: 600;
  font-family: monospace;
}

.pricing-value.free {
  color: #10b981;
}

.dark .pricing-value.free {
  color: #34d399;
}

.capabilities-section {
  display: flex;
  gap: 1rem;
}

.capability {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.capability-icon {
  width: 1rem;
  height: 1rem;
}

.capability-icon.vision {
  color: #8b5cf6;
}

.capability-icon.tools {
  color: #f59e0b;
}

.capability-icon.function {
  color: #3b82f6;
}

.capability-label {
  font-size: 0.75rem;
  font-weight: 500;
}

.capability-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.pill {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 500;
}

.pill.vision {
  background-color: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.pill.tools {
  background-color: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.pill.function {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.dark .pill.vision {
  background-color: rgba(139, 92, 246, 0.2);
}

.dark .pill.tools {
  background-color: rgba(245, 158, 11, 0.2);
}

.dark .pill.function {
  background-color: rgba(59, 130, 246, 0.2);
}

.performance-metrics {
  display: flex;
  justify-content: space-between;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.dark .performance-metrics {
  border-color: rgba(255, 255, 255, 0.1);
}

.metric {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 0.75rem;
  color: #666;
}

.dark .metric-label {
  color: #aaa;
}

.metric-value {
  font-size: 0.875rem;
  font-weight: 600;
  font-family: monospace;
}

/* Compact mode styles */
.compact {
  padding: 0.75rem;
  gap: 0.5rem;
}

.compact .model-name {
  font-size: 1rem;
}

.compact .context-value {
  font-size: 0.75rem;
}

.compact .context-label {
  font-size: 0.625rem;
}

.compact .pricing-section {
  padding: 0.5rem;
}

.compact .pricing-label,
.compact .pricing-value {
  font-size: 0.75rem;
}
</style> 