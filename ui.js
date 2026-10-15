// Shared palette UI. Runs as a content script (overlay on the page) and inside palette.html (fallback window).
(() => {
  if (window.__zenPaletteUI) return;

  const ICONS = {
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.3-4.3',
    star: 'M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2',
    undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
    bolt: 'M13 2.5L4.5 14H11l-1 7.5L18.5 10H12z',
    globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z',
    pin: 'M12 16v5M8.5 3.5h7l-1 5.5 3 3.5h-11l3-3.5z',
    speaker: 'M11 5L6.5 9H3.5v6h3l4.5 4zM15.5 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
    muted: 'M11 5L6.5 9H3.5v6h3l4.5 4zM16 9.5l5 5M21 9.5l-5 5',
    plus: 'M12 5v14M5 12h14',
    x: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
    reload: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v5h-5',
    copy: 'M9 9h10.5v10.5H9zM5 15V4.5h10.5',
    window: 'M3.5 5h17v14h-17zM3.5 9h17',
    book: 'M4 5.5c3-1 5.5-.5 8 1.5 2.5-2 5-2.5 8-1.5V19c-3-1-5.5-.5-8 1.5-2.5-2-5-2.5-8-1.5zM12 7v13.5',
    zoom: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.3-4.3M8 11h6M11 8v6',
    moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
    code: 'M8 7l-5 5 5 5M16 7l5 5-5 5',
    server: 'M4 4.5h16v6H4zM4 13.5h16v6H4zM7.5 7.5h.01M7.5 16.5h.01',
    trash: 'M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13',
    eye: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    database: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5.5M12 7.5h.01',
    camera: 'M3.5 7.5h4l1.5-2.5h6l1.5 2.5h4v11.5h-17zM12 10a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z',
    printer: 'M7 9V3.5h10V9M7 17H4.5V9.5h15V17H17M7 14h10v6.5H7z',
    file: 'M6 3h8l4 4v14H6zM14 3v4h4',
    left: 'M15 5l-7 7 7 7',
    right: 'M9 5l7 7-7 7',
    up: 'M12 19V5M5 12l7-7 7 7',
    down: 'M12 5v14M5 12l7 7 7-7',
    home: 'M3.5 11L12 4l8.5 7M6 9.5V20h12V9.5',
    sort: 'M7 4v16M3.5 16.5L7 20l3.5-3.5M13 6h8M13 11h6M13 16h4',
    phone: 'M7.5 2.5h9v19h-9zM11 18.5h2',
    github: 'M9 19c-4 1.3-4-2-5.5-2.5M14.5 21v-3.4a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6a4.7 4.7 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6 2.6 5 2.9 5 2.9a4.3 4.3 0 0 0-.1 3.2A4.7 4.7 0 0 0 3.6 9.3c0 4.6 2.8 5.7 5.5 6a3 3 0 0 0-.8 2.3V21',
    check: 'M4.5 12.5l5 5 10-11',
    tool: 'M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3zM17.5 3.5l3 3',
    edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
    cookie: 'M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1-3-3zM8.5 11h.01M12 15.5h.01M15.5 13h.01',
    image: 'M3.5 4.5h17v15h-17zM3.5 16l5-5 4 4 3-3 5 5M15.5 8.5h.01',
    zap: 'M13 2.5L4.5 14H11l-1 7.5L18.5 10H12z',
    shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    tabs: 'M3.5 5.5h17v13h-17zM3.5 9.5h17M8.5 5.5v4',
    back: 'M19 12H5M11 6l-6 6 6 6',
  };

  const FILTERS = [
    ['all', 'All', 'grid'],
    ['tabs', 'Tabs', 'tabs'],
    ['bookmarks', 'Bookmarks', 'star'],
    ['history', 'History', 'clock'],
    ['closed', 'Closed', 'undo'],
    ['actions', 'Actions', 'bolt'],
  ];
  const PREFIX = { '>': 'actions', '@': 'tabs', '#': 'bookmarks', '!': 'history', '~': 'closed' };
  const GROUPS = ['Tab', 'Page', 'Navigate', 'Copy', 'Window', 'Dev', 'Storage', 'Debug', 'URL', 'Inspect', 'GitHub', 'Check', 'Tools'];
  const CHIP_LABEL = {
    'new-tab': 'New tab', reopen: 'Reopen closed', bookmark: 'Bookmark', pin: 'Pin', 'close-dupes': 'Close duplicates',
    'copy-url': 'Copy URL', 'hard-reload': 'Hard reload', 'clear-site-data': 'Clear site data', 'dev-servers': 'Dev servers',
    'switch-env': 'Switch env', 'page-info': 'Page info', 'view-cookies': 'Cookies', 'view-local': 'localStorage', params: 'Query params',
  };
  const DEFAULT_CHIPS = ['new-tab', 'reopen', 'bookmark', 'pin', 'close-dupes', 'copy-url', 'hard-reload', 'clear-site-data'];
  const SEARCHES = {
    g: ['Google', 'https://www.google.com/search?q='],
    mdn: ['MDN', 'https://developer.mozilla.org/en-US/search?q='],
    npm: ['npm', 'https://www.npmjs.com/search?q='],
    gh: ['GitHub', 'https://github.com/search?type=repositories&q='],
    so: ['Stack Overflow', 'https://stackoverflow.com/search?q='],
    caniuse: ['Can I use', 'https://caniuse.com/?search='],
    yt: ['YouTube', 'https://www.youtube.com/results?search_query='],
  };
  const GO_LABEL = { tab: 'Switch to tab', action: 'Run', bookmark: 'Open', history: 'Open', url: 'Open', nav: 'Go', go: 'Search', closed: 'Restore', web: 'Search', copy: 'Copy' };
  const TAB_CAP = 250;
  const TAB_CAP_MIXED = 12;
  const PLACEHOLDER = 'Search tabs, bookmarks, history, actions…';

  const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
button { all: unset; }
.zp {
  --panel: rgba(250, 250, 252, 0.76);
  --solid: #f5f5f7;
  --border: rgba(0, 0, 0, 0.09);
  --hair: rgba(0, 0, 0, 0.07);
  --text: #1d1d1f;
  --muted: rgba(60, 60, 67, 0.72);
  --faint: rgba(60, 60, 67, 0.46);
  --sel: rgba(0, 0, 0, 0.06);
  --seg: rgba(255, 255, 255, 0.95);
  --well: rgba(0, 0, 0, 0.045);
  --accent: #6e56cf;
  --kbd: rgba(0, 0, 0, 0.065);
  --ic: rgba(0, 0, 0, 0.05);
  --dim: rgba(0, 0, 0, 0.14);
  --shadow: 0 28px 70px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.08);
  --gloss: rgba(255, 255, 255, 0.7);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", "Ubuntu", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  font-size: 14px; line-height: 1.3; color: var(--text);
}
@media (prefers-color-scheme: dark) {
  .zp {
    --panel: rgba(28, 28, 32, 0.68);
    --solid: #1c1c20;
    --border: rgba(255, 255, 255, 0.1);
    --hair: rgba(255, 255, 255, 0.07);
    --text: rgba(255, 255, 255, 0.95);
    --muted: rgba(235, 235, 245, 0.62);
    --faint: rgba(235, 235, 245, 0.38);
    --sel: rgba(255, 255, 255, 0.075);
    --seg: rgba(255, 255, 255, 0.1);
    --well: rgba(255, 255, 255, 0.05);
    --accent: #b4a7ff;
    --kbd: rgba(255, 255, 255, 0.09);
    --ic: rgba(255, 255, 255, 0.07);
    --dim: rgba(0, 0, 0, 0.34);
    --shadow: 0 30px 80px rgba(0, 0, 0, 0.55), 0 2px 10px rgba(0, 0, 0, 0.3);
    --gloss: rgba(255, 255, 255, 0.08);
  }
}
svg { display: block; }
.wrap { position: fixed; inset: 0; z-index: 2147483647; pointer-events: auto; }
.backdrop { position: absolute; inset: 0; background: var(--dim); animation: fade 0.16s ease-out; }
.panel {
  position: absolute; left: 50%; top: 9vh; transform: translateX(-50%);
  width: min(720px, calc(100vw - 32px)); max-height: min(760px, 86vh);
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--panel);
  backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid var(--border); border-radius: 20px;
  box-shadow: var(--shadow), inset 0 1px 0 var(--gloss);
  animation: pop 0.2s cubic-bezier(0.2, 0.9, 0.25, 1);
}
@keyframes pop { from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.97); } }
@keyframes fade { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .panel, .backdrop { animation: none; } }

