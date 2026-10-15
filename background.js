const LOCAL_RE = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$|\.localhost$|\.test$/;
const TRACKING_RE = /^(utm_\w+|fbclid|gclid|dclid|gbraid|wbraid|msclkid|yclid|mc_cid|mc_eid|igshid|_hsenc|_hsmi|mkt_tok|ref_src|vero_id|oly_\w+|si|spm)$/i;
const DEV_PORTS = [3000, 3001, 3002, 3003, 4000, 4173, 4200, 4321, 5000, 5173, 5174, 5500, 6006, 8000, 8080, 8081, 8787, 8888, 9000, 1234];
const GH_RESERVED = new Set(['settings', 'orgs', 'marketplace', 'notifications', 'explore', 'topics', 'search', 'login', 'sponsors', 'features', 'pulls', 'issues', 'new', 'codespaces', 'apps', 'about', 'pricing']);

let ctx = null;
let paletteWin = null;
let usage = {};
let density = 'compact';

browser.storage.local.get(['usage', 'density']).then((r) => {
  usage = r.usage || {};
  density = r.density || 'compact';
});
browser.storage.onChanged.addListener((changes) => {
  if (changes.usage) usage = changes.usage.newValue || {};
  if (changes.density) density = changes.density.newValue || 'compact';
});

// ---------- helpers ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function info(tab) {
  let u = null;
  try {
    u = new URL(tab.url);
  } catch {}
  const http = !!u && /^https?:$/.test(u.protocol);
  const local = http && LOCAL_RE.test(u.hostname);
  const m = http && u.hostname === 'github.com' ? u.pathname.match(/^\/([^/]+)\/([^/]+)/) : null;
  const gh = m && !GH_RESERVED.has(m[1]) ? { owner: m[1], repo: m[2].replace(/\.git$/, '') } : null;
  return { tab, u, http, local, web: http && !local, gh };
}

const pathOf = (i) => i.u.pathname + i.u.search + i.u.hash;
const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

async function copy(text, toast = 'Copied') {
  await navigator.clipboard.writeText(text);
  return { toast };
}

async function inPage(tabId, fn, arg) {
  const [r] = await browser.tabs.executeScript(tabId, { code: `(${fn})(${JSON.stringify(arg ?? null)})` });
  return r;
}

function visible(i) {
  return browser.tabs.query({ windowId: i.tab.windowId, hidden: false });
}

async function closeTabs(ids, windowId) {
  if (!ids.length) return { toast: 'Nothing to close' };
  const remaining = await browser.tabs.query({ windowId });
  if (remaining.length <= ids.length) await browser.tabs.create({ windowId });
  await browser.tabs.remove(ids);
  return { toast: ids.length === 1 ? 'Closed 1 tab' : `Closed ${ids.length} tabs` };
}

function openUrl(i, url, here) {
  if (here) return browser.tabs.update(i.tab.id, { url });
  return browser.tabs.create({ url, windowId: i.tab.windowId, index: i.tab.index + 1 });
}

function setUrl(i, mutate) {
  const u = new URL(i.tab.url);
  mutate(u);
  return browser.tabs.update(i.tab.id, { url: u.href });
}

async function toggleBookmark(tab) {
  const found = await browser.bookmarks.search({ url: tab.url }).catch(() => []);
  if (found.length) {
    await Promise.all(found.map((b) => browser.bookmarks.remove(b.id)));
    return { toast: 'Bookmark removed' };
  }
  await browser.bookmarks.create({ title: tab.title, url: tab.url });
  return { toast: 'Bookmarked' };
}

async function screenshot(i, full) {
  await sleep(160); // let the palette fade out first
  let rect;
  if (full) {
    const s = await inPage(i.tab.id, () => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
    rect = { x: 0, y: 0, width: s.w, height: Math.min(s.h, 16000) };
  }
  const dataUrl = await browser.tabs.captureTab(i.tab.id, { format: 'png', ...(rect ? { rect } : {}) });
  const buf = await (await fetch(dataUrl)).arrayBuffer();
  await browser.clipboard.setImageData(buf, 'png');
  return { toast: full ? 'Full-page screenshot copied' : 'Screenshot copied' };
}

async function jsonClipboard(minify) {
  const text = await navigator.clipboard.readText();
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return { toast: 'Clipboard is not valid JSON' };
  }
  await navigator.clipboard.writeText(minify ? JSON.stringify(value) : JSON.stringify(value, null, 2));
  return { toast: minify ? 'Minified JSON copied' : 'Formatted JSON copied' };
}

async function toggleStyle(i, id, css, on, off) {
  const enabled = await inPage(
    i.tab.id,
    ([id, css]) => {
      const existing = document.getElementById(id);
      if (existing) {
        existing.remove();
        return false;
      }
      const s = document.createElement('style');
      s.id = id;
      s.textContent = css;
      document.documentElement.appendChild(s);
      return true;
    },
    [id, css],
  );
  return { toast: enabled ? on : off };
}

// ---------- functions that run inside the page (serialized, no outer scope) ----------

