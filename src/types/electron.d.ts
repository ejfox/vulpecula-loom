import { ElectronAPI } from "@electron-toolkit/preload";

interface Window {
  electron: {
    // Window management
    onToggleChatSidebar: (callback: () => void) => void;
    onToggleContextPanel: (callback: () => void) => void;
    removeToggleChatSidebar: (callback: () => void) => void;
    removeToggleContextPanel: (callback: () => void) => void;
    showWindow: () => Promise<void>;
    setBadge: (count: number) => Promise<void>;
    onNewChat: (callback: () => void) => void;
    removeNewChat: (callback: () => void) => void;
    onOpenSettings: (callback: () => void) => void;
    removeOpenSettings: (callback: () => void) => void;

    // IPC store for file operations
    ipc: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, func: (...args: any[]) => void) => void;
      removeListener: (channel: string, func: (...args: any[]) => void) => void;
    };

    // Shell operations
    shell: {
      openExternal: (url: string) => Promise<void>;
    };
  };
}

export interface IpcRenderer {
  invoke(channel: string, ...args: any[]): Promise<any>;
  on(channel: string, func: (...args: any[]) => void): () => void;
  once(channel: string, func: (...args: any[]) => void): void;
  removeListener(channel: string, func: (...args: any[]) => void): void;
}

export interface Store {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
}

declare global {
  interface Window {
    electron?: {
      ipc: IpcRenderer;
      store: Store;
      shell: {
        openExternal: (url: string) => Promise<void>;
      };
      handleMenuAction(
        channel: string,
        callback: (...args: any[]) => void
      ): () => void;
      onMenuAction(channel: string, callback: () => void): () => void;
      onOpenSettings(callback: () => void): () => void;
      onNewChat(callback: () => void): () => void;
      onExportChat(callback: () => void): () => void;
      onToggleChatSidebar(callback: () => void): () => void;
      onToggleContextPanel(callback: () => void): () => void;
    };
    electronAPI: {
      store: Store;
      handleMenuAction(
        channel: string,
        callback: (...args: any[]) => void
      ): () => void;
    };
  }
}

export {};
