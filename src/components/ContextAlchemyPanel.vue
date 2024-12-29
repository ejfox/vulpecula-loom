<script setup>
import { useBreakpoints } from '@vueuse/core'
import { computed, ref } from 'vue'
import { formatDistanceToNow, differenceInMinutes, format } from 'date-fns'
import { useOpenRouter } from '../composables/useOpenRouter'

const props = defineProps({
  isContextPanelOpen: {
    type: Boolean,
    default: false
  },
  messages: {
    type: Array,
    required: true
  },
  chatStats: {
    type: Object,
    required: true
  }
})

const { formatModelCost } = useOpenRouter()

const emit = defineEmits(['update:isContextPanelOpen', 'prune-before', 'remove-document'])

const breakpoints = useBreakpoints({
  sm: 640,
  md: 768,
  lg: 1024,
})
const isMobile = breakpoints.smaller('lg')

// Computed stats
const totalMessages = computed(() => props.messages.length)
const userMessages = computed(() => props.messages.filter(m => m.role === 'user').length)
const assistantMessages = computed(() => props.messages.filter(m => m.role === 'assistant').length)
const totalTokens = computed(() => props.chatStats.promptTokens + props.chatStats.completionTokens)
const totalCost = computed(() => {
  // Get total cost from chat stats
  const statsCost = props.chatStats.cost || 0
  return formatModelCost('anthropic/claude-3-sonnet', statsCost)
})

// Time-based analysis
const timeAnalysis = computed(() => {
  if (!props.messages.length) return null

  const timestamps = props.messages.map(m => new Date(m.timestamp))
  const firstMessage = timestamps[0]
  const lastMessage = timestamps[timestamps.length - 1]
  const totalDuration = differenceInMinutes(lastMessage, firstMessage)

  // Calculate message frequency (messages per minute)
  const messageFrequency = totalDuration > 0
    ? props.messages.length / totalDuration
    : props.messages.length

  // Calculate token rate (tokens per minute)
  const tokenRate = totalDuration > 0
    ? totalTokens.value / totalDuration
    : totalTokens.value

  // Find periods of high activity (>2x average frequency)
  const timeWindows = []
  let windowStart = firstMessage
  let windowMessages = []

  for (let i = 0; i < timestamps.length - 1; i++) {
    const timeDiff = differenceInMinutes(timestamps[i + 1], timestamps[i])
    if (timeDiff > 5) { // New window if gap > 5 minutes
      if (windowMessages.length > 1) {
        timeWindows.push({
          start: windowStart,
          end: timestamps[i],
          messages: windowMessages,
          duration: differenceInMinutes(timestamps[i], windowStart),
          messageCount: windowMessages.length,
          tokenCount: windowMessages.reduce((sum, msg) => sum + (msg.tokens?.total || 0), 0)
        })
      }
      windowStart = timestamps[i + 1]
      windowMessages = []
    }
    windowMessages.push(props.messages[i])
  }

  // Add final window
  if (windowMessages.length > 1) {
    timeWindows.push({
      start: windowStart,
      end: lastMessage,
      messages: windowMessages,
      duration: differenceInMinutes(lastMessage, windowStart),
      messageCount: windowMessages.length,
      tokenCount: windowMessages.reduce((sum, msg) => sum + (msg.tokens?.total || 0), 0)
    })
  }

  // Sort windows by token density (tokens per minute)
  const sortedWindows = timeWindows
    .map(w => ({
      ...w,
      tokenDensity: w.duration > 0 ? w.tokenCount / w.duration : w.tokenCount
    }))
    .sort((a, b) => b.tokenDensity - a.tokenDensity)
    .slice(0, 3)

  return {
    conversationStart: firstMessage,
    conversationEnd: lastMessage,
    totalDuration,
    messageFrequency,
    tokenRate,
    highActivityPeriods: sortedWindows,
  }
})

// Document analysis
const documentAnalysis = computed(() => {
  const documents = new Map()

  // Collect all unique documents and their usage
  props.messages.forEach((msg, idx) => {
    if (msg.includedFiles) {
      msg.includedFiles.forEach(file => {
        if (!documents.has(file.path)) {
          documents.set(file.path, {
            ...file,
            firstUsed: msg.timestamp,
            usageCount: 1,
            lastUsed: msg.timestamp,
            messageIndexes: [idx],
            estimatedTokens: Math.ceil((file.content?.length || 0) / 4), // Rough estimate
          })
        } else {
          const doc = documents.get(file.path)
          doc.usageCount++
          doc.lastUsed = msg.timestamp
          doc.messageIndexes.push(idx)
        }
      })
    }
  })

  // Convert to array and sort by estimated token impact
  const documentList = Array.from(documents.values())
    .sort((a, b) => b.estimatedTokens - a.estimatedTokens)

  // Calculate total document token impact
  const totalDocumentTokens = documentList.reduce((sum, doc) => sum + doc.estimatedTokens, 0)

  return {
    documents: documentList,
    totalDocumentTokens,
    uniqueDocuments: documentList.length,
    documentsWithMultipleUses: documentList.filter(d => d.usageCount > 1).length
  }
})

