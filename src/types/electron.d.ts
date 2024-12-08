import { ElectronAPI } from "@electron-toolkit/preload";

interface IpcRenderer {
  invoke(channel: string, ...args: any[]): Promise<any>;
  on(channel: string, func: (...args: any[]) => void): void;
  removeListener(channel: string, func: (...args: any[]) => void): void;
}

interface Shell {
  openExternal(url: string): Promise<void>;
}

interface Electron {
  ipcRenderer: IpcRenderer;
  shell: Shell;
}

declare global {
  interface Window {
    electron: Electron;
  }
}

interface ElectronAPI {
  ipcRenderer: IpcRenderer;
}

declare interface Window {
  electron: ElectronAPI;
}

declare module "electron" {
  import { IpcMain, Dialog, IpcMainInvokeEvent } from "electron";
  export { IpcMain, Dialog, IpcMainInvokeEvent };
  export const ipcMain: IpcMain;
  export const dialog: Dialog;
}

export {};
