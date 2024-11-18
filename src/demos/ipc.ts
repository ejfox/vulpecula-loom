if (window.electron?.ipcRenderer) {
  window.electron.ipcRenderer.on('main-process-message', (...args) => {
    console.log('[Receive Main-process message]:', ...args)
  })
}
