import type { StoreSchema } from "../../electron/main/store";

function checkElectron() {
  if (!window.electron?.store) {
    throw new Error("Electron store API not available");
  }
}

export function useStore() {
  async function get<K extends keyof StoreSchema>(
    key: K
  ): Promise<StoreSchema[K]> {
    checkElectron();
    return window.electron.store.get(key);
  }

  async function set<K extends keyof StoreSchema>(
    key: K,
    value: StoreSchema[K]
  ): Promise<boolean> {
    checkElectron();
    return window.electron.store.set(key, value);
  }

  async function clear(): Promise<boolean> {
    checkElectron();
    return window.electron.store.clear();
  }

  return {
    get,
    set,
    clear,
  };
}
