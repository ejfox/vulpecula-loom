import fs from "node:fs";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import pkg from "./package.json";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        // Main process entry file
        entry: "electron/main/index.ts",
        onstart(options) {
          options.startup();
        },
        vite: {
          build: {
            outDir: "dist-electron/main",
            rollupOptions: {
              output: {
                entryFileNames: "index.js",
              },
            },
          },
        },
      },
      {
        entry: "electron/preload/index.ts",
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: "dist-electron/preload",
            rollupOptions: {
              output: {
                entryFileNames: "index.js",
              },
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  server: process.env.VSCODE_DEBUG
    ? {
        host: new URL(pkg.debug.env.VITE_DEV_SERVER_URL).hostname,
        port: Number(new URL(pkg.debug.env.VITE_DEV_SERVER_URL).port),
      }
    : undefined,
  clearScreen: false,
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  base: process.env.ELECTRON_RENDERER_URL ? "./" : undefined,
});
