import { StoreSchema } from "@/types";

export const useStore = () => {
  const get = async <K extends keyof StoreSchema>(
    key: K
  ): Promise<StoreSchema[K] | null> => {
    try {
      if (!window.electron?.ipc) {
        console.warn("⚠️ Store: Electron API not available");
        return null;
      }
      const value = await window.electron.ipc.invoke("store-get", key);
      return value as StoreSchema[K] | null;
    } catch (err) {
      console.error(
        "❌ Store: Failed to get value for key:",
        key,
        "Error:",
        err
      );
      return null;
    }
  };

  const set = async <K extends keyof StoreSchema>(
    key: K,
    value: StoreSchema[K]
  ): Promise<void> => {
    try {
      if (!window.electron?.ipc) {
        console.warn("⚠️ Store: Electron API not available");
        return;
      }
      await window.electron.ipc.invoke("store-set", key, value);
    } catch (err) {
      console.error(
        "❌ Store: Failed to set value for key:",
        key,
        "Error:",
        err
      );
    }
  };

  const clear = async (): Promise<void> => {
    try {
      if (!window.electron?.ipc) {
        console.warn("⚠️ Store: Electron API not available");
        return;
      }
      await window.electron.ipc.invoke("store-clear");
    } catch (err) {
      console.error("❌ Store: Failed to clear store:", err);
    }
  };

  return {
    get,
    set,
    clear,
  };
};

export default useStore;
