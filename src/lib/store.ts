import { StoreSchema } from "@/types";

export const useStore = () => {
  const get = async <K extends keyof StoreSchema>(
    key: K
  ): Promise<StoreSchema[K] | null> => {
    console.log("🔍 Store: Attempting to get value for key:", key);
    try {
      if (!window.electron?.ipc) {
        console.warn("⚠️ Store: Electron API not available");
        return null;
      }
      const value = await window.electron.ipc.invoke("store-get", key);
      // console.log("✅ Store: Got value for key:", key, "Value:", value);
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
    console.log(
      "💾 Store: Attempting to set value for key:",
      key,
      "Value:",
      value
    );
    try {
      if (!window.electron?.ipc) {
        console.warn("⚠️ Store: Electron API not available");
        return;
      }
      await window.electron.ipc.invoke("store-set", key, value);
      console.log("✅ Store: Successfully set value for key:", key);
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
    console.log("🗑️ Store: Attempting to clear store");
    try {
      if (!window.electron?.ipc) {
        console.warn("⚠️ Store: Electron API not available");
        return;
      }
      await window.electron.ipc.invoke("store-clear");
      console.log("✅ Store: Successfully cleared store");
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
