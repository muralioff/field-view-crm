/* ============================================================
   Time picker — the Crux time component's behaviour, in plain JS
   Behaviour: docs/crux-time-component-behaviour.md (crux-time-component
   as Beat Engine's "Run scheduler at" uses it). Look: Figma 5988:122077.

   One text box that always holds a time, split into three segments —
   hour, minute, AM/PM — with a list of times below it.

   - Focus selects the hour. Focus alone does not open the list.
   - Click selects the segment under the pointer and opens the list.
   - The list holds 48 times, 12:00 AM to 11:30 PM in 30-minute steps.
     The current time is highlighted and scrolled into view; a time off
     the grid (9:15 AM) highlights nothing.
   - Digits fill the segment in focus and open the list, narrowing it to
     the matching AM/PM pair. Completing the hour — or typing : . , —
     moves on to the minutes. Any minute can be typed, not just :00/:30.
   - A or P sets the meridian. ← → Tab Shift+Tab move between segments;
     Tab past AM/PM (or Shift+Tab before the hour) leaves the field.
   - ↑/↓ with the list closed step the segment: hours by 1, minutes by
     30, rolling over into the hour and meridian. With the list open they
     move the highlight, and Enter picks it. Escape closes the list.
   - Letters, Backspace and Delete do nothing: the field cannot be
     cleared. Pasted text that is not a valid time is ignored.
   - Every accepted change commits at once and calls onChange.

   Display follows the Figma frame: "9:00 AM" (no leading zero).

   Usage:
     const tp = TimePicker.create(hostEl, { value: '9:00 AM', onChange(display, wire) {} });
     tp.value     → "9:00 AM"  ('' while blank)
     tp.wire      → "09:00"    (24-hour HH:mm, as saved)
     tp.setValue('2:30 PM')

   Extras for chained form fields (Beat Detail's visit dialogs):
     opts.mandatory            the red marker strip inside the left edge
     tp.clear()                blank, for a field locked until the ones above
                               it are answered; any value fills it again
     tp.setDisabled(on)
     tp.setDisabledTimes([..]) times greyed out in the list and not pickable
                               (a slot another visit already holds)
   ============================================================ */
