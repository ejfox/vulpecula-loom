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

  // Menu-related IPC handlers
  // These are just stubs - the actual event sending happens in the menu.ts file
  // But we register them here for documentation and to maintain a single source of truth
  ipcMain.handle("menu:new-chat", () => {
    console.log("IPC: menu:new-chat handler called");
    // The actual event is sent from menu.ts
    return true;
  });

  ipcMain.handle("menu:export-chat", () => {
    console.log("IPC: menu:export-chat handler called");
    // The actual event is sent from menu.ts
    return true;
  });

  ipcMain.handle("menu:open-settings", () => {
    console.log("IPC: menu:open-settings handler called");
    // The actual event is sent from menu.ts
    return true;
  });

  ipcMain.handle("menu:toggle-chat-sidebar", () => {
    console.log("IPC: menu:toggle-chat-sidebar handler called");
    // The actual event is sent from menu.ts
    return true;
  });

  ipcMain.handle("menu:toggle-context-panel", () => {
    console.log("IPC: menu:toggle-context-panel handler called");
    // The actual event is sent from menu.ts
    return true;
  });

  // New menu action handlers
  ipcMain.handle("menu:print-chat", () => {
    console.log("IPC: menu:print-chat handler called");
    return true;
  });

  ipcMain.handle("menu:search-in-chat", () => {
    console.log("IPC: menu:search-in-chat handler called");
    return true;
  });

  ipcMain.handle("menu:search-across-chats", () => {
    console.log("IPC: menu:search-across-chats handler called");
    return true;
  });

  ipcMain.handle("menu:clear-chat", () => {
    console.log("IPC: menu:clear-chat handler called");
    return true;
  });

  ipcMain.handle("menu:clear-chat-history", () => {
    console.log("IPC: menu:clear-chat-history handler called");
    return true;
  });

  ipcMain.handle("menu:regenerate-response", () => {
    console.log("IPC: menu:regenerate-response handler called");
    return true;
  });

  ipcMain.handle("menu:change-model", () => {
    console.log("IPC: menu:change-model handler called");
    return true;
  });

  ipcMain.handle("menu:show-keyboard-shortcuts", () => {
    console.log("IPC: menu:show-keyboard-shortcuts handler called");
    return true;
  });
}

export default setupIpcHandlers;
