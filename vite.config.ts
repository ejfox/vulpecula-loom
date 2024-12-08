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
          // Main-Process entry file of the Electron App.
          entry: "electron/main/index.ts",
          onstart({ startup }) {
            if (process.env.VSCODE_DEBUG) {
              console.log("[startup] Electron App");
            } else {
              startup();
            }
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: "dist-electron/main",
              rollupOptions: {
                external: Object.keys(
                  "dependencies" in pkg ? pkg.dependencies : {}
                ),
                preserveEntrySignatures: "strict",
                input: {
                  index: resolve(__dirname, "electron/main/index.ts"),
                },
              },
            },
          },
        },
        {
          entry: "electron/preload/index.ts",
          onstart({ reload }) {
            reload();
          },
          vite: {
            build: {
              sourcemap: sourcemap ? "inline" : undefined,
              minify: isBuild,
              outDir: "dist-electron/preload",
              rollupOptions: {
                external: Object.keys(
                  "dependencies" in pkg ? pkg.dependencies : {}
                ),
                preserveEntrySignatures: "strict",
                input: {
                  index: resolve(__dirname, "electron/preload/index.ts"),
                },
              },
              lib: {
                entry: "electron/preload/index.ts",
                formats: ["cjs"],
                fileName: () => "index.js",
              },
            },
          },
        },
      ]),
      renderer(),
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
    base: process.env.ELECTRON == "true" ? "./" : ".",
  };
});
