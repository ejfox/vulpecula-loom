import Store from "electron-store";
import { ipcMain } from "electron";
import type { StoreSchema } from "../../src/types";

const store = new Store<StoreSchema>({
  defaults: {
    "api-key": "",
    theme: "dark",
    "show-progress-bar": true,
    "show-only-pinned-models": false,
    "pinned-models": [],
    "enabled-model-ids": [],
    "recent-model-ids": [],
    "remember-window-state": true,
    "minimize-to-tray": false,
    "show-notifications": true,
    "play-sounds": true,
    "show-badge-count": true,
    "obsidian-vault-path": "",
    enabledModelIds: [],
    recentModelIds: [],
  },
});

export function setupStoreHandlers() {
  ipcMain.handle("store-get", (_event, key: keyof StoreSchema) => {
    try {
      const value = store.get(key);
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      console.error(
        "❌ Store Handler: Failed to get value for key:",
        key,
        "Error:",
        err
      );
      throw err;
    }
  });

  ipcMain.handle(
    "store-set",
    (_event, key: keyof StoreSchema, value: StoreSchema[keyof StoreSchema]) => {
      try {
        const cloneableValue = JSON.parse(JSON.stringify(value));
        store.set(key, cloneableValue);
      } catch (err) {
        console.error(
          "❌ Store Handler: Failed to set value for key:",
          key,
          "Error:",
          err
        );
        throw err;
      }
    }
  );

  ipcMain.handle("store-clear", () => {
    try {
      store.clear();
    } catch (err) {
      console.error("❌ Store Handler: Failed to clear store:", err);
      throw err;
    }
  });
}

export default store;
