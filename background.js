const ACTIONS = [
  { id: 'new-tab', title: 'New Tab', kw: 'open create', hint: 'Ctrl T', icon: 'plus' },
  { id: 'new-window', title: 'New Window', kw: 'open', hint: 'Ctrl N', icon: 'plus' },
  { id: 'new-private', title: 'New Private Window', kw: 'incognito', hint: 'Ctrl Shift P', icon: 'plus' },
  { id: 'reopen', title: 'Reopen Closed Tab', kw: 'undo restore', hint: 'Ctrl Shift T', icon: 'undo' },
  { id: 'close', title: 'Close Tab', kw: 'remove', hint: 'Ctrl W', icon: 'x' },
  { id: 'close-others', title: 'Close Other Tabs', kw: 'unpinned', icon: 'x' },
  { id: 'clear', title: 'Clear Unpinned Tabs', kw: 'close all', icon: 'x' },
  { id: 'close-dupes', title: 'Close Duplicate Tabs', kw: 'dedupe', icon: 'x' },
  { id: 'pin', title: 'Pin / Unpin Tab', kw: 'essential', icon: 'pin' },
  { id: 'duplicate', title: 'Duplicate Tab', kw: 'copy clone', icon: 'copy' },
  { id: 'mute', title: 'Mute / Unmute Tab', kw: 'sound audio', icon: 'speaker' },
  { id: 'reload', title: 'Reload Tab', kw: 'refresh', hint: 'Ctrl R', icon: 'reload' },
  { id: 'hard-reload', title: 'Hard Reload (bypass cache)', kw: 'refresh', hint: 'Ctrl Shift R', icon: 'reload' },
  { id: 'move-window', title: 'Move Tab to New Window', kw: 'detach', icon: 'window' },
  { id: 'bookmark', title: 'Bookmark This Page', kw: 'save star', hint: 'Ctrl D', icon: 'star' },
  { id: 'copy-url', title: 'Copy URL', kw: 'link', icon: 'copy' },
  { id: 'copy-md', title: 'Copy as Markdown Link', kw: 'title', icon: 'copy' },
  { id: 'reader', title: 'Toggle Reader View', kw: 'read article', icon: 'book' },
  { id: 'zoom-in', title: 'Zoom In', kw: 'bigger', hint: 'Ctrl +', icon: 'zoom' },
  { id: 'zoom-out', title: 'Zoom Out', kw: 'smaller', hint: 'Ctrl −', icon: 'zoom' },
  { id: 'zoom-reset', title: 'Reset Zoom', kw: 'actual size', hint: 'Ctrl 0', icon: 'zoom' },
  { id: 'unload', title: 'Unload Other Tabs (free memory)', kw: 'discard sleep', icon: 'moon' },
];

let ctx = null;
let paletteWin = null;

async function toggle() {
  if (paletteWin !== null) {
    closePaletteWindow();
    return;
  }
  const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab) return;
  ctx = { tabId: tab.id, windowId: tab.windowId };

  try {
    await browser.tabs.sendMessage(tab.id, { type: 'toggle' });
    return;
  } catch {}
  try {
    await browser.tabs.executeScript(tab.id, { file: 'ui.js', runAt: 'document_start' });
    await browser.tabs.executeScript(tab.id, { file: 'content.js', runAt: 'document_start' });
    return;
  } catch {}
  // Pages extensions can't draw on (about:, new tab, addons site): fall back to a small centered window.
  openPaletteWindow(tab.windowId);
}

async function openPaletteWindow(windowId) {
  const w = await browser.windows.get(windowId);
  const width = 720;
  const height = 520;
  const win = await browser.windows.create({
    url: 'palette.html',
    type: 'popup',
    width,
    height,
    left: Math.round(w.left + (w.width - width) / 2),
    top: Math.round(w.top + (w.height - height) / 3),
  });
  paletteWin = win.id;
}

function closePaletteWindow() {
  if (paletteWin === null) return;
  browser.windows.remove(paletteWin).catch(() => {});
  paletteWin = null;
}

browser.windows.onRemoved.addListener((id) => {
  if (id === paletteWin) paletteWin = null;
});

browser.windows.onFocusChanged.addListener((id) => {
  if (paletteWin !== null && id !== paletteWin) closePaletteWindow();
});

browser.commands.onCommand.addListener((name) => {
  if (name === 'toggle-palette') toggle();
});

browser.browserAction.onClicked.addListener(toggle);

async function ensureCtx() {
  if (ctx) {
    try {
      await browser.tabs.get(ctx.tabId);
      return ctx;
    } catch {}
  }
  const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true, windowType: 'normal' });
  ctx = tab ? { tabId: tab.id, windowId: tab.windowId } : null;
  return ctx;
}

async function getState() {
  await ensureCtx();
  const [tabs, closed] = await Promise.all([
    browser.tabs.query({ hidden: false, windowType: 'normal' }),
    browser.sessions.getRecentlyClosed({ maxResults: 15 }).catch(() => []),
  ]);
  return {
    currentId: ctx?.tabId,
    currentWindowId: ctx?.windowId,
    actions: ACTIONS,
    tabs: tabs.map((t) => ({
      id: t.id,
      windowId: t.windowId,
      index: t.index,
      title: t.title,
      url: t.url,
      favIconUrl: t.favIconUrl,
      pinned: t.pinned,
      audible: t.audible,
      muted: t.mutedInfo?.muted,
      discarded: t.discarded,
      lastAccessed: t.lastAccessed || 0,
    })),
    closed: closed
      .filter((s) => s.tab && !s.tab.url.startsWith('moz-extension:'))
      .map((s) => ({ sessionId: s.tab.sessionId, title: s.tab.title, url: s.tab.url, favIconUrl: s.tab.favIconUrl })),
  };
}

