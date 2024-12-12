export interface StoreSchema {
  "openrouter-api-key": string;
  "ai-chat-model": string;
  theme: "system" | "light" | "dark";
  "obsidian-vault-path": string;
  validateApiKey: boolean;
  rememberWindowState: boolean;
  minimizeToTray: boolean;
  showNotifications: boolean;
  playSounds: boolean;
  showBadgeCount: boolean;
  showProgressBar: boolean;
  enabledModelIds: string[];
  recentModelIds: string[];
}

declare global {
  interface Window {
    electron: {
      store: {
        get: <K extends keyof StoreSchema>(key: K) => Promise<StoreSchema[K]>;
        set: <K extends keyof StoreSchema>(
          key: K,
          value: StoreSchema[K]
        ) => Promise<boolean>;
        clear: () => Promise<boolean>;
      };
      shell: {
        openExternal: (url: string) => Promise<void>;
      };
      // Add other electron API types here
    };
    electronAPI: typeof window.electron;
  }
}
