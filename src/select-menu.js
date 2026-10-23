/* ============================================================
   Select menu — a dropdown whose unavailable options can say why
   A native <select> cannot show a tooltip on a disabled option, so this
   draws the list itself: the same field and list look as the record
   picker (Figma 6678:569481), and a greyed option names its reason in
   the page's white tooltip on hover or keyboard highlight.

   Keys: ↓ / Enter / Space on the field open it; ↑ ↓ move the highlight
   (over greyed options too, so their reason can be read), Enter picks,
   Escape or Tab closes.

   Usage:
     const sm = SelectMenu.create(hostEl, { placeholder: 'Select Date', mandatory: true,
                                            fieldId: 'x', onChange(value) {} });
     sm.setOptions([{ value: '0', label: 'Day 1 • 4 May', disabled: true, tip: 'Why not' }, …]);
     sm.value → '' until picked · sm.clear() · sm.setDisabled(on) · sm.field
   ============================================================ */
(function () {
  let uid = 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TICK = '<svg class="sm-tick" width="11" height="9" viewBox="0 0 11 8.38833" fill="none" aria-hidden="true"><path d="M1 4.333L3.769 7L10 1" stroke-width="2" stroke-linecap="round" stroke="currentColor"/></svg>';

  /* One tooltip for every menu on the page, above dialogs */
  let tip;
  function showTip(el, text) {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'sm-tip';
      tip.setAttribute('role', 'tooltip');
      document.body.appendChild(tip);
    }
    tip.textContent = text;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = `${Math.min(Math.max(8, r.left + 12), window.innerWidth - w - 8)}px`;
    tip.style.top = `${r.bottom + 6 + h <= window.innerHeight - 8 ? r.bottom + 6 : r.top - 6 - h}px`;
  }
  const hideTip = () => { if (tip) tip.hidden = true; };

  function create(host, opts = {}) {
    const id = `sm-${++uid}`;
    let options = [];
    let value = '';
    let active = -1;
    let disabled = false;

    host.classList.add('sm');
    host.classList.toggle('mandatory', Boolean(opts.mandatory));
    host.innerHTML = `
      <button class="sm-field" type="button" id="${opts.fieldId || id}" role="combobox"
              aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-list">
        <span class="sm-marker" aria-hidden="true"></span>
        <span class="sm-value placeholder"></span>
        <span class="sm-caret" aria-hidden="true"></span>
      </button>
      <ul class="sm-list" id="${id}-list" role="listbox" hidden></ul>`;
    const field = host.querySelector('.sm-field');
    const valueEl = host.querySelector('.sm-value');
    const list = host.querySelector('.sm-list');

    function showValue() {
      const o = options.find(x => x.value === value);
      valueEl.textContent = o ? o.label : (opts.placeholder || '');
      valueEl.classList.toggle('placeholder', !o);
    }

    function draw() {
      list.innerHTML = options.map((o, i) => {
        const sel = o.value === value;
        return `<li class="sm-opt${sel ? ' selected' : ''}${o.disabled ? ' off' : ''}" role="option"
                    id="${id}-o${i}" data-i="${i}" aria-selected="${sel}"${o.disabled ? ' aria-disabled="true"' : ''}>
                  ${sel ? TICK : ''}<span>${esc(o.label)}</span></li>`;
      }).join('');
      active = options.findIndex(o => o.value === value);
      if (active < 0) active = options.findIndex(o => !o.disabled);
      mark(false);
    }
    function mark(withTip) {
      const items = [...list.children];
      items.forEach((li, i) => li.classList.toggle('active', i === active));
      const li = items[active];
      if (li) {
        field.setAttribute('aria-activedescendant', li.id);
        li.scrollIntoView({ block: 'nearest' });
        const o = options[active];
        if (withTip && o.disabled && o.tip) showTip(li, o.tip); else hideTip();
      } else {
        field.removeAttribute('aria-activedescendant');
        hideTip();
      }
    }

    function place() {
      const r = field.getBoundingClientRect();
      list.style.left = `${r.left}px`;
      list.style.width = `${r.width}px`;
      const h = list.offsetHeight;
      const below = r.bottom + h <= window.innerHeight - 8 || r.top - h < 8;
      list.style.top = below ? `${r.bottom}px` : `${r.top - h}px`;
    }
    function open() {
      if (disabled || !list.hidden) return;
      draw();
      list.hidden = false;
      host.classList.add('open');
      field.setAttribute('aria-expanded', 'true');
      place();
      setTimeout(() => { if (!list.hidden) place(); }, 300);   // a dialog still dropping in
    }
    function close() {
      if (list.hidden) return;
      list.hidden = true;
      host.classList.remove('open');
      field.setAttribute('aria-expanded', 'false');
      field.removeAttribute('aria-activedescendant');
      hideTip();
    }
    function pick(i) {
      const o = options[i];
      if (!o || o.disabled) return;
      const changed = o.value !== value;
      value = o.value;
      showValue();
      close();
      field.focus();
      if (changed && opts.onChange) opts.onChange(value);
    }

    field.addEventListener('click', () => (list.hidden ? open() : close()));
    field.addEventListener('keydown', e => {
      const isOpen = !list.hidden;
      if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); return; }
      if (!isOpen) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        active = Math.min(options.length - 1, Math.max(0, active + (e.key === 'ArrowDown' ? 1 : -1)));
        mark(true);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pick(active);
      } else if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        close();
      } else if (e.key === 'Tab') {
        close();
      }
    });
    field.addEventListener('blur', () => setTimeout(() => { if (!host.contains(document.activeElement)) close(); }, 0));

    list.addEventListener('mousedown', e => e.preventDefault());
    list.addEventListener('click', e => {
      const li = e.target.closest('.sm-opt');
      if (li) pick(Number(li.dataset.i));
    });
    list.addEventListener('mouseover', e => {
      const li = e.target.closest('.sm-opt');
      if (!li) return;
      active = Number(li.dataset.i);
      mark(true);
    });
    list.addEventListener('mouseleave', hideTip);

    document.addEventListener('mousedown', e => { if (!host.contains(e.target)) close(); });
    window.addEventListener('scroll', e => { if (!list.hidden && !list.contains(e.target)) close(); }, true);
    window.addEventListener('resize', close);

    function setDisabled(on) {
      disabled = on;
      field.disabled = on;
      host.classList.toggle('disabled', on);
      if (on) close();
    }

    showValue();

    return {
      get value() { return value; },
      setOptions(list_) { options = list_.map(o => ({ ...o, value: String(o.value) })); value = ''; showValue(); },
      setValue(v) { value = String(v); showValue(); },
      clear() { value = ''; showValue(); close(); },
      setDisabled,
      field,
    };
  }

  window.SelectMenu = { create };
})();
