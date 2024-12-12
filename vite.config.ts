import fs from "node:fs";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import pkg from "./package.json";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isServe = command === "serve";
  const isBuild = command === "build";
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG;

  return {
    plugins: [
      vue(),
      electron([
        {
          // Main process entry file
          entry: "electron/main/index.ts",
          vite: {
            build: {
              outDir: "dist-electron/main",
            },
          },
        },
        {
          entry: "electron/preload/index.ts",
          vite: {
            build: {
              outDir: "dist-electron/preload",
            },
          },
        },
      ]),
      renderer({
        nodeIntegration: true,
      }),
    ],
    server:
      process.env.VSCODE_DEBUG &&
      (() => {
        const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL);
        return {
          host: url.hostname,
          port: +url.port,
        };
      })(),
    clearScreen: false,
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    base: process.env.ELECTRON_RENDERER_URL ? "./" : undefined,
  };
});