.bar { display: flex; align-items: center; gap: 12px; height: 54px; padding: 0 20px; flex: none; }
.bar > svg { width: 20px; height: 20px; color: var(--muted); flex: none; }
input {
  all: unset; flex: 1; min-width: 0;
  font: inherit; font-size: 19px; letter-spacing: -0.01em;
  color: var(--text); caret-color: var(--accent);
}
input::placeholder { color: var(--faint); }
input::selection { background: color-mix(in srgb, var(--accent) 35%, transparent); }

.cur { display: flex; align-items: center; gap: 10px; margin: 0 12px; padding: 5px 10px; border-radius: 10px; cursor: pointer; flex: none; font-size: 12.5px; color: var(--faint); min-width: 0; }
.cur:hover { background: var(--well); }
.cur.editing { background: var(--well); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent); }
.cur .ic { width: 18px; height: 18px; border-radius: 4px; background: none; }
.cur .ic img { width: 16px; height: 16px; }
.cur .ic .lt { font-size: 10px; border-radius: 4px; }
.cur .su { flex: 1; min-width: 0; font-size: 12.5px; }
.cur .k { display: inline-flex; align-items: center; gap: 6px; flex: none; white-space: nowrap; }
.cur .k kbd + kbd, .cur .k span + kbd { margin-left: 6px; }

.filters { display: flex; gap: 2px; margin: 6px 12px 2px; padding: 2px; border-radius: 10px; background: var(--well); flex: none; }
.f { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; height: 26px; padding: 0 6px; border-radius: 8px; font-size: 12.5px; color: var(--muted); white-space: nowrap; cursor: default; min-width: 0; }
.f svg { width: 14px; height: 14px; flex: none; }
.f:hover { color: var(--text); }
.f.on { background: var(--seg); color: var(--text); font-weight: 600; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.16), inset 0 0 0 1px var(--hair); }
.f .n { font-size: 11px; font-weight: 500; color: var(--faint); }

.crumb { display: flex; align-items: center; gap: 8px; margin: 6px 20px 2px; font-size: 13px; font-weight: 600; flex: none; }
.crumb svg { width: 15px; height: 15px; color: var(--muted); cursor: pointer; }
.crumb .sp { flex: 1; }
.crumb .k { display: inline-flex; align-items: center; gap: 6px; font-weight: 400; font-size: 12px; color: var(--muted); }

