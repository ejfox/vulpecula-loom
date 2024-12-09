import { ElectronAPI } from "@electron-toolkit/preload";

interface IpcRenderer {
  invoke(channel: string, ...args: any[]): Promise<any>;
  on(channel: string, func: (...args: any[]) => void): void;
  removeListener(channel: string, func: (...args: any[]) => void): void;
}

interface Shell {
  openExternal(url: string): Promise<void>;
}

// Main API used by the app
interface ElectronAPI {
  onToggleChatSidebar: (callback: () => void) => void;
  onToggleContextPanel: (callback: () => void) => void;
  removeToggleChatSidebar: (callback: () => void) => void;
  removeToggleContextPanel: (callback: () => void) => void;
  showWindow: () => Promise<void>;
  setBadge: (count: number) => Promise<void>;
  onNewChat: (callback: () => void) => void;
  removeNewChat: (callback: () => void) => void;
  openExternal: (url: string) => Promise<void>;
  onOpenSettings: (callback: () => void) => void;
  removeOpenSettings: (callback: () => void) => void;
}

// Base electron API
interface Electron {
  ipcRenderer: IpcRenderer;
  shell: Shell;
}

declare global {
  interface Window {
    electron: Electron;
    electronAPI: ElectronAPI;
  }
}

export {};
