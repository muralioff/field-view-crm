/* ============================================================
   Field Rules — the wizard's step 4
   Behaviour contract: beat-planner-specs/03-field-rules.md

   Route Limits     Max Distance per Day (1–999, km or mile; switching the
                    unit converts the number) and Buffer Between Visits
                    (1–240 min). Whole digits only, on typing and paste.
   Ad hoc visits    a switch
   Start and End    a switch; its note (what happens when off) always shows
   Check-In and     radius 25–200 m with an info tooltip, Manual / Automatic
   Check-Out        cards — a radiogroup with exactly one always selected —
                    and Check-Out Mode as a dropdown with Manual only
   Beat Expense     a switch; while on: Fuel Expense (Record Manually /
   Tracking         Record Automatically, which asks for a Fuel Allowance
                    per km or mile), Other Expenses (the expense types and
                    whether each needs a receipt) and Manager Approval

   All seven values are written to the wizard state as they change, an
   invalid one included, so Previous never resets what was typed.
   ============================================================ */
(function () {
  const F = Planner.state.fieldRules;
  const { LIMITS, MESSAGES, KM_PER_MILE } = Planner;
  const $ = id => document.getElementById(id);
  const persist = () => Planner.save();

  const errors = PCErrors.create({ scope: $('fr-body'), inline: true });

  /* ── Numbers ───────────────────────────────────────── */
  const NUMBERS = [
    { el: $('fr-mileage'), key: 'mileage', min: 1, max: LIMITS.mileageMax,
      range: `Max Distance per Day must be a whole number between 1 and ${LIMITS.mileageMax}.` },
    { el: $('fr-buffer'), key: 'buffer', min: 1, max: LIMITS.bufferMax,
      range: `Buffer Between Visits must be between 1 and ${LIMITS.bufferMax} minutes.` },
    { el: $('fr-radius'), key: 'radius', min: LIMITS.radiusMin, max: LIMITS.radiusMax,
      range: `Check-In and Check-Out Radius must be between ${LIMITS.radiusMin} and ${LIMITS.radiusMax} meters.` },
  ];

  NUMBERS.forEach(({ el, key }) => {
    el.value = F[key];
    Planner.digitsOnly(el, 4);
    el.addEventListener('input', () => { F[key] = el.value; persist(); });
  });

  /* ── Unit ──────────────────────────────────────────── */
  /* Switching converts the number (rounded to whole) rather than relabel
     it; the converted value is validated on Next like any other */
  const unitEl = $('fr-unit');
  unitEl.value = F.unit;
  unitEl.addEventListener('change', () => {
    const mileage = $('fr-mileage');
    const raw = mileage.value.trim();
    if (raw) {
      const n = Number(raw);
      const converted = unitEl.value === 'mile' ? n / KM_PER_MILE : n * KM_PER_MILE;
      mileage.value = String(Math.round(converted));
      F.mileage = mileage.value;
      errors.clear(mileage);
    }
    F.unit = unitEl.value;
    persist();
  });

  /* ── Switches ──────────────────────────────────────── */
  /* Only the switch changes; the notes stay whatever the state */
  [[$('fr-adhoc'), 'adhoc'], [$('fr-loc'), 'prefLocation']].forEach(([btn, key]) => {
    btn.setAttribute('aria-checked', String(F[key]));
    btn.addEventListener('click', () => {
      F[key] = btn.getAttribute('aria-checked') !== 'true';
      btn.setAttribute('aria-checked', String(F[key]));
      persist();
    });
  });

  /* ── Card radiogroups (Check-In Mode, Fuel Expense) ── */
  /* Exactly one card always selected; Enter / Space pick (Space without
     scrolling the panel), arrow keys move, roving tabindex */
  function cardGroup(groupEl, initial, onPick) {
    const cards = [...groupEl.querySelectorAll('.fr-mode')];
    function select(mode, focus) {
      cards.forEach(card => {
        const on = card.dataset.mode === mode;
        card.setAttribute('aria-checked', String(on));
        card.tabIndex = on ? 0 : -1;
        if (on && focus) card.focus();
      });
      onPick(mode);
    }
    cards.forEach(card => {
      card.addEventListener('click', () => select(card.dataset.mode, true));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select(card.dataset.mode, true);
        } else if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
          e.preventDefault();
          const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
          select(cards[(cards.indexOf(card) + step + cards.length) % cards.length].dataset.mode, true);
        }
      });
    });
    select(initial, false);
  }

  cardGroup($('fr-modes'), F.mode === 'Automatic' ? 'Automatic' : 'Manual', mode => { F.mode = mode; persist(); });

  /* ── Beat Expense Tracking ─────────────────────────── */
  const X = F.expense;
  const CURRENCY = 'USD';          // the org's currency code, from Company Details
  const expBtn = $('fr-exp');
  const expBody = $('fr-exp-body');
  const allowance = $('fr-allowance');
  const rowsEl = $('fr-exp-rows');

  function showExpense() {
    expBtn.setAttribute('aria-checked', String(X.on));
    expBody.hidden = !X.on;
  }

  expBtn.addEventListener('click', () => {
    X.on = !X.on;
    if (!X.on) errors.clearAll();
    showExpense();
    persist();
  });

  /* Fuel: Record Automatically needs the rate it is worked out at */
  cardGroup($('fr-fuel'), X.fuel === 'automatic' ? 'automatic' : 'manual', mode => {
    X.fuel = mode;
    $('fr-allowance-row').hidden = mode !== 'automatic';
    if (mode !== 'automatic') errors.clear(allowance);
    persist();
  });

  $('fr-currency').textContent = CURRENCY;
  /* "per km" / "per mile", following the distance unit above */
  const syncAllowanceUnit = () => { $('fr-allowance-unit').textContent = `per ${unitEl.value}`; };
  unitEl.addEventListener('change', syncAllowanceUnit);
  syncAllowanceUnit();

  /* Money: digits and one decimal point, two places at most */
  allowance.value = X.allowance;
  allowance.addEventListener('input', () => {
    let v = allowance.value.replace(/[^\d.]/g, '');
    const dot = v.indexOf('.');
    if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '').slice(0, 2);
    v = v.slice(0, 7);
    if (v !== allowance.value) allowance.value = v;
    X.allowance = v;
    persist();
  });

  /* Other Expenses: one editable row per type. The name is handled as
     Visit Types handles its name: no mandatory strip, a red outline with
     the shared tooltip when empty or repeated, and Return adds the next
     row only once this one is valid. */
  const typeErrors = PCErrors.create({ scope: rowsEl, scroller: $('fr-body'), tip: $('pc-tip') });
  const TYPE_EXISTS = 'Expense type already exists.';

  function typeRow(t, i) {
    return `
      <div class="fr-exp-tr" role="row" data-i="${i}">
        <span class="pc-field-cell" role="cell">
          <input class="pc-field fr-exp-name" type="text" maxlength="${LIMITS.expenseTypeName}"
                 placeholder="Expense Type" aria-label="Expense type ${i + 1}" value="${Planner.escape(t.name)}" />
        </span>
        <span class="pc-field-cell" role="cell">
          <select class="pc-field fr-exp-receipt" aria-label="Receipt required for expense type ${i + 1}">
            <option value="yes"${t.receipt ? ' selected' : ''}>Yes</option>
            <option value="no"${t.receipt ? '' : ' selected'}>No</option>
          </select>
        </span>
        <span class="fr-exp-actions" role="cell">
          <button class="pc-icon-btn remove" type="button" aria-label="Remove expense type ${i + 1}"
                  ${X.types.length === 1 ? 'hidden' : ''}>
            <i class="ti ti-circle-minus" aria-hidden="true"></i>
          </button>
          <button class="pc-icon-btn add" type="button" aria-label="Add expense type"
                  ${i !== X.types.length - 1 ? 'hidden' : ''}>
            <i class="ti ti-circle-plus" aria-hidden="true"></i>
          </button>
        </span>
      </div>`;
  }

  /* As on Visit Types: − on every row while more than one is left, + on
     the last row only, so there is always at least one type */
  function renderTypes() {
    if (!X.types.length) X.types.push({ name: '', receipt: true });
    rowsEl.innerHTML = X.types.map(typeRow).join('');
  }

  rowsEl.addEventListener('input', e => {
    if (!e.target.classList.contains('fr-exp-name')) return;
    X.types[Number(e.target.closest('.fr-exp-tr').dataset.i)].name = e.target.value;
    persist();
  });

  rowsEl.addEventListener('change', e => {
    if (!e.target.classList.contains('fr-exp-receipt')) return;
    X.types[Number(e.target.closest('.fr-exp-tr').dataset.i)].receipt = e.target.value === 'yes';
    persist();
  });

  rowsEl.addEventListener('click', e => {
    if (e.target.closest('.pc-icon-btn.add')) { addType(); typeErrors.retarget(); return; }
    const btn = e.target.closest('.pc-icon-btn.remove');
    if (!btn) return;
    const i = Number(btn.closest('.fr-exp-tr').dataset.i);
    X.types.splice(i, 1);
    persist();
    renderTypes();
    typeErrors.retarget();
    const names = rowsEl.querySelectorAll('.fr-exp-name');
    names[Math.min(i, names.length - 1)].focus();
  });

  /* One name against the names already seen; true when clean */
  function checkTypeName(input, seen) {
    const key = input.value.trim().toLowerCase();
    if (!key) { typeErrors.set(input, MESSAGES.empty); return false; }
    if (seen.has(key)) { typeErrors.set(input, TYPE_EXISTS); return false; }
    seen.add(key);
    return true;
  }

  /* Return in a name adds the next row, once this one has a valid name */
  rowsEl.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.classList.contains('fr-exp-name')) return;
    e.preventDefault();
    const input = e.target;
    const seen = new Set([...rowsEl.querySelectorAll('.fr-exp-name')]
      .filter(other => other !== input)
      .map(other => other.value.trim().toLowerCase()));
    typeErrors.clear(input);
    if (!checkTypeName(input, seen)) { typeErrors.retarget(); return; }
    addType();
    typeErrors.retarget();
  });

  function addType() {
    X.types.push({ name: '', receipt: true });
    persist();
    renderTypes();
    const names = rowsEl.querySelectorAll('.fr-exp-name');
    names[names.length - 1].focus();
  }


  /* Manager Approval for expenses — independent of the Beat approval */
  const approvalBtn = $('fr-exp-approval');
  approvalBtn.setAttribute('aria-checked', String(X.approval));
  approvalBtn.addEventListener('click', () => {
    X.approval = !X.approval;
    approvalBtn.setAttribute('aria-checked', String(X.approval));
    persist();
  });

  showExpense();
  renderTypes();

  /* ── Validation on Next ────────────────────────────── */
  function validate() {
    errors.clearAll();
    typeErrors.clearAll();
    NUMBERS.forEach(({ el, min, max, range }) => {
      const raw = el.value.trim();
      if (!raw) errors.set(el, MESSAGES.empty);
      else if (Number(raw) < min || Number(raw) > max) errors.set(el, range);
    });

    /* Nothing inside Beat Expense Tracking counts while it is off */
    if (X.on) {
      if (X.fuel === 'automatic') {
        const raw = allowance.value.trim();
        if (!raw) errors.set(allowance, MESSAGES.empty);
        else if (!(Number(raw) > 0) || Number(raw) > LIMITS.allowanceMax) {
          errors.set(allowance, `Fuel Allowance must be more than 0 and at most ${LIMITS.allowanceMax}.`);
        }
      }
      const seen = new Set();
      rowsEl.querySelectorAll('.fr-exp-name').forEach(input => checkTypeName(input, seen));
    }
    /* Focus goes to the first problem in page order; the tooltip names
       what is wrong with the first expense type */
    const fieldsOk = errors.showFirst();
    const typesOk = typeErrors.showFirst();
    return fieldsOk && typesOk;
  }

  Planner.initPage({ index: 3, validate });
})();
