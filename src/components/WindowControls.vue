<script setup lang="ts">
const isMac = process.platform === 'darwin'

const minimize = () => window.electron?.ipc.invoke('window-minimize')
const maximize = () => window.electron?.ipc.invoke('window-maximize')
const close = () => window.electron?.ipc.invoke('window-close')
</script>

<template>
  <div class="window-controls" :class="{ 'is-mac': isMac }">
    <!-- macOS style -->
    <template v-if="isMac">
      <button @click="close" class="control close" aria-label="Close">
        <svg viewBox="0 0 10 10">
          <path d="M5,5 L9,1 L5,5 L9,9 L5,5 L1,9 L5,5 L1,1 L5,5 Z" />
        </svg>
      </button>
      <button @click="minimize" class="control minimize" aria-label="Minimize">
        <svg viewBox="0 0 10 10">
          <path d="M1,5 L9,5" />
        </svg>
      </button>
      <button @click="maximize" class="control maximize" aria-label="Maximize">
        <svg viewBox="0 0 10 10">
          <path d="M1,1 L9,1 L9,9 L1,9 L1,1" />
        </svg>
      </button>
    </template>

    <!-- Windows style -->
    <template v-else>
      <button @click="minimize" class="control minimize" aria-label="Minimize">
        <svg viewBox="0 0 10 10">
          <path d="M1,5 L9,5" />
        </svg>
      </button>
      <button @click="maximize" class="control maximize" aria-label="Maximize">
        <svg viewBox="0 0 10 10">
          <path d="M1,1 L9,1 L9,9 L1,9 L1,1" />
        </svg>
      </button>
      <button @click="close" class="control close" aria-label="Close">
        <svg viewBox="0 0 10 10">
          <path d="M1,1 L9,9 M9,1 L1,9" />
        </svg>
      </button>
    </template>
  </div>
</template>

<style scoped>
.window-controls {
  display: flex;
  gap: 8px;
  padding: 8px;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.window-controls.is-mac {
  gap: 4px;
  padding: 8px 12px;
}

.control {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  opacity: 0.8;
}

/* macOS style */
.is-mac .control {
  width: 12px;
  height: 12px;
}

.is-mac .control svg {
  width: 8px;
  height: 8px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.is-mac .control:hover svg {
  opacity: 0.5;
}

.is-mac .close {
  background: rgb(255, 95, 87);
}

.is-mac .minimize {
  background: rgb(255, 189, 46);
}

.is-mac .maximize {
  background: rgb(39, 201, 63);
}

/* Windows style */
:not(.is-mac) .control {
  background: transparent;
  width: 30px;
  height: 30px;
  border-radius: 4px;
}

:not(.is-mac) .control svg {
  width: 10px;
  height: 10px;
  stroke: currentColor;
  stroke-width: 1;
  fill: none;
}

:not(.is-mac) .control:hover {
  background: rgb(229 231 235);
}

:root.dark :not(.is-mac) .control:hover {
  background: rgb(55 65 81);
}

:not(.is-mac) .close:hover {
  background: rgb(239 68 68);
  color: white;
}

/* Dark mode adjustments */
:root.dark .control svg {
  color: rgb(209 213 219);
}
</style>