function pageInfo() {
  const w = window.wrappedJSObject || window;
  const q = (s) => document.querySelector(s);
  const found = [];
  if (q('#__NEXT_DATA__') || q('script[src*="/_next/"]') || w.next) found.push('Next.js');
  if (w.__NUXT__ || q('#__nuxt')) found.push('Nuxt');
  if (w.__remixContext) found.push('Remix');
  if (q('#___gatsby')) found.push('Gatsby');
  if (q('astro-island, [data-astro-cid]')) found.push('Astro');
  const ng = q('[ng-version]');
  if (ng) found.push(`Angular ${ng.getAttribute('ng-version')}`);
  if (w.__VUE__ || q('[data-v-app]') || w.Vue) found.push('Vue');
  if (q('[class*="svelte-"]')) found.push('Svelte');
  const reactish = () => {
    if (w.React || q('[data-reactroot]')) return true;
    const els = document.querySelectorAll('body, body > *, #root, #app, #__next');
    for (const el of els) {
      const raw = el.wrappedJSObject || el;
      if (Object.keys(raw).some((k) => k.startsWith('__react') || k.startsWith('_reactRoot'))) return true;
    }
    return false;
  };
  if (!found.some((f) => ['Next.js', 'Remix', 'Gatsby'].includes(f)) && reactish()) found.push('React');
  if (w.jQuery?.fn?.jquery) found.push(`jQuery ${w.jQuery.fn.jquery}`);
  if (q('script[src*="/@vite/client"]')) found.push('Vite dev server');
  const gen = q('meta[name="generator"]')?.content;
  if (gen) found.push(gen);

  const nav = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource');
  const bytes = res.reduce((s, r) => s + (r.transferSize || 0), nav?.transferSize || 0);
  const ms = (v) => (v ? `${Math.round(v)} ms` : '—');
  const meta = (n) => q(`meta[name="${n}"]`)?.content || '—';
  return [
    ['Framework', found.join(', ') || 'Not detected'],
    ['Load time', ms(nav?.loadEventEnd || nav?.duration)],
    ['DOM ready', ms(nav?.domContentLoadedEventEnd)],
    ['Server response (TTFB)', ms(nav && nav.responseStart - nav.requestStart)],
    ['Requests', String(res.length + 1)],
    ['Transferred', bytes ? `${(bytes / 1024).toFixed(1)} KB` : '— (cached or cross-origin)'],
    ['DOM elements', String(document.getElementsByTagName('*').length)],
    ['Title', document.title || '—'],
    ['Description', meta('description')],
    ['Canonical URL', q('link[rel="canonical"]')?.href || '—'],
    ['Language', document.documentElement.lang || '—'],
    ['Viewport', meta('viewport')],
    ['Images', String(document.images.length)],
    ['Links', String(document.links.length)],
    ['Scripts', String(document.scripts.length)],
  ];
}

function socialTags() {
  const out = [];
  for (const m of document.querySelectorAll('meta[property^="og:"], meta[name^="og:"], meta[name^="twitter:"], meta[property^="twitter:"]')) {
    out.push([m.getAttribute('property') || m.getAttribute('name'), m.content || '']);
  }
  return out;
}

function readLocalStorage() {
  const out = [];
  for (let n = 0; n < localStorage.length; n++) {
    const k = localStorage.key(n);
    out.push([k, localStorage.getItem(k) ?? '']);
  }
  return out;
}

// ---------- actions ----------

const W = {
  http: (i) => i.http,
  web: (i) => i.web,
  local: (i) => i.local,
  gh: (i) => !!i.gh,
  params: (i) => i.http && i.u.search.length > 1,
  sub: (i) => i.http && i.u.pathname !== '/',
};

const ext = (base) => (i) => openUrl(i, base + encodeURIComponent(i.tab.url), false);
const gh = (suffix) => (i) => openUrl(i, `https://github.com/${i.gh.owner}/${i.gh.repo}${suffix}`, true);

