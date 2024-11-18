import { createApp } from 'vue'
import App from './App.vue'

import './style.css'
import './main.css';

createApp(App)
  .mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