// Message analysis
const messageAnalysis = computed(() => {
  // Sort messages by token count
  const sortedByTokens = [...props.messages].sort((a, b) => {
    const aTokens = (a.tokens?.total || 0) +
      (a.includedFiles?.reduce((sum, f) => sum + Math.ceil((f.content?.length || 0) / 4), 0) || 0)
    const bTokens = (b.tokens?.total || 0) +
      (b.includedFiles?.reduce((sum, f) => sum + Math.ceil((f.content?.length || 0) / 4), 0) || 0)
    return bTokens - aTokens
  })

  // Get top 5 largest messages
  const largestMessages = sortedByTokens.slice(0, 5)

  // Calculate running token total including documents
  let runningTotal = 0
  const messagesWithCumulative = props.messages.map((msg, idx) => {
    const documentTokens = msg.includedFiles?.reduce(
      (sum, f) => sum + Math.ceil((f.content?.length || 0) / 4),
      0
    ) || 0

    runningTotal += (msg.tokens?.total || 0) + documentTokens

    return {
      ...msg,
      documentTokens,
      cumulativeTokens: runningTotal,
      messageNumber: idx + 1,
      timeSincePrevious: idx > 0
        ? differenceInMinutes(new Date(msg.timestamp), new Date(props.messages[idx - 1].timestamp))
        : 0
    }
  })

  // Find potential pruning points (significant token increases)
  const pruningPoints = messagesWithCumulative
    .filter((msg, idx) => {
      if (idx < 5) return false // Skip first few messages
      const tokenIncrease = msg.tokens?.total || 0
      const averageTokens = runningTotal / (idx + 1)
      return tokenIncrease > averageTokens * 1.5 // 50% larger than average
    })
    .slice(0, 3) // Top 3 pruning points

  return {
    largestMessages,
    messagesWithCumulative,
    pruningPoints,
    averageTokensPerMessage: runningTotal / props.messages.length
  }
})

const selectedPrunePoint = ref(null)

const handlePrune = () => {
  if (selectedPrunePoint.value) {
    emit('prune-before', selectedPrunePoint.value)
  }
}

// Format helpers
const formatTime = (date) => format(new Date(date), 'HH:mm:ss')
const formatTimeAgo = (date) => formatDistanceToNow(new Date(date), { addSuffix: true })
</script>