const ACTIONS = [
  // Tab
  { id: 'new-tab', title: 'New Tab', group: 'Tab', icon: 'plus', hint: 'Ctrl T', kw: 'open create', run: (i) => browser.tabs.create({ windowId: i.tab.windowId }) },
  { id: 'reopen', title: 'Reopen Closed Tab', group: 'Tab', icon: 'undo', hint: 'Ctrl Shift T', kw: 'undo restore', run: () => browser.sessions.restore() },
  { id: 'close', title: 'Close Tab', group: 'Tab', icon: 'x', hint: 'Ctrl W', run: (i) => closeTabs([i.tab.id], i.tab.windowId) },
  { id: 'close-others', title: 'Close Other Tabs', group: 'Tab', icon: 'x', kw: 'unpinned', run: async (i) => closeTabs((await visible(i)).filter((x) => !x.pinned && x.id !== i.tab.id).map((x) => x.id), i.tab.windowId) },
  { id: 'close-below', title: 'Close Tabs Below', group: 'Tab', icon: 'x', kw: 'right after', run: async (i) => closeTabs((await visible(i)).filter((x) => !x.pinned && x.index > i.tab.index).map((x) => x.id), i.tab.windowId) },
  { id: 'close-above', title: 'Close Tabs Above', group: 'Tab', icon: 'x', kw: 'left before', run: async (i) => closeTabs((await visible(i)).filter((x) => !x.pinned && x.index < i.tab.index).map((x) => x.id), i.tab.windowId) },
  { id: 'close-site', title: 'Close All Tabs from This Site', group: 'Tab', icon: 'x', kw: 'domain host', when: W.http, run: async (i) => closeTabs((await visible(i)).filter((x) => !x.pinned && hostOf(x.url) === hostOf(i.tab.url)).map((x) => x.id), i.tab.windowId) },
  { id: 'clear', title: 'Clear Unpinned Tabs', group: 'Tab', icon: 'x', kw: 'close all', run: async (i) => closeTabs((await visible(i)).filter((x) => !x.pinned).map((x) => x.id), i.tab.windowId) },
  {
    id: 'close-dupes', title: 'Close Duplicate Tabs', group: 'Tab', icon: 'x', kw: 'dedupe',
    run: async (i) => {
      const tabs = (await visible(i)).sort((a, b) => b.pinned - a.pinned || b.active - a.active);
      const seen = new Set();
      const dupes = [];
      for (const x of tabs) {
        if (seen.has(x.url)) dupes.push(x.id);
        else seen.add(x.url);
      }
      return closeTabs(dupes, i.tab.windowId);
    },
  },
  { id: 'pin', title: 'Pin / Unpin Tab', group: 'Tab', icon: 'pin', kw: 'essential', run: (i) => browser.tabs.update(i.tab.id, { pinned: !i.tab.pinned }) },
  { id: 'duplicate', title: 'Duplicate Tab', group: 'Tab', icon: 'copy', kw: 'clone', run: (i) => browser.tabs.duplicate(i.tab.id) },
  { id: 'mute', title: 'Mute / Unmute Tab', group: 'Tab', icon: 'speaker', kw: 'sound audio', run: (i) => browser.tabs.update(i.tab.id, { muted: !i.tab.mutedInfo?.muted }) },
  {
    id: 'mute-others', title: 'Mute All Other Tabs', group: 'Tab', icon: 'muted', kw: 'sound audio silence',
    run: async (i) => {
      const tabs = await browser.tabs.query({ audible: true });
      await Promise.all(tabs.filter((x) => x.id !== i.tab.id).map((x) => browser.tabs.update(x.id, { muted: true })));
      return { toast: `Muted ${tabs.filter((x) => x.id !== i.tab.id).length} tabs` };
    },
  },
  {
    id: 'unload-this', title: 'Unload This Tab', group: 'Tab', icon: 'moon', kw: 'discard sleep memory',
    run: async (i) => {
      const others = (await visible(i)).filter((x) => x.id !== i.tab.id).sort((a, b) => b.lastAccessed - a.lastAccessed);
      if (!others.length) return { toast: 'No other tab to switch to' };
      await browser.tabs.update(others[0].id, { active: true });
      await browser.tabs.discard(i.tab.id);
      return { toast: 'Tab unloaded' };
    },
  },
  {
    id: 'unload', title: 'Unload Other Tabs', group: 'Tab', icon: 'moon', kw: 'discard sleep memory free',
    run: async (i) => {
      const tabs = await browser.tabs.query({ windowId: i.tab.windowId, active: false, discarded: false });
      await browser.tabs.discard(tabs.map((x) => x.id));
      return { toast: `Unloaded ${tabs.length} tabs` };
    },
  },
  {
    id: 'move-top', title: 'Move Tab to Top', group: 'Tab', icon: 'up', kw: 'first start',
    run: async (i) => {
      const first = (await visible(i)).find((x) => !x.pinned);
      if (first) await browser.tabs.move(i.tab.id, { index: first.index });
    },
  },
  { id: 'move-bottom', title: 'Move Tab to Bottom', group: 'Tab', icon: 'down', kw: 'last end', run: (i) => browser.tabs.move(i.tab.id, { index: -1 }) },
  {
    id: 'sort-site', title: 'Sort Tabs by Site', group: 'Tab', icon: 'sort', kw: 'group domain order organize',
    run: async (i) => {
      const tabs = (await visible(i)).filter((x) => !x.pinned);
      if (tabs.length < 2) return;
      const start = Math.min(...tabs.map((x) => x.index));
      tabs.sort((a, b) => hostOf(a.url).localeCompare(hostOf(b.url)) || a.title.localeCompare(b.title));
      await browser.tabs.move(tabs.map((x) => x.id), { index: start });
      return { toast: `Sorted ${tabs.length} tabs` };
    },
  },
  { id: 'move-window', title: 'Move Tab to New Window', group: 'Tab', icon: 'window', kw: 'detach', run: (i) => browser.windows.create({ tabId: i.tab.id }) },

  // Page
  { id: 'reload', title: 'Reload Page', group: 'Page', icon: 'reload', hint: 'Ctrl R', kw: 'refresh', run: (i) => browser.tabs.reload(i.tab.id) },
  { id: 'hard-reload', title: 'Hard Reload (bypass cache)', group: 'Page', icon: 'reload', hint: 'Ctrl Shift R', kw: 'refresh cache', run: (i) => browser.tabs.reload(i.tab.id, { bypassCache: true }) },
  { id: 'bookmark', title: 'Bookmark / Unbookmark Page', group: 'Page', icon: 'star', hint: 'Ctrl D', kw: 'save star', when: W.http, run: (i) => toggleBookmark(i.tab) },
  { id: 'print', title: 'Print…', group: 'Page', icon: 'printer', hint: 'Ctrl P', run: () => browser.tabs.print() },
  { id: 'pdf', title: 'Save Page as PDF', group: 'Page', icon: 'file', kw: 'export download', run: () => browser.tabs.saveAsPDF({}) },
  { id: 'screenshot', title: 'Screenshot Visible Area', group: 'Page', icon: 'camera', kw: 'capture image clipboard', when: W.http, run: (i) => screenshot(i, false) },
  { id: 'screenshot-full', title: 'Screenshot Full Page', group: 'Page', icon: 'camera', kw: 'capture image clipboard whole', when: W.http, run: (i) => screenshot(i, true) },
  { id: 'view-source', title: 'View Page Source', group: 'Page', icon: 'code', hint: 'Ctrl U', kw: 'html', when: W.http, run: (i) => openUrl(i, `view-source:${i.tab.url}`, false) },
  { id: 'reader', title: 'Toggle Reader View', group: 'Page', icon: 'book', kw: 'read article', when: W.http, run: (i) => browser.tabs.toggleReaderMode(i.tab.id) },
  { id: 'translate', title: 'Translate Page', group: 'Page', icon: 'globe', kw: 'english language google', when: W.web, run: (i) => openUrl(i, `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(i.tab.url)}`, false) },
  { id: 'site-search', title: 'Search This Site', group: 'Page', icon: 'search', kw: 'google site:', when: W.web, stay: true, run: (i) => ({ fill: `g site:${i.u.hostname} ` }) },
  { id: 'zoom-in', title: 'Zoom In', group: 'Page', icon: 'zoom', hint: 'Ctrl +', kw: 'bigger', run: async (i) => browser.tabs.setZoom(i.tab.id, Math.min(3, (await browser.tabs.getZoom(i.tab.id)) + 0.1)) },
  { id: 'zoom-out', title: 'Zoom Out', group: 'Page', icon: 'zoom', hint: 'Ctrl −', kw: 'smaller', run: async (i) => browser.tabs.setZoom(i.tab.id, Math.max(0.3, (await browser.tabs.getZoom(i.tab.id)) - 0.1)) },
  { id: 'zoom-reset', title: 'Reset Zoom', group: 'Page', icon: 'zoom', hint: 'Ctrl 0', kw: 'actual size', run: (i) => browser.tabs.setZoom(i.tab.id, 0) },

  // Navigate
  { id: 'edit-url', title: 'Edit Current URL', group: 'Navigate', icon: 'edit', hint: 'Alt L', kw: 'address change', stay: true, run: () => ({}) },
  { id: 'back', title: 'Go Back', group: 'Navigate', icon: 'left', hint: 'Alt ←', kw: 'previous history', run: (i) => browser.tabs.goBack(i.tab.id) },
  { id: 'forward', title: 'Go Forward', group: 'Navigate', icon: 'right', hint: 'Alt →', kw: 'next history', run: (i) => browser.tabs.goForward(i.tab.id) },
  {
    id: 'up', title: 'Go Up One Level', group: 'Navigate', icon: 'up', kw: 'parent folder path', when: W.sub,
    run: (i) => setUrl(i, (u) => {
      u.pathname = u.pathname.replace(/\/[^/]*\/?$/, '/') || '/';
      u.search = '';
      u.hash = '';
    }),
  },
  { id: 'home', title: 'Go to Site Home', group: 'Navigate', icon: 'home', kw: 'root origin', when: W.sub, run: (i) => openUrl(i, `${i.u.origin}/`, true) },

  // Copy
  { id: 'copy-url', title: 'Copy URL', group: 'Copy', icon: 'link', hint: 'Alt C', kw: 'link address', run: (i) => copy(i.tab.url, 'URL copied') },
  { id: 'copy-title', title: 'Copy Page Title', group: 'Copy', icon: 'copy', kw: 'name', run: (i) => copy(i.tab.title, 'Title copied') },
  { id: 'copy-md', title: 'Copy as Markdown Link', group: 'Copy', icon: 'copy', kw: 'title link', run: (i) => copy(`[${i.tab.title}](${i.tab.url})`, 'Markdown link copied') },
  {
    id: 'copy-clean', title: 'Copy Clean URL (no tracking)', group: 'Copy', icon: 'link', kw: 'utm strip share', when: W.http,
    run: (i) => {
      const u = new URL(i.tab.url);
      for (const k of [...u.searchParams.keys()]) if (TRACKING_RE.test(k)) u.searchParams.delete(k);
      return copy(u.href, 'Clean URL copied');
    },
  },
  { id: 'copy-all-urls', title: 'Copy All Tab URLs', group: 'Copy', icon: 'copy', kw: 'list links export', run: async (i) => copy((await visible(i)).map((x) => x.url).join('\n'), 'All tab URLs copied') },

  // Window
  { id: 'new-window', title: 'New Window', group: 'Window', icon: 'window', hint: 'Ctrl N', kw: 'open', run: () => browser.windows.create({}) },
  { id: 'new-private', title: 'New Private Window', group: 'Window', icon: 'eye', hint: 'Ctrl Shift P', kw: 'incognito', run: () => browser.windows.create({ incognito: true }) },
  { id: 'open-private', title: 'Open Page in Private Window', group: 'Window', icon: 'eye', kw: 'incognito logged out', when: W.http, run: (i) => browser.windows.create({ incognito: true, url: i.tab.url }) },
  {
    id: 'merge-windows', title: 'Merge All Windows Here', group: 'Window', icon: 'layers', kw: 'combine gather',
    run: async (i) => {
      const wins = await browser.windows.getAll({ windowTypes: ['normal'], populate: true });
      let moved = 0;
      for (const w of wins) {
        if (w.id === i.tab.windowId || w.incognito !== i.tab.incognito) continue;
        for (const t of w.tabs) {
          try {
            await browser.tabs.move(t.id, { windowId: i.tab.windowId, index: -1 });
            moved++;
          } catch {}
        }
      }
      return { toast: `Moved ${moved} tabs here` };
    },
  },
  {
    id: 'bookmark-all', title: 'Bookmark All Tabs in a Folder', group: 'Window', icon: 'star', kw: 'save session',
    run: async (i) => {
      const tabs = (await visible(i)).filter((x) => /^https?:/.test(x.url));
      const folder = await browser.bookmarks.create({ title: `Tabs ${new Date().toLocaleString()}` });
      for (const t of tabs) await browser.bookmarks.create({ parentId: folder.id, title: t.title, url: t.url });
      return { toast: `Saved ${tabs.length} tabs to “${folder.title}”` };
    },
  },

  // Dev
  { id: 'dev-servers', title: 'Find Running Dev Servers', group: 'Dev', icon: 'server', kw: 'localhost ports scan', stay: true, run: async (i) => ({ view: await serversView(i, false) }) },
  { id: 'switch-port', title: 'Switch Port (same path)', group: 'Dev', icon: 'server', kw: 'localhost', when: W.local, stay: true, run: async (i) => ({ view: await serversView(i, true) }) },
  { id: 'switch-env', title: 'Switch Environment (same path)', group: 'Dev', icon: 'layers', kw: 'staging production prod localhost', when: W.http, stay: true, run: async (i) => ({ view: await envsView(i) }) },
  { id: 'env-settings', title: 'Edit Environments…', group: 'Dev', icon: 'edit', kw: 'settings staging production', run: () => browser.runtime.openOptionsPage() },
  { id: 'phone', title: 'Open in Phone-Size Window', group: 'Dev', icon: 'phone', kw: 'mobile responsive', when: W.http, run: (i) => browser.windows.create({ url: i.tab.url, type: 'popup', width: 390, height: 844 }) },
  { id: 'tablet', title: 'Open in Tablet-Size Window', group: 'Dev', icon: 'phone', kw: 'ipad responsive', when: W.http, run: (i) => browser.windows.create({ url: i.tab.url, type: 'popup', width: 768, height: 1024 }) },

  // Storage
  {
    id: 'clear-site-data', title: 'Clear Site Data & Reload', group: 'Storage', icon: 'trash', kw: 'cookies localstorage indexeddb service worker cache logout reset', when: W.http,
    run: async (i) => {
      const host = i.u.hostname;
      await browser.browsingData.remove({ hostnames: [host] }, { cookies: true, localStorage: true, indexedDB: true, serviceWorkers: true });
      await inPage(i.tab.id, () => {
        try {
          sessionStorage.clear();
        } catch {}
      }).catch(() => {});
      await browser.tabs.reload(i.tab.id, { bypassCache: true });
      return { toast: `Cleared cookies, storage and service workers for ${host}` };
    },
  },
  {
    id: 'copy-cookies', title: 'Copy Cookies (header format)', group: 'Storage', icon: 'cookie', kw: 'session token', when: W.http,
    run: async (i) => {
      const cs = await browser.cookies.getAll({ url: i.tab.url });
      return copy(cs.map((c) => `${c.name}=${c.value}`).join('; '), `Copied ${cs.length} cookies`);
    },
  },
  { id: 'view-cookies', title: 'View / Delete Cookies', group: 'Storage', icon: 'cookie', kw: 'session token', when: W.http, stay: true, run: async (i) => ({ view: await cookiesView(i) }) },
  {
    id: 'copy-local', title: 'Copy localStorage as JSON', group: 'Storage', icon: 'database', kw: 'storage export', when: W.http,
    run: async (i) => copy(JSON.stringify(Object.fromEntries(await inPage(i.tab.id, readLocalStorage)), null, 2), 'localStorage copied'),
  },
  { id: 'view-local', title: 'View / Delete localStorage', group: 'Storage', icon: 'database', kw: 'storage keys', when: W.http, stay: true, run: async (i) => ({ view: await localView(i) }) },
  {
    id: 'clear-local', title: 'Clear localStorage & sessionStorage', group: 'Storage', icon: 'trash', kw: 'storage reset', when: W.http,
    run: async (i) => {
      await inPage(i.tab.id, () => {
        localStorage.clear();
        sessionStorage.clear();
      });
      return { toast: 'localStorage and sessionStorage cleared' };
    },
  },

  // Debug
  { id: 'outline', title: 'Toggle Element Outlines', group: 'Debug', icon: 'layers', kw: 'border layout css debug boxes', when: W.http, run: (i) => toggleStyle(i, '__zp_outline', '*{outline:1px solid rgba(255,64,64,.55)!important;outline-offset:-1px!important}', 'Outlines on', 'Outlines off') },
  {
    id: 'design-mode', title: 'Toggle Live Text Editing', group: 'Debug', icon: 'edit', kw: 'design mode contenteditable copy', when: W.http,
    run: async (i) => {
      const on = await inPage(i.tab.id, () => {
        document.designMode = document.designMode === 'on' ? 'off' : 'on';
        return document.designMode === 'on';
      });
      return { toast: on ? 'Live text editing on — click any text' : 'Live text editing off' };
    },
  },
  {
    id: 'disable-css', title: 'Toggle Page CSS', group: 'Debug', icon: 'eye', kw: 'styles disable raw structure', when: W.http,
    run: async (i) => {
      const off = await inPage(i.tab.id, () => {
        const off = !window.__zpCssOff;
        window.__zpCssOff = off;
        for (const s of document.styleSheets) {
          try {
            s.disabled = off;
          } catch {}
        }
        return off;
      });
      return { toast: off ? 'Page CSS disabled' : 'Page CSS restored' };
    },
  },
  {
    id: 'missing-alt', title: 'Highlight Images Missing Alt Text', group: 'Debug', icon: 'image', kw: 'accessibility a11y', when: W.http,
    run: async (i) => {
      const r = await toggleStyle(i, '__zp_alt', 'img:not([alt]),img[alt=""]{outline:3px solid #ff3b30!important;outline-offset:2px!important}', 'on', 'off');
      if (r.toast === 'off') return { toast: 'Alt-text highlight off' };
      const n = await inPage(i.tab.id, () => document.querySelectorAll('img:not([alt]),img[alt=""]').length);
      return { toast: n ? `${n} image${n > 1 ? 's' : ''} missing alt text (outlined red)` : 'All images have alt text' };
    },
  },

  // URL
  { id: 'params', title: 'Edit Query Parameters', group: 'URL', icon: 'link', kw: 'search query string', when: W.http, stay: true, run: (i) => ({ view: paramsView(new URL(i.tab.url)) }) },
  { id: 'clear-params', title: 'Remove All Query Parameters', group: 'URL', icon: 'x', kw: 'query string clean', when: W.params, run: (i) => setUrl(i, (u) => (u.search = '')) },
  { id: 'copy-params', title: 'Copy Query Parameters as JSON', group: 'URL', icon: 'copy', kw: 'query string', when: W.params, run: (i) => copy(JSON.stringify(Object.fromEntries(new URL(i.tab.url).searchParams), null, 2), 'Parameters copied') },

  // Inspect
  { id: 'page-info', title: 'Page Info & Performance', group: 'Inspect', icon: 'info', kw: 'framework load time size meta speed', when: W.http, stay: true, run: async (i) => ({ view: rowsView('info', 'Page Info', await inPage(i.tab.id, pageInfo)) }) },
  { id: 'og', title: 'Social Share Preview (Open Graph)', group: 'Inspect', icon: 'image', kw: 'og twitter meta seo', when: W.http, stay: true, run: async (i) => ({ view: rowsView('og', 'Open Graph & Twitter Tags', await inPage(i.tab.id, socialTags), 'No Open Graph or Twitter tags on this page') }) },
  { id: 'framework', title: 'Detect Framework', group: 'Inspect', icon: 'code', kw: 'react next vue angular stack tech', when: W.http, run: async (i) => ({ toast: (await inPage(i.tab.id, pageInfo))[0][1] }) },

  // GitHub
  { id: 'gh-dev', title: 'Open in github.dev', group: 'GitHub', icon: 'github', kw: 'editor vscode code', when: W.gh, run: (i) => openUrl(i, i.tab.url.replace('://github.com', '://github.dev'), false) },
  { id: 'gh-vscode', title: 'Open in vscode.dev', group: 'GitHub', icon: 'code', kw: 'editor', when: W.gh, run: (i) => openUrl(i, `https://vscode.dev/github/${i.gh.owner}/${i.gh.repo}`, false) },
  { id: 'gh-clone', title: 'Copy Clone URL', group: 'GitHub', icon: 'copy', kw: 'git', when: W.gh, run: (i) => copy(`https://github.com/${i.gh.owner}/${i.gh.repo}.git`, 'Clone URL copied') },
  { id: 'gh-actions', title: 'Go to Actions', group: 'GitHub', icon: 'github', kw: 'ci workflow', when: W.gh, run: gh('/actions') },
  { id: 'gh-pulls', title: 'Go to Pull Requests', group: 'GitHub', icon: 'github', kw: 'pr', when: W.gh, run: gh('/pulls') },
  { id: 'gh-issues', title: 'Go to Issues', group: 'GitHub', icon: 'github', kw: 'bugs', when: W.gh, run: gh('/issues') },

  // Check
  { id: 'pagespeed', title: 'Check PageSpeed Insights', group: 'Check', icon: 'zap', kw: 'lighthouse performance core web vitals', when: W.web, run: ext('https://pagespeed.web.dev/analysis?url=') },
  { id: 'sec-headers', title: 'Check Security Headers', group: 'Check', icon: 'shield', kw: 'csp hsts', when: W.web, run: (i) => openUrl(i, `https://securityheaders.com/?followRedirects=on&q=${encodeURIComponent(i.tab.url)}`, false) },
  { id: 'ssl', title: 'Check SSL Certificate', group: 'Check', icon: 'shield', kw: 'tls https', when: W.web, run: (i) => openUrl(i, `https://www.ssllabs.com/ssltest/analyze.html?d=${i.u.hostname}`, false) },
  { id: 'w3c', title: 'Validate HTML (W3C)', group: 'Check', icon: 'check', kw: 'markup validator', when: W.web, run: ext('https://validator.w3.org/nu/?doc=') },
  { id: 'wayback', title: 'Open in Wayback Machine', group: 'Check', icon: 'clock', kw: 'archive old version', when: W.web, run: (i) => openUrl(i, `https://web.archive.org/web/*/${i.tab.url}`, false) },

  // Tools
  { id: 'json-format', title: 'Format JSON on Clipboard', group: 'Tools', icon: 'code', kw: 'pretty print beautify', run: () => jsonClipboard(false) },
  { id: 'json-minify', title: 'Minify JSON on Clipboard', group: 'Tools', icon: 'code', kw: 'compact', run: () => jsonClipboard(true) },
  { id: 'tools-help', title: 'Mini Tools & Search Shortcuts', group: 'Tools', icon: 'tool', kw: 'help commands ts jwt base64 uuid mdn npm', stay: true, run: () => ({ view: helpView() }) },
  { id: 'settings', title: 'Palette Settings…', group: 'Tools', icon: 'tool', kw: 'options preferences environments', run: () => browser.runtime.openOptionsPage() },
];

