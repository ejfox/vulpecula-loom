import { app, Menu, BrowserWindow, MenuItemConstructorOptions } from "electron";
import { isMac } from "./utils";

// Set the app name
app.name = "Vulpecula";

export function createApplicationMenu(mainWindow: BrowserWindow) {
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
                click: () => mainWindow.webContents.send("menu:open-settings"),
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
          click: () => mainWindow.webContents.send("menu:new-chat"),
        },
        { type: "separator" as const },
        {
          label: "Export Chat",
          accelerator: "CmdOrCtrl+E",
          click: () => mainWindow.webContents.send("menu:export-chat"),
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
      ],
    },

    // View Menu
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Chat Sidebar",
          accelerator: "CmdOrCtrl+K",
          click: () => mainWindow.webContents.send("menu:toggle-chat-sidebar"),
        },
        {
          label: "Toggle Context Panel",
          accelerator: "CmdOrCtrl+/",
          click: () => mainWindow.webContents.send("menu:toggle-context-panel"),
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
            await shell.openExternal(
              "https://github.com/your-repo/vulpecula-loom"
            );
          },
        },
      ],
    },
  ];

  // Create and set the menu
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Return the menu in case we need it later
  return menu;
}
