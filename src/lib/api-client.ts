import { authClient } from './auth-client';
import type { 
  Chat,
  ChatHistory, 
  ChatMessage,
  ChatMetadata,
  Thread,
  ThreadOptions,
  ChatForkOptions,
  NewChat
} from '../types';

// API Client for chat operations and other non-auth endpoints
class ApiClient {
  private baseURL = "http://localhost:3000/api";
  
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await authClient.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.token && { 'Authorization': `Bearer ${session.token}` })
    };
  }
  
  private async request(endpoint: string, options: RequestInit = {}) {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
    }
    
    return response.json();
  }
  
  // Chat operations
  async saveChat(chat: Omit<NewChat, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Chat> {
    const result = await this.request('/chats', {
      method: 'POST',
      body: JSON.stringify({
        ...chat,
        metadata: {
          ...chat.metadata,
          messageCount: chat.messages?.length || 0,
          lastUpdated: new Date().toISOString()
        }
      })
    });
    return result.data;
  }
  
  async loadChats(threadId?: string): Promise<Chat[]> {
    const params = threadId ? `?thread_id=${threadId}` : '';
    const result = await this.request(`/chats${params}`);
    return result.data;
  }
  
  async loadChat(id: string): Promise<Chat> {
    const result = await this.request(`/chats/${id}`);
    return result.data;
  }
  
  async updateChat(id: string, updates: {
    title?: string;
    messages?: ChatMessage[];
    metadata?: ChatMetadata;
    model?: string;
    threadId?: string;
  }): Promise<Chat> {
    const result = await this.request(`/chats/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updates,
        metadata: updates.metadata ? {
          ...updates.metadata,
          messageCount: updates.messages?.length || 0,
          lastUpdated: new Date().toISOString()
        } : undefined
      })
    });
    return result.data;
  }
  
  async deleteChat(id: string): Promise<void> {
    await this.request(`/chats/${id}`, {
      method: 'DELETE'
    });
  }
  
  async deleteAllChats(): Promise<void> {
    const chats = await this.loadChats();
    await Promise.all(chats.map(chat => this.deleteChat(chat.id)));
  }
  
  async forkChat(options: ChatForkOptions): Promise<Chat> {
    const result = await this.request(`/chats/${options.parentId}/fork`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
    return result.data;
  }
  
  // Thread operations
  async createThread(options: ThreadOptions): Promise<Thread> {
    const result = await this.request('/threads', {
      method: 'POST',
      body: JSON.stringify(options)
    });
    return result.data;
  }
  
  async loadThreads(): Promise<Thread[]> {
    const result = await this.request('/threads');
    return result.data;
  }
  
  async updateThread(id: string, updates: Partial<Thread>): Promise<Thread> {
    const result = await this.request(`/threads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return result.data;
  }
  
  async deleteThread(id: string): Promise<void> {
    await this.request(`/threads/${id}`, {
      method: 'DELETE'
    });
  }
  
  async addChatToThread(chatId: string, threadId: string): Promise<boolean> {
    try {
      await this.request(`/threads/${threadId}/chats`, {
        method: 'POST',
        body: JSON.stringify({ chatId })
      });
      return true;
    } catch (error) {
      console.error('Failed to add chat to thread:', error);
      return false;
    }
  }
  
  async removeChatFromThread(chatId: string, threadId: string): Promise<boolean> {
    try {
      await this.request(`/threads/${threadId}/chats/${chatId}`, {
        method: 'DELETE'
      });
      return true;
    } catch (error) {
      console.error('Failed to remove chat from thread:', error);
      return false;
    }
  }
  
  async getThreadChats(threadId: string): Promise<Chat[]> {
    return this.loadChats(threadId);
  }
  
  // Utility methods
  async updateChatMetadata(chatId: string, metadata: Partial<ChatMetadata>): Promise<Chat | null> {
    try {
      return await this.updateChat(chatId, { metadata });
    } catch (error) {
      console.error('Failed to update chat metadata:', error);
      return null;
    }
  }
  
  async generateChatSummary(chatId: string, messages: ChatMessage[]): Promise<Chat | null> {
    // TODO: Implement AI-powered summary generation
    const summary = `Chat with ${messages.length} messages`;
    return this.updateChatMetadata(chatId, { 
      summary,
      summaryLastUpdated: new Date().toISOString()
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;