/* ============================================================
   Beat Engine — the wizard's step 3
   Behaviour contract: beat-planner-specs/02-beat-engine.md

   A. Beat Limits (both models): two whole numbers, each with its own
      range, read back as sentences on every keystroke. Company Settings
      says what a business day is.
   B. Auto-create Beats (Top Down only; not rendered for Bottom Up). Off
      by default; turning it off with work configured warns first.
      B1 Run scheduler at — the shared time picker, 9:00 AM
      B2 Visit Frequency — rules per step-1 module, first match wins
      B3 Visit Assignment — Assign Auto-Created Beats To (users only,
         picked inline or in Select Users), then Assign Visits based on:
         Optimized Route, or CRM Assignment Rule — the planner's own
         rules, first match wins, everything else by Optimized Route

   Everything is written to the wizard state as it changes, so leaving
   the step and coming back keeps every value and every rule's order.
   ============================================================ */
(function () {
  const S = Planner.state;
  const E = S.engine;
  const { LIMITS, MESSAGES, escape, newId } = Planner;
  const { COMPANY, FREQUENCIES, MODULE_FIELDS, USER_FIELDS, GROUPS, ROLES, userById, initials } = BEData;

  const $ = id => document.getElementById(id);

  /* Auto-created Beats go to users only; a selection saved before that
     decision loses its groups and roles */
  E.reps = { users: [...(E.reps.users || [])], groups: {}, roles: [] };
  const bodyEl = $('be-body');
  const persist = () => Planner.save();
  const topDown = S.model === 'top-down';
  const mappedModules = () => S.modules.map(m => m.module);

  /* Errors sit inline under their field, and focus walks to the first */
  const errors = PCErrors.create({ scope: bodyEl, inline: true });

  const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

  /* ── Company Settings ──────────────────────────────── */
  $('be-facts').innerHTML = [
    ['Business Days', COMPANY.businessDays],
    ['Business Hours', COMPANY.businessHours],
    ['Time Zone', COMPANY.timeZone],
  ].map(([term, value]) => `<div><dt>${term}</dt><dd>${value ? escape(value) : 'Not set'}</dd></div>`).join('');

  /* Opens Company Details in a new tab, so the wizard keeps its state */
  $('be-manage').addEventListener('click', e => {
    e.preventDefault();
    Planner.toast('Company Details opens in a new tab.');
  });

  /* ── A. Beat Limits ────────────────────────────────── */
  const LIMIT_MAX = { visits: LIMITS.visitsMax, days: LIMITS.daysMax };
  const limitInputs = [$('be-visits'), $('be-days')];

  $('be-tip-visits').textContent = `Min value = 1 , Max value = ${LIMITS.visitsMax}`;
  $('be-tip-days').textContent = `Min value = 1 , Max value = ${LIMITS.daysMax}`;

  limitInputs.forEach(input => {
    input.value = E[input.dataset.key];
    /* Whole digits, two at most, on typing and paste */
    Planner.digitsOnly(input, 2);
    input.addEventListener('input', () => {
      E[input.dataset.key] = input.value;
      persist();
      renderSummary();
    });
  });

  const limitValue = key => (Planner.limitProblem(E[key], LIMIT_MAX[key]) ? null : Number(E[key]));

  /* A sentence needs every number it uses; a missing one drops that
     sentence instead of printing a wrong or empty value */
  function renderSummary() {
    const visits = limitValue('visits');
    const days = limitValue('days');
    const b = (n, one) => `<b>${n}</b> ${n === 1 ? one : one + 's'}`;
    let line = '';
    if (days !== null && visits !== null) line = `Each Beat can span up to ${b(days, 'business day')}, with up to ${b(visits, 'Visit')} scheduled per day.`;
    else if (days !== null) line = `Each Beat can span up to ${b(days, 'business day')}.`;
    else if (visits !== null) line = `Up to ${b(visits, 'Visit')} can be scheduled per day.`;
    $('be-summary-body').innerHTML = line
      ? `<p>${line}</p>`
      : '<p class="be-summary-empty">Enter the Beat limits to see what they allow.</p>';
  }

  /* ── B. Auto-create Beats ──────────────────────────── */
  const autoBtn = $('be-auto');
  const autoBody = $('be-auto-body');

  /* Bottom Up: reps build their own beats, so there is nothing to generate */
  if (!topDown) {
    $('be-auto-section').remove();
    E.auto = false;
    persist();
  }

  const isAutoConfigured = () => Planner.repCount(E.reps) > 0 || E.freqRules.length > 0
    || E.assignRules.length > 0 || E.time !== '09:00' || E.conditional;

  /* "the rep selection, 2 frequency rules and 1 assignment rule" */
  function lossList() {
    const parts = [];
    if (Planner.repCount(E.reps)) parts.push('the users Beats are assigned to');
    if (E.freqRules.length) parts.push(plural(E.freqRules.length, 'frequency rule'));
    if (E.assignRules.length) parts.push(plural(E.assignRules.length, 'assignment rule'));
    if (E.time !== '09:00') parts.push('the scheduler time');
    if (!parts.length && E.conditional) parts.push('the CRM Assignment Rule setting');
    return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  }

  function setAuto(on) {
    E.auto = on;
    autoBtn.setAttribute('aria-checked', String(on));
    autoBody.hidden = !on;
  }

  autoBtn?.addEventListener('click', async () => {
    const on = autoBtn.getAttribute('aria-checked') !== 'true';
    if (!on && isAutoConfigured()) {
      const ok = await Planner.confirm({
        title: 'Turn off Auto-create Beats',
        message: `Turning off Auto-create Beats removes ${lossList()}.`,
        action: 'Turn Off',
      });
      if (!ok) return;
      Object.assign(E, {
        reps: { users: [], groups: {}, roles: [] },
        time: '09:00', freqRules: [], conditional: false, assignRules: [],
      });
      scheduler?.setValue(toDisplay(E.time));
      renderAll();
    }
    setAuto(on);
    errors.clearAll();
    persist();
  });

  /* ── B3. Assign Auto-Created Beats To ──────────────── */
  /* Users only. Chips for the chosen users; the input filters a list
     that toggles users in and out (it stays open for several picks);
     the icon opens Select Users. ↑ ↓ move, Enter toggles, Escape closes,
     Backspace in an empty input removes the last chip. */
  const picker = $('be-reps');
  const pickInput = $('be-reps-input');
  const pickList = $('be-reps-list');
  let pickActive = 0;

  const avatarHtml = name => `<span class="pw-avatar" aria-hidden="true">${escape(initials(name))}</span>`;

  function setReps(ids) {
    E.reps.users = ids;
    persist();
    renderReps();
    if (ids.length) errors.clear(picker);
  }

  function renderReps() {
    if (!picker) return;
    $('be-reps-chips').innerHTML = E.reps.users.map(id => {
      const name = userById(id)?.name || id;
      return `<span class="pw-chip">${avatarHtml(name)}<span>${escape(name)}</span>
        <button class="be-chip-x" type="button" data-id="${id}" aria-label="Remove ${escape(name)}"><i class="ti ti-x" aria-hidden="true"></i></button>
      </span>`;
    }).join('');
    pickInput.placeholder = E.reps.users.length ? '' : 'Select users';
    if (!pickList.hidden) renderPickList();
  }

  const pickMatches = () => {
    const q = pickInput.value.trim().toLowerCase();
    return BEData.USERS.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  };

  function renderPickList() {
    const users = pickMatches();
    pickActive = Math.min(pickActive, Math.max(users.length - 1, 0));
    pickList.innerHTML = users.length
      ? users.map((u, i) => {
          const on = E.reps.users.includes(u.id);
          return `<li class="be-userpick-opt${i === pickActive ? ' active' : ''}" role="option" id="be-reps-o${i}"
                      data-id="${u.id}" aria-selected="${on}">
                    ${avatarHtml(u.name)}
                    <span class="be-who"><span class="be-name">${escape(u.name)}</span><span class="be-email">${escape(u.email)}</span></span>
                    ${on ? '<i class="ti ti-check be-userpick-tick" aria-hidden="true"></i>' : ''}
                  </li>`;
        }).join('')
      : `<li class="be-userpick-none" role="presentation">No users match “${escape(pickInput.value.trim())}”.</li>`;
    if (users.length) {
      pickInput.setAttribute('aria-activedescendant', `be-reps-o${pickActive}`);
      pickList.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
    } else {
      pickInput.removeAttribute('aria-activedescendant');
    }
  }

  function openPick() {
    if (!pickList.hidden) return;
    pickActive = 0;
    pickList.hidden = false;
    picker.classList.add('open');
    pickInput.setAttribute('aria-expanded', 'true');
    renderPickList();
  }

  function closePick() {
    if (pickList.hidden) return;
    pickList.hidden = true;
    picker.classList.remove('open');
    pickInput.setAttribute('aria-expanded', 'false');
    pickInput.removeAttribute('aria-activedescendant');
  }

  function toggleUser(id) {
    setReps(E.reps.users.includes(id) ? E.reps.users.filter(u => u !== id) : [...E.reps.users, id]);
  }

  if (picker) {
    /* A click anywhere in the box, or focus moved to it by validation,
       lands in the input */
    picker.addEventListener('focus', () => pickInput.focus());
    picker.addEventListener('mousedown', e => {
      if (e.target.closest('.be-chip-x, .be-userpick-dlg')) return;
      e.preventDefault();
      pickInput.focus();
      if (pickList.hidden) openPick(); else if (e.target.closest('.be-userpick-caret')) closePick();
    });
    pickInput.addEventListener('focus', openPick);
    pickInput.addEventListener('input', () => { pickActive = 0; openPick(); renderPickList(); });
    pickInput.addEventListener('blur', () => setTimeout(() => {
      if (!picker.contains(document.activeElement)) closePick();
    }, 0));

    pickInput.addEventListener('keydown', e => {
      const users = pickMatches();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (pickList.hidden) { openPick(); return; }
        pickActive = Math.min(users.length - 1, Math.max(0, pickActive + (e.key === 'ArrowDown' ? 1 : -1)));
        renderPickList();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!pickList.hidden && users[pickActive]) toggleUser(users[pickActive].id);
      } else if (e.key === 'Escape' && !pickList.hidden) {
        e.preventDefault();
        e.stopPropagation();
        closePick();
      } else if (e.key === 'Backspace' && !pickInput.value && E.reps.users.length) {
        setReps(E.reps.users.slice(0, -1));
      } else if (e.key === 'Tab') {
        closePick();
      }
    });

    /* The list keeps focus in the input, so picking never blurs it */
    pickList.addEventListener('mousedown', e => e.preventDefault());
    pickList.addEventListener('click', e => {
      const opt = e.target.closest('.be-userpick-opt');
      if (!opt) return;
      pickActive = [...pickList.querySelectorAll('.be-userpick-opt')].indexOf(opt);
      toggleUser(opt.dataset.id);
    });

    $('be-reps-chips').addEventListener('click', e => {
      const x = e.target.closest('.be-chip-x');
      if (!x) return;
      setReps(E.reps.users.filter(id => id !== x.dataset.id));
      pickInput.focus();
    });

    $('be-reps-dialog').addEventListener('click', e => {
      closePick();
      BEUsers.open(E.reps.users, e.currentTarget, setReps);
    });

    document.addEventListener('mousedown', e => {
      if (!picker.parentElement.contains(e.target)) closePick();
    });
  }

  /* ── B1. Run scheduler at ──────────────────────────── */
  /* Saved as 24-hour HH:mm, shown as "9:00 AM", in the org time zone */
  function toDisplay(wire) {
    const [h, m] = String(wire || '09:00').split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }

  if (topDown) $('be-tip-time').textContent = `Beats are created from records available at this time, in the company time zone (${COMPANY.timeZone || 'Not set'}). Runs on business days only.`;

  const scheduler = topDown ? TimePicker.create($('be-time-host'), {
    value: toDisplay(E.time),
    inputId: 'be-time',
    mandatory: true,
    onChange(display, wire) { E.time = wire; persist(); clearTimeError(); },
  }) : null;

  function setTimeError(message) {
    clearTimeError();
    const msg = document.createElement('span');
    msg.className = 'pc-field-msg';
    msg.id = 'be-time-msg';
    msg.setAttribute('role', 'alert');
    msg.textContent = message;
    $('be-time-host').after(msg);
    $('be-time').classList.add('invalid');
  }

  function clearTimeError() {
    $('be-time-msg')?.remove();
    $('be-time')?.classList.remove('invalid');
  }

  /* ── B2 / B3 shared: the Add Rule module menu ──────── */
  function moduleMenu(btn, onPick) {
    const modules = mappedModules();
    const items = modules.length
      ? modules.map(m => ({ label: m, module: m }))
      : [{ label: 'Map a module in Planner Configuration first', module: null }];
    Planner.menu(btn, items, item => { if (item.module) onPick(item.module, btn); });
  }

  /* A new rule goes to the end of its module's group */
  function insertAtModuleEnd(rules, rule) {
    const last = rules.map(r => r.module).lastIndexOf(rule.module);
    const next = rules.slice();
    next.splice(last === -1 ? next.length : last + 1, 0, rule);
    return next;
  }

  /* ── B2. Visit Frequency ───────────────────────────── */
  const visitTypeMissing = rule => !Planner.visitTypeExists(rule.visitType);

  const freqTable = topDown && BERules.mountTable({
    host: $('be-freq-table'),
    kind: 'frequency rule',
    cols: '40px minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 0.7fr)',
    headers: ['Condition', 'Visit Type', 'Frequency'],
    getRules: () => E.freqRules,
    setRules: rules => { E.freqRules = rules; },
    moduleOrder: mappedModules,
    mappedModules,
    rowError: rule => (visitTypeMissing(rule) ? 'This visit type no longer exists.' : ''),
    cells: (rule, { error }) => [
      `${escape(rule.visitType)}${error ? `<span class="pw-rule-flag">${error}</span>` : ''}`,
      escape(rule.frequency),
    ],
    onEdit: (rule, from) => openFreq(rule.module, from, rule),
    onChange: () => { persist(); renderFreq(); },
  });

  function renderFreq() {
    if (!freqTable) return;
    const any = E.freqRules.length > 0;
    $('be-freq-table').hidden = !any;
    $('be-freq-empty').hidden = any;
    const full = E.freqRules.length >= LIMITS.rules;
    $('be-freq-add').hidden = full;
    $('be-freq-limit').hidden = !full;
    if (!E.freqRules.some(visitTypeMissing)) $('be-freq-error').hidden = true;
    freqTable.render();
  }

  $('be-freq-add')?.addEventListener('click', e => moduleMenu(e.currentTarget, openFreq));

  /* Frequency Rules dialog */
  const freqOverlay = $('be-freq-overlay');
  const freqForm = $('be-freq-form');
  const freqModal = freqOverlay.querySelector('.mb-modal');
  const freqScroll = freqOverlay.querySelector('.mb-body');
  const freqErrors = PCErrors.create({ scope: freqOverlay, inline: true });
  const freqDlg = Planner.dialog(freqOverlay, { onDismiss: () => closeFreq() });
  let freqDraft = null;

  /* Field metadata loads once per module; the first open shows a beat of
     "Loading fields…" as the real request would */
  const loadedFields = new Set();
  let loadingModule = null;

  freqForm.innerHTML = `
    <section class="pw-dlg-section">
      <h3 class="pw-dlg-head" id="be-freq-scope-label">Apply this rule to</h3>
      <div class="pw-radios" role="radiogroup" aria-labelledby="be-freq-scope-label">
        ${scopeRadio('be-freq-scope', 'all', 'Scoped Records', 'Records associated in the Planner configuration only.')}
        ${scopeRadio('be-freq-scope', 'specific', 'Specific Records within Scoped Records', 'Filter will be applied to records associated in the Planner configuration only')}
      </div>
      <div class="be-crit-area" id="be-freq-crit"></div>
    </section>
    <section class="pw-dlg-section">
      <h3 class="pw-dlg-head">Create Visits</h3>
      <div class="pw-pair">
        <div class="pw-pair-field">
          <span class="pw-pair-label" id="be-freq-f-label">Frequency</span>
          <div class="pc-field-cell" id="be-freq-f-host"></div>
        </div>
        <div class="pw-pair-field">
          <span class="pw-pair-label" id="be-freq-vt-label">Visit Type</span>
          <div class="pc-field-cell" id="be-freq-vt-host"></div>
        </div>
      </div>
    </section>`;

  function scopeRadio(name, value, label, tip) {
    return `
      <span class="pw-radio-wrap">
        <label class="mb-radio"><input type="radio" name="${name}" value="${value}" /> ${label}</label>
        <button class="pw-info" type="button" aria-label="About ${label}">
          <img src="src/info-circle.svg" alt="" />
          <span class="pw-tip" role="tooltip">${tip}</span>
        </button>
      </span>`;
  }

  const freqSelect = SelectMenu.create($('be-freq-f-host'), {
    placeholder: 'Select', mandatory: true, fieldId: 'be-freq-frequency',
    onChange(v) { freqDraft.frequency = v; freqErrors.clear(freqSelect.field); },
  });
  freqSelect.setOptions(FREQUENCIES.map(f => ({ value: f, label: f })));

  const vtSelect = SelectMenu.create($('be-freq-vt-host'), {
    placeholder: 'Select', mandatory: true, fieldId: 'be-freq-visit-type',
    footer: () => ({
      label: 'New Visit Type',
      disabled: S.visitTypes.length >= LIMITS.visitTypes,
      why: `You can add up to ${LIMITS.visitTypes} visit types.`,
    }),
    onFooter: () => openQuickCreate(),
    onChange(v) { freqDraft.visitType = v; freqErrors.clear(vtSelect.field); },
  });

  [[freqSelect, 'be-freq-f-label'], [vtSelect, 'be-freq-vt-label']].forEach(([sm, labelId]) =>
    sm.field.setAttribute('aria-labelledby', `${labelId} ${sm.field.id}`));

  function fillVisitTypes() {
    vtSelect.setOptions(S.visitTypes.map(v => ({ value: v.name, label: v.name })));
    if (freqDraft?.visitType && Planner.visitTypeExists(freqDraft.visitType)) vtSelect.setValue(freqDraft.visitType);
  }

  /* The criteria area: nothing for Scoped Records; for Specific, the
     builder — or why it cannot be shown */
  function critAreaHtml(draft, builderKey, label) {
    if (draft.scope !== 'specific') return '';
    if (!mappedModules().includes(draft.module)) {
      const lines = BERules.critLines(BERules.builderValue(draft[builderKey]).criteria.filter(c => c.field));
      return `<p class="pw-dlg-error" role="alert">This module is no longer available, so its criteria cannot be edited.</p>
              ${lines.length ? `<div class="pw-crit be-crit-readonly">${lines.join('')}</div>` : ''}`;
    }
    if (!MODULE_FIELDS[draft.module]) {
      return '<p class="pw-dlg-error" role="alert">Fields for this module could not be loaded. Close this rule and open it again to retry.</p>';
    }
    if (loadingModule === draft.module || !loadedFields.has(draft.module)) {
      return '<p class="pw-loading" role="status">Loading fields…</p>';
    }
    return BERules.builderHtml(draft[builderKey], builderKey, label);
  }

  function ensureFields(module, rerender) {
    if (loadedFields.has(module) || !MODULE_FIELDS[module] || loadingModule === module) return;
    loadingModule = module;
    setTimeout(() => {
      loadedFields.add(module);
      loadingModule = null;
      rerender();
    }, 450);
  }

  function renderFreqCrit() {
    const area = $('be-freq-crit');
    if (freqDraft.scope === 'specific') ensureFields(freqDraft.module, () => freqDraft && renderFreqCrit());
    area.innerHTML = critAreaHtml(freqDraft, 'rec', 'Criteria');
    const builder = area.querySelector('.be-builder');
    if (builder) BERules.fillBuilder(builder, freqDraft.rec, MODULE_FIELDS[freqDraft.module]);
    Planner.syncShadows(freqModal, freqScroll);
  }

  BERules.bindBuilders($('be-freq-crit'), () => freqDraft.rec, renderFreqCrit, freqErrors);

  freqForm.addEventListener('change', e => {
    if (e.target.name !== 'be-freq-scope') return;
    freqDraft.scope = e.target.value;
    /* Back to Scoped discards the rows rather than keeping them unseen */
    if (freqDraft.scope === 'all') freqDraft.rec = BERules.blankBuilder();
    freqErrors.clearAll();
    renderFreqCrit();
  });

  freqScroll.addEventListener('scroll', () => Planner.syncShadows(freqModal, freqScroll));

  function openFreq(module, opener, rule = null) {
    freqDraft = rule
      ? { id: rule.id, module: rule.module, scope: rule.scope, rec: BERules.builderFrom(rule.criteria, rule.pattern),
          frequency: rule.frequency, visitType: rule.visitType, saved: rule.saved }
      : { id: null, module, scope: 'all', rec: BERules.blankBuilder(), frequency: '', visitType: '', saved: false };
    $('be-freq-title').textContent = `Frequency Rules for “${freqDraft.module}”`;
    freqForm.querySelectorAll('[name="be-freq-scope"]').forEach(r => { r.checked = r.value === freqDraft.scope; });
    freqSelect.setValue(freqDraft.frequency);
    fillVisitTypes();
    if (!freqDraft.visitType || !Planner.visitTypeExists(freqDraft.visitType)) vtSelect.clear();
    freqErrors.clearAll();
    renderFreqCrit();
    freqScroll.scrollTop = 0;
    freqDlg.open(opener, freqForm.querySelector('[name="be-freq-scope"]:checked'));
    /* An edited rule whose visit type has gone shows why at once */
    if (rule && visitTypeMissing(rule)) {
      freqErrors.set(vtSelect.field, `“${rule.visitType}” no longer exists. Pick a current visit type.`);
    }
  }

  function closeFreq() {
    freqDraft = null;
    freqErrors.clearAll();
    freqDlg.close();
  }

  $('be-freq-cancel').addEventListener('click', closeFreq);

  $('be-freq-done').addEventListener('click', () => {
    freqErrors.clearAll();
    const builderEl = $('be-freq-crit').querySelector('.be-builder');
    if (freqDraft.scope === 'specific' && builderEl) BERules.validateBuilder(builderEl, freqDraft.rec, freqErrors);
    if (!freqDraft.frequency) freqErrors.set(freqSelect.field, MESSAGES.empty);
    if (!freqDraft.visitType || !Planner.visitTypeExists(freqDraft.visitType)) freqErrors.set(vtSelect.field, MESSAGES.empty);
    if (!freqErrors.showFirst()) return;
    /* Still loading: wait for the fields rather than save half a rule */
    if (freqDraft.scope === 'specific' && !builderEl && mappedModules().includes(freqDraft.module) && MODULE_FIELDS[freqDraft.module]) return;

    const crit = freqDraft.scope === 'specific' ? BERules.builderValue(freqDraft.rec) : { criteria: [], pattern: '' };
    const rule = {
      id: freqDraft.id || newId('fr'),
      module: freqDraft.module,
      scope: freqDraft.scope,
      criteria: crit.criteria.filter(c => c.field),
      pattern: crit.pattern,
      frequency: freqDraft.frequency,
      visitType: freqDraft.visitType,
      saved: freqDraft.saved,
    };
    const editing = Boolean(freqDraft.id);
    E.freqRules = editing
      ? E.freqRules.map(r => (r.id === rule.id ? rule : r))
      : insertAtModuleEnd(E.freqRules, rule);
    persist();
    closeFreq();
    renderFreq();
    Planner.toast(editing ? 'Frequency rule updated.' : 'Frequency rule added.');
  });

  /* Quick Create: Visit Type — the same list as step 2 */
  const vtOverlay = $('be-vt-overlay');
  const vtErrors = PCErrors.create({ scope: vtOverlay, inline: true });
  const vtDlg = Planner.dialog(vtOverlay, { onDismiss: () => vtDlg.close() });
  const vtName = $('be-vt-name');
  const vtDuration = $('be-vt-duration');
  Planner.digitsOnly(vtDuration, 3);

  function openQuickCreate() {
    vtName.value = '';
    vtDuration.value = '15';
    vtOverlay.querySelectorAll('[data-field]').forEach(c => { c.checked = false; });
    vtErrors.clearAll();
    vtDlg.open(vtSelect.field, vtName);
  }

  $('be-vt-cancel').addEventListener('click', () => vtDlg.close());

  $('be-vt-save').addEventListener('click', () => {
    vtErrors.clearAll();
    const name = vtName.value.trim();
    if (!name) vtErrors.set(vtName, MESSAGES.empty);
    else if (Planner.visitTypeExists(name)) vtErrors.set(vtName, `A visit type named "${name}" already exists.`);
    const duration = vtDuration.value.trim();
    if (!duration) vtErrors.set(vtDuration, MESSAGES.empty);
    else if (Number(duration) === 0) vtErrors.set(vtDuration, 'Duration must be above 0.');
    if (!vtErrors.showFirst()) return;

    const type = { name, duration: String(Number(duration)) };
    vtOverlay.querySelectorAll('[data-field]').forEach(c => { type[c.dataset.field] = c.checked ? 'mandatory' : 'visible'; });
    S.visitTypes.push(type);
    persist();
    /* Created and selected in the dialog behind */
    freqDraft.visitType = name;
    fillVisitTypes();
    freqErrors.clear(vtSelect.field);
    vtDlg.close();
    Planner.toast(`Visit type “${name}” created.`);
  });

  /* ── B3. Visit Assignment: Assign Visits based on ──── */
  /* E.conditional is true for CRM Assignment Rule: the planner's own
     rules run first, and records no rule matches fall back to the most
     efficient route. Optimized Route alone is the default. */
  const condBody = $('be-cond-body');
  const ASSIGN_BY = [
    { value: 'route', label: 'Optimized Route',
      desc: 'Visits are assigned based on the most efficient route for each rep, within their shift hours.' },
    { value: 'rules', label: 'CRM Assignment Rule',
      desc: 'Records that match your assignment rules go to the rep each rule specifies. All other records are assigned by the most efficient route.' },
  ];

  const assignBy = topDown && SelectMenu.create($('be-assign-by-host'), {
    fieldId: 'be-assign-by',
    async onChange(value) {
      const on = value === 'rules';
      /* Leaving the rules with some defined throws them away, so ask */
      if (!on && E.assignRules.length) {
        const ok = await Planner.confirm({
          title: 'Switch to Optimized Route',
          message: `Switching to Optimized Route removes ${plural(E.assignRules.length, 'assignment rule')}. Every visit will then be assigned by the most efficient route.`,
          action: 'Switch',
        });
        if (!ok) { assignBy.setValue('rules'); return; }
        E.assignRules = [];
        renderAssign();
      }
      setConditional(on);
      persist();
    },
  });

  if (assignBy) {
    assignBy.setOptions(ASSIGN_BY);
    assignBy.field.setAttribute('aria-labelledby', `be-assign-by-label ${assignBy.field.id}`);
  }

  function setConditional(on) {
    E.conditional = on;
    assignBy?.setValue(on ? 'rules' : 'route');
    condBody.hidden = !on;
  }

  /* The users auto-created Beats go to, as the users a rule may name */
  const repUserIds = () => E.reps.users;

  const CAT_KIND = { Users: 'Users', Groups: 'Group', Roles: 'Role' };
  const expandedChips = new Set();

  function targetName(rule, t) {
    return rule.catType === 'Users' ? (userById(t)?.name || t) : t;
  }

  /* Chips past the third collapse into "and N more", which opens the rest */
  function assignHtml(rule) {
    if (rule.assign === 'conditions') {
      const lines = BERules.critLines(rule.userCriteria, { prefix: 'Users · ' });
      const pattern = rule.userCriteria.length > 1
        ? `<p class="pw-crit-pattern"><span>Criteria Pattern</span>${escape(rule.userPattern)}</p>` : '';
      return `<div class="pw-crit">${lines.join('')}${pattern}</div>`;
    }
    const all = rule.targets.map(t => targetName(rule, t));
    const open = expandedChips.has(rule.id);
    const shown = open ? all : all.slice(0, 3);
    const rest = all.length - shown.length;
    const chip = name => rule.catType === 'Users'
      ? `<span class="pw-chip"><span class="pw-avatar" aria-hidden="true">${escape(initials(name))}</span><span>${escape(name)}</span></span>`
      : `<span class="pw-chip plain"><span>${escape(name)}</span></span>`;
    const more = rest > 0
      ? `<button class="pw-see" type="button" data-chips="${rule.id}" aria-expanded="false"
                 aria-label="Show all ${all.length} ${CAT_KIND[rule.catType].toLowerCase()}s for this rule">and ${rest > 99 ? '99+' : rest} more</button>`
      : open && all.length > 3
        ? `<button class="pw-see" type="button" data-chips="${rule.id}" aria-expanded="true">Show less</button>` : '';
    return `<div><span class="be-assign-kind">${CAT_KIND[rule.catType]}</span>
              <div class="pw-chips">${shown.map(chip).join('')}${more}</div></div>`;
  }

  const assignTable = topDown && BERules.mountTable({
    host: $('be-assign-table'),
    kind: 'assignment rule',
    cols: '40px minmax(0, 1.3fr) minmax(0, 1fr)',
    headers: ['Condition', 'Assign to'],
    getRules: () => E.assignRules,
    setRules: rules => { E.assignRules = rules; },
    moduleOrder: mappedModules,
    mappedModules,
    rowError: rule => ((rule.assign === 'category' ? !rule.targets.length : !rule.userCriteria.length)
      ? 'Choose who this rule assigns to.' : ''),
    cells: (rule, { error }) => [`${assignHtml(rule)}${error ? `<span class="pw-rule-flag">${error}</span>` : ''}`],
    onEdit: (rule, from) => openAssign(rule.module, from, rule),
    onChange: () => { persist(); renderAssign(); },
  });

  $('be-assign-table')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-chips]');
    if (!btn) return;
    const id = btn.dataset.chips;
    if (expandedChips.has(id)) expandedChips.delete(id); else expandedChips.add(id);
    assignTable.render();
    $('be-assign-table').querySelector(`[data-chips="${id}"]`)?.focus();
  });

  function renderAssign() {
    if (!assignTable) return;
    const any = E.assignRules.length > 0;
    $('be-assign-table').hidden = !any;
    $('be-assign-empty').hidden = any;
    const full = E.assignRules.length >= LIMITS.rules;
    $('be-assign-add').hidden = full;
    $('be-assign-limit').hidden = !full;
    $('be-assign-error').hidden = true;
    assignTable.render();
  }

  $('be-assign-add')?.addEventListener('click', e => moduleMenu(e.currentTarget, openAssign));

  /* Assignment Rules dialog */
  const asOverlay = $('be-assign-overlay');
  const asForm = $('be-assign-form');
  const asModal = asOverlay.querySelector('.mb-modal');
  const asScroll = asOverlay.querySelector('.mb-body');
  const asErrors = PCErrors.create({ scope: asOverlay, inline: true });
  const asDlg = Planner.dialog(asOverlay, { onDismiss: () => closeAssign() });
  let asDraft = null;

  asForm.innerHTML = `
    <section class="pw-dlg-section">
      <h3 class="pw-dlg-head" id="be-as-scope-label">Apply this rule to</h3>
      <div class="pw-radios" role="radiogroup" aria-labelledby="be-as-scope-label">
        ${scopeRadio('be-as-scope', 'all', 'Scoped Records', 'Records associated in the Planner configuration only.')}
        ${scopeRadio('be-as-scope', 'specific', 'Specific Records within Scoped Records', 'Filter will be applied to records associated in the Planner configuration only')}
      </div>
      <div class="be-crit-area" id="be-as-crit"></div>
    </section>
    <section class="pw-dlg-section">
      <h3 class="pw-dlg-head" id="be-as-target-label">Assign Record to</h3>
      <div class="pw-radios" role="radiogroup" aria-labelledby="be-as-target-label">
        <label class="mb-radio"><input type="radio" name="be-as-assign" value="category" /> Category</label>
        <label class="mb-radio"><input type="radio" name="be-as-assign" value="conditions" /> Users matching certain conditions</label>
      </div>
      <div class="be-as-category" id="be-as-category">
        <div class="be-as-cat-row">
          <div class="pc-field-cell be-as-type" id="be-as-type-host"></div>
          <div class="pc-field-cell be-as-pick" id="be-as-pick-host"></div>
        </div>
        <p class="pw-inline-warn" id="be-as-warn" role="status" hidden></p>
        <p class="be-as-hint" id="be-as-hint" hidden>Select users in Assign Auto-Created Beats To first. Only they can be assigned visits.</p>
        <div class="pw-chips be-as-chips" id="be-as-chips"></div>
      </div>
      <div class="be-crit-area" id="be-as-users" hidden></div>
    </section>`;

  const typeSelect = SelectMenu.create($('be-as-type-host'), {
    fieldId: 'be-as-type',
    onChange(v) {
      /* Chips never carry across types */
      if (asDraft.targets.length) {
        $('be-as-warn').innerHTML = `<i class="ti ti-alert-triangle" aria-hidden="true"></i>Changing the type cleared the ${asDraft.targets.length} selected ${asDraft.catType.toLowerCase()}.`;
        $('be-as-warn').hidden = false;
      }
      asDraft.catType = v;
      asDraft.targets = [];
      renderTargets();
    },
  });
  typeSelect.setOptions(['Users', 'Groups', 'Roles'].map(v => ({ value: v, label: v })));
  typeSelect.field.setAttribute('aria-label', 'Category type');

  const targetSelect = SelectMenu.create($('be-as-pick-host'), {
    placeholder: 'Select users', mandatory: true, fieldId: 'be-as-pick',
    onChange(v) {
      if (!v) return;
      asDraft.targets.push(v);
      asErrors.clear(targetSelect.field);
      $('be-as-warn').hidden = true;
      renderTargets();
      targetSelect.field.focus();
    },
  });

  function targetOptions() {
    if (asDraft.catType === 'Users') {
      return repUserIds().map(id => ({ value: id, label: userById(id).name }));
    }
    const source = asDraft.catType === 'Groups' ? GROUPS : ROLES;
    return Object.keys(source).map(name => ({ value: name, label: name }));
  }

  function renderTargets() {
    const options = targetOptions().filter(o => !asDraft.targets.includes(o.value));
    targetSelect.setOptions(options);
    const noReps = asDraft.catType === 'Users' && !repUserIds().length;
    targetSelect.setDisabled(noReps || !options.length);
    $('be-as-hint').hidden = !noReps;
    const noun = asDraft.catType.toLowerCase();
    targetSelect.field.querySelector('.sm-value').textContent =
      noReps ? 'No users selected above' : options.length ? `Select ${noun}` : `All ${noun} added`;
    targetSelect.field.setAttribute('aria-label', `Choose ${noun} to assign to`);
    $('be-as-chips').innerHTML = asDraft.targets.map(t => {
      const name = asDraft.catType === 'Users' ? userById(t)?.name || t : t;
      return `<span class="pw-chip${asDraft.catType === 'Users' ? '' : ' plain'}">
        ${asDraft.catType === 'Users' ? `<span class="pw-avatar" aria-hidden="true">${escape(initials(name))}</span>` : ''}
        <span>${escape(name)}</span>
        <button class="be-chip-x" type="button" data-target="${escape(t)}" aria-label="Remove ${escape(name)}"><i class="ti ti-x" aria-hidden="true"></i></button>
      </span>`;
    }).join('');
    Planner.syncShadows(asModal, asScroll);
  }

  $('be-as-chips').addEventListener('click', e => {
    const x = e.target.closest('.be-chip-x');
    if (!x) return;
    asDraft.targets = asDraft.targets.filter(t => t !== x.dataset.target);
    renderTargets();
    ($('be-as-chips').querySelector('.be-chip-x') || targetSelect.field).focus();
  });

  function renderAsCrit() {
    const area = $('be-as-crit');
    if (asDraft.scope === 'specific') ensureFields(asDraft.module, () => asDraft && renderAsCrit());
    const html = critAreaHtml(asDraft, 'rec', 'Criteria');
    area.innerHTML = html && asDraft.scope === 'specific'
      ? `<p class="be-crit-lead">If the below conditions matches,</p>${html}` : html;
    const builder = area.querySelector('.be-builder');
    if (builder) BERules.fillBuilder(builder, asDraft.rec, MODULE_FIELDS[asDraft.module]);
    Planner.syncShadows(asModal, asScroll);
  }

  function renderAsUsers() {
    const area = $('be-as-users');
    const on = asDraft.assign === 'conditions';
    area.hidden = !on;
    $('be-as-category').hidden = on;
    area.innerHTML = on ? BERules.builderHtml(asDraft.user, 'user', 'User condition') : '';
    const builder = area.querySelector('.be-builder');
    if (builder) BERules.fillBuilder(builder, asDraft.user, USER_FIELDS);
    Planner.syncShadows(asModal, asScroll);
  }

  BERules.bindBuilders($('be-as-crit'), () => asDraft.rec, renderAsCrit, asErrors);
  BERules.bindBuilders($('be-as-users'), () => asDraft.user, renderAsUsers, asErrors);

  asForm.addEventListener('change', e => {
    const t = e.target;
    if (t.name === 'be-as-scope') {
      asDraft.scope = t.value;
      if (asDraft.scope === 'all') asDraft.rec = BERules.blankBuilder();
      asErrors.clearAll();
      renderAsCrit();
    }
    if (t.name === 'be-as-assign') {
      /* The other side's input is discarded; both are never submitted */
      asDraft.assign = t.value;
      asDraft.targets = [];
      asDraft.user = BERules.blankBuilder();
      $('be-as-warn').hidden = true;
      asErrors.clearAll();
      renderAsUsers();
      renderTargets();
    }
  });

  asScroll.addEventListener('scroll', () => Planner.syncShadows(asModal, asScroll));

  function openAssign(module, opener, rule = null) {
    asDraft = rule
      ? {
          id: rule.id, module: rule.module, scope: rule.scope,
          rec: BERules.builderFrom(rule.criteria, rule.pattern),
          assign: rule.assign, catType: rule.catType, targets: [...rule.targets],
          user: BERules.builderFrom(rule.userCriteria, rule.userPattern), saved: rule.saved,
        }
      : {
          id: null, module, scope: 'all', rec: BERules.blankBuilder(),
          assign: 'category', catType: 'Users', targets: [], user: BERules.blankBuilder(), saved: false,
        };
    $('be-assign-title').textContent = `Assignment Rules for “${asDraft.module}”`;
    asForm.querySelectorAll('[name="be-as-scope"]').forEach(r => { r.checked = r.value === asDraft.scope; });
    asForm.querySelectorAll('[name="be-as-assign"]').forEach(r => { r.checked = r.value === asDraft.assign; });
    typeSelect.setValue(asDraft.catType);
    $('be-as-warn').hidden = true;
    asErrors.clearAll();
    renderAsCrit();
    renderAsUsers();
    renderTargets();
    asScroll.scrollTop = 0;
    asDlg.open(opener, asForm.querySelector('[name="be-as-scope"]:checked'));
  }

  function closeAssign() {
    asDraft = null;
    asErrors.clearAll();
    asDlg.close();
  }

  $('be-assign-cancel').addEventListener('click', closeAssign);

  /* A target that reaches none of the reps would assign to nobody */
  function reachesNobody() {
    if (asDraft.catType === 'Users') return false;
    const reps = new Set(repUserIds());
    const source = asDraft.catType === 'Groups' ? GROUPS : ROLES;
    return !asDraft.targets.some(name => (source[name] || []).some(id => reps.has(id)));
  }

  $('be-assign-done').addEventListener('click', () => {
    asErrors.clearAll();
    const recEl = $('be-as-crit').querySelector('.be-builder');
    if (asDraft.scope === 'specific' && recEl) BERules.validateBuilder(recEl, asDraft.rec, asErrors);
    if (asDraft.assign === 'category') {
      if (!asDraft.targets.length) asErrors.set(targetSelect.field, 'Choose who this rule assigns to.');
      else if (reachesNobody()) {
        asErrors.set(targetSelect.field, `None of the selected ${asDraft.catType.toLowerCase()} include a user that auto-created Beats are assigned to.`);
      }
    } else {
      BERules.validateBuilder($('be-as-users').querySelector('.be-builder'), asDraft.user, asErrors);
    }
    if (!asErrors.showFirst()) return;
    if (asDraft.scope === 'specific' && !recEl && mappedModules().includes(asDraft.module) && MODULE_FIELDS[asDraft.module]) return;

    const rec = asDraft.scope === 'specific' ? BERules.builderValue(asDraft.rec) : { criteria: [], pattern: '' };
    const user = asDraft.assign === 'conditions' ? BERules.builderValue(asDraft.user) : { criteria: [], pattern: '' };
    const rule = {
      id: asDraft.id || newId('ar'),
      module: asDraft.module,
      scope: asDraft.scope,
      criteria: rec.criteria.filter(c => c.field),
      pattern: rec.pattern,
      assign: asDraft.assign,
      catType: asDraft.catType,
      targets: asDraft.assign === 'category' ? asDraft.targets : [],
      userCriteria: user.criteria,
      userPattern: user.pattern,
      saved: asDraft.saved,
    };
    const editing = Boolean(asDraft.id);
    E.assignRules = editing
      ? E.assignRules.map(r => (r.id === rule.id ? rule : r))
      : insertAtModuleEnd(E.assignRules, rule);
    persist();
    closeAssign();
    renderAssign();
    Planner.toast(editing ? 'Assignment rule updated.' : 'Assignment rule added.');
  });

  /* ── Validation on Next ────────────────────────────── */
  /* Fields first, in visual order; then rules, whose table says what is
     wrong and whose first marked row takes focus on its ⋯ button */
  function validate() {
    errors.clearAll();
    clearTimeError();

    limitInputs.forEach(input => {
      const problem = Planner.limitProblem(input.value, LIMIT_MAX[input.dataset.key]);
      if (problem) errors.set(input, problem);
    });

    let ruleError = null;
    if (topDown && E.auto) {
      if (!Planner.repCount(E.reps)) errors.set(picker, 'Select at least one user to assign auto-created Beats to.');
      if (!scheduler.value) setTimeError('Set the time at which the scheduler should run.');

      renderFreq();
      if (E.freqRules.some(visitTypeMissing)) {
        const err = $('be-freq-error');
        err.textContent = 'A frequency rule refers to a visit type that no longer exists. Edit the rule to pick a current visit type.';
        err.hidden = false;
        ruleError = ruleError || $('be-freq-table').querySelector('.pw-rule.has-error .pw-more');
      }

      if (E.conditional) {
        renderAssign();
        if (E.assignRules.some(r => (r.assign === 'category' ? !r.targets.length : !r.userCriteria.length))) {
          const err = $('be-assign-error');
          err.textContent = 'An assignment rule has no one to assign to. Edit the rule to choose who it assigns to.';
          err.hidden = false;
          ruleError = ruleError || $('be-assign-table').querySelector('.pw-rule.has-error .pw-more');
        }
      }
    }

    if (!errors.showFirst()) return false;
    if ($('be-time-msg')) { $('be-time').focus(); return false; }
    if (ruleError) {
      ruleError.scrollIntoView({ block: 'center' });
      ruleError.focus();
      return false;
    }
    return true;
  }

  /* ── First render ──────────────────────────────────── */
  function renderAll() {
    renderReps();
    renderFreq();
    renderAssign();
  }

  if (topDown) {
    setAuto(E.auto);
    setConditional(E.conditional);
  }
  renderSummary();
  renderAll();

  Planner.initPage({ index: 2, validate });
})();
