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

export {};
