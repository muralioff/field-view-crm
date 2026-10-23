/* ============================================================
   Record picker — Module & Record lookup (Figma 6678:569481)

   A dropdown field. Opening it shows a panel with a module switcher
   joined to a search box, then the records of that module — names only.
   The switcher opens its own small menu (the current module ticked) and
   picking a module filters the list to it. Typing in the search narrows
   the list by name.

   Keys: ↓ / Enter / Space on the field open it. In the search, ↑ ↓ move
   the highlight and Enter picks it. Escape closes the module menu, then
   the panel. A click outside closes everything.

   Usage:
     const rp = RecordPicker.create(hostEl, {
       modules: { Leads: ['Karthik Rao', …], Contacts: […], … },
       placeholder: 'None', mandatory: true,
       onChange(record, module) {},
     });
     rp.value  → 'Karthik Rao'  ('' until one is picked)
     rp.module → 'Leads'
     rp.clear()
     rp.field  → the field button (for error messages)
   ============================================================ */
(function () {
  let uid = 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const TICK = '<svg class="rp-tick" width="11" height="9" viewBox="0 0 11 8.38833" fill="none" aria-hidden="true"><path d="M1 4.333L3.769 7L10 1" stroke-width="2" stroke-linecap="round" stroke="currentColor"/></svg>';
  const SEARCH = '<svg class="rp-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><g opacity="0.7"><path d="M10.6953 6.13937C10.6953 8.65546 8.65557 10.6952 6.13948 10.6952C3.62339 10.6952 1.58369 8.65546 1.58369 6.13937C1.58369 3.62328 3.62339 1.58359 6.13948 1.58359C8.65557 1.58359 10.6953 3.62328 10.6953 6.13937Z" stroke-width="1.5" stroke-miterlimit="10" stroke="#313949"/><path d="M12.6188 12.4163L9.68289 9.48038" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke="#313949"/></g></svg>';

  function create(host, opts) {
    const id = `rp-${++uid}`;
    const modules = opts.modules;
    const names = Object.keys(modules);
    let value = '', valueModule = '';
    let module = names[0];
    let query = '';
    let active = -1;

    host.classList.add('rp');
    host.classList.toggle('mandatory', Boolean(opts.mandatory));
    host.innerHTML = `
      <button class="rp-field" type="button" id="${opts.fieldId || id}"
              aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-panel">
        <span class="rp-marker" aria-hidden="true"></span>
        <span class="rp-value placeholder">${esc(opts.placeholder || 'None')}</span>
        <span class="rp-caret" aria-hidden="true"></span>
      </button>
      <div class="rp-panel" id="${id}-panel" hidden>
        <div class="rp-bar">
          <div class="rp-combo">
            <button class="rp-module" type="button" aria-haspopup="listbox" aria-expanded="false"
                    aria-controls="${id}-mods"><span class="rp-module-name"></span><span class="rp-module-caret" aria-hidden="true"></span></button>
            <span class="rp-divider" aria-hidden="true"></span>
            <label class="rp-search">
              ${SEARCH}
              <input class="rp-search-input" type="text" placeholder="Search" autocomplete="off" spellcheck="false"
                     role="combobox" aria-autocomplete="list" aria-controls="${id}-list" aria-expanded="true"
                     aria-label="Search records" />
            </label>
          </div>
        </div>
        <ul class="rp-list" id="${id}-list" role="listbox" aria-label="Records"></ul>
        <ul class="rp-mods" id="${id}-mods" role="listbox" aria-label="Modules" hidden></ul>
      </div>`;

    const field = host.querySelector('.rp-field');
    const valueEl = host.querySelector('.rp-value');
    const panel = host.querySelector('.rp-panel');
    const modBtn = host.querySelector('.rp-module');
    const modName = host.querySelector('.rp-module-name');
    const search = host.querySelector('.rp-search-input');
    const list = host.querySelector('.rp-list');
    const mods = host.querySelector('.rp-mods');

    /* ── Drawing ──────────────────────────────────────── */
    function rows() {
      const q = query.trim().toLowerCase();
      return modules[module].filter(n => !q || n.toLowerCase().includes(q));
    }
    function drawList() {
      modName.textContent = module;
      const items = rows();
      list.innerHTML = items.length
        ? items.map((n, i) => {
            const sel = n === value && module === valueModule;
            return `<li class="rp-opt${sel ? ' selected' : ''}" role="option" id="${id}-r${i}"
                        aria-selected="${sel}" data-i="${i}">${sel ? TICK : ''}<span>${esc(n)}</span></li>`;
          }).join('')
        : '<li class="rp-empty" role="presentation">No records found</li>';
      active = Math.max(0, items.findIndex(n => n === value && module === valueModule));
      if (!items.length) active = -1;
      markActive();
    }
    function markActive() {
      [...list.querySelectorAll('.rp-opt')].forEach((li, i) => li.classList.toggle('active', i === active));
      const li = list.querySelectorAll('.rp-opt')[active];
      if (li) { search.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
      else search.removeAttribute('aria-activedescendant');
    }
    function drawMods() {
      mods.innerHTML = names.map(m => {
        const sel = m === module;
        return `<li class="rp-opt${sel ? ' selected' : ''}" role="option" aria-selected="${sel}" data-m="${esc(m)}">${sel ? TICK : ''}<span>${esc(m)}</span></li>`;
      }).join('');
    }
    function showValue() {
      /* Picked, the field reads "Record • Module", as Revise Visit shows it;
         the list itself stays names only */
      valueEl.textContent = value ? `${value} • ${valueModule}` : (opts.placeholder || 'None');
      valueEl.classList.toggle('placeholder', !value);
    }

    /* ── Open / close ─────────────────────────────────── */
    /* The panel is placed against the window so a scrolling dialog body
       cannot clip it: right under the field, or above it without room */
    function place() {
      const r = field.getBoundingClientRect();
      panel.style.left = `${r.left}px`;
      panel.style.width = `${r.width}px`;
      const h = panel.offsetHeight;
      const below = r.bottom + h <= window.innerHeight - 8 || r.top - h < 8;
      panel.style.top = below ? `${r.bottom}px` : `${r.top - h}px`;
    }
    function open() {
      if (!panel.hidden) return;
      if (valueModule) module = valueModule;
      query = ''; search.value = '';
      drawList();
      panel.hidden = false;
      host.classList.add('open');
      field.setAttribute('aria-expanded', 'true');
      place();
      /* A dialog still dropping in moves the field; settle with it */
      setTimeout(() => { if (!panel.hidden) place(); }, 300);
      search.focus();
    }
    function close(refocus) {
      closeMods();
      if (panel.hidden) return;
      panel.hidden = true;
      host.classList.remove('open');
      field.setAttribute('aria-expanded', 'false');
      if (refocus) field.focus();
    }
    function openMods() {
      drawMods();
      mods.hidden = false;
      modBtn.setAttribute('aria-expanded', 'true');
      host.classList.add('mods-open');
    }
    function closeMods() {
      if (mods.hidden) return;
      mods.hidden = true;
      modBtn.setAttribute('aria-expanded', 'false');
      host.classList.remove('mods-open');
    }

    function pick(n) {
      const changed = n !== value || module !== valueModule;
      value = n; valueModule = module;
      showValue();
      close(true);
      if (changed && opts.onChange) opts.onChange(value, valueModule);
    }

    /* ── Events ───────────────────────────────────────── */
    field.addEventListener('click', () => (panel.hidden ? open() : close(true)));
    field.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });

    modBtn.addEventListener('click', () => (mods.hidden ? openMods() : closeMods()));
    mods.addEventListener('click', e => {
      const li = e.target.closest('.rp-opt');
      if (!li) return;
      module = li.dataset.m;
      closeMods();
      drawList();
      search.focus();
    });

    search.addEventListener('input', () => { query = search.value; closeMods(); drawList(); });
    search.addEventListener('keydown', e => {
      const n = list.querySelectorAll('.rp-opt').length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!n) return;
        active = Math.min(n - 1, Math.max(0, active + (e.key === 'ArrowDown' ? 1 : -1)));
        markActive();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = rows()[active];
        if (r) pick(r);
      } else if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        if (!mods.hidden) closeMods(); else close(true);
      } else if (e.key === 'Tab') {
        close();
      }
    });

    list.addEventListener('mousedown', e => e.preventDefault());
    list.addEventListener('click', e => {
      const li = e.target.closest('.rp-opt');
      if (li) pick(rows()[Number(li.dataset.i)]);
    });
    list.addEventListener('mousemove', e => {
      const li = e.target.closest('.rp-opt');
      if (!li) return;
      const i = Number(li.dataset.i);
      if (i !== active) { active = i; markActive(); }
    });

    document.addEventListener('mousedown', e => {
      if (panel.hidden) return;
      if (!host.contains(e.target)) close();
      else if (!mods.hidden && !mods.contains(e.target) && !modBtn.contains(e.target)) closeMods();
    });
    window.addEventListener('scroll', e => {
      if (!panel.hidden && !panel.contains(e.target)) close();
    }, true);
    window.addEventListener('resize', () => close());

    showValue();

    return {
      get value() { return value; },
      get module() { return valueModule; },
      clear() { value = ''; valueModule = ''; module = names[0]; showValue(); close(); },
      field,
    };
  }

  window.RecordPicker = { create };
})();