.chips { display: flex; gap: 8px; padding: 8px 14px 2px; flex: none; overflow-x: auto; scrollbar-width: none; mask-image: linear-gradient(90deg, #000 92%, transparent); }
.chip { flex: none; display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 13px; border-radius: 999px; background: var(--well); border: 1px solid var(--hair); font-size: 13px; white-space: nowrap; cursor: default; }
.chip svg { width: 14px; height: 14px; color: var(--accent); }
.chip:hover, .chip.sel { background: var(--sel); border-color: var(--border); }
.chip.sel { box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent); }

.list { flex: 1; overflow-y: auto; padding: 4px 10px 10px; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--kbd) transparent; }
.sec { font-size: 11.5px; font-weight: 600; color: var(--faint); padding: 10px 10px 4px; letter-spacing: 0.02em; }
.row { display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 4px 10px 4px 2px; border-radius: 10px; border: 1px solid transparent; cursor: default; }
.comfy .row { gap: 12px; min-height: 54px; padding-top: 7px; padding-bottom: 7px; border-radius: 12px; }
.comfy .row.compact { min-height: 42px; padding-top: 4px; padding-bottom: 4px; }
.row.sel { background: var(--sel); border-color: var(--hair); }
.num { width: 20px; flex: none; text-align: right; font-size: 11.5px; color: var(--faint); font-variant-numeric: tabular-nums; }
.ic { width: 26px; height: 26px; border-radius: 7px; background: var(--ic); display: grid; place-items: center; flex: none; color: var(--muted); overflow: hidden; }
.comfy .ic { width: 32px; height: 32px; border-radius: 9px; }
.comfy .compact .ic { width: 28px; height: 28px; border-radius: 8px; }
.ic img { width: 16px; height: 16px; border-radius: 4px; }
.comfy .ic img { width: 18px; height: 18px; }
.ic svg { width: 15px; height: 15px; }
.ic .lt { width: 100%; height: 100%; display: grid; place-items: center; font-size: 12px; font-weight: 700; color: #fff; }
.tx { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 10px; }
.comfy .tx { flex-direction: column; align-items: stretch; gap: 3px; }
.ti { flex: 0 1 auto; max-width: 72%; font-size: 13.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.comfy .ti { max-width: none; font-size: 14px; font-weight: 600; }
.comfy .compact .ti { font-weight: 500; }
.grp { font-weight: 400; font-size: 12px; color: var(--faint); margin-left: 10px; }
.su { flex: 1 1 0; min-width: 40px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--faint); }
.su .dom { color: var(--muted); }
.mono { font-family: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace; font-size: 13px; font-weight: 500; }
mark { background: none; color: var(--accent); font-weight: inherit; }
.acc { display: flex; align-items: center; gap: 8px; flex: none; color: var(--faint); font-size: 12px; }
.acc > svg { width: 14px; height: 14px; }
.curtag { font-size: 11px; color: var(--accent); }
.btns { display: none; gap: 2px; }
.row:hover .btns { display: flex; }
.row:hover .go { display: none; }
.btn { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; color: var(--muted); cursor: pointer; }
.btn:hover, .btn.on { background: var(--kbd); color: var(--text); }
.btn svg { width: 15px; height: 15px; }
.go { display: none; align-items: center; gap: 7px; margin-left: 4px; color: var(--accent); font-weight: 500; font-size: 12.5px; white-space: nowrap; }
.row.sel .go { display: inline-flex; }
.row.sel .hint { display: none; }
kbd {
  font: inherit; font-size: 11px; font-weight: 500; line-height: 1;
  padding: 3px 6px; min-width: 20px; text-align: center;
  border-radius: 5px; background: var(--kbd); color: var(--muted);
}
.go kbd { color: var(--accent); background: color-mix(in srgb, var(--accent) 16%, transparent); }
.more { padding: 6px 10px 2px 46px; font-size: 12px; color: var(--faint); }
.empty { padding: 34px 20px; text-align: center; color: var(--faint); font-size: 13px; }

.foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: 40px; padding: 0 16px; border-top: 1px solid var(--hair); font-size: 12px; color: var(--muted); flex: none; }
.foot .l, .foot .r { display: flex; align-items: center; gap: 14px; white-space: nowrap; overflow: hidden; }
.foot .k { display: inline-flex; align-items: center; gap: 6px; }
.foot .r { color: var(--faint); }

.toast {
  position: fixed; left: 50%; bottom: 40px; z-index: 2147483647;
  display: flex; align-items: center; gap: 8px; max-width: min(560px, calc(100vw - 32px));
  padding: 10px 16px; border-radius: 12px;
  background: var(--panel); backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid var(--border); box-shadow: var(--shadow);
  font-size: 13px; color: var(--text);
  opacity: 0; transform: translateX(-50%) translateY(8px);
  transition: opacity 0.18s, transform 0.18s; pointer-events: none;
}
.toast svg { width: 15px; height: 15px; color: var(--accent); flex: none; }
.toast.show { opacity: 1; transform: translateX(-50%); }

