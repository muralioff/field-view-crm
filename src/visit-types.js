/* ============================================================
   Visit Types — the wizard's step 2
   Row behaviour taken from the reference frames:
     4115:774722 — initial state: one empty row, add (+) only,
                   duration prefilled, nothing checked
     4115:775129 — every row gets remove (−), the last row also gets
                   add (+); invalid fields are outlined red
   Return in the visit-type field adds the next row.

   Two designs share every behaviour above (Type switch in the top bar):
     Type 1 — a checkbox per field marks it mandatory
     Type 2 — Figma 6339:176759: a dropdown per field picks
              Visible / Mandatory / Hide, and Notes becomes Comments

   Error outlines and the shared tooltip live in src/field-errors.js.
   Full behaviour contract: docs/visit-types-spec.md
   ============================================================ */
(function () {
  /* Duration a fresh row starts with, per the reference frames */
  const DEFAULT_DURATION = '15';

  const MESSAGES = {
    emptyName:     'Field cannot be empty.',
    emptyDuration: 'Field cannot be empty.',
    duplicateName: 'Visit type already exists.',
    zeroDuration:  'Duration must be above 0.',
  };

  /* Type 2's choices for each field. Visible is the default: the rep sees
     the field and may leave it empty, as an unticked Type 1 checkbox does. */
  const VISIBILITY = [
    ['visible',   'Visible'],
    ['mandatory', 'Mandatory'],
    ['hide',      'Hide'],
  ];
  const DEFAULT_VISIBILITY = 'visible';

  /* The three per-visit fields, in column order */
  const FIELDS = [
    { key: 'image', label: 'Image Upload' },
    { key: 'file',  label: 'File Upload' },
    { key: 'notes', label: 'Notes', label2: 'Comments' },
  ];

  const LAYOUT_KEY = 'vt-layout';
  let layout = '1';

  const rowsEl = document.getElementById('pc-rows');
  const headEl = document.getElementById('pc-thead');
  const bodyEl = document.querySelector('.pc-body');
  const toastEl = document.getElementById('pc-toast');

  const errors = PCErrors.create({
    scope: rowsEl,
    scroller: bodyEl,
    tip: document.getElementById('pc-tip'),
  });

  function headHtml() {
    const fields = FIELDS.map(f => layout === '2'
      ? `<span>${f.label2 || f.label}</span>`
      : `<span class="pc-center">${f.label}</span>`).join('');
    return `
      <span>Visit Type Name</span>
      <span>Duration <span class="pc-unit">(min)</span></span>
      ${fields}
      <span></span>`;
  }

  function fieldCell(f, value) {
    const label = f.label2 || f.label;
    if (layout === '2') {
      const options = VISIBILITY.map(([v, text]) =>
        `<option value="${v}"${v === value ? ' selected' : ''}>${text}</option>`).join('');
      return `
      <span class="pc-cell">
        <select class="pc-field vt-visibility" data-field="${f.key}" aria-label="${label}">${options}</select>
      </span>`;
    }
    return `
      <span class="pc-cell-center"><input type="checkbox" data-field="${f.key}" aria-label="${label} mandatory" ${value === 'mandatory' ? 'checked' : ''}></span>`;
  }

  function rowHtml(row) {
    return `
      <span class="pc-cell">
        <input class="pc-field pc-name" type="text" placeholder="Visit Type"
               aria-label="Visit type name" value="${row.name}" />
      </span>
      <span class="pc-cell">
        <input class="pc-field pc-duration" type="text" inputmode="numeric"
               aria-label="Duration in minutes" value="${row.duration}" />
      </span>
      ${FIELDS.map(f => fieldCell(f, row[f.key])).join('')}
      <span class="pc-actions">
        <button class="pc-icon-btn remove" type="button" aria-label="Remove visit type">
          <i class="ti ti-circle-minus" aria-hidden="true"></i>
        </button>
        <button class="pc-icon-btn add" type="button" aria-label="Add visit type">
          <i class="ti ti-circle-plus" aria-hidden="true"></i>
        </button>
      </span>`;
  }

  function addRow(row, afterEl) {
    const tr = document.createElement('div');
    tr.className = 'pc-tr';
    tr.innerHTML = rowHtml(Object.assign(
      { name: '', duration: DEFAULT_DURATION,
        image: DEFAULT_VISIBILITY, file: DEFAULT_VISIBILITY, notes: DEFAULT_VISIBILITY }, row
    ));
    if (afterEl) afterEl.insertAdjacentElement('afterend', tr);
    else rowsEl.appendChild(tr);
    syncActions();
    return tr;
  }

  /* Remove is hidden while a single row remains; add shows on the last row only */
  function syncActions() {
    const rows = [...rowsEl.children];
    rows.forEach((tr, i) => {
      tr.querySelector('.pc-icon-btn.remove').hidden = rows.length === 1;
      tr.querySelector('.pc-icon-btn.add').hidden = i !== rows.length - 1;
    });
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ── Events ────────────────────────────────────────── */
  rowsEl.addEventListener('click', e => {
    const btn = e.target.closest('.pc-icon-btn');
    if (!btn) return;
    if (btn.classList.contains('add')) {
      addRow().querySelector('.pc-name').focus();
    } else {
      btn.closest('.pc-tr').remove();
      syncActions();
    }
    errors.retarget();
  });

  /* Return in the visit-type field adds the next row, once this one has a name */
  rowsEl.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.classList.contains('pc-name')) return;
    e.preventDefault();
    const name = e.target;
    const tr = name.closest('.pc-tr');
    /* Names in the other rows, so a repeat is caught before a row is added */
    const seen = new Map([...rowsEl.children]
      .filter(other => other !== tr)
      .map(other => [other.querySelector('.pc-name').value.trim().toLowerCase(), true]));
    errors.clear(name);
    if (!checkName(name, seen)) { errors.retarget(); return; }
    addRow(null, tr).querySelector('.pc-name').focus();
    errors.retarget();
  });

  /* Duration takes digits only, capped at three */
  rowsEl.addEventListener('input', e => {
    if (e.target.classList.contains('pc-duration')) {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
    }
  });

  /* Checks one row's name against the names already seen. True when clean. */
  function checkName(name, seen) {
    const value = name.value.trim();
    const key = value.toLowerCase();
    if (!value) { errors.set(name, MESSAGES.emptyName); return false; }
    if (seen.has(key)) { errors.set(name, MESSAGES.duplicateName); return false; }
    seen.set(key, true);
    return true;
  }

  function validate() {
    errors.clearAll();
    const seen = new Map();

    [...rowsEl.children].forEach(tr => {
      checkName(tr.querySelector('.pc-name'), seen);

      const duration = tr.querySelector('.pc-duration');
      if (!duration.value.trim()) errors.set(duration, MESSAGES.emptyDuration);
      else if (Number(duration.value) === 0) errors.set(duration, MESSAGES.zeroDuration);
    });

    return errors.showFirst();
  }

  document.getElementById('pc-next').addEventListener('click', () => {
    if (validate()) toast(`${rowsEl.children.length} visit type(s) saved — next: Beat Engine.`);
  });

  document.getElementById('pc-draft').addEventListener('click', () => toast('Saved as draft.'));
  document.getElementById('pc-previous').addEventListener('click', () => { window.location.href = 'planner-config.html'; });
  document.getElementById('pc-cancel').addEventListener('click', () => { window.location.href = 'index.html'; });

  /* ── Type switch ───────────────────────────────────── */
  /* Reads the rows back so a switch keeps what was typed. A ticked box is
     Mandatory; an unticked one is Visible, and Hide has no Type 1 form, so
     it comes back as an unticked box. */
  function readRows() {
    return [...rowsEl.children].map(tr => {
      const row = {
        name: tr.querySelector('.pc-name').value,
        duration: tr.querySelector('.pc-duration').value,
      };
      FIELDS.forEach(f => {
        const el = tr.querySelector(`[data-field="${f.key}"]`);
        row[f.key] = el.type === 'checkbox'
          ? (el.checked ? 'mandatory' : DEFAULT_VISIBILITY)
          : el.value;
      });
      return row;
    });
  }

  function setLayout(type) {
    const rows = rowsEl.children.length ? readRows() : [{}];
    layout = type;
    bodyEl.classList.toggle('vt-type-2', type === '2');
    document.querySelectorAll('.vt-layout-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.layout === type));
    try { localStorage.setItem(LAYOUT_KEY, type); } catch { /* private mode */ }
    headEl.innerHTML = headHtml();
    errors.clearAll();
    rowsEl.innerHTML = '';
    rows.forEach(row => addRow(row));
  }

  document.querySelector('.vt-layout').addEventListener('click', e => {
    const btn = e.target.closest('.vt-layout-btn');
    if (btn && btn.dataset.layout !== layout) setLayout(btn.dataset.layout);
  });

  let savedLayout = '1';
  try { savedLayout = localStorage.getItem(LAYOUT_KEY) || '1'; } catch { /* private mode */ }
  if (!['1', '2'].includes(savedLayout)) savedLayout = '1';

  /* Initial state, in both types: one empty row, duration prefilled,
     nothing checked (Type 1) or every field Visible (Type 2) */
  setLayout(savedLayout);
  rowsEl.querySelector('.pc-name').focus();
})();
