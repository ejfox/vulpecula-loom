import Store from "electron-store";

interface StoreSchema {
  "openrouter-api-key": string;
  "ai-chat-model": string;
  theme: "system" | "light" | "dark";
  "obsidian-vault-path": string;
  rememberWindowState: boolean;
  minimizeToTray: boolean;
  showNotifications: boolean;
  playSounds: boolean;
  showBadgeCount: boolean;
  showProgressBar: boolean;
  enabledModelIds: string[];
  recentModelIds: string[];
}

export function useStore() {
  async function get<K extends keyof StoreSchema>(
    key: K
  ): Promise<StoreSchema[K]> {
    return window.electron.ipcRenderer.invoke("store-get", key);
  }

  async function set<K extends keyof StoreSchema>(
    key: K,
    value: StoreSchema[K]
  ): Promise<boolean> {
    return window.electron.ipcRenderer.invoke("store-set", key, value);
  }

  async function clear(): Promise<boolean> {
    return window.electron.ipcRenderer.invoke("store-clear");
  }

  return {
    get,
    set,
    clear,
  };
}
