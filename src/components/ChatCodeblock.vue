<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { ref, onMounted, watch } from 'vue'
import { getHighlighter, type Highlighter } from 'shiki'
import { getSuggestedFilename } from '../lib/fileUtils'

const props = defineProps<{
  code: string
  language?: string
}>()

const highlightedCode = ref('')
const isDark = ref(document.documentElement.classList.contains('dark'))
const highlighter = ref<Highlighter>()

// Watch for dark mode changes
watch(() => isDark.value, () => {
  highlightCode()
})

// Initialize syntax highlighter
onMounted(async () => {
  console.log('🎨 Initializing syntax highlighter...')
  try {
    highlighter.value = await getHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: [
        'javascript', 'typescript', 'json', 'html', 'css', 'bash', 'markdown',
        'python', 'rust', 'go', 'ruby', 'php', 'java', 'c', 'cpp', 'csharp',
        'swift', 'kotlin', 'scala', 'sql', 'yaml', 'toml', 'vue', 'svelte',
        'jsx', 'tsx'
      ]
    })

    console.log('✨ Syntax highlighter initialized')
    highlightCode()
  } catch (error) {
    console.error('❌ Failed to initialize syntax highlighter:', error)
  }
})

const highlightCode = async () => {
  if (!highlighter.value || !props.code) return

  try {
    const lang = props.language?.toLowerCase() || 'text'
    console.debug(`🔍 Highlighting code as ${lang}`)

    highlightedCode.value = highlighter.value.codeToHtml(props.code, {
      lang,
      theme: isDark.value ? 'github-dark' : 'github-light'
    })
  } catch (e) {
    console.warn(`⚠️ Language not supported: ${props.language}, falling back to plain text`)
    // Fallback to plain text if language not supported
    highlightedCode.value = `<pre class="shiki"><code>${props.code}</code></pre>`
  }
}

// Watch for code/language changes
watch(() => props.code, highlightCode)
watch(() => props.language, highlightCode)

const { copy, copied } = useClipboard()

const handleCopy = () => {
  copy(props.code)
  console.log('📋 Code copied to clipboard')
}

// Save to file functionality
const handleSave = async () => {
  try {
    console.log('Checking electron availability...', {
      electron: window.electron,
      ipc: window.electron?.ipc,
      validChannels: ['show-save-dialog', 'write-file']
    })

    if (!window.electron) {
      throw new Error('Electron not available - are you running in development mode?')
    }

    if (!window.electron.ipc?.invoke) {
      throw new Error('IPC store not available - check preload script')
    }

    // Generate a suggested filename based on the language
    const suggestedName = getSuggestedFilename(props.language, "ChatExport")
    console.log("📝 Suggested filename:", suggestedName)

    // Get the extension for file filters
    const extension = suggestedName.split('.').pop() || 'txt'

    console.log('💾 Attempting to save code block...', {
      suggestedName,
      extension,
      language: props.language
    })

    // Ask main process to show save dialog
    const result = await window.electron.ipc.invoke('show-save-dialog', {
      title: 'Save Code Block',
      suggestedName,
      filters: [
        {
          name: props.language ? `${props.language} files` : 'All Files',
          extensions: [extension]
        },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    console.log('Save dialog result:', result)

    if (!result.canceled && result.filePath) {
      // Write the file through the main process
      const writeResult = await window.electron.ipc.invoke('write-file', result.filePath, props.code)
      console.log('✅ Code block saved successfully:', {
        path: result.filePath,
        result: writeResult
      })
    } else {
      console.log('Save dialog cancelled by user')
    }
  } catch (error) {
    console.error('❌ Failed to save file:', error)
    console.error('Error details:', {
      electronAvailable: !!window.electron,
      ipcAvailable: !!(window.electron?.ipc?.invoke),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
</script>

<template>
  <div class="relative group rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900/50">
    <!-- Action bar - floating -->
    <div class="absolute inset-x-0 top-0 z-20">
      <div
        class="flex items-center justify-between p-2 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <!-- Language badge -->
        <div v-if="props.language"
          class="px-2 py-1 text-xs rounded bg-white/10 text-gray-500 dark:text-gray-400 font-mono">
          {{ props.language }}
        </div>

        <!-- Action buttons -->
        <div class="flex gap-1 ml-auto">
          <!-- Save button -->
          <button @click="handleSave"
            class="p-1.5 rounded bg-white/10 hover:bg-white/20 text-gray-500 dark:text-gray-400 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </button>

          <!-- Copy button -->
          <button @click="handleCopy"
            class="p-1.5 rounded bg-white/10 hover:bg-white/20 text-gray-500 dark:text-gray-400 transition-colors">
            <svg v-if="!copied" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Scrollable code content -->
    <div class="max-h-[600px] overflow-y-auto">
      <div class="overflow-x-auto p-4 pt-12" v-html="highlightedCode || props.code" />
    </div>
  </div>
</template>

<style>
.shiki {
  margin: 0;
  padding: 0;
  background: transparent !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  tab-size: 2;
  width: 100%;
}

/* Light mode overrides */
:root:not(.dark) .shiki {
  --shiki-color-text: theme('colors.gray.900');
  --shiki-color-background: transparent;
  --shiki-token-constant: theme('colors.blue.600');
  --shiki-token-string: theme('colors.green.600');
  --shiki-token-comment: theme('colors.gray.500');
  --shiki-token-keyword: theme('colors.purple.600');
  --shiki-token-parameter: theme('colors.orange.600');
  --shiki-token-function: theme('colors.pink.600');
  --shiki-token-string-expression: theme('colors.green.600');
  --shiki-token-punctuation: theme('colors.gray.500');
  --shiki-token-link: theme('colors.blue.600');
}

/* Dark mode overrides */
:root.dark .shiki {
  --shiki-color-text: theme('colors.gray.100');
  --shiki-color-background: transparent;
  --shiki-token-constant: theme('colors.blue.300');
  --shiki-token-string: theme('colors.green.300');
  --shiki-token-comment: theme('colors.gray.500');
  --shiki-token-keyword: theme('colors.purple.300');
  --shiki-token-parameter: theme('colors.orange.300');
  --shiki-token-function: theme('colors.pink.300');
  --shiki-token-string-expression: theme('colors.green.300');
  --shiki-token-punctuation: theme('colors.gray.400');
  --shiki-token-link: theme('colors.blue.300');
}

/* Scrollbar styling */
.shiki::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}

.shiki::-webkit-scrollbar-track {
  background-color: theme('colors.gray.100');
  border-radius: 4px;
}

.shiki::-webkit-scrollbar-thumb {
  background-color: theme('colors.gray.300');
  border-radius: 4px;
}

:root.dark .shiki::-webkit-scrollbar-track {
  background-color: theme('colors.gray.800');
}

:root.dark .shiki::-webkit-scrollbar-thumb {
  background-color: theme('colors.gray.600');
}
</style>
