import { ref, computed } from 'vue'

export interface ChatMessage {
  id: string
  userId: string
  username: string
  content: string
  timestamp: Date
  isCurrentUser: boolean
}

export function useChat() {
  const messages = ref<ChatMessage[]>([
    {
      id: '1',
      userId: 'user1',
      username: 'User1',
      content: 'Hello, how can I help you today?',
      timestamp: new Date('2024-03-20T10:30:00'),
      isCurrentUser: false
    },
    {
      id: '2',
      userId: 'user2',
      username: 'User2',
      content: "I'm looking for information on your services.",
      timestamp: new Date('2024-03-20T10:32:00'),
      isCurrentUser: true
    }
  ])

  const newMessage = ref('')

  const sortedMessages = computed(() => {
    return [...messages.value].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    )
  })

  function formatTimestamp(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date)
  }

  function sendMessage(content: string) {
    if (!content.trim()) return

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      userId: 'user2', // In real app, get from auth
      username: 'User2',
      content: content.trim(),
      timestamp: new Date(),
      isCurrentUser: true
    }

    messages.value.push(message)
    newMessage.value = '' // Clear input
  }

  return {
    messages: sortedMessages,
    newMessage,
    sendMessage,
    formatTimestamp
  }
} 