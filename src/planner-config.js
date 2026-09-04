/* ============================================================
   Planner Configuration — Visit Types step
   Row behaviour taken from the reference frames:
     4115:774722 — initial state: one empty row, add (+) only,
                   duration prefilled, nothing checked
     4115:775129 — every row gets remove (−), the last row also gets
                   add (+); invalid fields are outlined red
   Return in the visit-type field adds the next row.

   An invalid visit-type or duration field gets a red outline only, so
   the row never grows. One tooltip carries the message: it opens on
   the first invalid field and hands over to whichever invalid field
   the pointer moves to, so exactly one is on screen at a time.
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

  const rowsEl = document.getElementById('pc-rows');
  const bodyEl = document.querySelector('.pc-body');
  const toastEl = document.getElementById('pc-toast');
  const tipEl = document.getElementById('pc-tip');

  let tipField = null;   // the field the tooltip currently points at

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

  /* ── The one tooltip, moved between invalid fields ─── */
  function showTip(field) {
    if (!field || !field.dataset.error) return hideTip();
    tipField = field;
    tipEl.textContent = field.dataset.error;
    tipEl.classList.add('show');
    tipEl.setAttribute('aria-hidden', 'false');
    placeTip();
  }

  function placeTip() {
    if (!tipField) return;
    const r = tipField.getBoundingClientRect();
    /* Hide rather than float loose when the field scrolls out of the table */
    const body = bodyEl.getBoundingClientRect();
    if (r.bottom < body.top || r.top > body.bottom) {
      tipEl.classList.remove('show');
      return;
    }
    tipEl.classList.add('show');
    tipEl.style.top = `${r.bottom + 6}px`;
    /* Left-align with the field, pulled in if it would leave the viewport */
    const width = tipEl.offsetWidth;
    const left = Math.min(r.left, window.innerWidth - width - 12);
    tipEl.style.left = `${left}px`;
    /* Arrow points at the field even after that nudge */
    tipEl.style.setProperty('--tip-arrow', `${Math.max(10, r.left - left + 24)}px`);
  }

  function hideTip() {
    tipField = null;
    tipEl.classList.remove('show');
    tipEl.setAttribute('aria-hidden', 'true');
  }

  /* Always leave one tooltip up: fall back to the first field still invalid */
  function retargetTip() {
    if (tipField && tipField.isConnected && tipField.dataset.error) return placeTip();
    const next = rowsEl.querySelector('.pc-field.invalid');
    if (next) showTip(next); else hideTip();
  }

  /* ── Field errors ──────────────────────────────────── */
  function setError(field, key) {
    clearError(field);
    field.classList.add('invalid');
    field.setAttribute('aria-invalid', 'true');
    field.dataset.error = MESSAGES[key];
  }

  function clearError(field) {
    field.classList.remove('invalid');
    field.removeAttribute('aria-invalid');
    delete field.dataset.error;
    if (tipField === field) tipField = null;
  }

  function clearAllErrors() {
    rowsEl.querySelectorAll('.pc-field').forEach(clearError);
    hideTip();
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
    retargetTip();
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
    if (!checkName(name, seen)) { retargetTip(); return; }
    addRow(null, tr).querySelector('.pc-name').focus();
    retargetTip();
  });

  rowsEl.addEventListener('input', e => {
    const field = e.target;
    if (!field.classList.contains('pc-field')) return;
    if (field.classList.contains('pc-duration')) {
      field.value = field.value.replace(/\D/g, '').slice(0, 3);
    }
    /* An error clears as soon as the field is edited */
    if (field.classList.contains('invalid')) { clearError(field); retargetTip(); }
  });

  /* Hovering another invalid field hands the tooltip over to it */
  rowsEl.addEventListener('mouseover', e => {
    const field = e.target.closest('.pc-field.invalid');
    if (field && field !== tipField) showTip(field);
  });

  bodyEl.addEventListener('scroll', placeTip);
  window.addEventListener('resize', placeTip);

  /* Checks one row's name against the names above it. Returns true when clean. */
  function checkName(name, seen) {
    const value = name.value.trim();
    const key = value.toLowerCase();
    if (!value) { setError(name, 'emptyName'); return false; }
    if (seen.has(key)) { setError(name, 'duplicateName'); return false; }
    seen.set(key, true);
    return true;
  }

  function validate() {
    clearAllErrors();
    const seen = new Map();

    [...rowsEl.children].forEach(tr => {
      const name = tr.querySelector('.pc-name');
      const duration = tr.querySelector('.pc-duration');
      checkName(name, seen);

      if (!duration.value.trim()) setError(duration, 'emptyDuration');
      else if (Number(duration.value) === 0) setError(duration, 'zeroDuration');
    });

    const firstBad = rowsEl.querySelector('.pc-field.invalid');
    if (!firstBad) return true;
    showTip(firstBad);
    return false;
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
