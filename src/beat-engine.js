/* ============================================================
   Beat Engine — the wizard's step 3
   Figma 5988:117145 for Beat Limits and the Auto-create toggle.

   Beat Limits are two whole numbers, all mandatory, each with its own
   range (docs/beat-engine-spec.md §3). Below them a summary reads the
   limits back as sentences, rewritten on every keystroke; Company
   Settings on the right is read-only and says what a business day is.

   Error outlines and the shared tooltip live in src/field-errors.js.
   ============================================================ */
(function () {
  const MESSAGES = {
    empty: 'Field cannot be empty.',
    zero:  'Must be at least 1.',
    above: max => `Must be ${max} or less.`,
  };

  const $ = id => document.getElementById(id);
  const bodyEl = $('be-body');
  const fieldsEl = $('be-fields');
  const summaryEl = $('be-summary-body');
  const toastEl = $('pc-toast');
  const autoBtn = $('be-auto');
  const autoBody = $('be-auto-body');

  const errors = PCErrors.create({
    scope: fieldsEl,
    scroller: bodyEl,
    tip: $('pc-tip'),
  });

  const inputs = [...fieldsEl.querySelectorAll('.be-num')];

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* The field's error message, or '' when it holds a usable value */
  function problemOf(input) {
    const raw = input.value.trim();
    if (!raw) return MESSAGES.empty;
    const n = Number(raw);
    if (n === 0) return MESSAGES.zero;
    if (n > Number(input.dataset.max)) return MESSAGES.above(input.dataset.max);
    return '';
  }

  /* Each limit as a number, or null when it is empty or out of range */
  function values() {
    return Object.fromEntries(inputs.map(input =>
      [input.dataset.key, problemOf(input) ? null : Number(input.value)]));
  }

  /* ── Summary ───────────────────────────────────────── */
  const plural = (n, one, many = one + 's') => `<b>${n}</b> ${n === 1 ? one : many}`;

  /* A sentence needs every number it uses; a missing one drops that
     sentence instead of printing a wrong or empty value */
  function renderSummary() {
    const { visits, days } = values();
    const lines = [];

    if (days !== null && visits !== null) {
      lines.push(`Each Beat can span up to ${plural(days, 'business day')}, with up to ${plural(visits, 'Visit')} scheduled per day.`);
    } else if (days !== null) {
      lines.push(`Each Beat can span up to ${plural(days, 'business day')}.`);
    } else if (visits !== null) {
      lines.push(`Up to ${plural(visits, 'Visit')} can be scheduled per day.`);
    }

    summaryEl.innerHTML = lines.length
      ? lines.map(l => `<p>${l}</p>`).join('')
      : '<p class="be-summary-empty">Enter the Beat limits to see what they allow.</p>';
  }

  /* ── Inputs ────────────────────────────────────────── */
  /* Whole digits only, on paste as well as typing; two digits covers every range */
  fieldsEl.addEventListener('input', e => {
    const input = e.target;
    if (!input.classList.contains('be-num')) return;
    input.value = input.value.replace(/\D/g, '').slice(0, 2);
    errors.clear(input);
    errors.retarget();
    renderSummary();
  });

  function validate() {
    errors.clearAll();
    inputs.forEach(input => {
      const problem = problemOf(input);
      if (problem) errors.set(input, problem);
    });
    return errors.showFirst();
  }

  /* ── Auto-create Beats ─────────────────────────────── */
  /* Fixed 30-minute steps across the day, 9:00 AM preselected */
  const timeSel = $('be-time');
  for (let m = 0; m < 24 * 60; m += 30) {
    const h = Math.floor(m / 60), min = m % 60;
    const label = `${(h % 12) || 12}:${String(min).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    timeSel.add(new Option(label, label, false, label === '9:00 AM'));
  }

  autoBtn.addEventListener('click', () => {
    const on = autoBtn.getAttribute('aria-checked') !== 'true';
    autoBtn.setAttribute('aria-checked', String(on));
    autoBody.hidden = !on;
  });

  $('be-add-rule').addEventListener('click', () => toast('The rule builder is not part of this prototype yet.'));
  $('be-manage').addEventListener('click', e => {
    e.preventDefault();
    toast('Opens Company Details in a new tab.');
  });

  /* ── Footer ────────────────────────────────────────── */
  $('pc-next').addEventListener('click', () => {
    if (validate()) toast('Beat Engine saved — next: Field Rules.');
  });
  $('pc-draft').addEventListener('click', () => toast('Saved as draft.'));
  $('pc-previous').addEventListener('click', () => { window.location.href = 'visit-types.html'; });
  $('pc-cancel').addEventListener('click', () => { window.location.href = 'index.html'; });

  renderSummary();
})();
