(() => {
  if (window.__zenPaletteContent) return;
  window.__zenPaletteContent = true;

  // The host never blocks the page: only the palette panel itself takes clicks.
  const host = document.createElement('zen-palette-root');
  for (const [k, v] of Object.entries({ position: 'fixed', inset: '0', 'z-index': '2147483647', 'pointer-events': 'none', display: 'block' })) {
    host.style.setProperty(k, v, 'important');
  }

  const ui = window.__zenPaletteUI.mount(host, {
    mode: 'overlay',
    onShow: () => {
      if (!host.isConnected) document.documentElement.appendChild(host);
    },
  });

  document.documentElement.appendChild(host);

  browser.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'toggle') {
      ui.toggle();
      return Promise.resolve(true);
    }
  });

  ui.open();
})();