<template>
  <Transition enter-active-class="transition-all duration-300 ease-out"
    leave-active-class="transition-all duration-200 ease-in" enter-from-class="translate-x-full"
    enter-to-class="translate-x-0" leave-from-class="translate-x-0" leave-to-class="translate-x-full">
    <div v-if="isContextPanelOpen"
      class="fixed top-[38px] right-0 bottom-0 w-[400px] bg-gray-900 border-l border-white/5 shadow-xl">
      <div class="h-full flex flex-col">
        <!-- Panel Header -->
        <div class="flex-shrink-0 h-10 flex items-center justify-between px-4 border-b border-white/5">
          <h2 class="text-sm text-white/80">Context Alchemy</h2>
          <button @click="emit('update:isContextPanelOpen', false)"
            class="p-1 text-white/40 hover:text-white/60 transition-colors">
            <span class="sr-only">Close panel</span>
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Panel Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <div class="space-y-6">
            <!-- Time Overview -->
            <div v-if="timeAnalysis" class="bg-gray-800/50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-white/90 mb-3">Conversation Timeline</h3>
              <dl class="grid grid-cols-2 gap-4">
                <div>
                  <dt class="text-xs text-white/60">Duration</dt>
                  <dd class="mt-1 text-lg font-medium text-white/80">
                    {{ timeAnalysis.totalDuration }} minutes
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-white/60">Started</dt>
                  <dd class="mt-1 text-lg font-medium text-white/80">
                    {{ formatTimeAgo(timeAnalysis.conversationStart) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-white/60">Messages/Min</dt>
                  <dd class="mt-1 text-lg font-medium text-white/80">
                    {{ timeAnalysis.messageFrequency.toFixed(1) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-white/60">Tokens/Min</dt>
                  <dd class="mt-1 text-lg font-medium text-white/80">
                    {{ Math.round(timeAnalysis.tokenRate) }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- High Activity Periods -->
            <div v-if="timeAnalysis?.highActivityPeriods.length" class="bg-gray-800/50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-white/90 mb-3">High Activity Periods</h3>
              <div class="space-y-3">
                <div v-for="(period, index) in timeAnalysis.highActivityPeriods" :key="index"
                  class="p-3 rounded-md bg-gray-800/30 border border-white/5">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs text-white/60">
                      {{ formatTime(period.start) }} - {{ formatTime(period.end) }}
                    </span>
                    <span class="text-xs font-medium text-white/80">
                      {{ period.duration }}min
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-white/60">
                      {{ period.messageCount }} messages
                    </span>
                    <span class="text-xs font-medium text-white/80">
                      {{ Math.round(period.tokenDensity) }} tokens/min
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Current Context Size -->
            <div class="bg-gray-800/50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-white/90 mb-3">Current Context Size</h3>
              <dl class="grid grid-cols-2 gap-4">
                <div>
                  <dt class="text-xs text-white/60">Total Messages</dt>
                  <dd class="mt-1 text-2xl font-semibold text-white/90">{{ totalMessages }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-white/60">Total Tokens</dt>
                  <dd class="mt-1 text-2xl font-semibold text-white/90">{{ totalTokens }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-white/60">Avg Tokens/Message</dt>
                  <dd class="mt-1 text-lg font-medium text-white/80">
                    {{ Math.round(messageAnalysis.averageTokensPerMessage) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-white/60">Total Cost</dt>
                  <dd class="mt-1 text-lg font-medium text-white/80">{{ totalCost }}</dd>
                </div>
              </dl>
            </div>

            <!-- Largest Messages -->
            <div class="bg-gray-800/50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-white/90 mb-3">Largest Messages</h3>
              <div class="space-y-3">
                <div v-for="msg in messageAnalysis.largestMessages" :key="msg.id"
                  class="flex items-start gap-2 py-2 px-3 rounded-md bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs text-white/60">{{ msg.role === 'user' ? 'User' : 'AI' }} Message</span>
                      <span class="text-xs font-medium text-white/80">{{ msg.tokens?.total || 0 }} tokens</span>
                    </div>
                    <p class="text-xs text-white/80 truncate">{{ msg.content }}</p>
                    <p class="text-xs text-white/40 mt-1">{{ formatTimeAgo(msg.timestamp) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Token Growth -->
            <div class="bg-gray-800/50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-white/90 mb-3">Cumulative Token Usage</h3>
              <div class="space-y-2">
                <div v-for="msg in messageAnalysis.pruningPoints" :key="msg.id"
                  class="p-3 rounded-md bg-gray-800/30 border border-white/5">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs text-white/60">Message #{{ msg.messageNumber }}</span>
                    <span class="text-xs font-medium text-white/80">
                      {{ msg.cumulativeTokens }} total tokens
                    </span>
                  </div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs text-white/60">{{ formatTimeAgo(msg.timestamp) }}</span>
                    <span class="text-xs text-white/60">
                      +{{ msg.timeSincePrevious }}min gap
                    </span>
                  </div>
                  <p class="text-xs text-white/60 mb-2">
                    Large token increase (+{{ msg.tokens?.total || 0 }} tokens)
                  </p>
                  <button @click="selectedPrunePoint = msg"
                    class="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
                    :class="{ 'ring-1 ring-white/20': selectedPrunePoint?.id === msg.id }">
                    Select as Prune Point
                  </button>
                </div>
              </div>
            </div>

            <!-- Prune Action -->
            <div v-if="selectedPrunePoint" class="bg-gray-800/50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-white/90 mb-3">Prune History</h3>
              <p class="text-xs text-white/60 mb-3">
                Pruning before message #{{ selectedPrunePoint.messageNumber }} will remove
                {{ selectedPrunePoint.cumulativeTokens }} tokens from the context.
              </p>
              <button @click="handlePrune"
                class="w-full px-3 py-2 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors">
                Prune History
              </button>
            </div>

            <!-- Included Documents -->
            <div v-if="documentAnalysis.documents.length" class="bg-gray-800/50 rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-medium text-white/90">Included Documents</h3>
                <span class="text-xs text-white/60">
                  ~{{ documentAnalysis.totalDocumentTokens }} tokens
                </span>
              </div>

              <div class="space-y-3">
                <div v-for="doc in documentAnalysis.documents" :key="doc.path"
                  class="p-3 rounded-md bg-gray-800/30 border border-white/5">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-medium text-white/80">{{ doc.title }}</span>
                    <span class="text-xs text-white/60">~{{ doc.estimatedTokens }} tokens</span>
                  </div>

                  <!-- Document preview -->
                  <div class="mb-2 p-2 rounded bg-black/20">
                    <p class="text-xs text-white/60 line-clamp-2">{{ doc.content }}</p>
                  </div>

                  <div class="flex items-center justify-between text-xs text-white/60 mb-2">
                    <span>Used {{ doc.usageCount }}×</span>
                    <span>Last used {{ formatTimeAgo(doc.lastUsed) }}</span>
                  </div>

                  <button @click="emit('remove-document', doc.path)"
                    class="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/80 transition-colors w-full">
                    Remove from Context
                  </button>
                </div>
              </div>

              <!-- Document Stats -->
              <dl class="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                <div>
                  <dt class="text-xs text-white/60">Unique Documents</dt>
                  <dd class="mt-1 text-lg font-medium text-white/80">
                    {{ documentAnalysis.uniqueDocuments }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-white/60">Multi-use Docs</dt>
                  <dd class="mt-1 text-lg font-medium text-white/80">
                    {{ documentAnalysis.documentsWithMultipleUses }}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>