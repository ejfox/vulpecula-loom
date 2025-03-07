<script setup lang="ts">
import { useBreakpoints } from '@vueuse/core'
import { computed, ref, onMounted } from 'vue'
import { formatDistanceToNow, differenceInMinutes, format } from 'date-fns'
import { useOpenRouter } from '../composables/useOpenRouter'
import type { ChatMessage } from '../types'

interface Props {
  isContextPanelOpen: boolean
  messages: ChatMessage[]
}

const props = withDefaults(defineProps<Props>(), {
  isContextPanelOpen: false
})

const emit = defineEmits<{
  'update:isContextPanelOpen': [value: boolean]
  'prune-before': [message: ChatMessage]
  'remove-document': [path: string]
}>()

// Preload Monaspace font when component is mounted
onMounted(() => {
  preloadFont('https://cdn.jsdelivr.net/gh/githubnext/monaspace@v1.000/fonts/webfonts/MonaspaceNeon-Regular.woff');
  preloadFont('https://cdn.jsdelivr.net/gh/githubnext/monaspace@v1.000/fonts/webfonts/MonaspaceNeon-Bold.woff');
})

function preloadFont(url: string) {
  const link = document.createElement('link');
  link.href = url;
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff';
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

const { formatModelCost } = useOpenRouter()

const breakpoints = useBreakpoints({
  sm: 640,
  md: 768,
  lg: 1024,
})
const isMobile = breakpoints.smaller('lg')

// Calculate chat stats directly from messages
const chatStats = computed(() => {
  return props.messages.reduce((stats, msg) => {
    if (msg.tokens) {
      stats.promptTokens += msg.tokens.prompt || 0
      stats.completionTokens += msg.tokens.completion || 0
    }
    if (msg.cost) {
      stats.cost += msg.cost
    }
    return stats
  }, {
    promptTokens: 0,
    completionTokens: 0,
    cost: 0,
    totalMessages: props.messages.length
  })
})

// Update existing computed properties to use our new chatStats
const totalTokens = computed(() => chatStats.value.promptTokens + chatStats.value.completionTokens)
const hasTotalTokens = computed(() => totalTokens.value > 0)
const totalCost = computed(() => {
  return formatModelCost('anthropic/claude-3-sonnet', chatStats.value.cost)
})
const hasCost = computed(() => chatStats.value.cost > 0)

// Time-based analysis
const timeAnalysis = computed(() => {
  if (!props.messages.length) return null

  // Just cast everything to any to make TypeScript happy
  const timestamps: any[] = props.messages.map(m => m.timestamp ? new Date(m.timestamp) : new Date())
  const firstMessage: any = timestamps[0]
  const lastMessage: any = timestamps[timestamps.length - 1]
  const totalDuration: any = differenceInMinutes(lastMessage, firstMessage)

  // Calculate message frequency (messages per minute)
  const messageFrequency = totalDuration > 0
    ? props.messages.length / totalDuration
    : props.messages.length

  // Calculate token rate (tokens per minute)
  const tokenRate = totalDuration > 0
    ? totalTokens.value / totalDuration
    : totalTokens.value

  // Find periods of high activity (>2x average frequency)
  const timeWindows: any[] = []
  let windowStart: any = firstMessage
  let windowMessages: any[] = []

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
          tokenCount: windowMessages.reduce((sum: number, msg: any) => sum + (msg.tokens?.total || 0), 0)
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
      tokenCount: windowMessages.reduce((sum: number, msg: any) => sum + (msg.tokens?.total || 0), 0)
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

interface MessageWithAnalysis extends Omit<ChatMessage, 'id'> {
  documentTokens: number
  cumulativeTokens: number
  messageNumber: number
  timeSincePrevious: number
  id?: string // Make id optional
}

interface TimeWindow {
  start: Date
  end: Date
  messages: ChatMessage[]
  duration: number
  messageCount: number
  tokenCount: number
  tokenDensity?: number
}

interface MessageAnalysis {
  largestMessages: ChatMessage[]
  messagesWithCumulative: MessageWithAnalysis[]
  pruningPoints: MessageWithAnalysis[]
  averageTokensPerMessage: number
}

// Message analysis
const messageAnalysis = computed<MessageAnalysis | null>(() => {
  if (!props.messages.length) return null

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
  const messagesWithCumulative = props.messages.map((msg, idx): MessageWithAnalysis => {
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
        ? differenceInMinutes(
          new Date(msg.timestamp as string),
          new Date(props.messages[idx - 1].timestamp as string)
        )
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
    averageTokensPerMessage: props.messages.length > 0 ? runningTotal / props.messages.length : 0
  }
})

const selectedPrunePoint = ref<any>(null)

const handlePrune = () => {
  if (selectedPrunePoint.value) {
    emit('prune-before', selectedPrunePoint.value as any)
  }
}

// Format helpers
const formatTime = (date: any): string => {
  if (!date) return ''
  return format(new Date(date), 'HH:mm:ss')
}

const formatTimeAgo = (date: any): string => {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
</script>

<template>
  <Transition enter-active-class="context-panel-enter" leave-active-class="context-panel-leave"
    enter-from-class="translate-x-full" leave-to-class="translate-x-full">
    <div v-if="isContextPanelOpen"
      class="fixed top-[38px] right-0 bottom-0 w-[400px] bg-gray-900 border-l border-white/5 context-panel">
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
        <div class="flex-1 overflow-y-auto p-4 panel-content">
          <div class="space-y-6">
            <!-- Time Overview -->
            <div v-if="timeAnalysis" class="bg-gray-800/50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-white/90 mb-3">Conversation Timeline</h3>
              <dl class="grid grid-cols-2 gap-4">
                <div>
                  <dt class="text-xs text-white/60">Duration</dt>
                  <dd class="mt-1 text-lg font-medium text-white/80 monospace-text">
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
                  <dd class="mt-1 text-lg font-medium text-white/80 monospace-text">
                    {{ timeAnalysis.messageFrequency.toFixed(1) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-white/60">Tokens/Min</dt>
                  <dd class="mt-1 text-lg font-medium text-white/80 monospace-text">
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
                    <span class="text-xs text-white/60 monospace-text">
                      {{ formatTime(period.start) }} - {{ formatTime(period.end) }}
                    </span>
                    <span class="text-xs font-medium text-white/80 monospace-text">
                      {{ period.duration }}min
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-white/60">
                      <span class="monospace-text">{{ period.messageCount }}</span> messages
                    </span>
                    <span class="text-xs font-medium text-white/80">
                      <span class="monospace-text">{{ Math.round(period.tokenDensity) }}</span> tokens/min
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Current Context Size -->
            <div class="bg-gray-800/50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-white/90 mb-3">Current Context Size</h3>

              <!-- Waffle chart visualization of context window usage -->
              <div class="mb-4">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs text-white/60">Context Window Usage</span>
                  <span class="text-xs font-medium text-white/80 monospace-text">
                    {{ hasTotalTokens ? Math.round((totalTokens / 8192) * 100) : 0 }}% of 8K
                  </span>
                </div>
                <div class="grid grid-cols-10 gap-1">
                  <div v-if="hasTotalTokens && totalTokens > 0" v-for="i in Math.ceil((totalTokens / 8192) * 100)"
                    :key="i"
                    class="aspect-square rounded-sm transition-colors duration-300 bg-gradient-to-br from-blue-500 to-purple-600">
                  </div>
                  <div v-else class="text-xs text-white/40 py-2">No token data available</div>
                </div>
                <div class="flex justify-between mt-1 text-xs text-white/40 monospace-text">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              <dl class="grid grid-cols-2 gap-4">
                <div>
                  <dt class="text-xs text-white/60">Total Messages</dt>
                  <dd class="mt-1 text-2xl font-semibold text-white/90 monospace-text">{{ props.messages.length }}</dd>
                </div>
                <div v-if="hasTotalTokens">
                  <dt class="text-xs text-white/60">Total Tokens</dt>
                  <dd class="mt-1 text-2xl font-semibold text-white/90 monospace-text">{{ totalTokens }}</dd>
                </div>
                <div v-if="hasTotalTokens && messageAnalysis && messageAnalysis.averageTokensPerMessage > 0">
                  <dt class="text-xs text-white/60">Avg. Tokens/Message</dt>
                  <dd class="mt-1 text-lg font-medium text-white/80 monospace-text">
                    {{ Math.round(messageAnalysis.averageTokensPerMessage) }}
                  </dd>
                </div>
                <div v-if="hasCost">
                  <dt class="text-xs text-white/60">Total Cost</dt>
                  <dd class="mt-1 text-lg font-medium text-white/80 monospace-text">{{ totalCost }}</dd>
                </div>
              </dl>
            </div>

            <!-- Largest Messages -->
            <div v-if="messageAnalysis?.largestMessages.length" class="bg-gray-800/50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-white/90 mb-3">Largest Messages</h3>
              <div class="space-y-3">
                <div v-for="msg in messageAnalysis.largestMessages" :key="msg.id"
                  class="flex items-start gap-2 py-2 px-3 rounded-md bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs text-white/60">{{ msg.role === 'user' ? 'User' : 'AI' }} Message</span>
                      <span class="text-xs font-medium text-white/80 monospace-text">{{ msg.tokens?.total || 0 }}
                        tokens</span>
                    </div>
                    <p class="text-xs text-white/80 truncate">{{ msg.content }}</p>
                    <p class="text-xs text-white/40 mt-1">{{ formatTimeAgo(msg.timestamp) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Token Growth -->
            <div v-if="messageAnalysis?.pruningPoints.length" class="bg-gray-800/50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-white/90 mb-3">Cumulative Token Usage</h3>

              <!-- Token Beeswarm Visualization -->
              <div class="mb-4 mt-2 relative h-24 bg-gray-800/30 rounded-lg overflow-hidden">
                <!-- Timeline axis -->
                <div class="absolute bottom-0 left-0 right-0 h-px bg-gray-700/50"></div>

                <!-- Message Units -->
                <div v-if="messageAnalysis?.messagesWithCumulative.length" class="absolute inset-0 p-2">
                  <div v-for="(msg, idx) in messageAnalysis.messagesWithCumulative" :key="idx"
                    class="absolute rounded-full transition-all duration-300"
                    :class="msg.role === 'user' ? 'bg-blue-500/70' : 'bg-purple-500/70'" :style="{
                      width: `${Math.max(4, Math.min(12, Math.sqrt(msg.tokens?.total || 0) / 5))}px`,
                      height: `${Math.max(4, Math.min(12, Math.sqrt(msg.tokens?.total || 0) / 5))}px`,
                      left: `${(idx / Math.max(1, messageAnalysis.messagesWithCumulative.length - 1)) * 100}%`,
                      bottom: `${Math.min(80, Math.max(10, (msg.tokens?.total || 0) / 40))}%`,
                      transform: 'translate(-50%, 50%)',
                      opacity: msg.role === 'assistant' ? 0.9 : 0.7
                    }"></div>
                </div>

                <!-- Pattern markers -->
                <div v-for="(point, idx) in messageAnalysis?.pruningPoints" :key="'point-' + idx"
                  class="absolute bottom-0 w-px h-full bg-red-500/30" :style="{
                    left: `${(point.messageNumber / Math.max(1, messageAnalysis.messagesWithCumulative.length)) * 100}%`
                  }">
                  <div
                    class="absolute bottom-full mb-1 text-xs text-red-400 whitespace-nowrap transform -translate-x-1/2 monospace-text">
                    Message #{{ point.messageNumber }}
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <div v-for="msg in messageAnalysis.pruningPoints" :key="msg.id"
                  class="p-3 rounded-md bg-gray-800/30 border border-white/5">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs text-white/60">Message #<span class="monospace-text">{{ msg.messageNumber
                    }}</span></span>
                    <span class="text-xs font-medium text-white/80 monospace-text">
                      {{ msg.cumulativeTokens }} total tokens
                    </span>
                  </div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs text-white/60">{{ formatTimeAgo(msg.timestamp) }}</span>
                    <span class="text-xs text-white/60 monospace-text">
                      +{{ msg.timeSincePrevious }}min gap
                    </span>
                  </div>
                  <p class="text-xs text-white/60 mb-2">
                    Large token increase (+<span class="monospace-text">{{ msg.tokens?.total || 0 }}</span> tokens)
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
                Pruning before message #<span class="monospace-text">{{ selectedPrunePoint.messageNumber }}</span> will
                remove
                <span class="monospace-text">{{ selectedPrunePoint.cumulativeTokens }}</span> tokens from the context.
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
                <span class="text-xs text-white/60 monospace-text">
                  ~{{ documentAnalysis.totalDocumentTokens }} tokens
                </span>
              </div>

              <div class="space-y-3">
                <div v-for="doc in documentAnalysis.documents" :key="doc.path"
                  class="p-3 rounded-md bg-gray-800/30 border border-white/5">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-medium text-white/80">{{ doc.title }}</span>
                    <span class="text-xs text-white/60 monospace-text">~{{ doc.estimatedTokens }} tokens</span>
                  </div>

                  <!-- Document token unit chart -->
                  <div class="mb-2">
                    <div class="h-2 w-full bg-gray-900/50 rounded-full overflow-hidden">
                      <div class="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300"
                        :style="{
                          width: `${Math.min(100, (doc.estimatedTokens / Math.max(1, documentAnalysis.totalDocumentTokens)) * 100 * 3)}%`
                        }"></div>
                    </div>
                    <div class="flex justify-between mt-1 text-[9px] text-white/40 monospace-text">
                      <span>{{ Math.round((doc.estimatedTokens / Math.max(1, documentAnalysis.totalDocumentTokens)) *
                        100) }}% of document tokens</span>
                      <span>{{ Math.round((doc.estimatedTokens / 8192) * 100) }}% of context</span>
                    </div>
                  </div>

                  <!-- Document preview -->
                  <div class="mb-2 p-2 rounded bg-black/20">
                    <p class="text-xs text-white/60 line-clamp-2">{{ doc.content }}</p>
                  </div>

                  <div class="flex items-center justify-between text-xs text-white/60 mb-2">
                    <span>Used <span class="monospace-text">{{ doc.usageCount }}</span>×</span>
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
                  <dd class="mt-1 text-lg font-medium text-white/80 monospace-text">
                    {{ documentAnalysis.uniqueDocuments }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-white/60">Multi-use Docs</dt>
                  <dd class="mt-1 text-lg font-medium text-white/80 monospace-text">
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

<style scoped>
.context-panel {
  position: fixed !important;
  overflow: hidden;
  z-index: 30;
  box-shadow: -5px 0 25px rgba(0, 0, 0, 0.5);
}

/* Import Monaspace Neon font from GitHub with proper fallbacks */
@font-face {
  font-family: 'Monaspace Neon';
  src: url('https://cdn.jsdelivr.net/gh/githubnext/monaspace@v1.000/fonts/webfonts/MonaspaceNeon-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Monaspace Neon';
  src: url('https://cdn.jsdelivr.net/gh/githubnext/monaspace@v1.000/fonts/webfonts/MonaspaceNeon-Bold.woff') format('woff');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

/* Apply monospace font to elements with proper fallbacks */
.monospace-text {
  font-family: 'Monaspace Neon', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  letter-spacing: -0.02em;
  font-feature-settings: "calt" 1, "liga" 1;
}

.context-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background-color: rgba(17, 24, 39, 0);
  /* Dark overlay that matches the panel bg */
  pointer-events: none;
  z-index: 10;
  transition: background-color 180ms ease-in-out;
}

/* Beautiful coordinated transitions */
.context-panel-enter {
  transition: transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 350ms ease, box-shadow 450ms ease;
  animation: context-fade-in 450ms forwards;
}

.context-panel-leave {
  transition: transform 450ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 250ms ease, box-shadow 350ms ease;
  animation: context-fade-out 350ms forwards;
}

@keyframes context-fade-in {
  0% {
    opacity: 0.7;
    box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  }

  20% {
    opacity: 0.8;
  }

  60% {
    box-shadow: -8px 0 30px rgba(0, 0, 0, 0.3);
  }

  100% {
    opacity: 1;
    box-shadow: -5px 0 25px rgba(0, 0, 0, 0.5);
  }
}

@keyframes context-fade-out {
  0% {
    opacity: 1;
    box-shadow: -5px 0 25px rgba(0, 0, 0, 0.5);
  }

  40% {
    opacity: 0.9;
  }

  100% {
    opacity: 0;
    box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  }
}

/* Add a subtle content flash animation for text */
.panel-content {
  animation: content-flash 450ms forwards;
}

.context-panel-leave .panel-content {
  animation: content-fade-out 250ms forwards;
}

@keyframes content-flash {
  0% {
    opacity: 0;
  }

  40% {
    opacity: 0.5;
  }

  100% {
    opacity: 1;
  }
}

@keyframes content-fade-out {
  0% {
    opacity: 1;
  }

  70% {
    opacity: 0.3;
  }

  100% {
    opacity: 0;
  }
}

/* Define transition for the panel with quad easing */
.context-panel {
  transition-property: transform, box-shadow, opacity;
  transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);
  transition-duration: 450ms;
  transform-origin: right center;
}
</style>