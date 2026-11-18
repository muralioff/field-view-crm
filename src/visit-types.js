/* ============================================================
   Visit Types — the wizard's step 2
   Row behaviour taken from the reference frames:
     4115:774722 — initial state: one empty row, add (+) only,
                   duration prefilled, every field Visible
     4115:775129 — every row gets remove (−), the last row also gets
                   add (+); invalid fields are outlined red
   Return in the visit-type field adds the next row.

   Figma 6339:176759: a dropdown per field picks Visible / Mandatory /
   Hide, and the Notes field is labelled Comments.

   Error outlines and the shared tooltip live in src/field-errors.js.
   Full behaviour contract: docs/visit-types-spec.md

   The rows are written to the wizard state as they change: Beat Engine's
   Visit Type list is this same list, and a type created there with
   Quick Create shows up here.
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

  /* Each field's choices. Visible is the default: the rep sees the field
     and may leave it empty. */
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
    { key: 'notes', label: 'Comments' },
  ];

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
    const fields = FIELDS.map(f => `<span>${f.label}</span>`).join('');
    return `
      <span>Visit Type Name</span>
      <span>Duration <span class="pc-unit">(min)</span></span>
      ${fields}
      <span></span>`;
  }

  function fieldCell(f, value) {
    const options = VISIBILITY.map(([v, text]) =>
      `<option value="${v}"${v === value ? ' selected' : ''}>${text}</option>`).join('');
    return `
      <span class="pc-cell">
        <select class="pc-field vt-visibility" data-field="${f.key}" aria-label="${f.label}">${options}</select>
      </span>`;
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

  /* Previous, Cancel, Save as Draft and Next are wired by the wizard */
  function persist() {
    Planner.state.visitTypes = readRows();
    Planner.save();
  }

  rowsEl.addEventListener('input', persist);
  rowsEl.addEventListener('change', persist);
  rowsEl.addEventListener('click', e => { if (e.target.closest('.pc-icon-btn')) persist(); });

  /* The rows as the wizard state holds them */
  function readRows() {
    return [...rowsEl.children].map(tr => {
      const row = {
        name: tr.querySelector('.pc-name').value,
        duration: tr.querySelector('.pc-duration').value,
      };
      FIELDS.forEach(f => { row[f.key] = tr.querySelector(`[data-field="${f.key}"]`).value; });
      return row;
    });
  }

  /* Initial state: the rows saved for this planner, or one empty row with
     the duration prefilled and every field Visible */
  const saved = Planner.state.visitTypes;
  headEl.innerHTML = headHtml();
  (saved.length ? saved : [{}]).forEach(row => addRow(row));
  persist();
  rowsEl.querySelector('.pc-name').focus();
  Planner.initPage({ index: 1, validate });
})();
