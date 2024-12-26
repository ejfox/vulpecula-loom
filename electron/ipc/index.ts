import { ipcMain, shell } from "electron";
import { setupStoreHandlers } from "../main/store";

/**
 * Central setup function for all IPC handlers
 * All IPC communication should be registered here
 */
export function setupIpcHandlers() {
  // Set up store handlers
  setupStoreHandlers();

  // Handle opening external links
  ipcMain.handle("open-external", async (_event, url: string) => {
    try {
      await shell.openExternal(url);
    } catch (err) {
      console.error("Failed to open external URL:", err);
    }
  });
}

export default setupIpcHandlers;
