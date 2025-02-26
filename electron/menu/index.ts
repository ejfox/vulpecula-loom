import { app, Menu, BrowserWindow, MenuItemConstructorOptions } from "electron";
import { isMac } from "./utils";

// Set the app name
app.name = "Vulpecula";

/**
 * Create and set the application menu
 * @param mainWindow The main browser window
 */
export function createApplicationMenu(mainWindow: BrowserWindow) {
  console.log("Creating application menu...");

  const template: MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              {
                label: "Preferences...",
                accelerator: "CmdOrCtrl+,",
                click: () => {
                  console.log("Menu: Sending menu:open-settings");
                  mainWindow.webContents.send("menu:open-settings");
                },
              },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),

    // File Menu
    {
      label: "File",
      submenu: [
        {
          label: "New Chat",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            console.log("Menu: Sending menu:new-chat");
            mainWindow.webContents.send("menu:new-chat");
          },
        },
        { type: "separator" as const },
        {
          label: "Save Chat",
          accelerator: "CmdOrCtrl+S",
          click: () => {
            console.log("Menu: Sending menu:export-chat (save)");
            mainWindow.webContents.send("menu:export-chat");
          },
        },
        {
          label: "Export Chat",
          accelerator: "CmdOrCtrl+E",
          click: () => {
            console.log("Menu: Sending menu:export-chat");
            mainWindow.webContents.send("menu:export-chat");
          },
        },
        { type: "separator" as const },
        {
          label: "Print Chat",
          accelerator: "CmdOrCtrl+P",
          click: () => {
            console.log("Menu: Sending menu:print-chat");
            mainWindow.webContents.send("menu:print-chat");
          },
        },
        { type: "separator" as const },
        isMac ? { role: "close" as const } : { role: "quit" as const },
      ],
    },

    // Edit Menu
    {
      label: "Edit",
      submenu: [
        { role: "undo" as const },
        { role: "redo" as const },
        { type: "separator" as const },
        { role: "cut" as const },
        { role: "copy" as const },
        { role: "paste" as const },
        ...(isMac
          ? [
              { role: "pasteAndMatchStyle" as const },
              { role: "delete" as const },
              { role: "selectAll" as const },
              { type: "separator" as const },
              {
                label: "Speech",
                submenu: [
                  { role: "startSpeaking" as const },
                  { role: "stopSpeaking" as const },
                ],
              },
            ]
          : [
              { role: "delete" as const },
              { type: "separator" as const },
              { role: "selectAll" as const },
            ]),
        { type: "separator" as const },
        {
          label: "Search in Chat",
          accelerator: "CmdOrCtrl+F",
          click: () => {
            console.log("Menu: Sending menu:search-in-chat");
            mainWindow.webContents.send("menu:search-in-chat");
          },
        },
        {
          label: "Search Across Chats",
          accelerator: "CmdOrCtrl+Shift+F",
          click: () => {
            console.log("Menu: Sending menu:search-across-chats");
            mainWindow.webContents.send("menu:search-across-chats");
          },
        },
      ],
    },

    // View Menu
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Chat Sidebar",
          accelerator: "CmdOrCtrl+K",
          click: () => {
            console.log("Menu: Sending menu:toggle-chat-sidebar");
            mainWindow.webContents.send("menu:toggle-chat-sidebar");
          },
        },
        {
          label: "Toggle Context Panel",
          accelerator: "CmdOrCtrl+/",
          click: () => {
            console.log("Menu: Sending menu:toggle-context-panel");
            mainWindow.webContents.send("menu:toggle-context-panel");
          },
        },
        { type: "separator" as const },
        { role: "reload" as const },
        { role: "forceReload" as const },
        { role: "toggleDevTools" as const },
        { type: "separator" as const },
        { role: "resetZoom" as const },
        { role: "zoomIn" as const },
        { role: "zoomOut" as const },
        { type: "separator" as const },
        { role: "togglefullscreen" as const },
      ],
    },

    // Chat Menu (new menu for chat-specific actions)
    {
      label: "Chat",
      submenu: [
        {
          label: "Clear Chat",
          click: () => {
            console.log("Menu: Sending menu:clear-chat");
            mainWindow.webContents.send("menu:clear-chat");
          },
        },
        {
          label: "Clear Chat History",
          click: () => {
            console.log("Menu: Sending menu:clear-chat-history");
            mainWindow.webContents.send("menu:clear-chat-history");
          },
        },
        {
          label: "Regenerate Response",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            console.log("Menu: Sending menu:regenerate-response");
            mainWindow.webContents.send("menu:regenerate-response");
          },
        },
        { type: "separator" as const },
        {
          label: "Change Model",
          click: () => {
            console.log("Menu: Sending menu:change-model");
            mainWindow.webContents.send("menu:change-model");
          },
        },
      ],
    },

    // Window Menu
    {
      label: "Window",
      submenu: [
        { role: "minimize" as const },
        { role: "zoom" as const },
        ...(isMac
          ? [
              { type: "separator" as const },
              { role: "front" as const },
              { type: "separator" as const },
              { role: "window" as const },
            ]
          : [{ role: "close" as const }]),
      ],
    },

    // Help Menu
    {
      role: "help" as const,
      submenu: [
        {
          label: "Learn More",
          click: async () => {
            const { shell } = require("electron");
            await shell.openExternal("https://github.com/ejfox/vulpecula-loom");
          },
        },
        {
          label: "Keyboard Shortcuts",
          accelerator: "CmdOrCtrl+Shift+/",
          click: () => {
            console.log("Menu: Sending menu:show-keyboard-shortcuts");
            mainWindow.webContents.send("menu:show-keyboard-shortcuts");
          },
        },
        { type: "separator" as const },
        {
          label: "Report an Issue",
          click: async () => {
            const { shell } = require("electron");
            await shell.openExternal(
              "https://github.com/ejfox/vulpecula-loom/issues/new"
            );
          },
        },
      ],
    },
  ];

  // Create and set the menu
  try {
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    console.log("Application menu created and set successfully");
  } catch (error) {
    console.error("Failed to create application menu:", error);
  }
}
