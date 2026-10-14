(() => {
  if (window.__zenPaletteContent) return;
  window.__zenPaletteContent = true;

  const host = document.createElement('zen-palette-root');
  const hide = () => host.style.setProperty('display', 'none', 'important');
  host.style.setProperty('position', 'fixed', 'important');
  host.style.setProperty('inset', '0', 'important');
  host.style.setProperty('z-index', '2147483647', 'important');
  hide();

  const ui = window.__zenPaletteUI.mount(host, {
    mode: 'overlay',
    onShow: () => {
      if (!host.isConnected) document.documentElement.appendChild(host);
      host.style.setProperty('display', 'block', 'important');
    },
    onClose: hide,
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