const usable = (url) => url && !url.startsWith('place:') && !url.startsWith('javascript:');

async function search(q, mode) {
  let bookmarks = [];
  let history = [];
  if (q) {
    [bookmarks, history] = await Promise.all([
      browser.bookmarks.search(q).catch(() => []),
      browser.history.search({ text: q, maxResults: 40, startTime: 0 }).catch(() => []),
    ]);
  } else if (mode === 'bookmarks') {
    bookmarks = await browser.bookmarks.getRecent(40);
  } else if (mode === 'history') {
    history = await browser.history.search({ text: '', maxResults: 40 });
  }
  return {
    mode,
    bookmarks: bookmarks.filter((b) => usable(b.url)).slice(0, 40).map((b) => ({ title: b.title, url: b.url })),
    history: history.filter((h) => usable(h.url)).map((h) => ({ title: h.title, url: h.url, visits: h.visitCount || 0 })),
  };
}

function normalizeUrl(u) {
  return /^[a-z][\w+.-]*:/i.test(u) ? u : `https://${u}`;
}

async function openItem(item, alt) {
  closePaletteWindow();
  await ensureCtx();
  switch (item.kind) {
    case 'tab':
      await browser.tabs.update(item.tabId, { active: true });
      await browser.windows.update(item.windowId, { focused: true });
      break;
    case 'bookmark':
    case 'history':
    case 'url': {
      const url = normalizeUrl(item.url);
      if (alt && ctx) await browser.tabs.update(ctx.tabId, { url });
      else await browser.tabs.create({ url, windowId: ctx?.windowId });
      break;
    }
    case 'closed':
      await browser.sessions.restore(item.sessionId);
      break;
    case 'web':
      if (alt && ctx) await browser.search.search({ query: item.query, tabId: ctx.tabId });
      else await browser.search.search({ query: item.query, disposition: 'NEW_TAB' });
      break;
    case 'action':
      await runAction(item.id);
      break;
  }
}

async function closeTabs(ids, windowId) {
  if (!ids.length) return;
  const remaining = await browser.tabs.query({ windowId });
  if (remaining.length <= ids.length) await browser.tabs.create({ windowId });
  await browser.tabs.remove(ids);
}

async function runAction(id) {
  const t = await browser.tabs.get(ctx.tabId);
  const visible = () => browser.tabs.query({ windowId: t.windowId, hidden: false });
  switch (id) {
    case 'new-tab': return browser.tabs.create({ windowId: t.windowId });
    case 'new-window': return browser.windows.create({});
    case 'new-private': return browser.windows.create({ incognito: true });
    case 'reopen': return browser.sessions.restore();
    case 'close': return closeTabs([t.id], t.windowId);
    case 'close-others': {
      const tabs = await visible();
      return closeTabs(tabs.filter((x) => !x.pinned && x.id !== t.id).map((x) => x.id), t.windowId);
    }
    case 'clear': {
      const tabs = await visible();
      return closeTabs(tabs.filter((x) => !x.pinned).map((x) => x.id), t.windowId);
    }
    case 'close-dupes': {
      const tabs = (await visible()).sort((a, b) => (b.pinned - a.pinned) || (b.active - a.active));
      const seen = new Set();
      const dupes = [];
      for (const x of tabs) {
        if (seen.has(x.url)) dupes.push(x.id);
        else seen.add(x.url);
      }
      return closeTabs(dupes, t.windowId);
    }
    case 'pin': return browser.tabs.update(t.id, { pinned: !t.pinned });
    case 'duplicate': return browser.tabs.duplicate(t.id);
    case 'mute': return browser.tabs.update(t.id, { muted: !t.mutedInfo?.muted });
    case 'reload': return browser.tabs.reload(t.id);
    case 'hard-reload': return browser.tabs.reload(t.id, { bypassCache: true });
    case 'move-window': return browser.windows.create({ tabId: t.id });
    case 'bookmark': return browser.bookmarks.create({ title: t.title, url: t.url });
    case 'copy-url': return navigator.clipboard.writeText(t.url);
    case 'copy-md': return navigator.clipboard.writeText(`[${t.title}](${t.url})`);
    case 'reader': return browser.tabs.toggleReaderMode(t.id);
    case 'zoom-in': return browser.tabs.setZoom(t.id, Math.min(3, (await browser.tabs.getZoom(t.id)) + 0.1));
    case 'zoom-out': return browser.tabs.setZoom(t.id, Math.max(0.3, (await browser.tabs.getZoom(t.id)) - 0.1));
    case 'zoom-reset': return browser.tabs.setZoom(t.id, 0);
    case 'unload': {
      const tabs = await browser.tabs.query({ windowId: t.windowId, active: false, discarded: false });
      return browser.tabs.discard(tabs.map((x) => x.id));
    }
  }
}

async function tabOp(op, tabId) {
  const t = await browser.tabs.get(tabId);
  if (op === 'close') await closeTabs([tabId], t.windowId);
  if (op === 'pin') await browser.tabs.update(tabId, { pinned: !t.pinned });
  if (op === 'mute') await browser.tabs.update(tabId, { muted: !t.mutedInfo?.muted });
  if (op === 'unload' && !t.active) await browser.tabs.discard(tabId);
  return getState();
}

browser.runtime.onMessage.addListener((msg) => {
  switch (msg?.type) {
    case 'state': return getState();
    case 'search': return search(msg.q, msg.mode);
    case 'open': return openItem(msg.item, msg.alt).catch((e) => console.warn('Zen Palette:', e));
    case 'tabOp': return tabOp(msg.op, msg.tabId);
    case 'close-ui': closePaletteWindow(); return Promise.resolve();
  }
});
