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
  };

  const TAB_CAP = 250;
  const MODES = { '>': 'actions', '@': 'tabs', '#': 'bookmarks', '!': 'history' };
  const MODE_LABEL = { actions: 'Actions', tabs: 'Tabs', bookmarks: 'Bookmarks', history: 'History' };
  const GO_LABEL = { tab: 'Switch', action: 'Run', bookmark: 'Open', history: 'Open', url: 'Open', closed: 'Restore', web: 'Search' };

  const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.wrap {
  --panel: rgba(248, 248, 250, 0.72);
  --solid: #f4f4f6;
  --border: rgba(0, 0, 0, 0.08);
  --hair: rgba(0, 0, 0, 0.07);
  --text: #1d1d1f;
  --muted: rgba(60, 60, 67, 0.66);
  --faint: rgba(60, 60, 67, 0.42);
  --sel: rgba(0, 0, 0, 0.065);
  --accent: #007aff;
  --kbd: rgba(0, 0, 0, 0.06);
  --ic: rgba(0, 0, 0, 0.05);
  --dim: rgba(0, 0, 0, 0.14);
  --shadow: 0 28px 70px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.08);
  --gloss: rgba(255, 255, 255, 0.6);
  position: fixed; inset: 0; z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", "Ubuntu", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  color: var(--text); font-size: 14px; line-height: 1.3;
}
@media (prefers-color-scheme: dark) {
  .wrap {
    --panel: rgba(34, 34, 38, 0.6);
    --solid: #1f1f23;
    --border: rgba(255, 255, 255, 0.11);
    --hair: rgba(255, 255, 255, 0.07);
    --text: rgba(255, 255, 255, 0.94);
    --muted: rgba(235, 235, 245, 0.6);
    --faint: rgba(235, 235, 245, 0.36);
    --sel: rgba(255, 255, 255, 0.09);
    --accent: #0a84ff;
    --kbd: rgba(255, 255, 255, 0.08);
    --ic: rgba(255, 255, 255, 0.07);
    --dim: rgba(0, 0, 0, 0.32);
    --shadow: 0 30px 80px rgba(0, 0, 0, 0.55), 0 2px 10px rgba(0, 0, 0, 0.3);
    --gloss: rgba(255, 255, 255, 0.08);
  }
}
.backdrop { position: absolute; inset: 0; background: var(--dim); animation: fade 0.16s ease-out; }
.panel {
  position: absolute; left: 50%; top: 15vh; transform: translateX(-50%);
  width: min(680px, calc(100vw - 32px)); max-height: min(560px, 78vh);
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--panel);
  backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid var(--border); border-radius: 18px;
  box-shadow: var(--shadow), inset 0 1px 0 var(--gloss);
  animation: pop 0.2s cubic-bezier(0.2, 0.9, 0.25, 1);
}
@keyframes pop { from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.97); } }
@keyframes fade { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .panel, .backdrop { animation: none; } }

.bar { display: flex; align-items: center; gap: 12px; height: 60px; padding: 0 18px; border-bottom: 1px solid var(--hair); flex: none; }
.bar > svg { width: 21px; height: 21px; color: var(--muted); flex: none; }
input {
  all: unset; flex: 1; min-width: 0;
  font: inherit; font-size: 19px; letter-spacing: -0.01em;
  color: var(--text); caret-color: var(--accent);
}
input::placeholder { color: var(--faint); }
.chip {
  display: none; flex: none; font-size: 12px; font-weight: 600; color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  padding: 4px 10px; border-radius: 999px;
}
.chip.on { display: inline-block; }