.win .backdrop { display: none; }
.win .panel { inset: 0; top: 0; left: 0; transform: none; width: 100%; height: 100%; max-height: none; border: 0; border-radius: 0; background: var(--solid); backdrop-filter: none; box-shadow: none; animation: none; }
`;

  // ---------- small helpers ----------

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  const svg = (name) => {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.8');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', ICONS[name] || ICONS.bolt);
    s.appendChild(p);
    return s;
  };

  // Higher is better, -1 means no match. Fuzzy (subsequence) matching only for titles.
  function score(text, w, fuzzy) {
    if (!text) return -1;
    const s = text.toLowerCase();
    const i = s.indexOf(w);
    if (i >= 0) {
      const boundary = i === 0 || /[^a-z0-9]/.test(s[i - 1]);
      return 100 + (boundary ? 40 : 0) - Math.min(i, 60) * 0.5;
    }
    if (!fuzzy || w.length < 2) return -1;
    let j = 0;
    let gaps = 0;
    let last = -1;
    for (let k = 0; k < s.length && j < w.length; k++) {
      if (s[k] === w[j]) {
        if (last >= 0) gaps += k - last - 1;
        last = k;
        j++;
      }
    }
    return j < w.length ? -1 : Math.max(1, 50 - gaps * 2);
  }

  function matchItem(words, title, extra) {
    let total = 0;
    for (const w of words) {
      const a = score(title, w, true);
      const b = score(extra, w, false);
      const best = Math.max(a, b < 0 ? -1 : b * 0.7);
      if (best < 0) return -1;
      total += best;
    }
    return total;
  }

  function highlight(text, words) {
    const frag = document.createDocumentFragment();
    if (!words.length || !text) {
      frag.append(text || '');
      return frag;
    }
    const lower = text.toLowerCase();
    const ranges = [];
    for (const w of words) {
      let i = lower.indexOf(w);
      while (i >= 0) {
        ranges.push([i, i + w.length]);
        i = lower.indexOf(w, i + w.length);
      }
    }
    ranges.sort((a, b) => a[0] - b[0]);
    let pos = 0;
    for (const [a, b] of ranges) {
      if (b <= pos) continue;
      const start = Math.max(a, pos);
      if (start > pos) frag.append(text.slice(pos, start));
      frag.append(el('mark', null, text.slice(start, b)));
      pos = b;
    }
    frag.append(text.slice(pos));
    return frag;
  }

  function urlLine(u) {
    const line = el('div', 'su');
    try {
      const x = new URL(u);
      if (/^https?:$/.test(x.protocol)) {
        line.append(el('span', 'dom', x.host.replace(/^www\./, '')), x.pathname === '/' && !x.search ? '' : x.pathname + x.search);
        return line;
      }
    } catch {}
    line.append(el('span', 'dom', u || ''));
    return line;
  }

  const hostOf = (u) => {
    try {
      return new URL(u).hostname.replace(/^www\./, '') || u;
    } catch {
      return u || '?';
    }
  };

  function letterIcon(label) {
    const name = label || '?';
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    const d = el('div', 'lt', name[0].toUpperCase());
    d.style.background = `hsl(${h}, 55%, 52%)`;
    return d;
  }

  function looksLikeUrl(s) {
    if (/\s/.test(s)) return false;
    return /^[a-z][\w+.-]*:\/\//i.test(s) || /^localhost(:\d+)?(\/|$)/i.test(s) || /^[^/]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(s);
  }

  const keyOf = (it) => `${it.kind}:${it.tab?.id ?? it.id ?? it.key ?? it.sessionId ?? it.url ?? it.title}`;

  // ---------- mini tools ----------

  function b64enc(s) {
    let bin = '';
    for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b);
    return btoa(bin);
  }

  function b64dec(s) {
    let t = s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
    while (t.length % 4) t += '=';
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(t), (c) => c.charCodeAt(0)));
  }

  function uuid() {
    try {
      if (crypto.randomUUID) return crypto.randomUUID();
    } catch {}
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64;
    b[8] = (b[8] & 63) | 128;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  function relative(d) {
    const s = (d - Date.now()) / 1000;
    const f = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    for (const [unit, n] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]]) {
      if (Math.abs(s) >= n || unit === 'second') return f.format(Math.round(s / n), unit);
    }
  }

  function tools(text) {
    const m = text.match(/^(\S+)(?:\s+([\s\S]*))?$/);
    if (!m) return [];
    const cmd = m[1].toLowerCase();
    const arg = (m[2] || '').trim();
    const out = [];
    const add = (value, label, title) => out.push({ kind: 'copy', key: `${label}`, title: title ?? String(value), sub: label, value: String(value), glyph: 'copy', mono: true });

    if (SEARCHES[cmd] && arg) {
      const [name, base] = SEARCHES[cmd];
      out.push({ kind: 'go', key: cmd, title: `Search ${name} for “${arg}”`, url: base + encodeURIComponent(arg), glyph: 'search', compact: true });
      return out;
    }
    try {
      if (cmd === 'ts' || cmd === 'epoch') {
        let d;
        if (!arg) d = new Date();
        else if (/^-?\d+(\.\d+)?$/.test(arg)) d = new Date(arg.replace('-', '').split('.')[0].length >= 13 ? Number(arg) : Number(arg) * 1000);
        else d = new Date(arg);
        if (!isNaN(d)) {
          add(Math.floor(d.getTime() / 1000), 'Unix seconds');
          add(d.getTime(), 'Unix milliseconds');
          add(d.toISOString(), 'ISO 8601 (UTC)');
          add(d.toLocaleString(), `Local time · ${relative(d)}`);
        }
      } else if (cmd === 'jwt' && arg) {
        const [h, p] = arg.split('.');
        const header = JSON.parse(b64dec(h));
        const payload = JSON.parse(b64dec(p));
        add(JSON.stringify(payload, null, 2), 'Payload', JSON.stringify(payload));
        add(JSON.stringify(header, null, 2), 'Header', JSON.stringify(header));
        if (payload.exp) {
          const d = new Date(payload.exp * 1000);
          add(d.toISOString(), d < new Date() ? `Expired ${relative(d)}` : `Expires ${relative(d)}`, d.toLocaleString());
        }
        if (payload.iat) add(new Date(payload.iat * 1000).toISOString(), `Issued ${relative(new Date(payload.iat * 1000))}`, new Date(payload.iat * 1000).toLocaleString());
      } else if (cmd === 'b64' && arg) {
        add(b64enc(arg), 'Base64 encoded');
        try {
          add(b64dec(arg), 'Base64 decoded');
        } catch {}
      } else if (cmd === 'url' && arg) {
        add(encodeURIComponent(arg), 'URL encoded');
        try {
          const dec = decodeURIComponent(arg);
          if (dec !== arg) add(dec, 'URL decoded');
        } catch {}
      } else if (cmd === 'uuid') {
        add(uuid(), 'UUID v4');
      }
    } catch {}
    return out;
  }

  // ---------- palette ----------

  function mount(host, opts) {
    const isWin = opts.mode === 'window';
    const send = (m) => browser.runtime.sendMessage(m);
    const root = host.attachShadow({ mode: 'closed' });
    root.append(el('style', null, CSS));

    const zp = el('div', isWin ? 'zp win' : 'zp');
    const wrap = el('div', 'wrap');
    wrap.hidden = true;
    const backdrop = el('div', 'backdrop');
    const panel = el('div', 'panel');
    const bar = el('div', 'bar');
    const input = el('input');
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.placeholder = PLACEHOLDER;
    bar.append(svg('search'), input);
    const cur = el('div', 'cur');
    const filtersEl = el('div', 'filters');
    const crumb = el('div', 'crumb');
    const chipsEl = el('div', 'chips');
    const list = el('div', 'list');
    const foot = el('div', 'foot');
    const footL = el('div', 'l');
    const footR = el('div', 'r');
    foot.append(footL, footR);
    panel.append(bar, cur, filtersEl, crumb, chipsEl, list, foot);
    wrap.append(backdrop, panel);
    const toastEl = el('div', 'toast');
    zp.append(wrap, toastEl);
    root.append(zp);

    let data = { tabs: [], actions: [], closed: [], currentId: null, currentWindowId: null, current: null, usage: {} };
    let remote = { mode: null, bookmarks: [], history: [] };
    let filter = 'all';
    let view = null;
    let editUrl = false;
    let items = [];
    let rowEls = [];
    let sel = -1;
    let chips = [];
    let chipEls = [];
    let chipSel = null;
    let isOpen = false;
    let prevFocus = null;
    let timer = null;
    let token = 0;
    let toastTimer = null;

    const text = () => input.value.trim();
    const wordsOf = (t) => t.toLowerCase().split(/\s+/).filter(Boolean);
    const usageOf = (id) => data.usage?.[id] || 0;
    const chipsVisible = () => filter === 'actions' && !text() && !view && !editUrl && chips.length > 0;
    const currentOrigin = () => {
      try {
        const u = new URL(data.current?.url);
        return /^https?:$/.test(u.protocol) ? u.origin : null;
      } catch {
        return null;
      }
    };
    const stripScheme = (u) => (u || '').replace(/^[a-z]+:\/\//i, '').replace(/^www\./, '');

    // ----- building the list -----

    function rankTabs(words, t) {
      const ordered = [...data.tabs].sort(
        (a, b) => (b.windowId === data.currentWindowId) - (a.windowId === data.currentWindowId) || a.windowId - b.windowId || a.index - b.index,
      );
      const perWindow = new Map();
      for (const tab of ordered) {
        const n = (perWindow.get(tab.windowId) || 0) + 1;
        perWindow.set(tab.windowId, n);
        tab.num = n;
      }
      const numQuery = /^\d+$/.test(t) ? Number(t) : null;
      const byNumber = numQuery && ordered.find((tab) => tab.windowId === data.currentWindowId && tab.num === numQuery);
      const ranked = ordered
        .map((tab) => ({ tab, s: tab === byNumber ? Infinity : words.length ? matchItem(words, tab.title, tab.url) : 0 }))
        .filter((x) => x.s >= 0);
      if (words.length) ranked.sort((a, b) => b.s - a.s || a.tab.num - b.tab.num);
      return ranked.map(({ tab }) => ({ kind: 'tab', tab, num: tab.num, title: tab.title || tab.url, url: tab.url, icon: tab.favIconUrl }));
    }

    function rankActions(words) {
      const ranked = data.actions
        .map((a) => ({ a, s: words.length ? matchItem(words, a.title, `${a.kw || ''} ${a.group}`) : 0 }))
        .filter((x) => x.s >= 0)
        .map((x) => ({ ...x, s: x.s + Math.log2(1 + usageOf(x.a.id)) * 8 }));
      if (words.length) ranked.sort((a, b) => b.s - a.s);
      return ranked.map(({ a }) => actionItem(a));
    }

    const actionItem = (a) => ({ kind: 'action', id: a.id, title: a.title, sub: a.group, hint: a.hint, glyph: a.icon, stay: a.stay, compact: true });

    function rankRemote(kind, arr, words, extra) {
      const ranked = arr
        .map((x) => {
          const m = words.length ? matchItem(words, x.title, x.url) : 0;
          return { x, s: m < 0 ? -1 : m + (extra ? extra(x) : 0) };
        })
        .filter((r) => r.s >= 0);
      if (words.length) ranked.sort((a, b) => b.s - a.s);
      return ranked.map(({ x }) => ({ kind, url: x.url, title: x.title || x.url, glyph: kind === 'bookmark' ? 'star' : 'clock' }));
    }

    // Address-bar style suggestions for a URL being typed or edited.
    function urlSuggestions(t) {
      const q = stripScheme(t).toLowerCase();
      if (q.length < 2) return [];
      const matches = (u) => stripScheme(u).toLowerCase().includes(q);
      const tabs = data.tabs
        .filter((x) => x.id !== data.currentId && matches(x.url))
        .slice(0, 5)
        .map((tab) => ({ kind: 'tab', tab, title: tab.title || tab.url, url: tab.url, icon: tab.favIconUrl }));
      const seen = new Set([stripScheme(t), stripScheme(data.current?.url), ...tabs.map((x) => stripScheme(x.url))]);
      const pages = [];
      if (remote.mode === 'url') {
        const pool = [...remote.bookmarks.map((b) => ({ ...b, bm: true })), ...[...remote.history].sort((a, b) => b.visits - a.visits)];
        for (const x of pool) {
          const key = stripScheme(x.url);
          if (!matches(x.url) || seen.has(key)) continue;
          seen.add(key);
          pages.push({ kind: 'nav', key: `s:${x.url}`, url: x.url, title: x.title || x.url, glyph: x.bm ? 'star' : 'clock' });
          if (pages.length === 8) break;
        }
      }
      return [{ name: 'Open Tabs', items: tabs }, { name: 'Suggestions', items: pages }];
    }

    function build() {
      const t = text();
      const words = wordsOf(t);
      const has = words.length > 0;
      const S = [];
      const counts = {};

      if (view) {
        const its = view.items.filter((x) => !has || matchItem(words, x.title, `${x.sub || ''}`) >= 0).map((x) => ({ ...x, kind: 'view', glyph: x.glyph || view.icon }));
        const extra = view.freeform && t && new RegExp(view.freeform.re).test(t) ? [{ kind: 'view', apply: true, key: '__apply', title: view.freeform.label.replace('{}', t), glyph: 'check', compact: true }] : [];
        S.push({ items: [...extra, ...its] });
        return { S, words, counts };
      }

      if (editUrl) {
        if (t) {
          const isUrl = looksLikeUrl(t) || /^[a-z]+:/i.test(t);
          S.push({ items: [{ kind: 'nav', key: 'nav', url: t, title: isUrl ? t : `Search the web for “${t}”`, glyph: isUrl ? 'globe' : 'search', compact: true, mono: isUrl }] });
          S.push(...urlSuggestions(t));
        }
        return { S, words: [], counts };
      }

      const tabsR = rankTabs(words, t);
      const actsR = rankActions(words);
      const closedR = data.closed
        .map((c) => ({ c, s: has ? matchItem(words, c.title, c.url) : 0 }))
        .filter((x) => x.s >= 0)
        .map(({ c }) => ({ kind: 'closed', sessionId: c.sessionId, url: c.url, title: c.title || c.url, icon: c.favIconUrl, glyph: 'undo' }));
      const remoteOk = remote.mode === filter;
      const openUrls = new Set(data.tabs.map((x) => x.url));
      const bmR = remoteOk ? rankRemote('bookmark', remote.bookmarks.filter((b) => filter !== 'all' || !openUrls.has(b.url)), words) : [];
      const shown = new Set([...openUrls, ...bmR.map((b) => b.url)]);
      const hiR = remoteOk ? rankRemote('history', remote.history.filter((h) => filter !== 'all' || !shown.has(h.url)), words, (h) => Math.log2(1 + h.visits) * 6) : [];

      counts.tabs = tabsR.length;
      counts.closed = closedR.length;
      counts.actions = actsR.length;
      if (remoteOk && (has || filter === 'bookmarks')) counts.bookmarks = bmR.length;
      if (remoteOk && (has || filter === 'history')) counts.history = hiR.length;

      const origin = currentOrigin();
      if (filter === 'all' && t.startsWith('/') && origin) {
        S.push({ name: 'Go to', items: [{ kind: 'nav', key: 'path', url: origin + t, title: stripScheme(origin) + t, glyph: 'globe', compact: true, mono: true }] });
        S.push(...urlSuggestions(stripScheme(origin) + t));
        return { S, words: [], counts };
      }

      if (filter === 'all') {
        const tl = tools(t);
        if (tl.length) S.push({ name: tl[0].kind === 'go' ? 'Search' : 'Tools', items: tl });
        if (looksLikeUrl(t)) S.push({ name: 'Go to', items: [{ kind: 'url', key: 'goto', url: t, title: t, glyph: 'globe', compact: true, mono: true }] });
        const cap = has ? TAB_CAP_MIXED : 100;
        S.push({ name: has ? `Tabs · ${tabsR.length}` : null, items: tabsR.slice(0, cap), more: tabsR.length > cap ? `${tabsR.length - cap} more — press Tab for all tabs` : null });
        if (has) S.push({ name: 'Actions', items: actsR.slice(0, 5) });
        if (has) S.push({ name: 'Bookmarks', items: bmR.slice(0, 4) });
        if (has) S.push({ name: 'History', items: hiR.slice(0, 6) });
        if (has && !looksLikeUrl(t) && !tl.some((x) => x.kind === 'go')) S.push({ name: 'Search', items: [{ kind: 'web', key: 'web', query: t, title: `Search the web for “${t}”`, glyph: 'search', compact: true }] });
      } else if (filter === 'tabs') {
        S.push({ name: `Tabs · ${tabsR.length}`, items: tabsR.slice(0, TAB_CAP), more: tabsR.length > TAB_CAP ? `${tabsR.length - TAB_CAP} more — type to filter` : null });
      } else if (filter === 'bookmarks') {
        S.push({ name: has ? 'Bookmarks' : 'Recent Bookmarks', items: bmR });
      } else if (filter === 'history') {
        S.push({ name: has ? 'History' : 'Recent History', items: hiR });
      } else if (filter === 'closed') {
        S.push({ name: 'Recently Closed', items: closedR });
      } else if (filter === 'actions') {
        if (has) S.push({ name: 'Actions', items: actsR });
        else {
          for (const g of GROUPS) S.push({ name: g, items: actsR.filter((a) => a.sub === g).map((a) => ({ ...a, sub: '' })) });
        }
      }
      return { S, words, counts };
    }

    // ----- rendering -----

    function iconFor(it) {
      const box = el('div', 'ic');
      const fallback = () => {
        box.textContent = '';
        box.append(it.kind === 'tab' ? letterIcon(hostOf(it.url)) : svg(it.glyph));
      };
      if (it.icon && /^(https?|data):/.test(it.icon)) {
        const img = el('img');
        img.alt = '';
        img.decoding = 'async';
        img.onerror = fallback;
        img.src = it.icon;
        box.append(img);
      } else if (it.kind === 'tab') {
        fallback();
      } else {
        box.append(svg(it.glyph));
      }
      return box;
    }

    function rowFor(it, words) {
      const r = el('div', it.compact ? 'row compact' : 'row');
      r.dataset.i = it.index;
      r.append(el('span', 'num', it.num != null ? String(it.num) : ''), iconFor(it));

      const tx = el('div', 'tx');
      const ti = el('div', it.mono ? 'ti mono' : 'ti');
      ti.append(it.kind === 'web' || it.kind === 'go' || it.kind === 'copy' ? it.title : highlight(it.title, words));
      tx.append(ti);
      if (it.compact) {
        if (it.sub) ti.append(el('span', 'grp', it.sub));
      } else if (['tab', 'bookmark', 'history', 'closed', 'nav'].includes(it.kind)) {
        tx.append(urlLine(it.url));
      } else if (it.sub) {
        tx.append(el('div', 'su', it.sub));
      }

      const acc = el('div', 'acc');
      if (it.tab?.id === data.currentId) acc.append(el('span', 'curtag', 'Current'));
      if (it.tab?.muted) acc.append(svg('muted'));
      else if (it.tab?.audible) acc.append(svg('speaker'));
      if (it.tab?.pinned) acc.append(svg('pin'));
      if (it.hint) acc.append(el('kbd', 'hint', it.hint));
      if (it.kind === 'tab') {
        const btns = el('div', 'btns');
        for (const [op, icon, title] of [['pin', 'pin', 'Pin / unpin (Alt P)'], ['bookmark', 'star', 'Bookmark (Alt B)'], ['close', 'x', 'Close tab (Shift Del)']]) {
          const b = el('button', op === 'pin' && it.tab.pinned ? 'btn on' : 'btn');
          b.title = title;
          b.append(svg(icon));
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            tabOp(op, it);
          });
          btns.append(b);
        }
        acc.append(btns);
      }
      const label = view ? (it.apply ? 'Apply' : view.goLabel || 'Select') : GO_LABEL[it.kind];
      const go = el('span', 'go', label);
      go.append(el('kbd', null, '↵'));
      acc.append(go);
      r.append(tx, acc);
      return r;
    }

    function renderCurrent() {
      const c = data.current;
      cur.hidden = !c;
      cur.textContent = '';
      if (!c) return;
      cur.classList.toggle('editing', editUrl);
      cur.title = c.title || '';
      const k = el('span', 'k');
      k.append(el('kbd', null, 'Alt L'), 'Edit', el('kbd', null, 'Alt C'), 'Copy');
      cur.append(iconFor({ kind: 'tab', icon: c.favIconUrl, url: c.url }), urlLine(c.url), k);
    }

    function renderFilters(counts) {
      filtersEl.hidden = !!view || editUrl;
      filtersEl.textContent = '';
      for (const [id, label, icon] of FILTERS) {
        const b = el('div', filter === id ? 'f on' : 'f');
        b.append(label);
        if (id === 'tabs' && counts.tabs != null) b.append(el('span', 'n', String(counts.tabs)));
        b.addEventListener('mousedown', (e) => {
          e.preventDefault();
          setFilter(id);
        });
        filtersEl.append(b);
      }
    }

    function renderCrumb() {
      crumb.hidden = !view && !editUrl;
      crumb.textContent = '';
      if (crumb.hidden) return;
      const back = svg('back');
      back.addEventListener('mousedown', (e) => {
        e.preventDefault();
        exitModes();
      });
      const k = el('span', 'k');
      k.append(el('kbd', null, 'Esc'), 'Back');
      crumb.append(back, view ? view.title : 'Edit URL — Enter opens here, Shift+Enter in a new tab', el('span', 'sp'), k);
    }

    function renderChips() {
      chips = [];
      chipEls = [];
      chipsEl.textContent = '';
      const show = filter === 'actions' && !text() && !view && !editUrl;
      if (show) {
        const avail = new Map(data.actions.map((a) => [a.id, a]));
        const used = data.actions.filter((a) => usageOf(a.id) > 0).sort((a, b) => usageOf(b.id) - usageOf(a.id));
        const seen = new Set();
        for (const a of [...used, ...DEFAULT_CHIPS.map((id) => avail.get(id)).filter(Boolean)]) {
          if (seen.has(a.id) || a.id === 'edit-url') continue;
          seen.add(a.id);
          chips.push(a);
          if (chips.length === 8) break;
        }
        chips.forEach((a, n) => {
          const c = el('div', 'chip');
          c.append(svg(a.icon), CHIP_LABEL[a.id] || a.title);
          c.title = a.title;
          c.addEventListener('mousedown', (e) => {
            if (chipSel != null) setChip(n);
            e.preventDefault();
            runAction(a);
          });
          chipEls.push(c);
          chipsEl.append(c);
        });
      }
      chipsEl.hidden = !chips.length;
      if (!chips.length) chipSel = null;
      setChip(chipSel);
    }

    function render(keepKey) {
      const { S, words, counts } = build();
      zp.classList.toggle('comfy', data.density === 'comfortable');
      renderCurrent();
      renderFilters(counts);
      renderCrumb();
      renderChips();

      items = [];
      rowEls = [];
      const frag = document.createDocumentFragment();
      for (const sec of S) {
        if (!sec.items.length) continue;
        if (sec.name) frag.append(el('div', 'sec', sec.name));
        for (const it of sec.items) {
          it.index = items.length;
          items.push(it);
          const r = rowFor(it, words);
          rowEls.push(r);
          frag.append(r);
        }
        if (sec.more) frag.append(el('div', 'more', sec.more));
      }
      if (!items.length) frag.append(el('div', 'empty', view?.empty || (editUrl ? 'Type a URL or search' : 'No results')));
      list.textContent = '';
      list.append(frag);

      let idx = 0;
      if (!words.length && !view && !editUrl && filter !== 'actions') {
        const k = items.findIndex((i) => i.tab?.id === data.currentId);
        if (k >= 0) idx = k;
      }
      if (keepKey) {
        const k = items.findIndex((i) => keyOf(i) === keepKey);
        idx = k >= 0 ? k : Math.min(Math.max(sel, 0), items.length - 1);
      }
      sel = -1;
      setSel(items.length ? idx : -1, true);
    }

    function setSel(i, scroll = true) {
      if (i !== sel) {
        rowEls[sel]?.classList.remove('sel');
        sel = i;
        const r = rowEls[sel];
        if (r) {
          r.classList.add('sel');
          if (scroll) r.scrollIntoView({ block: 'nearest' });
        }
      }
      updateFoot();
    }

    function setChip(n) {
      chipSel = n;
      chipEls.forEach((c, k) => c.classList.toggle('sel', k === n));
      if (n != null) chipEls[n]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (n != null) rowEls[sel]?.classList.remove('sel');
      else rowEls[sel]?.classList.add('sel');
      updateFoot();
    }

    function hintsFor(it) {
      if (chipSel != null) return [['← →', 'Choose'], ['↵', 'Run'], ['↓', 'List']];
      if (!it) return [];
      if (view) {
        if (it.apply) return [['↵', 'Apply']];
        const h = [['↵', view.goLabel || 'Select']];
        if (view.canDelete && it.key !== '__all') h.push(['⇧ Del', 'Delete']);
        return h;
      }
      if (it.kind === 'tab') return [['↵', 'Switch'], ['⇧ Del', 'Close'], ['Alt P', 'Pin']];
      if (it.kind === 'nav') return [['↵', 'Open here'], ['⇧ ↵', 'New tab']];
      if (['bookmark', 'history', 'url', 'go', 'web'].includes(it.kind)) return [['↵', 'New tab'], ['⇧ ↵', 'This tab'], ['Alt C', 'Copy URL']];
      return [['↵', GO_LABEL[it.kind] || 'Select']];
    }

    function updateFoot() {
      footL.textContent = '';
      for (const [k, label] of hintsFor(items[sel])) {
        const s = el('span', 'k');
        s.append(el('kbd', null, k), label);
        footL.append(s);
      }
      footR.textContent = '';
      const right = view || editUrl ? [['Esc', 'Back']] : [['Tab', 'Filter'], ['/', 'Path'], ['Alt L', 'Edit URL'], ['>', 'Actions']];
      for (const [k, label] of right) {
        const s = el('span', 'k');
        s.append(el('kbd', null, k), label);
        footR.append(s);
      }
    }

    // ----- behaviour -----

    function move(d) {
      if (chipSel != null) return;
      if (!items.length) return;
      if (d < 0 && sel <= 0 && chipsVisible()) return setChip(0);
      setSel(Math.min(items.length - 1, Math.max(0, sel + d)));
    }

    function setFilter(id) {
      filter = id;
      chipSel = null;
      render(null);
      scheduleSearch();
      input.focus();
    }

    function cycleFilter(d) {
      const ids = FILTERS.map((f) => f[0]);
      setFilter(ids[(ids.indexOf(filter) + d + ids.length) % ids.length]);
    }

    function onInput() {
      if (!view && !editUrl && PREFIX[input.value[0]]) {
        filter = PREFIX[input.value[0]];
        input.value = input.value.slice(1).trimStart();
      }
      chipSel = null;
      sel = -1;
      render(null);
      scheduleSearch();
    }

    function scheduleSearch() {
      clearTimeout(timer);
      if (view) return;
      const t = text();
      let mode = filter;
      let q = t;
      if (editUrl || (filter === 'all' && t.startsWith('/') && currentOrigin())) {
        mode = 'url';
        q = editUrl ? stripScheme(t) : stripScheme(currentOrigin()) + t;
        if (q.length < 2) return;
      } else if (!(filter === 'all' ? t : filter === 'bookmarks' || filter === 'history')) {
        remote = { mode: null, bookmarks: [], history: [] };
        return;
      }
      const tk = ++token;
      timer = setTimeout(async () => {
        const r = await send({ type: 'search', q, mode });
        if (tk !== token || !isOpen) return;
        remote = r;
        render(sel > 0 && items[sel] ? keyOf(items[sel]) : null);
      }, 60);
    }

    function enterEdit() {
      if (!data.current) return;
      view = null;
      editUrl = true;
      chipSel = null;
      input.value = data.current.url;
      remote = { mode: null, bookmarks: [], history: [] };
      render(null);
      input.focus();
      input.select();
      scheduleSearch();
    }

    function showView(v) {
      const same = view?.id === v.id;
      const keep = same && items[sel] ? keyOf(items[sel]) : null;
      view = v;
      editUrl = false;
      chipSel = null;
      if (!same) input.value = '';
      input.placeholder = v.placeholder || 'Filter…';
      render(keep);
      input.focus();
    }

    function exitModes() {
      view = null;
      editUrl = false;
      input.value = '';
      input.placeholder = PLACEHOLDER;
      render(null);
      scheduleSearch();
      input.focus();
    }

    function handle(r) {
      if (!r) return;
      if (r.view && isOpen) showView(r.view);
      if (r.fill != null && isOpen) {
        view = null;
        editUrl = false;
        filter = 'all';
        input.placeholder = PLACEHOLDER;
        input.value = r.fill;
        input.focus();
        onInput();
      }
      if (r.close) close();
      if (r.toast) toast(r.toast);
    }

    function toast(msg) {
      toastEl.textContent = '';
      toastEl.append(svg('check'), msg);
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2000);
    }

    async function fire(msg) {
      const p = send(msg);
      close();
      try {
        handle(await p);
      } catch {}
    }

    function copyText(value, msg = 'Copied') {
      return fire({ type: 'copy', text: value }).then(() => toast(msg));
    }

    function plain(it) {
      return { kind: it.kind, tabId: it.tab?.id, windowId: it.tab?.windowId, id: it.id, url: it.url, sessionId: it.sessionId, query: it.query };
    }

    function plainView(it) {
      const { kind, index, glyph, compact, mono, ...rest } = it;
      return rest;
    }

    async function runAction(a, alt) {
      data.usage = { ...data.usage, [a.id]: usageOf(a.id) + 1 };
      if (a.id === 'edit-url') return enterEdit();
      const msg = { type: 'open', item: { kind: 'action', id: a.id }, alt };
      if (a.stay) return handle(await send(msg));
      fire(msg);
    }

    async function runView(op, it, alt) {
      handle(await send({ type: 'viewOp', view: view.id, arg: view.arg, op, item: plainView(it), text: text(), alt }));
    }

    function activate(it, alt) {
      if (!it) return;
      if (view) {
        if (it.apply) return runView('apply', it, alt);
        if (view.enterFills && it.fill != null) {
          input.value = it.fill;
          input.focus();
          render(null);
          return;
        }
        return runView('enter', it, alt);
      }
      if (it.kind === 'action') return runAction(it, alt);
      if (it.kind === 'copy') return copyText(it.value);
      fire({ type: 'open', item: plain(it), alt });
    }

    async function tabOp(op, it = items[sel]) {
      if (it?.kind !== 'tab') return;
      const next = items[it.index + 1];
      const keep = op === 'close' ? (next ? keyOf(next) : null) : keyOf(it);
      const r = await send({ type: 'tabOp', op, tabId: it.tab.id });
      if (r?.state) data = r.state;
      render(keep);
      if (r?.toast) toast(r.toast);
    }

    function viewDelete() {
      const it = items[sel];
      if (view?.canDelete && it && !it.apply && it.key !== '__all') runView('delete', it);
    }

    function copySelected() {
      const it = items[sel];
      const value = it?.value ?? it?.url ?? (!it && data.current?.url);
      if (value) copyText(value);
      else if (data.current) copyText(data.current.url, 'URL copied');
    }

    input.addEventListener('input', onInput);

    input.addEventListener('keydown', (e) => {
      const k = e.key;
      const lower = k.length === 1 ? k.toLowerCase() : k;
      if (chipSel != null && (k === 'ArrowLeft' || k === 'ArrowRight')) setChip(Math.min(chips.length - 1, Math.max(0, chipSel + (k === 'ArrowRight' ? 1 : -1))));
      else if (chipSel != null && (k === 'ArrowDown' || k === 'Escape')) setChip(null);
      else if (chipSel != null && k === 'Enter') runAction(chips[chipSel]);
      else if (k === 'ArrowDown' || (e.ctrlKey && (lower === 'n' || lower === 'j'))) move(1);
      else if (k === 'ArrowUp' || (e.ctrlKey && (lower === 'p' || lower === 'k'))) move(-1);
      else if (k === 'PageDown') move(8);
      else if (k === 'PageUp') move(-8);
      else if (k === 'Tab' && !view && !editUrl) cycleFilter(e.shiftKey ? -1 : 1);
      else if (k === 'Tab') move(e.shiftKey ? -1 : 1);
      else if (k === 'Enter') activate(items[sel], e.shiftKey || e.ctrlKey);
      else if (k === 'Escape') {
        if (view || editUrl) exitModes();
        else if (input.value) {
          input.value = '';
          onInput();
        } else if (filter !== 'all') setFilter('all');
        else close();
      } else if ((e.ctrlKey || e.altKey) && lower === 'l') enterEdit();
      else if (k === 'Delete' && e.shiftKey) view ? viewDelete() : tabOp('close');
      else if (e.altKey && lower === 'p') tabOp('pin');
      else if (e.altKey && lower === 'm') tabOp('mute');
      else if (e.altKey && lower === 'u') tabOp('unload');
      else if (e.altKey && lower === 'b') tabOp('bookmark');
      else if (e.altKey && lower === 'c') copySelected();
      else return;
      e.preventDefault();
    });

    // Keep the page's own shortcuts from firing while typing in the palette.
    for (const type of ['keydown', 'keyup', 'keypress', 'input']) wrap.addEventListener(type, (e) => e.stopPropagation());

    list.addEventListener('mousemove', (e) => {
      const r = e.target.closest('.row');
      if (r && chipSel == null) setSel(Number(r.dataset.i), false);
    });
    list.addEventListener('click', (e) => {
      const r = e.target.closest('.row');
      if (r) activate(items[Number(r.dataset.i)], e.shiftKey || e.ctrlKey);
    });
    for (const node of [list, cur, chipsEl]) node.addEventListener('mousedown', (e) => e.preventDefault());
    cur.addEventListener('click', enterEdit);
    backdrop.addEventListener('mousedown', () => close());

    async function open() {
      isOpen = true;
      prevFocus = document.activeElement;
      opts.onShow?.();
      wrap.hidden = false;
      panel.style.animation = 'none';
      void panel.offsetWidth;
      panel.style.animation = '';
      filter = 'all';
      view = null;
      editUrl = false;
      chipSel = null;
      input.value = '';
      input.placeholder = PLACEHOLDER;
      remote = { mode: null, bookmarks: [], history: [] };
      render(null);
      input.focus();
      data = await send({ type: 'state' });
      if (!isOpen) return;
      render(input.value && items[sel] ? keyOf(items[sel]) : null);
      input.focus();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      clearTimeout(timer);
      if (!isWin) wrap.hidden = true;
      opts.onClose?.();
      try {
        prevFocus?.focus?.({ preventScroll: true });
      } catch {}
    }

    return { open, close, toggle: () => (isOpen ? close() : open()) };
  }

  window.__zenPaletteUI = { mount };
})();
