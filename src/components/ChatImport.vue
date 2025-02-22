<script setup lang="ts">
import type { ChatMessage, Chat } from '../types'
import { useAIChat } from '../composables/useAIChat'
import { useSupabase } from '../composables/useSupabase'

const aiChat = useAIChat()
const { saveChatHistory } = useSupabase()

const emit = defineEmits(['new-chat'])

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const content = await file.text()
  const messages = parseMarkdownToMessages(content)

  if (messages.length > 0) {
    // Create new chat with imported messages
    await aiChat.createNewChat()

    // Update the messages and metadata
    const chatToSave = {
      title: 'Imported Chat',
      messages: messages,
      model: aiChat.currentModel.value,
      metadata: {
        lastUpdated: new Date().toISOString(),
        messageCount: messages.length,
        lastModel: aiChat.currentModel.value,
        stats: {
          promptTokens: 0,
          completionTokens: 0,
          cost: 0,
          totalMessages: messages.length
        }
      }
    }

    const savedChat = await saveChatHistory(chatToSave)
    emit('new-chat', savedChat)
  }
}

const parseMarkdownToMessages = (markdown: string): ChatMessage[] => {
  const messages: ChatMessage[] = []
  const lines = markdown.split('\n')
  let currentMessage: Partial<ChatMessage> = {}
  let content: string[] = []

  for (const line of lines) {
    if (line.startsWith('### ')) {
      // Save previous message if exists
      if (currentMessage.role && content.length > 0) {
        messages.push({
          ...currentMessage,
          content: content.join('\n'),
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString()
        } as ChatMessage)
        content = []
      }

      // Start new message
      const role = line.includes('Assistant:') ? 'assistant' as const : 'user' as const
      currentMessage = { role }
    } else if (line.trim() && currentMessage.role) {
      content.push(line)
    }
  }

  // Add final message
  if (currentMessage.role && content.length > 0) {
    messages.push({
      ...currentMessage,
      content: content.join('\n'),
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    } as ChatMessage)
  }

  return messages
}
</script>

<template>
  <div class="chat-import">
    <label class="import-button" role="button" tabindex="0" @keydown.enter="$refs.fileInput.click()"
      @keydown.space="$refs.fileInput.click()">
      <input ref="fileInput" type="file" accept=".md" class="hidden-input" @change="handleFileUpload" />
      <div class="button-content">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>Import</span>
      </div>
    </label>
  </div>
</template>

<style scoped>
.chat-import {
  display: inline-block;
}

.import-button {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: rgb(249 250 251);
  border: 1px solid rgb(229 231 235);
  color: rgb(31 41 55);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

/* Dark mode */
:root.dark .import-button {
  background: rgb(24 25 26);
  border-color: rgb(55 65 81);
  color: rgb(229 231 235);
}

.import-button:hover {
  background: rgb(243 244 246);
  border-color: rgb(209 213 219);
}

/* Dark mode hover */
:root.dark .import-button:hover {
  background: rgb(31 32 33);
  border-color: rgb(75 85 99);
}

.import-button:focus {
  outline: none;
  /* Only use color for focus state - important for accessibility */
  box-shadow: 0 0 0 2px rgb(255 255 255), 0 0 0 4px rgb(107 114 128);
}

/* Dark mode focus */
:root.dark .import-button:focus {
  box-shadow: 0 0 0 2px rgb(17 24 39), 0 0 0 4px rgb(156 163 175);
}

.hidden-input {
  display: none;
}

.button-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Ensure SVG icon color matches text */
.button-content svg {
  color: currentColor;
  width: 1rem;
  height: 1rem;
  opacity: 0.8;
}

/* Add subtle shadow for depth */
.import-button {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* Dark mode shadow */
:root.dark .import-button {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Active state */
.import-button:active {
  transform: translateY(1px);
}

/* Disabled state */
.import-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>