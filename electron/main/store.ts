import Store from "electron-store";
import { ipcMain } from "electron";

export interface StoreSchema {
  "api-key"?: string;
  theme?: string;
  "show-progress-bar"?: boolean;
  "show-only-pinned-models"?: boolean;
  "pinned-models"?: string[];
  "window-state"?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  "remember-window-state"?: boolean;
  "minimize-to-tray"?: boolean;
  "show-notifications"?: boolean;
  "play-sounds"?: boolean;
  "show-badge-count"?: boolean;
  "obsidian-vault-path"?: string;
  "ai-chat-model"?: string;
  "enabled-model-ids"?: string[];
  "recent-model-ids"?: string[];
}

const store = new Store<StoreSchema>({
  defaults: {
    "api-key": "",
    "ai-chat-model": "anthropic/claude-3-opus",
    theme: "system",
    "obsidian-vault-path": "",
    "remember-window-state": true,
    "minimize-to-tray": false,
    "show-notifications": true,
    "play-sounds": true,
    "show-badge-count": true,
    "show-progress-bar": true,
    "show-only-pinned-models": false,
    "pinned-models": [],
    "enabled-model-ids": [],
    "recent-model-ids": [],
  },
});

export function setupStoreHandlers() {
  ipcMain.handle("store-get", async (_event, key: keyof StoreSchema) => {
    return store.get(key);
  });

  ipcMain.handle(
    "store-set",
    async (_event, key: keyof StoreSchema, value: any) => {
      store.set(key, value);
      return true;
    }
  );

  ipcMain.handle("store-clear", async () => {
    store.clear();
    return true;
  });
}
