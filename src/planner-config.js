/* ============================================================
   Planner Configuration — Visit Types step
   Row behaviour taken from the reference frames:
     4115:774722 — initial state: one empty row, add (+) only,
                   duration prefilled, nothing checked
     4115:775129 — added state:  every row gets remove (−), the last
                   row also gets add (+); an invalid field shows a red
                   outline and an inline message under the input
   Return in the visit-type field adds the next row.
   ============================================================ */
(function () {
  /* Duration a fresh row starts with, per the reference frames */
  const DEFAULT_DURATION = '15';

  const rowsEl = document.getElementById('pc-rows');
  const toastEl = document.getElementById('pc-toast');

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
      <span class="pc-cell-center"><input type="checkbox" aria-label="Image upload mandatory" ${row.image ? 'checked' : ''}></span>
      <span class="pc-cell-center"><input type="checkbox" aria-label="File upload mandatory" ${row.file ? 'checked' : ''}></span>
      <span class="pc-cell-center"><input type="checkbox" aria-label="Notes mandatory" ${row.notes ? 'checked' : ''}></span>
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
      { name: '', duration: DEFAULT_DURATION, image: false, file: false, notes: false }, row
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

  /* ── Inline field errors ───────────────────────────── */
  function setError(field, message) {
    clearError(field);
    field.classList.add('invalid');
    field.setAttribute('aria-invalid', 'true');
    const msg = document.createElement('span');
    msg.className = 'pc-error';
    msg.textContent = message;
    field.parentElement.appendChild(msg);
  }

  function clearError(field) {
    field.classList.remove('invalid');
    field.removeAttribute('aria-invalid');
    const msg = field.parentElement.querySelector('.pc-error');
    if (msg) msg.remove();
  }

  function clearAllErrors() {
    rowsEl.querySelectorAll('.pc-field').forEach(clearError);
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
      const tr = addRow();
      tr.querySelector('.pc-name').focus();
    } else {
      btn.closest('.pc-tr').remove();
      syncActions();
    }
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
    clearError(name);
    if (!checkName(name, seen)) return;
    addRow(null, tr).querySelector('.pc-name').focus();
  });

  rowsEl.addEventListener('input', e => {
    const field = e.target;
    if (!field.classList.contains('pc-field')) return;
    if (field.classList.contains('pc-duration')) {
      field.value = field.value.replace(/\D/g, '').slice(0, 3);
    }
    /* An error clears as soon as the field is edited */
    if (field.classList.contains('invalid')) clearError(field);
  });

  /* Checks one row's name against the names above it. Returns true when clean. */
  function checkName(name, seen) {
    const value = name.value.trim();
    const key = value.toLowerCase();
    if (!value) { setError(name, 'Visit type cannot be empty'); return false; }
    if (seen.has(key)) { setError(name, 'Visit type already exists'); return false; }
    seen.set(key, true);
    return true;
  }

  function validate() {
    clearAllErrors();
    const rows = [...rowsEl.children];
    const seen = new Map();
    let firstBad = null;

    rows.forEach(tr => {
      const name = tr.querySelector('.pc-name');
      const duration = tr.querySelector('.pc-duration');
      checkName(name, seen);

      /* Kept short so the message fits the narrow duration column on one line */
      if (!duration.value.trim()) {
        setError(duration, 'Cannot be empty');
      } else if (Number(duration.value) === 0) {
        setError(duration, 'Must be above 0');
      }
    });

    firstBad = rowsEl.querySelector('.pc-field.invalid');
    if (firstBad) { firstBad.focus(); return false; }
    return true;
  }

  document.getElementById('pc-next').addEventListener('click', () => {
    if (validate()) toast(`${rowsEl.children.length} visit type(s) saved — next: Beat Engine.`);
  });

  document.getElementById('pc-draft').addEventListener('click', () => toast('Saved as draft.'));
  document.getElementById('pc-previous').addEventListener('click', () => toast('Previous step: Planner Configuration.'));
  document.getElementById('pc-cancel').addEventListener('click', () => { window.location.href = 'index.html'; });

  /* Initial state: one empty row, duration prefilled, nothing checked */
  addRow().querySelector('.pc-name').focus();
})();
