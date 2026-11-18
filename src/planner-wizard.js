/* ============================================================
   Planner wizard — what the five steps share
   Each step is its own page, so everything the steps hand to one another
   lives here, in sessionStorage, and survives moving between them:

     state      the planner being configured (name, model, modules, visit
                types, Beat Engine, Field Rules, Notifications)
     stepper    the five chevrons; done steps navigate back, a step ahead
                validates every step before it first
     footer     Previous · Cancel · Save as Draft · Next / Finish, and
                Delete Planner once the planner has been saved
     dialogs    focus trap, Escape / backdrop close, focus returned to
                the opener, stacking (a dialog opened from a dialog)
     confirm    the warning before configured work is thrown away
     toast      including one carried across a page change

   A page calls Planner.initPage({ index, validate }) once its own markup
   is ready. Steps that are not on screen are validated from the state
   (validators below), so Finish and the stepper can stop on the first
   step that fails and open it with its error showing (#validate).

   Behaviour contract: beat-planner-specs/01-shared-wizard-conventions.md
   ============================================================ */
window.Planner = (function () {
  const KEY = 'bp-planner';
  const FLASH_KEY = 'bp-planner-flash';

  const STEPS = [
    { label: 'Planner Configuration', href: 'planner-config.html' },
    { label: 'Visit Types',           href: 'visit-types.html' },
    { label: 'Beat Engine',           href: 'beat-engine.html' },
    { label: 'Field Rules',           href: 'field-rules.html' },
    { label: 'Notifications',         href: 'notifications.html' },
  ];

  /* The server's enforced limits win over the design (spec README):
     Max Visits per day is 1–23 in the field meta, not the design's 25 */
  const LIMITS = {
    visitsMax: 23,
    daysMax: 31,
    rules: 25,
    visitTypes: 15,
    durationMax: 999,
    mileageMax: 999,
    bufferMax: 240,
    radiusMin: 25,
    radiusMax: 200,
    allowanceMax: 9999.99,
    expenseTypeName: 50,
  };

  const KM_PER_MILE = 1.609344;

  /* Notifications, in table order. Email is the only channel the admin
     chooses; Mobile App is always on. */
  const NOTIFICATION_EVENTS = [
    { name: 'Visit Delayed',       recipient: 'Manager & Rep', email: true,  group: 'visit' },
    { name: 'Visit Cancelled',     recipient: 'Manager & Rep', email: false, group: 'visit' },
    { name: 'Visit Rescheduled',   recipient: 'Manager & Rep', email: true,  group: 'visit' },
    { name: 'Exceeded Visit Time', recipient: 'Manager & Rep', email: false, group: 'visit' },
    { name: 'Beat Submitted',      recipient: 'Manager',       email: true,  group: 'approval' },
    { name: 'Beat Approved',       recipient: 'Rep',           email: false, group: 'approval' },
    { name: 'Beat Rejected',       recipient: 'Rep',           email: true,  group: 'approval' },
    { name: 'SLA Expiring',        recipient: 'Manager',       email: false, group: 'approval' },
  ];

  const MESSAGES = { empty: 'Field cannot be empty.' };

  /* ── State ─────────────────────────────────────────── */
  const engineDefaults = () => ({
    visits: '1',
    days: '1',
    /* Not on screen any more (D1), but the backend still distributes by it */
    upcoming: 2,
    auto: false,
    reps: { users: [], groups: {}, roles: [] },
    time: '09:00',
    freqRules: [],
    conditional: false,
    assignRules: [],
  });

  const fieldRulesDefaults = () => ({
    mileage: '100',
    unit: 'km',
    buffer: '15',
    adhoc: false,
    prefLocation: false,
    radius: '25',
    mode: 'Manual',
    expense: expenseDefaults(),
  });

  /* Beat Expense Tracking: off until turned on. Each other-expense type is
     a row the rep fills in the expense's Other Expenses subform. */
  function expenseDefaults() {
    return {
      on: false,
      fuel: 'manual',
      allowance: '',
      types: [
        { name: 'Toll Payment', receipt: true },
        { name: 'Permit', receipt: true },
        { name: 'Miscellaneous', receipt: false },
      ],
      approval: false,
    };
  }

  const notificationDefaults = () =>
    Object.fromEntries(NOTIFICATION_EVENTS.map(e => [e.name, e.email]));

  const defaults = () => ({
    name: 'Food Export',
    model: 'top-down',
    approval: false,
    modules: [],
    visitTypes: [],
    furthest: 0,
    saved: false,
    engine: engineDefaults(),
    fieldRules: fieldRulesDefaults(),
    notifications: notificationDefaults(),
  });

  /* A step opened straight from the home page, with nothing configured
     before it, still needs modules and visit types to work with */
  function demo() {
    const s = defaults();
    s.modules = [
      { module: 'Accounts', addressType: 'unstructured', fields: { full: 'Billing Address' }, scope: 'all', criteria: [], pattern: '' },
      { module: 'Deals', addressType: 'unstructured', fields: { full: 'Shipping Address' }, scope: 'all', criteria: [], pattern: '' },
    ];
    s.visitTypes = [
      { name: 'Shop Delivery',      duration: '30', image: 'mandatory', file: 'visible', notes: 'visible' },
      { name: 'Order Collection',   duration: '15', image: 'visible',   file: 'visible', notes: 'mandatory' },
      { name: 'Payment Collection', duration: '20', image: 'visible',   file: 'mandatory', notes: 'visible' },
    ];
    s.furthest = 4;
    return s;
  }

  function read() {
    try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; }
  }

  const stored = read();
  const state = stored
    ? {
        ...defaults(), ...stored,
        engine: { ...engineDefaults(), ...stored.engine },
        fieldRules: {
          ...fieldRulesDefaults(), ...stored.fieldRules,
          expense: { ...expenseDefaults(), ...(stored.fieldRules || {}).expense },
        },
        notifications: { ...notificationDefaults(), ...stored.notifications },
      }
    : demo();

  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  }

  function reset() {
    try { sessionStorage.removeItem(KEY); } catch { /* private mode */ }
  }

  /* ── Small helpers ─────────────────────────────────── */
  const escape = s => String(s ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const patternOf = n => n > 0 ? '(' + Array.from({ length: n }, (_, i) => i + 1).join(' and ') + ')' : '';

  let uid = 0;
  const newId = prefix => `${prefix}-${Date.now().toString(36)}-${++uid}`;

  /* Whole digits only, on typing and on paste alike: the filter runs on
     the input event, so a disallowed character never stays in the field */
  function digitsOnly(input, maxLength) {
    input.addEventListener('input', () => {
      const clean = input.value.replace(/\D/g, '').slice(0, maxLength);
      if (clean !== input.value) input.value = clean;
    });
  }

  /* ── Toast ─────────────────────────────────────────── */
  function toast(message) {
    const el = document.getElementById('pc-toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* A toast for the page about to open */
  function flash(message) {
    try { sessionStorage.setItem(FLASH_KEY, message); } catch { /* private mode */ }
  }

  function showFlash() {
    let message = null;
    try {
      message = sessionStorage.getItem(FLASH_KEY);
      sessionStorage.removeItem(FLASH_KEY);
    } catch { /* private mode */ }
    if (message) setTimeout(() => toast(message), 150);
  }

  /* ── Validators, read from the state ───────────────── */
  /* Each answers "would this step's Next go through?" without its page.
     The page itself shows the errors once it is opened with #validate. */
  const repCount = reps => reps.users.length
    + Object.values(reps.groups).reduce((n, ids) => n + ids.length, 0)
    + reps.roles.length;

  function limitProblem(raw, max) {
    const value = String(raw ?? '').trim();
    if (!value) return MESSAGES.empty;
    const n = Number(value);
    if (n === 0) return 'Must be at least 1.';
    if (n > max) return `Must be ${max} or less.`;
    return '';
  }

  const visitTypeExists = name =>
    state.visitTypes.some(v => v.name.trim().toLowerCase() === String(name).trim().toLowerCase());

  const validators = [
    s => Boolean(s.name.trim()) && s.modules.length > 0,
    s => {
      if (!s.visitTypes.length) return false;
      const seen = new Set();
      return s.visitTypes.every(v => {
        const key = v.name.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return Number(v.duration) > 0;
      });
    },
    s => {
      const e = s.engine;
      if (limitProblem(e.visits, LIMITS.visitsMax) || limitProblem(e.days, LIMITS.daysMax)) return false;
      if (s.model !== 'top-down' || !e.auto) return true;
      if (!repCount(e.reps) || !e.time) return false;
      if (e.freqRules.some(r => !r.frequency || !r.visitType || !visitTypeExists(r.visitType))) return false;
      if (e.conditional && e.assignRules.some(r => r.assign === 'category'
        ? !r.targets.length
        : !r.userCriteria.length)) return false;
      return true;
    },
    s => {
      const f = s.fieldRules;
      const n = v => (String(v).trim() === '' ? NaN : Number(v));
      const limitsOk = n(f.mileage) >= 1 && n(f.mileage) <= LIMITS.mileageMax
        && n(f.buffer) >= 1 && n(f.buffer) <= LIMITS.bufferMax
        && n(f.radius) >= LIMITS.radiusMin && n(f.radius) <= LIMITS.radiusMax;
      const x = f.expense;
      if (!limitsOk || !x.on) return limitsOk;
      if (x.fuel === 'automatic' && !(n(x.allowance) > 0 && n(x.allowance) <= LIMITS.allowanceMax)) return false;
      const seen = new Set();
      return x.types.every(t => {
        const key = t.name.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    () => true,
  ];

  /* ── Navigation ────────────────────────────────────── */
  let page = null;

  function go(index, validateOnArrival = false) {
    save();
    window.location.href = STEPS[index].href + (validateOnArrival ? '#validate' : '');
  }

  /* Moving forward checks the step on screen (its live fields), then every
     step between here and the target from the state. The first one that
     fails is where the wizard stops. */
  function goForward(target) {
    if (!page.validate()) return;
    for (let i = page.index + 1; i < target; i++) {
      if (!validators[i](state)) { go(i, true); return; }
    }
    state.furthest = Math.max(state.furthest, target);
    go(target);
  }

  function finish() {
    if (!page.validate()) return;
    for (let i = 0; i < STEPS.length; i++) {
      if (i === page.index) continue;
      if (!validators[i](state)) {
        toast(`Complete ${STEPS[i].label} before finishing.`);
        setTimeout(() => go(i, true), 900);
        return;
      }
    }
    setSaving(true);
    /* Stands in for the save request */
    setTimeout(() => {
      state.saved = true;
      state.furthest = STEPS.length - 1;
      markRulesSaved();
      save();
      flash('Planner saved.');
      window.location.href = 'planner-summary.html';
    }, 600);
  }

  /* Rules already sent to the server ask before they are removed */
  function markRulesSaved() {
    state.engine.freqRules.forEach(r => { r.saved = true; });
    state.engine.assignRules.forEach(r => { r.saved = true; });
  }

  /* Buttons go dead and a freeze layer covers the page while saving */
  function setSaving(on) {
    document.querySelectorAll('.pc-footer .pc-btn').forEach(b => { b.disabled = on; });
    let freeze = document.getElementById('pc-freeze');
    if (!freeze) {
      freeze = document.createElement('div');
      freeze.id = 'pc-freeze';
      freeze.className = 'pc-freeze';
      freeze.innerHTML = '<span class="pc-freeze-spin" aria-hidden="true"></span>';
      freeze.setAttribute('aria-live', 'polite');
      document.body.appendChild(freeze);
    }
    freeze.classList.toggle('show', on);
    freeze.setAttribute('aria-label', on ? 'Saving the planner' : '');
  }

  /* ── Stepper ───────────────────────────────────────── */
  function mountStepper(index) {
    const nav = document.querySelector('.pc-stepper');
    if (!nav) return;
    nav.innerHTML = STEPS.map((step, i) => {
      const status = i === index ? 'active' : i < Math.max(index, state.furthest) ? 'done' : 'idle';
      return `
        <button class="pc-step ${status}" type="button" data-step="${i}"
                ${i === index ? 'aria-current="step"' : ''}>
          <span class="pc-marker" aria-hidden="true"></span>
          <span>${step.label}</span>
        </button>`;
    }).join('');
    nav.addEventListener('click', e => {
      const btn = e.target.closest('.pc-step');
      if (!btn) return;
      const target = Number(btn.dataset.step);
      if (target === index) return;
      if (target < index) go(target);
      else goForward(target);
    });
  }

  /* ── Footer ────────────────────────────────────────── */
  function wireFooter(index) {
    const $ = id => document.getElementById(id);

    $('pc-previous')?.addEventListener('click', () => go(index - 1));
    $('pc-cancel')?.addEventListener('click', () => {
      save();
      window.location.href = 'index.html';
    });
    $('pc-draft')?.addEventListener('click', () => {
      markRulesSaved();
      save();
      page.onDraft?.();
      toast('Saved as draft.');
    });
    $('pc-next')?.addEventListener('click', () => {
      if (page.validate()) {
        state.furthest = Math.max(state.furthest, index + 1);
        markRulesSaved();
        go(index + 1);
      }
    });
    $('pc-finish')?.addEventListener('click', finish);

    /* An existing planner can be deleted from any step */
    const previous = $('pc-previous');
    if (state.saved && previous && !$('pc-delete')) {
      const del = document.createElement('button');
      del.className = 'pc-btn failure';
      del.id = 'pc-delete';
      del.type = 'button';
      del.textContent = 'Delete Planner';
      const left = document.createElement('div');
      left.className = 'pc-footer-left';
      previous.replaceWith(left);
      left.append(previous, del);
      del.addEventListener('click', async () => {
        const ok = await confirm({
          title: 'Delete planner',
          message: `"${state.name}" and everything configured in it will be deleted. This cannot be undone.`,
          action: 'Delete',
        });
        if (!ok) return;
        reset();
        flash('Planner deleted.');
        window.location.href = 'index.html';
      });
    }
  }

  function initPage(opts) {
    page = opts;
    state.furthest = Math.max(state.furthest, opts.index);
    save();
    mountStepper(opts.index);
    wireFooter(opts.index);
    showFlash();
    /* Opened by Finish or the stepper because this step is incomplete:
       show its errors straight away */
    if (location.hash === '#validate') {
      history.replaceState(null, '', location.pathname);
      setTimeout(() => opts.validate(), 50);
    }
  }

  /* ── Dialogs ───────────────────────────────────────── */
  /* Open dialogs, innermost last; only the top one hears Escape and Tab */
  const stack = [];

  const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusables(root) {
    return [...root.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null || el === document.activeElement);
  }

  /* overlay: the .pc-overlay holding a role="dialog" element.
     onDismiss runs for Cancel / Escape / backdrop and should close it. */
  function dialog(overlay, { onDismiss } = {}) {
    let opener = null;
    const dlg = overlay.querySelector('[role="dialog"], [role="alertdialog"]');
    const dismiss = () => (onDismiss ? onDismiss() : api.close());

    /* A press that starts inside and ends on the backdrop (a text drag)
       is not a backdrop click */
    let downOnBackdrop = false;
    overlay.addEventListener('mousedown', e => { downOnBackdrop = e.target === overlay; });
    overlay.addEventListener('click', e => {
      if (e.target === overlay && downOnBackdrop) dismiss();
    });

    const api = {
      get isOpen() { return overlay.classList.contains('show'); },
      open(from, focusEl) {
        opener = from || document.activeElement;
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden', 'false');
        stack.push(api);
        requestAnimationFrame(() => (focusEl || focusables(dlg)[0] || dlg).focus());
      },
      close() {
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
        const i = stack.indexOf(api);
        if (i >= 0) stack.splice(i, 1);
        if (opener && opener.isConnected) opener.focus();
        opener = null;
      },
      dismiss,
      trap(e) {
        if (e.key === 'Escape') { e.preventDefault(); dismiss(); return; }
        if (e.key !== 'Tab') return;
        const items = focusables(dlg);
        if (!items.length) { e.preventDefault(); return; }
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || !dlg.contains(document.activeElement))) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      },
    };
    return api;
  }

  document.addEventListener('keydown', e => {
    const top = stack[stack.length - 1];
    if (!top) return;
    /* An open list inside the dialog takes Escape first */
    if (e.key === 'Escape' && e.defaultPrevented) return;
    top.trap(e);
  });

  /* Header and footer shadows only while content is scrolled behind them */
  function syncShadows(modal, scroller) {
    const atTop = scroller.scrollTop <= 0;
    const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    modal.classList.toggle('scrolled', !atTop);
    modal.classList.toggle('more-below', !atBottom);
  }

  /* ── Confirm ───────────────────────────────────────── */
  /* Names what will be lost and offers Cancel. Resolves true on the action. */
  function confirm({ title, message, action = 'Remove', cancel = 'Cancel' }) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'pc-overlay pw-confirm-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      const titleId = newId('pw-confirm-title');
      const descId = newId('pw-confirm-desc');
      overlay.innerHTML = `
        <div class="pw-confirm" role="alertdialog" aria-modal="true"
             aria-labelledby="${titleId}" aria-describedby="${descId}">
          <span class="pw-confirm-icon" aria-hidden="true"><i class="ti ti-alert-triangle"></i></span>
          <div class="pw-confirm-text">
            <h2 class="pw-confirm-title" id="${titleId}">${escape(title)}</h2>
            <p class="pw-confirm-msg" id="${descId}">${escape(message)}</p>
          </div>
          <div class="pw-confirm-foot">
            <button class="pc-btn default" type="button" data-act="cancel">${escape(cancel)}</button>
            <button class="pc-btn failure" type="button" data-act="ok">${escape(action)}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      let result = false;
      const d = dialog(overlay, { onDismiss: () => done(false) });
      function done(ok) {
        result = ok;
        d.close();
        overlay.remove();
        resolve(result);
      }
      overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => done(false));
      overlay.querySelector('[data-act="ok"]').addEventListener('click', () => done(true));
      /* Cancel takes focus: the safe choice is the default one */
      d.open(document.activeElement, overlay.querySelector('[data-act="cancel"]'));
    });
  }

  /* ── Menus (⋯ row menu, module menu) ───────────────── */
  /* A small popup list of actions. Arrow keys move, Enter picks, Escape
     and an outside click close it and return focus to its button. */
  let openMenu = null;

  function menu(anchor, items, onPick) {
    closeMenu();
    const el = document.createElement('div');
    el.className = 'pw-menu';
    el.setAttribute('role', 'menu');
    el.innerHTML = items.map((item, i) => `
      <button class="pw-menu-item${item.danger ? ' danger' : ''}" type="button" role="menuitem"
              tabindex="-1" data-i="${i}">${escape(item.label)}</button>`).join('');
    document.body.appendChild(el);

    const r = anchor.getBoundingClientRect();
    const h = el.offsetHeight;
    const w = el.offsetWidth;
    el.style.left = `${Math.min(r.left, window.innerWidth - w - 8)}px`;
    el.style.top = `${r.bottom + 4 + h <= window.innerHeight - 8 ? r.bottom + 4 : r.top - 4 - h}px`;

    anchor.setAttribute('aria-expanded', 'true');
    const buttons = [...el.querySelectorAll('.pw-menu-item')];
    buttons[0]?.focus();

    function close(returnFocus = true) {
      el.remove();
      anchor.setAttribute('aria-expanded', 'false');
      document.removeEventListener('mousedown', outside, true);
      openMenu = null;
      if (returnFocus && anchor.isConnected) anchor.focus();
    }
    function outside(e) { if (!el.contains(e.target) && e.target !== anchor) close(false); }
    document.addEventListener('mousedown', outside, true);

    el.addEventListener('keydown', e => {
      const i = buttons.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = (i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next].focus();
      } else if (e.key === 'Home') { e.preventDefault(); buttons[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); buttons[buttons.length - 1].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'Tab') { close(false); }
    });
    el.addEventListener('click', e => {
      const btn = e.target.closest('.pw-menu-item');
      if (!btn) return;
      close(false);
      onPick(items[Number(btn.dataset.i)]);
    });

    openMenu = { close };
  }

  function closeMenu() { if (openMenu) openMenu.close(false); }
  window.addEventListener('resize', closeMenu);
  document.addEventListener('scroll', closeMenu, true);

  return {
    STEPS, LIMITS, KM_PER_MILE, NOTIFICATION_EVENTS, MESSAGES,
    state, save, reset,
    /* false when this page opened with no planner in progress */
    wasStored: Boolean(stored),
    initPage, go, finish, setSaving,
    toast, flash, showFlash,
    dialog, confirm, menu, closeMenu, syncShadows,
    escape, patternOf, newId, digitsOnly,
    repCount, limitProblem, visitTypeExists, validators,
    engineDefaults,
  };
})();
