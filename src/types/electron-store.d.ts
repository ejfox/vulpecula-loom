declare module "electron-store" {
  class Store<T extends Record<string, any>> {
    constructor(options?: {
      defaults?: Partial<T>;
      name?: string;
      cwd?: string;
      encryptionKey?: string | Buffer;
      fileExtension?: string;
      clearInvalidConfig?: boolean;
      serialize?: (value: T) => string;
      deserialize?: (value: string) => T;
    });

    // Store is also an event emitter
    on(eventName: string, callback: (...args: any[]) => void): this;
    off(eventName: string, callback: (...args: any[]) => void): this;

    // Main methods
    get<K extends keyof T>(key: K): T[K];
    set<K extends keyof T>(key: K, value: T[K]): void;
    has(key: keyof T): boolean;
    reset(...keys: Array<keyof T>): void;
    delete(key: keyof T): void;
    clear(): void;
    onDidChange<K extends keyof T>(
      key: K,
      callback: (newValue: T[K], oldValue: T[K]) => void
    ): () => void;
    size: number;
    store: T;
    path: string;
  }

  export = Store;
}
