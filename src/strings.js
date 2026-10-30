/* ============================================================
   Content keys — the page's copy, owned by product management
   Every user-facing string is a named key. Its text lives in
   content/strings.json, a snapshot of the PM's Zoho Sheet: the sheet is
   exported to content/beat_detail_strings.csv by hand and tools/sync_strings.py pull
   brings it in — no code change.

     t('beatDetail.toast.routeOptimized', { day: 'Day 1', date: '4 May' })
       → "Route optimized for Day 1 - 4 May."

   Placeholders are named, {day}, so the PM can reword around them.

   Static HTML carries the key on the element:
     <button data-t="beatDetail.header.optimize.label">Optimize Route</button>
     <textarea data-t="beatDetail.notes.box.placeholder" data-t-attr="placeholder aria-label">
     <p data-t="cancelBeat.sub" data-t-var-beat="BP-003">…</p>
   data-t-attr names the attribute(s) the text goes in, instead of the
   element's own text; data-t-var-* fill the text's placeholders.

   Load this in <head>, before the page's scripts. The body stays hidden
   until the strings are in, so old text never flashes. Page scripts
   wait on Strings.ready before their first render.
   ============================================================ */
(function () {
  const BASE = 'content/';

  let texts = {};          /* key → the text in use */
  let defaults = {};       /* key → { text, where, notes } from strings.json */
  const warned = new Set();
  const warnOnce = (id, ...msg) => { if (!warned.has(id)) { warned.add(id); console.warn(...msg); } };

  /* Hold the first paint until the copy is settled */
  const root = document.documentElement;
  root.classList.add('t-pending');
  const hold = document.createElement('style');
  hold.textContent = 'html.t-pending body { visibility: hidden; }';
  document.head.appendChild(hold);

  /* ── Loading ───────────────────────────────────────── */
  /* tools/sync_strings.py pull turns the exported CSV into
     content/strings.json, and the page reads that */
  async function load() {
    try {
      const r = await fetch(BASE + 'strings.json', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      defaults = await r.json();
    } catch (err) {
      console.error('Content keys: content/strings.json did not load —', err.message);
      return;
    }
    Object.keys(defaults).forEach(key => { texts[key] = defaults[key].text; });
  }

  /* ── t() ───────────────────────────────────────────── */
  /* `fallback` is for shared components that also run on pages which do
     not load the strings */
  function t(key, vars, fallback) {
    let text = texts[key];
    if (text == null) {
      if (fallback != null) text = fallback;
      else { warnOnce(key, `Content keys: no text for "${key}"`); return key; }
    }
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (all, name) => {
      if (name in vars) return String(vars[name]);
      warnOnce(`${key}:${name}`, `Content keys: "${key}" has {${name}}, which the page does not fill`);
      return all;
    });
  }

  /* ── data-t ────────────────────────────────────────── */
  function varsOf(el) {
    const vars = {};
    Object.keys(el.dataset).forEach(k => {
      if (k.startsWith('tVar') && k.length > 4) vars[k[4].toLowerCase() + k.slice(5)] = el.dataset[k];
    });
    return vars;
  }

  /* An element with children (an icon, a nested select) keeps them: only
     its own text is replaced */
  function setOwnText(el, text) {
    if (!el.children.length) { el.textContent = text; return; }
    const node = [...el.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim());
    if (!node) { el.appendChild(document.createTextNode(text)); return; }
    const [, lead, trail] = node.nodeValue.match(/^(\s*)[\s\S]*?(\s*)$/);
    node.nodeValue = lead + text + trail;
  }

  function apply(scope = document) {
    scope.querySelectorAll('[data-t]').forEach(el => {
      const key = el.dataset.t;
      if (texts[key] == null) { warnOnce(key, `Content keys: no text for "${key}"`); return; }
      const text = t(key, varsOf(el));
      const attrs = (el.dataset.tAttr || '').split(/[\s|]+/).filter(Boolean);
      if (attrs.length) attrs.forEach(a => el.setAttribute(a, text));
      else setOwnText(el, text);
    });
  }

  /* ── Finding a key from the page (Show content keys) ── */
  /* Static text names its key in data-t. Text drawn by script does not,
     so it is matched against every key's text, with each {placeholder}
     standing for anything. */
  let patterns = null;
  function buildPatterns() {
    patterns = Object.keys(texts).map(key => {
      const parts = texts[key].split(/\{\w+\}/).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const bare = parts.join('').trim();
      return { key, bare, re: new RegExp(`^${parts.join('[\\s\\S]+?')}$`) };
    }).filter(p => p.bare.length > 1);   /* a lone "•" or "{x}" would match too much */
  }

  function keysForText(text) {
    if (!text) return [];
    if (!patterns) buildPatterns();
    const s = text.replace(/\s+/g, ' ').trim();
    return patterns.filter(p => p.re.test(s)).map(p => p.key);
  }

  /* Text is matched only where the element holds it itself — a container's
     text runs on into its children's and would match too loosely */
  const ownText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());

  /* The keys behind an element: its own data-t, then a match on its text.
     With `attrs`, also the attributes that carry copy (a hint, a screen
     reader name, a placeholder). */
  function keysFor(el, attrs = true) {
    const out = [];
    const add = keys => keys.forEach(k => { if (!out.includes(k)) out.push(k); });
    const attrOnly = Boolean(el.dataset.tAttr);
    if (el.dataset.t && (attrs || !attrOnly)) add([el.dataset.t]);
    if (!out.length && ownText(el)) add(keysForText(el.textContent));
    if (attrs) ['data-tip', 'aria-label', 'placeholder', 'title'].forEach(a => add(keysForText(el.getAttribute(a))));
    return out;
  }

  const domReady = new Promise(res => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', res, { once: true });
    else res();
  });

  const ready = Promise.all([load(), domReady]).then(() => {
    apply();
    patterns = null;
    root.classList.remove('t-pending');
    console.info(`Content keys: ${Object.keys(texts).length} strings.`);
  });

  /* Never leave the page hidden, whatever went wrong above */
  ready.catch(err => { console.error('Content keys:', err); root.classList.remove('t-pending'); });

  window.Strings = { ready: ready.catch(() => {}), t, apply, keysFor,
                     get defaults() { return defaults; } };
  window.t = t;
})();
