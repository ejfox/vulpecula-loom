/// <reference path="./types/electron.d.ts" />

import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import "./main.css";

// Preload Monaspace font for all numbers and metrics
function preloadFont(url: string) {
  const link = document.createElement("link");
  link.href = url;
  link.rel = "preload";
  link.as = "font";
  link.type = "font/woff";
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

// Preload Monaspace font variants
preloadFont(
  "https://cdn.jsdelivr.net/gh/githubnext/monaspace@v1.000/fonts/webfonts/MonaspaceNeon-Regular.woff"
);
preloadFont(
  "https://cdn.jsdelivr.net/gh/githubnext/monaspace@v1.000/fonts/webfonts/MonaspaceNeon-Bold.woff"
);

const app = createApp(App);
app.mount("#app");
