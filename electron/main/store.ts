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
  console.log("🔧 Setting up store handlers");

  ipcMain.handle("store-get", (_event, key: keyof StoreSchema) => {
    console.log("📥 Store Handler: Getting value for key:", key);
    try {
      const value = store.get(key);
      console.log("✅ Store Handler: Got value for key:", key, "Value:", value);
      // Convert to JSON and back to ensure it's cloneable
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
      console.log(
        "📤 Store Handler: Setting value for key:",
        key,
        "Value:",
        value
      );
      try {
        // Convert to JSON and back to ensure it's cloneable
        const cloneableValue = JSON.parse(JSON.stringify(value));
        store.set(key, cloneableValue);
        console.log("✅ Store Handler: Successfully set value for key:", key);
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
    console.log("🗑️ Store Handler: Clearing store");
    try {
      store.clear();
      console.log("✅ Store Handler: Successfully cleared store");
    } catch (err) {
      console.error("❌ Store Handler: Failed to clear store:", err);
      throw err;
    }
  });

  console.log("✅ Store handlers setup complete");
}

export default store;
