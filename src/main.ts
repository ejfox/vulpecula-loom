/// <reference path="./types/electron.d.ts" />

import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import "./main.css";

const app = createApp(App);
app.mount("#app");