// ---------- views (sub-lists inside the palette) ----------

async function probe(port) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 900);
  try {
    const r = await fetch(`http://localhost:${port}/`, { signal: ctrl.signal, credentials: 'omit', cache: 'no-store' });
    let title = '';
    try {
      title = ((await r.text()).slice(0, 30000).match(/<title[^>]*>([^<]*)/i) || [])[1]?.trim() || '';
    } catch {}
    return { port, status: r.status, title };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function serversView(i, samePath) {
  const found = (await Promise.all(DEV_PORTS.map(probe))).filter(Boolean);
  const current = i.local ? Number(i.u.port || 80) : null;
  const suffix = samePath ? pathOf(i) : '/';
  return {
    id: 'servers',
    title: samePath ? 'Switch Port' : 'Running Dev Servers',
    icon: 'server',
    arg: { samePath, suffix },
    placeholder: 'Filter, or type a port number',
    goLabel: samePath ? 'Switch' : 'Open',
    freeform: { re: '^\\d{2,5}$', label: 'Open localhost:{}' },
    empty: 'No dev servers on common ports — type a port number',
    items: found
      .filter((f) => f.port !== current)
      .map((f) => ({ key: String(f.port), title: `localhost:${f.port}`, sub: f.title || `HTTP ${f.status}`, url: `http://localhost:${f.port}${suffix}` })),
  };
}

function parseEnvs(text) {
  const norm = (x) => {
    try {
      const host = x.replace(/^[a-z]+:\/\//i, '').split(/[:/]/)[0];
      return new URL(/^[a-z]+:\/\//i.test(x) ? x : `${LOCAL_RE.test(host) ? 'http' : 'https'}://${x}`).origin;
    } catch {
      return null;
    }
  };
  return text
    .split('\n')
    .map((line) => line.split(/[\s,|]+|↔|<->/).filter(Boolean).map(norm).filter(Boolean))
    .filter((g) => g.length > 1);
}

async function envsView(i) {
  const { envs = '' } = await browser.storage.local.get('envs');
  const groups = parseEnvs(envs);
  const origin = i.u.origin;
  const group = groups.find((g) => g.includes(origin));
  const targets = (group || [...new Set(groups.flat())]).filter((o) => o !== origin);
  const p = pathOf(i);
  return {
    id: 'envs',
    title: 'Switch Environment',
    icon: 'layers',
    goLabel: 'Switch',
    placeholder: 'Filter environments',
    items: [
      ...targets.map((o) => ({ key: o, title: o.replace(/^https?:\/\//, ''), sub: o + p, url: o + p })),
      { key: '__settings', title: 'Edit environments…', sub: 'Set which sites are the same app, e.g. localhost:3000 ↔ example.com' },
    ],
  };
}

function paramsView(u) {
  return {
    id: 'params',
    title: 'Query Parameters',
    icon: 'link',
    arg: u.href,
    placeholder: 'Filter, or type key=value and Enter to set',
    goLabel: 'Edit',
    enterFills: true,
    canDelete: true,
    freeform: { re: '^[^=\\s]+=', label: 'Set {}' },
    empty: 'No query parameters — type key=value to add one',
    items: [...u.searchParams].map(([k, v], n) => ({ key: `${k}#${n}`, name: k, title: k, sub: v || '(empty)', fill: `${k}=${v}` })),
  };
}

async function cookiesView(i) {
  const cs = await browser.cookies.getAll({ url: i.tab.url });
  return {
    id: 'cookies',
    title: `Cookies · ${i.u.hostname}`,
    icon: 'cookie',
    goLabel: 'Copy',
    canDelete: true,
    placeholder: 'Filter cookies',
    empty: 'No cookies for this site',
    items: [
      ...(cs.length ? [{ key: '__all', title: 'Copy all as Cookie header', sub: `${cs.length} cookies`, value: cs.map((c) => `${c.name}=${c.value}`).join('; ') }] : []),
      ...cs.map((c) => ({
        key: `${c.name}@${c.domain}${c.path}`,
        title: c.name,
        sub: `${c.value || '(empty)'}  ·  ${c.domain}${c.path}${c.httpOnly ? '  ·  HttpOnly' : ''}`,
        value: c.value,
        cookie: { name: c.name, storeId: c.storeId, url: `${c.secure ? 'https' : 'http'}://${c.domain.replace(/^\./, '')}${c.path}` },
      })),
    ],
  };
}

async function localView(i) {
  const entries = await inPage(i.tab.id, readLocalStorage);
  return {
    id: 'local',
    title: `localStorage · ${i.u.hostname}`,
    icon: 'database',
    goLabel: 'Copy',
    canDelete: true,
    placeholder: 'Filter keys',
    empty: 'localStorage is empty',
    items: [
      ...(entries.length ? [{ key: '__all', title: 'Copy all as JSON', sub: `${entries.length} keys`, value: JSON.stringify(Object.fromEntries(entries), null, 2) }] : []),
      ...entries.map(([k, v]) => ({ key: k, name: k, title: k, sub: v.length > 240 ? `${v.slice(0, 240)}…` : v || '(empty)', value: v })),
    ],
  };
}

function rowsView(id, title, rows, empty) {
  return {
    id,
    title,
    icon: 'info',
    goLabel: 'Copy',
    placeholder: 'Filter',
    empty: empty || 'Nothing found',
    items: rows.map(([k, v]) => ({ key: k, title: k, sub: v, value: v })),
  };
}

function helpView() {
  const cmds = [
    ['ts', 'Timestamp ↔ date — ts 1697040000 · ts 2026-10-15 · ts (now)'],
    ['jwt', 'Decode a JWT — jwt eyJhbGciOi…'],
    ['b64', 'Base64 encode / decode — b64 hello'],
    ['url', 'URL encode / decode — url a b&c'],
    ['uuid', 'Generate a random UUID'],
    ['json', 'Format or minify the JSON on your clipboard'],
    ['g', 'Search Google — g query'],
    ['mdn', 'Search MDN docs — mdn flexbox'],
    ['npm', 'Search npm — npm zod'],
    ['gh', 'Search GitHub repos — gh next.js'],
    ['so', 'Search Stack Overflow — so error message'],
    ['caniuse', 'Check browser support — caniuse dialog'],
    ['yt', 'Search YouTube — yt query'],
  ];
  return {
    id: 'help',
    title: 'Mini Tools & Search Shortcuts',
    icon: 'tool',
    goLabel: 'Use',
    placeholder: 'Pick one, then type after it',
    items: cmds.map(([c, d]) => ({ key: c, title: c, sub: d, fill: `${c} ` })),
  };
}

async function viewOp({ view, arg, op, item, text, alt }) {
  const t = await currentTab();
  const i = info(t);
  switch (view) {
    case 'servers': {
      const url = op === 'apply' ? `http://localhost:${text}${arg.suffix}` : item.url;
      await openUrl(i, url, arg.samePath ? !alt : alt);
      return { close: true };
    }
    case 'envs':
      if (item.key === '__settings') {
        browser.runtime.openOptionsPage();
        return { close: true };
      }
      await openUrl(i, item.url, !alt);
      return { close: true };
    case 'params': {
      const u = new URL(arg);
      if (op === 'apply') {
        const [k, ...rest] = text.split('=');
        u.searchParams.set(k.trim(), rest.join('='));
      } else if (op === 'delete') {
        u.searchParams.delete(item.name);
      }
      await browser.tabs.update(t.id, { url: u.href });
      return { view: paramsView(u), toast: op === 'delete' ? `Removed ${item.name}` : 'Parameter set' };
    }
    case 'cookies':
      if (op === 'delete') {
        if (!item.cookie) return null;
        await browser.cookies.remove(item.cookie);
        return { view: await cookiesView(i), toast: `Deleted cookie ${item.cookie.name}` };
      }
      await copy(item.value);
      return { close: true, toast: 'Copied' };
    case 'local':
      if (op === 'delete') {
        if (item.key === '__all') return null;
        await inPage(t.id, (k) => localStorage.removeItem(k), item.name);
        return { view: await localView(i), toast: `Removed ${item.name}` };
      }
      await copy(item.value);
      return { close: true, toast: 'Copied' };
    case 'help':
      return { fill: item.fill };
    default:
      await copy(item.value ?? '');
      return { close: true, toast: 'Copied' };
  }
}

// ---------- palette plumbing ----------

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
  const width = 760;
  const height = 600;
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

async function currentTab() {
  await ensureCtx();
  return browser.tabs.get(ctx.tabId);
}

async function getState() {
  await ensureCtx();
  const [tabs, closed, cur] = await Promise.all([
    browser.tabs.query({ hidden: false, windowType: 'normal' }),
    browser.sessions.getRecentlyClosed({ maxResults: 15 }).catch(() => []),
    ctx ? browser.tabs.get(ctx.tabId).catch(() => null) : null,
  ]);
  const i = cur ? info(cur) : null;
  return {
    currentId: ctx?.tabId,
    currentWindowId: ctx?.windowId,
    current: cur && { title: cur.title, url: cur.url, favIconUrl: cur.favIconUrl },
    usage,
    density,
    actions: ACTIONS.filter((a) => !a.when || (i && a.when(i))).map(({ id, title, kw, group, icon, hint, stay }) => ({ id, title, kw, group, icon, hint, stay })),
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
      mode === 'history' ? [] : browser.bookmarks.search(q).catch(() => []),
      mode === 'bookmarks' ? [] : browser.history.search({ text: q, maxResults: 40, startTime: 0 }).catch(() => []),
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

const normalizeUrl = (u) => (/^[a-z][\w+.-]*:/i.test(u) ? u : `${LOCAL_RE.test(u.split(/[:/]/)[0]) ? 'http' : 'https'}://${u}`);
const looksLikeUrl = (s) => !/\s/.test(s) && (/^[a-z][\w+.-]*:\/\//i.test(s) || /^localhost(:\d+)?(\/|$)/i.test(s) || /^[^/]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(s));

function asResult(r) {
  if (!r || typeof r !== 'object') return undefined;
  const { toast, view, fill, close } = r;
  return toast || view || fill != null || close ? { toast, view, fill, close } : undefined;
}

async function recordUse(id) {
  usage[id] = (usage[id] || 0) + 1;
  await browser.storage.local.set({ usage });
}

async function openItem(item, alt) {
  await ensureCtx();
  const t = await browser.tabs.get(ctx.tabId).catch(() => null);
  const i = t ? info(t) : null;
  let result;
  switch (item.kind) {
    case 'tab':
      await browser.tabs.update(item.tabId, { active: true });
      await browser.windows.update(item.windowId, { focused: true });
      break;
    case 'bookmark':
    case 'history':
    case 'url':
    case 'go':
      await openUrl(i, normalizeUrl(item.url), alt);
      break;
    case 'nav':
      if (looksLikeUrl(item.url) || /^[a-z]+:/i.test(item.url)) await openUrl(i, normalizeUrl(item.url), !alt);
      else if (alt) await browser.search.search({ query: item.url, disposition: 'NEW_TAB' });
      else await browser.search.search({ query: item.url, tabId: i.tab.id });
      break;
    case 'closed':
      await browser.sessions.restore(item.sessionId);
      break;
    case 'web':
      if (alt) await browser.search.search({ query: item.query, tabId: i.tab.id });
      else await browser.search.search({ query: item.query, disposition: 'NEW_TAB' });
      break;
    case 'action': {
      const a = ACTIONS.find((x) => x.id === item.id);
      if (!a || !i) break;
      recordUse(a.id);
      try {
        result = asResult(await a.run(i, alt));
      } catch (e) {
        console.warn('Zen Palette:', a.id, e);
        result = { toast: `Couldn't run “${a.title}” on this page` };
      }
      break;
    }
  }
  if (!result?.view && result?.fill == null) closePaletteWindow();
  return result;
}

async function tabOp(op, tabId) {
  const t = await browser.tabs.get(tabId);
  let r;
  if (op === 'close') await closeTabs([tabId], t.windowId);
  if (op === 'pin') await browser.tabs.update(tabId, { pinned: !t.pinned });
  if (op === 'mute') await browser.tabs.update(tabId, { muted: !t.mutedInfo?.muted });
  if (op === 'unload') r = t.active ? { toast: "Can't unload the tab you're on" } : (await browser.tabs.discard(tabId), { toast: 'Tab unloaded' });
  if (op === 'bookmark') r = await toggleBookmark(t);
  return { state: await getState(), toast: r?.toast };
}

browser.runtime.onMessage.addListener((msg) => {
  switch (msg?.type) {
    case 'state': return getState();
    case 'search': return search(msg.q, msg.mode);
    case 'open': return openItem(msg.item, msg.alt).catch((e) => ({ toast: `Error: ${e.message}` }));
    case 'tabOp': return tabOp(msg.op, msg.tabId).catch((e) => ({ toast: `Error: ${e.message}` }));
    case 'viewOp': return viewOp(msg).catch((e) => ({ toast: `Error: ${e.message}` }));
    case 'copy': return copy(msg.text);
    case 'close-ui': closePaletteWindow(); return Promise.resolve();
  }
});