.list { flex: 1; overflow-y: auto; padding: 4px 8px 8px; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--kbd) transparent; }
.sec { font-size: 11.5px; font-weight: 600; color: var(--faint); padding: 12px 10px 5px; letter-spacing: 0.02em; }
.row { display: flex; align-items: center; gap: 12px; height: 42px; padding: 0 10px; border-radius: 10px; cursor: default; }
.row.sel { background: var(--sel); }
.ic { width: 26px; height: 26px; border-radius: 7px; background: var(--ic); display: grid; place-items: center; flex: none; color: var(--muted); overflow: hidden; }
.ic img { width: 16px; height: 16px; border-radius: 3px; }
.ic svg { width: 15px; height: 15px; }
.ic .lt { width: 100%; height: 100%; display: grid; place-items: center; font-size: 12px; font-weight: 700; color: #fff; }
.tx { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 10px; }
.ti { flex: 0 1 auto; max-width: 78%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
.su { flex: 1 1 0; min-width: 40px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12.5px; color: var(--faint); }
mark { background: none; color: var(--accent); font-weight: 600; }
.acc { display: flex; align-items: center; gap: 8px; flex: none; color: var(--faint); font-size: 12px; }
.acc svg { width: 13px; height: 13px; }
.go { display: none; color: var(--muted); }
.row.sel .go { display: inline-flex; align-items: center; gap: 6px; }
.row.sel .hint { display: none; }
kbd {
  font: inherit; font-size: 11px; font-weight: 500; line-height: 1;
  padding: 3px 6px; min-width: 20px; text-align: center;
  border-radius: 5px; background: var(--kbd); color: var(--muted);
}
.num { width: 22px; flex: none; margin-right: -4px; text-align: right; font-size: 11.5px; font-variant-numeric: tabular-nums; color: var(--faint); }
.row.sel .num { color: var(--muted); }
.cur { font-size: 11px; color: var(--accent); }
.more { padding: 8px 10px 4px 44px; font-size: 12px; color: var(--faint); }
.empty { padding: 34px 20px; text-align: center; color: var(--faint); font-size: 13px; }

.foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: 38px; padding: 0 14px; border-top: 1px solid var(--hair); font-size: 12px; color: var(--muted); flex: none; }
.foot .l, .foot .r { display: flex; align-items: center; gap: 14px; white-space: nowrap; overflow: hidden; }
.foot .k { display: inline-flex; align-items: center; gap: 6px; }
.foot .r { color: var(--faint); gap: 10px; }
.foot .r .k { gap: 4px; }

.win .backdrop { display: none; }
.win .panel { inset: 0; top: 0; left: 0; transform: none; width: 100%; height: 100%; max-height: none; border: 0; border-radius: 0; background: var(--solid); backdrop-filter: none; box-shadow: none; animation: none; }
`;

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

  function prettyUrl(u) {
    try {
      const x = new URL(u);
      if (!/^https?:$/.test(x.protocol)) return u;
      const path = x.pathname === '/' ? '' : x.pathname;
      return x.hostname.replace(/^www\./, '') + path;
    } catch {
      return u || '';
    }
  }

  function hostOf(u) {
    try {
      return new URL(u).hostname.replace(/^www\./, '');
    } catch {
      return u || '?';
    }
  }

  function letterIcon(label) {
    const name = label || '?';
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    const d = el('div', 'lt', name.replace(/^www\./, '')[0].toUpperCase());
    d.style.background = `hsl(${h}, 55%, 52%)`;
    return d;
  }

  function looksLikeUrl(s) {
    if (/\s/.test(s)) return false;
    return /^[a-z][\w+.-]*:\/\//i.test(s) || /^localhost(:\d+)?(\/|$)/i.test(s) || /^[^/]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(s);
  }

  const keyOf = (it) => `${it.kind}:${it.tab?.id ?? it.id ?? it.sessionId ?? it.url ?? it.query}`;

  function mount(host, opts) {
    const send = (m) => browser.runtime.sendMessage(m);
    const root = host.attachShadow({ mode: 'closed' });
    root.appendChild(el('style', null, CSS));

    const wrap = el('div', opts.mode === 'window' ? 'wrap win' : 'wrap');
    const backdrop = el('div', 'backdrop');
    const panel = el('div', 'panel');
    const bar = el('div', 'bar');
    const input = el('input');
    input.placeholder = 'Search tabs, bookmarks, history… or type a tab number';
    input.spellcheck = false;
    input.autocomplete = 'off';
    const chip = el('span', 'chip');
    bar.append(svg('search'), input, chip);
    const list = el('div', 'list');
    const foot = el('div', 'foot');
    const footL = el('div', 'l');
    const footR = el('div', 'r');
    for (const [p, m] of Object.entries(MODES)) {
      const s = el('span', 'k');
      s.append(el('kbd', null, p), MODE_LABEL[m]);
      footR.append(s);
    }
    foot.append(footL, footR);
    panel.append(bar, list, foot);
    wrap.append(backdrop, panel);
    root.appendChild(wrap);

    let data = { tabs: [], actions: [], closed: [], currentId: null };
    let remote = { mode: null, bookmarks: [], history: [] };
    let items = [];
    let rowEls = [];
    let sel = 0;
    let isOpen = false;
    let prevFocus = null;
    let timer = null;
    let token = 0;

    function parse() {
      let text = input.value.trim();
      let mode = 'all';
      if (MODES[text[0]]) {
        mode = MODES[text[0]];
        text = text.slice(1).trim();
      }
      return { mode, text, words: text.toLowerCase().split(/\s+/).filter(Boolean) };
    }

    function build() {
      const { mode, text, words } = parse();
      const sections = [];
      const has = words.length > 0;
      const openUrls = new Set(data.tabs.map((t) => t.url));
      const byScore = (a, b) => b.s - a.s;

      if (mode === 'all' && looksLikeUrl(text)) {
        sections.push(['Go to', [{ kind: 'url', url: text, title: text, sub: '' }]]);
      }

      if (mode === 'all' || mode === 'tabs') {
        // Sidebar order: current window first, then each tab's position. Numbers match Ctrl+1…8.
        const ordered = [...data.tabs].sort(
          (a, b) => (b.windowId === data.currentWindowId) - (a.windowId === data.currentWindowId) || a.windowId - b.windowId || a.index - b.index,
        );
        const perWindow = new Map();
        for (const t of ordered) {
          const n = (perWindow.get(t.windowId) || 0) + 1;
          perWindow.set(t.windowId, n);
          t.num = n;
        }
        const numQuery = /^\d+$/.test(text) ? Number(text) : null;
        const byNumber = numQuery && ordered.find((t) => t.windowId === data.currentWindowId && t.num === numQuery);
        let ranked = ordered
          .map((t) => ({ t, s: t === byNumber ? Infinity : has ? matchItem(words, t.title, t.url) : 0 }))
          .filter((x) => x.s >= 0);
        if (has) ranked.sort((a, b) => b.s - a.s || a.t.num - b.t.num);
        const total = ranked.length;
        ranked = ranked.slice(0, TAB_CAP);
        const rows = ranked.map(({ t }) => ({ kind: 'tab', tab: t, num: t.num, title: t.title || t.url, sub: prettyUrl(t.url), url: t.url, icon: t.favIconUrl }));
        sections.push([`Tabs · ${total}`, rows, total > TAB_CAP ? `${total - TAB_CAP} more — type to filter` : null]);
      }

      if (mode === 'actions' || (mode === 'all' && has)) {
        let ranked = data.actions
          .map((a) => ({ a, s: has ? matchItem(words, a.title, a.kw) : 0 }))
          .filter((x) => x.s >= 0);
        if (has) ranked.sort(byScore);
        if (mode === 'all') ranked = ranked.slice(0, 4);
        sections.push(['Actions', ranked.map(({ a }) => ({ kind: 'action', id: a.id, title: a.title, sub: '', hint: a.hint, glyph: a.icon }))]);
      }

      const useRemote = remote.mode === mode;
      const shownUrls = new Set(openUrls);

      if (useRemote && (mode === 'bookmarks' || (mode === 'all' && has))) {
        const ranked = remote.bookmarks
          .filter((b) => mode === 'bookmarks' || !openUrls.has(b.url))
          .map((b) => ({ b, s: has ? matchItem(words, b.title, b.url) : 0 }))
          .filter((x) => x.s >= 0);
        if (has) ranked.sort(byScore);
        const cap = mode === 'all' ? 4 : 40;
        const out = ranked.slice(0, cap).map(({ b }) => ({ kind: 'bookmark', url: b.url, title: b.title || b.url, sub: prettyUrl(b.url), glyph: 'star' }));
        out.forEach((x) => shownUrls.add(x.url));
        sections.push(['Bookmarks', out]);
      }

      if (useRemote && (mode === 'history' || (mode === 'all' && has))) {
        const ranked = remote.history
          .filter((h) => mode === 'history' || !shownUrls.has(h.url))
          .map((h) => ({ h, s: has ? matchItem(words, h.title, h.url) + Math.log2(1 + h.visits) * 6 : 0 }))
          .filter((x) => x.s >= 0);
        if (has) ranked.sort(byScore);
        const cap = mode === 'all' ? 6 : 40;
        sections.push(['History', ranked.slice(0, cap).map(({ h }) => ({ kind: 'history', url: h.url, title: h.title || h.url, sub: prettyUrl(h.url), glyph: 'clock' }))]);
      }

      if (mode === 'all') {
        const closed = data.closed
          .map((c) => ({ c, s: has ? matchItem(words, c.title, c.url) : 0 }))
          .filter((x) => x.s >= 0)
          .slice(0, has ? 3 : 5);
        sections.push(['Recently Closed', closed.map(({ c }) => ({ kind: 'closed', sessionId: c.sessionId, url: c.url, title: c.title || c.url, sub: prettyUrl(c.url), icon: c.favIconUrl, glyph: 'undo' }))]);
      }

      if (mode === 'all' && text && !looksLikeUrl(text)) {
        sections.push(['Search', [{ kind: 'web', query: text, title: `Search the web for “${text}”`, sub: '', glyph: 'search' }]]);
      }

      return { sections, words };
    }

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
        box.append(svg(it.kind === 'url' ? 'globe' : it.glyph));
      }
      return box;
    }

    function rowFor(it, words) {
      const r = el('div', 'row');
      r.dataset.i = it.index;
      const tx = el('div', 'tx');
      const ti = el('span', 'ti');
      ti.append(it.kind === 'web' ? it.title : highlight(it.title, words));
      tx.append(ti);
      if (it.sub) tx.append(el('span', 'su', it.sub));

      const acc = el('div', 'acc');
      if (it.tab?.pinned) acc.append(svg('pin'));
      if (it.tab?.muted) acc.append(svg('muted'));
      else if (it.tab?.audible) acc.append(svg('speaker'));
      if (it.hint) acc.append(el('kbd', 'hint', it.hint));
      const go = el('span', 'go', GO_LABEL[it.kind]);
      go.append(el('kbd', null, '↵'));
      acc.append(go);

      if (it.tab?.id === data.currentId) acc.prepend(el('span', 'cur', 'Current'));
      r.append(el('span', 'num', it.num != null ? String(it.num) : ''));
      r.append(iconFor(it), tx, acc);
      return r;
    }

    function render(keepKey) {
      const { sections, words } = build();
      const { mode } = parse();
      chip.textContent = MODE_LABEL[mode] || '';
      chip.classList.toggle('on', mode !== 'all');

      items = [];
      rowEls = [];
      const frag = document.createDocumentFragment();
      for (const [name, arr, more] of sections) {
        if (!arr.length) continue;
        frag.append(el('div', 'sec', name));
        for (const it of arr) {
          it.index = items.length;
          items.push(it);
          const r = rowFor(it, words);
          rowEls.push(r);
          frag.append(r);
        }
        if (more) frag.append(el('div', 'more', more));
      }
      if (!items.length) frag.append(el('div', 'empty', 'No results'));
      list.textContent = '';
      list.append(frag);

      // With an empty search, start on the current tab, like the sidebar.
      let idx = words.length ? 0 : Math.max(0, items.findIndex((i) => i.tab?.id === data.currentId));
      if (keepKey) {
        const k = items.findIndex((i) => keyOf(i) === keepKey);
        idx = k >= 0 ? k : Math.min(sel, items.length - 1);
      }
      sel = -1;
      setSel(Math.max(0, idx));
    }

    function hintsFor(it) {
      if (!it) return [];
      const common = [['↑↓', 'Navigate']];
      if (it.kind === 'tab') return [...common, ['↵', 'Switch'], ['⇧ Del', 'Close'], ['Alt P', 'Pin'], ['Alt M', 'Mute']];
      if (['bookmark', 'history', 'url', 'web'].includes(it.kind)) return [...common, ['↵', 'New tab'], ['⇧ ↵', 'This tab']];
      return [...common, ['↵', GO_LABEL[it.kind]], ['Esc', 'Close']];
    }

    function setSel(i, scroll = true) {
      if (i === sel || !rowEls.length) {
        if (!rowEls.length) footL.textContent = '';
        return;
      }
      rowEls[sel]?.classList.remove('sel');
      sel = i;
      const r = rowEls[sel];
      r.classList.add('sel');
      if (scroll) r.scrollIntoView({ block: 'nearest' });
      footL.textContent = '';
      for (const [k, label] of hintsFor(items[sel])) {
        const s = el('span', 'k');
        s.append(el('kbd', null, k), label);
        footL.append(s);
      }
    }

    function move(d) {
      if (!items.length) return;
      setSel(Math.min(items.length - 1, Math.max(0, sel + d)));
    }

    function scheduleSearch() {
      clearTimeout(timer);
      const { mode, text } = parse();
      if (!text && mode !== 'bookmarks' && mode !== 'history') {
        remote = { mode: null, bookmarks: [], history: [] };
        return;
      }
      const t = ++token;
      timer = setTimeout(async () => {
        const r = await send({ type: 'search', q: text, mode });
        if (t !== token) return;
        remote = r;
        render(sel > 0 && items[sel] ? keyOf(items[sel]) : null);
      }, 60);
    }

    function plain(it) {
      return { kind: it.kind, tabId: it.tab?.id, windowId: it.tab?.windowId, id: it.id, url: it.url, sessionId: it.sessionId, query: it.query };
    }

    function activate(it, alt) {
      if (!it) return;
      send({ type: 'open', item: plain(it), alt });
      close();
    }

    async function tabOp(op) {
      const it = items[sel];
      if (it?.kind !== 'tab') return;
      const keep = op === 'close' ? (items[sel + 1] ? keyOf(items[sel + 1]) : null) : keyOf(it);
      data = await send({ type: 'tabOp', op, tabId: it.tab.id });
      render(keep);
    }

    input.addEventListener('input', () => {
      sel = -1;
      render(null);
      scheduleSearch();
    });

    input.addEventListener('keydown', (e) => {
      const k = e.key;
      const lower = k.length === 1 ? k.toLowerCase() : k;
      if (k === 'ArrowDown' || (k === 'Tab' && !e.shiftKey) || (e.ctrlKey && (lower === 'n' || lower === 'j'))) move(1);
      else if (k === 'ArrowUp' || (k === 'Tab' && e.shiftKey) || (e.ctrlKey && (lower === 'p' || lower === 'k'))) move(-1);
      else if (k === 'PageDown') move(8);
      else if (k === 'PageUp') move(-8);
      else if (k === 'Enter') activate(items[sel], e.shiftKey || e.ctrlKey);
      else if (k === 'Escape') {
        if (input.value) {
          input.value = '';
          input.dispatchEvent(new Event('input'));
        } else close();
      } else if (k === 'Delete' && e.shiftKey) tabOp('close');
      else if (e.altKey && lower === 'p') tabOp('pin');
      else if (e.altKey && lower === 'm') tabOp('mute');
      else if (e.altKey && lower === 'u') tabOp('unload');
      else return;
      e.preventDefault();
    });

    // Keep the page's own shortcuts from firing while typing in the palette.
    for (const type of ['keydown', 'keyup', 'keypress', 'input']) {
      wrap.addEventListener(type, (e) => e.stopPropagation());
    }

    list.addEventListener('mousemove', (e) => {
      const r = e.target.closest('.row');
      if (r) setSel(Number(r.dataset.i), false);
    });
    list.addEventListener('click', (e) => {
      const r = e.target.closest('.row');
      if (r) activate(items[Number(r.dataset.i)], e.shiftKey || e.ctrlKey);
    });
    list.addEventListener('mousedown', (e) => e.preventDefault());
    backdrop.addEventListener('mousedown', () => close());

    async function open() {
      isOpen = true;
      prevFocus = document.activeElement;
      opts.onShow?.();
      // Restart the entrance animation.
      panel.style.animation = 'none';
      void panel.offsetWidth;
      panel.style.animation = '';
      input.value = '';
      remote = { mode: null, bookmarks: [], history: [] };
      render(null);
      input.focus();
      data = await send({ type: 'state' });
      if (isOpen && !input.value) render(null);
      else if (isOpen) render(items[sel] ? keyOf(items[sel]) : null);
      input.focus();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      clearTimeout(timer);
      opts.onClose?.();
      try {
        prevFocus?.focus?.({ preventScroll: true });
      } catch {}
    }

    return { open, close, toggle: () => (isOpen ? close() : open()) };
  }

  window.__zenPaletteUI = { mount };
})();
