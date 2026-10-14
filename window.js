const ui = window.__zenPaletteUI.mount(document.getElementById('root'), {
  mode: 'window',
  onClose: () => {
    browser.runtime.sendMessage({ type: 'close-ui' });
    window.close();
  },
});
ui.open();