(function () {
  const STEP = 30;            // list step, and the ↑/↓ step on minutes
  const HOUR_STEP = 1;        // ↑/↓ step on hours
  const SEGS = ['h', 'm', 'a'];
  let uid = 0;

  const pad = n => String(n).padStart(2, '0');

  /* "9:05 PM" → { h: 9, m: 5, a: 'PM' }, or null when it is not a time */
  function parse(text) {
    const t = String(text || '').trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]?\.?$/);
    if (!t) return null;
    const h = Number(t[1]), m = Number(t[2]);
    if (h < 1 || h > 12 || m > 59) return null;
    return { h, m, a: t[3].toUpperCase() === 'P' ? 'PM' : 'AM' };
  }

  const toMinutes = ({ h, m, a }) => ((h % 12) + (a === 'PM' ? 12 : 0)) * 60 + m;
  function fromMinutes(total) {
    const t = ((total % 1440) + 1440) % 1440;
    const h24 = Math.floor(t / 60);
    return { h: (h24 % 12) || 12, m: t % 60, a: h24 < 12 ? 'AM' : 'PM' };
  }
  const format = ({ h, m, a }) => `${h}:${pad(m)} ${a}`;

  /* The list: every half hour of the day */
  const GRID = Array.from({ length: 1440 / STEP }, (_, i) => fromMinutes(i * STEP));

  function create(host, opts = {}) {
    const id = `tp-${++uid}`;
    let t = parse(opts.value) || { h: 9, m: 0, a: 'AM' };
    let empty = opts.value === '';
    let blocked = new Set();  // minutes-of-day that cannot be picked
    let seg = 'h';
    let pending = null;      // first hour digit waiting for its second
    let narrowed = false;    // the list shows only the AM/PM pair being typed
    let active = -1;         // highlighted row while the list is open

    host.classList.add('tp');
    host.classList.toggle('mandatory', Boolean(opts.mandatory));
    host.innerHTML = `
      <div class="tp-box">
        <span class="tp-marker" aria-hidden="true"></span>
        <input class="tp-input" type="text" id="${opts.inputId || id}" autocomplete="off" spellcheck="false"
               role="combobox" aria-autocomplete="none" aria-expanded="false" aria-controls="${id}-list" />
        <span class="tp-caret" aria-hidden="true"></span>
      </div>
      <ul class="tp-list" id="${id}-list" role="listbox" hidden></ul>`;
    const box = host.querySelector('.tp-box');
    const input = host.querySelector('.tp-input');
    const list = host.querySelector('.tp-list');
    if (opts.ariaLabel) input.setAttribute('aria-label', opts.ariaLabel);

    /* ── Segments ─────────────────────────────────────── */
    function ranges() {
      const v = input.value, c = v.indexOf(':');
      return { h: [0, c], m: [c + 1, c + 3], a: [c + 4, v.length] };
    }
    function selectSeg(s) {
      seg = s;
      const [a, b] = ranges()[s];
      input.setSelectionRange(a, b);
    }
    function segAt(pos) {
      const r = ranges();
      if (pos <= r.h[1]) return 'h';
      if (pos <= r.m[1]) return 'm';
      return 'a';
    }

    /* ── Value ────────────────────────────────────────── */
    function show() { input.value = empty ? '' : format(t); }
    function commit(next, keepSeg = true) {
      const changed = empty || toMinutes(next) !== toMinutes(t) || next.a !== t.a || next.h !== t.h;
      t = next;
      empty = false;
      show();
      if (keepSeg && document.activeElement === input) selectSeg(seg);
      if (!list.hidden) drawList();
      if (changed && opts.onChange) opts.onChange(format(t), wire());
    }
    const wire = () => { const m = toMinutes(t); return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };

    /* ── List ─────────────────────────────────────────── */
    function rows() {
      if (!narrowed) return GRID;
      return [{ h: t.h, m: t.m, a: 'AM' }, { h: t.h, m: t.m, a: 'PM' }];
    }
    function drawList() {
      const items = rows();
      const cur = toMinutes(t);
      list.innerHTML = items.map((r, i) => {
        const sel = !empty && toMinutes(r) === cur;
        const off = blocked.has(toMinutes(r));
        return `<li class="tp-opt${sel ? ' selected' : ''}${off ? ' off' : ''}" role="option" id="${id}-o${i}"
                    aria-selected="${sel}"${off ? ' aria-disabled="true"' : ''} data-i="${i}">${format(r)}</li>`;
      }).join('');
      active = empty ? -1 : items.findIndex(r => toMinutes(r) === cur);
      markActive(true);
    }
    function markActive(scroll) {
      [...list.children].forEach((li, i) => li.classList.toggle('active', i === active));
      const li = list.children[active];
      if (li) {
        input.setAttribute('aria-activedescendant', li.id);
        if (scroll) li.scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }
    function open() {
      if (opts.disabled || !list.hidden) return;
      list.hidden = false;
      place();
      host.classList.add('open');
      input.setAttribute('aria-expanded', 'true');
      drawList();
      /* The current time sits in view, not just at the edge. A time off
         the grid highlights nothing, but the list still opens at its
         half hour. */
      const li = list.children[active >= 0 ? active : Math.floor(toMinutes(t) / STEP)];
      if (li) list.scrollTop = li.offsetTop - (list.clientHeight - li.offsetHeight) / 2;
    }
    /* The list is placed against the window, so a scrolling dialog body
       cannot clip it: below the field, or above it when there is no room */
    function place() {
      const r = box.getBoundingClientRect();
      list.style.left = `${r.left}px`;
      list.style.minWidth = `${r.width}px`;
      const h = Math.min(list.scrollHeight, 210) + 2;
      const below = r.bottom + 4 + h <= window.innerHeight - 8 || r.top - 4 - h < 8;
      list.style.top = below ? `${r.bottom + 4}px` : `${r.top - 4 - h}px`;
      host.classList.toggle('up', !below);
    }
    /* Scrolling anything but the list itself takes the field away from it */
    window.addEventListener('scroll', e => {
      if (!list.hidden && !list.contains(e.target)) close();
    }, true);
    window.addEventListener('resize', () => close());

    function close() {
      if (list.hidden) return;
      list.hidden = true;
      host.classList.remove('open');
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      narrowed = false;
    }
    function restoreFull() {
      if (!narrowed) return;
      narrowed = false;
      if (!list.hidden) drawList();
    }

    list.addEventListener('mousedown', e => e.preventDefault());   // keep focus in the field
    list.addEventListener('click', e => {
      const li = e.target.closest('.tp-opt');
      if (!li || li.classList.contains('off')) return;
      const r = rows()[Number(li.dataset.i)];
      close();
      input.focus();
      commit({ ...r });
    });

    /* ── Pointer ──────────────────────────────────────── */
    /* Clicking the box (the caret included) is clicking the field */
    box.addEventListener('mousedown', e => {
      if (opts.disabled) { e.preventDefault(); return; }
      if (e.target !== input) { e.preventDefault(); input.focus(); selectSeg(seg); open(); }
    });
    input.addEventListener('mouseup', () => {
      if (opts.disabled) return;
      pending = null;
      selectSeg(segAt(input.selectionStart));
      open();
    });

    /* Focus picks out the hour; blur closes and forgets any half-typed hour */
    let pointerFocus = false;
    input.addEventListener('mousedown', () => { pointerFocus = true; });
    input.addEventListener('focus', () => {
      host.classList.add('focus');
      if (!pointerFocus) requestAnimationFrame(() => selectSeg('h'));
      pointerFocus = false;
    });
    input.addEventListener('blur', () => {
      host.classList.remove('focus');
      pending = null;
      close();
    });
    document.addEventListener('mousedown', e => { if (!host.contains(e.target)) close(); });

    /* ── Keys ─────────────────────────────────────────── */
    function typeDigit(d) {
      open();
      if (empty) { empty = false; show(); selectSeg(seg); }
      if (seg === 'h') {
        let h = null, done = false;
        if (pending === '1') { h = d <= 2 ? 10 + d : (d || 12); done = true; }
        else if (pending === '0') { h = d === 0 ? 12 : d; done = true; }
        else if (d === 1) { h = 1; pending = '1'; }
        else if (d === 0) { pending = '0'; }
        else { h = d; done = true; }
        if (done) pending = null;
        narrowed = true;
        if (h !== null) commit({ ...t, h });
        else drawList();
        if (done) selectSeg('m');
      } else if (seg === 'm') {
        let m = (t.m % 10) * 10 + d;
        if (m > 59) m = d;
        narrowed = true;
        commit({ ...t, m });
      }
      /* Digits mean nothing on AM/PM */
    }

    function stepSeg(dir) {
      if (empty) return commit({ ...t });
      const now = toMinutes(t);
      if (seg === 'a') return commit({ ...t, a: t.a === 'AM' ? 'PM' : 'AM' });
      const by = seg === 'h' ? HOUR_STEP * 60 : STEP;
      commit(fromMinutes(now + dir * by));
    }

    function moveSeg(dir) {
      const i = SEGS.indexOf(seg) + dir;
      if (i < 0 || i >= SEGS.length) return false;
      pending = null;
      selectSeg(SEGS[i]);
      return true;
    }

    input.addEventListener('keydown', e => {
      if (opts.disabled) return;
      const k = e.key;
      const isOpen = !list.hidden;

      if (k === 'Tab') {
        close();
        /* Inside the field Tab walks the segments; past either end it leaves */
        if (moveSeg(e.shiftKey ? -1 : 1)) e.preventDefault();
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        /* Let copy, paste and select-all through; nothing else edits */
        if (!/^[acv]$/i.test(k)) e.preventDefault();
        return;
      }

      if (/^\d$/.test(k)) { e.preventDefault(); typeDigit(Number(k)); return; }
      if (k === ':' || k === '.' || k === ',') {
        e.preventDefault();
        if (seg === 'h') { pending = null; selectSeg('m'); }
        return;
      }

      /* Every other key brings back the whole list */
      restoreFull();

      if (k === 'ArrowLeft' || k === 'ArrowRight') {
        e.preventDefault();
        moveSeg(k === 'ArrowLeft' ? -1 : 1);
        return;
      }
      if (k === 'ArrowUp' || k === 'ArrowDown') {
        e.preventDefault();
        if (isOpen) {
          const n = list.children.length;
          active = active < 0 ? (k === 'ArrowDown' ? 0 : n - 1)
                              : Math.min(n - 1, Math.max(0, active + (k === 'ArrowDown' ? 1 : -1)));
          markActive(true);
        } else {
          pending = null;
          stepSeg(k === 'ArrowUp' ? 1 : -1);
        }
        return;
      }
      if (k === 'Enter') {
        e.preventDefault();
        if (isOpen && active >= 0 && !list.children[active].classList.contains('off')) {
          const r = rows()[active];
          close();
          commit({ ...r });
        }
        return;
      }
      if (k === 'Escape') {
        if (isOpen) { e.preventDefault(); e.stopPropagation(); close(); }
        return;
      }
      if (seg === 'a' && /^[ap]$/i.test(k)) {
        e.preventDefault();
        commit({ ...t, a: k.toUpperCase() === 'P' ? 'PM' : 'AM' });
        return;
      }
      /* Letters, Backspace, Delete, space: blocked — the field never empties */
      if (k.length === 1 || k === 'Backspace' || k === 'Delete') e.preventDefault();
    });

    /* Paste a whole time, or nothing changes */
    input.addEventListener('paste', e => {
      e.preventDefault();
      const next = parse((e.clipboardData || window.clipboardData).getData('text'));
      if (next) { pending = null; commit(next); }
    });
    /* Anything else that edits the text (drop, IME) is put back */
    input.addEventListener('input', () => { show(); selectSeg(seg); });
    input.addEventListener('drop', e => e.preventDefault());

    function setDisabled(on) {
      opts.disabled = on;
      input.disabled = on;
      host.classList.toggle('disabled', on);
      if (on) close();
    }

    show();
    if (opts.disabled) setDisabled(true);

    return {
      get value() { return empty ? '' : format(t); },
      get wire() { return empty ? '' : wire(); },
      get isEmpty() { return empty; },
      get disabled() { return Boolean(opts.disabled); },
      setValue(text) {
        const n = parse(text);
        if (n) { t = n; empty = false; show(); if (!list.hidden) drawList(); }
      },
      clear() { empty = true; show(); },
      setDisabled,
      setDisabledTimes(times) {
        blocked = new Set((times || []).map(parse).filter(Boolean).map(toMinutes));
        if (!list.hidden) drawList();
      },
      input,
    };
  }

  window.TimePicker = { create, parse, format };
})();
