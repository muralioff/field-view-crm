/* ============================================================
   Planner Configuration — the wizard's step 1
   Figma 75:6766 (empty) / 2022:73607 (modules added)
          1995:72270 → 2022:73059 (Module & Address Mapping modal)

   Three things get configured here:
     1. Planner name
     2. Operating model — Top Down or Bottom Up, single choice
     3. Modules & address mapping — the table of mapped modules

   The Add / Edit dialog lives in src/module-modal-b.js and reaches this
   page's rows through the window.PCModules API at the foot of this file.

   Everything here is written to the wizard state (src/planner-wizard.js)
   as it changes: Beat Engine reads the model and the modules, and
   Notifications reads the model and Beat Approval.
   ============================================================ */
(function () {
  const MODULES = ['Contacts', 'Accounts', 'Deals', 'Leads'];

  /* Single-line CRM fields, one per address part */
  const ADDRESS_FIELDS = [
    'Billing Street', 'Billing City', 'Billing State', 'Billing Country', 'Billing Code',
    'Shipping Street', 'Shipping City', 'Shipping State', 'Shipping Country', 'Shipping Code',
    'Mailing Address', 'Office Address',
  ];

  /* Multiline fields — the whole address sits in one of these and is parsed
     downstream to plot the record, so only multiline fields can be mapped. */
  const MULTILINE_FIELDS = [
    'Billing Address', 'Shipping Address', 'Mailing Address', 'Other Address', 'Address Description',
  ];

  /* How the module stores its address, and what each way asks to be mapped.
     Street, City, State and Pincode are mandatory when it is spread across
     fields; Country is not. The single-field form maps one multiline field
     holding the whole address. */
  const ADDRESS_PARTS = {
    structured: [
      { key: 'street',  label: 'Street',  required: true },
      { key: 'city',    label: 'City',    required: true },
      { key: 'state',   label: 'State',   required: true },
      { key: 'pincode', label: 'Pincode', required: true },
      { key: 'country', label: 'Country', required: false },
    ],
    unstructured: [
      {
        key: 'full',
        label: 'Full Address',
        required: true,
        fields: MULTILINE_FIELDS,
      },
    ],
  };

  const CRITERIA_FIELDS = ['Division', 'Status', 'Contact Owner', 'Account Owner', 'Priority', 'Lead Status'];
  const OPERATORS = ['is', 'is not', 'contains', 'starts with', 'is empty', 'is not empty'];

  /* Operators that stand alone — no value to type or validate */
  const VALUELESS = new Set(['is empty', 'is not empty']);

  const MESSAGES = {
    empty: 'Field cannot be empty.',
  };

  const modulesEl = document.getElementById('pc-modules');
  const modRowsEl = document.getElementById('pc-mod-rows');
  const nextBtn = document.getElementById('pc-next');
  const toastEl = document.getElementById('pc-toast');

  const S = Planner.state;

  /* Opening step 1 with no planner in progress starts a new one */
  if (!Planner.wasStored) {
    S.modules = [];
    S.visitTypes = [];
    S.furthest = 0;
  }

  /* The mapped modules.
     Each row: { module, addressType, fields{part:crmField}, scope, criteria[] } */
  let rows = S.modules;
  let editingIndex = null;   // null while adding, the row index while editing

  /* ── Small helpers ─────────────────────────────────── */
  const option = (value, selected) =>
    `<option value="${value}" ${value === selected ? 'selected' : ''}>${value}</option>`;

  const placeholder = (label, selected) =>
    `<option value="" ${selected ? '' : 'selected'} disabled>${label}</option>`;

  function fillSelect(el, values, selected, label) {
    el.innerHTML = placeholder(label, selected) + values.map(v => option(v, selected)).join('');
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  const escape = s => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ── 1. Planner name ───────────────────────────────── */
  const nameEl = document.getElementById('pc-planner-name');
  nameEl.value = S.name;
  nameEl.addEventListener('input', () => { S.name = nameEl.value; Planner.save(); });

  /* ── 2. Operating model ────────────────────────────── */
  const approvalRow = document.getElementById('pc-approval-row');
  const approvalBtn = document.getElementById('pc-approval');

  function showModel() {
    document.querySelectorAll('.pc-model').forEach(card =>
      card.setAttribute('aria-pressed', String(card.dataset.model === S.model)));
    approvalRow.hidden = S.model !== 'bottom-up';
    approvalBtn.setAttribute('aria-checked', String(S.approval));
  }

  /* What Bottom Up would throw away from Beat Engine's Auto-create */
  function autoBeatLoss() {
    const E = S.engine;
    const parts = [];
    if (E.auto) parts.push('Auto-create Beats');
    if (Planner.repCount(E.reps)) parts.push('the users Beats are assigned to');
    if (E.freqRules.length) parts.push(`${E.freqRules.length} frequency rule${E.freqRules.length === 1 ? '' : 's'}`);
    if (E.assignRules.length) parts.push(`${E.assignRules.length} assignment rule${E.assignRules.length === 1 ? '' : 's'}`);
    if (E.time !== '09:00') parts.push('the scheduler time');
    if (!parts.length) return '';
    return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  }

  document.querySelectorAll('.pc-model').forEach(card => {
    card.addEventListener('click', async () => {
      const model = card.dataset.model;
      if (model === S.model) return;
      const loss = model === 'bottom-up' ? autoBeatLoss() : '';
      if (loss) {
        const ok = await Planner.confirm({
          title: 'Switch to Bottom-Up',
          message: `Switching to Bottom-Up removes ${loss}. Reps build their own beats, so nothing is generated or assigned.`,
          action: 'Switch',
        });
        if (!ok) return;
      }
      if (model === 'bottom-up') {
        /* Saved as Auto_Beat_Creation=false, Scheduler_Time and
           Involved_Reps empty — the API rejects them otherwise */
        const { visits, days, upcoming } = S.engine;
        S.engine = { ...Planner.engineDefaults(), visits, days, upcoming };
      }
      S.model = model;
      Planner.save();
      showModel();
    });
  });

  approvalBtn.addEventListener('click', () => {
    S.approval = approvalBtn.getAttribute('aria-checked') !== 'true';
    Planner.save();
    showModel();
  });

  /* ── 3. The modules table ──────────────────────────── */
  const OPERATOR_LABEL = op => op.toUpperCase();

  /* Just the fields feeding the map. Which part each one fills, and whether
     the address is spread or combined, is settled inside the dialog. */
  function addressHtml(row) {
    const fields = ADDRESS_PARTS[row.addressType]
      .filter(part => row.fields[part.key])
      .map(part => row.fields[part.key]);
    return `<span class="pc-addr-fields">${escape(fields.join(', '))}</span>`;
  }

  function summaryHtml(row) {
    if (row.scope !== 'specific' || !row.criteria.length) {
      return '<span class="pc-mod-cell">All Records</span>';
    }
    const lines = row.criteria.map((c, i) => `
      <span class="pc-summary-line">
        <span class="pc-summary-idx">${i + 1}</span>
        <span>${escape(c.field)}</span>
        <span class="pc-summary-op">${escape(OPERATOR_LABEL(c.op))}</span>
        <span>${escape(c.value)}</span>
      </span>`).join('');
    const pattern = row.criteria.length > 1
      ? `<span class="pc-summary-pattern">
           <span class="label">Criteria Pattern</span>
           <span>${escape(row.pattern || '')}</span>
         </span>`
      : '';
    return `<span class="pc-summary">${lines}${pattern}</span>`;
  }

  function renderModules() {
    modRowsEl.innerHTML = rows.map((row, i) => `
      <div class="pc-mod-tr pc-mod-row" data-index="${i}">
        <span class="pc-mod-actions">
          <button class="pc-mod-act" type="button" data-act="delete" aria-label="Delete mapping">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
          <button class="pc-mod-act" type="button" data-act="edit" aria-label="Edit mapping">
            <i class="ti ti-pencil" aria-hidden="true"></i>
          </button>
        </span>
        <span class="pc-mod-cell">${escape(row.module)}</span>
        <span>${addressHtml(row)}</span>
        <span>${summaryHtml(row)}</span>
      </div>`).join('');

    const any = rows.length > 0;
    const allMapped = rows.length >= MODULES.length;
    modulesEl.hidden = !any;
    /* Add Module moves up beside the heading once the table is there, and
       goes altogether once every module is spoken for */
    document.getElementById('pc-add-module-btn').hidden = any;
    document.getElementById('pc-add-module-link').hidden = !any || allMapped;
    nextBtn.disabled = !any;
  }

  modRowsEl.addEventListener('click', e => {
    const btn = e.target.closest('.pc-mod-act');
    if (!btn) return;
    const index = Number(btn.closest('.pc-mod-row').dataset.index);
    if (btn.dataset.act === 'delete') { rows.splice(index, 1); Planner.save(); renderModules(); }
    else PCModuleModal.open(index);
  });

  /* ── Footer ────────────────────────────────────────── */
  /* Previous, Cancel, Save as Draft and Next are wired by the wizard */
  function validate() {
    if (!nameEl.value.trim()) { nameEl.focus(); toast('Planner name cannot be empty.'); return false; }
    if (!rows.length) { toast('Add at least one module.'); document.getElementById('pc-add-module-btn').focus(); return false; }
    return true;
  }

  showModel();
  renderModules();
  Planner.initPage({ index: 0, validate });

  /* Layout B drives the same table through this, so both variants stay
     one source of truth. See src/module-modal-b.js. */
  window.PCModules = {
    add(row) { rows.push(row); Planner.save(); renderModules(); },
    update(index, row) { rows[index] = row; Planner.save(); renderModules(); },
    get: index => rows[index],
    /* Modules spoken for by some other row, so the dialog can grey them out
       rather than let one be picked and then rejected */
    takenModules: ignoreIndex =>
      rows.filter((_, i) => i !== ignoreIndex).map(r => r.module),
    constants: {
      MODULES, ADDRESS_FIELDS, ADDRESS_PARTS, CRITERIA_FIELDS,
      OPERATORS, VALUELESS, MESSAGES,
    },
    helpers: { fillSelect, escape, toast },
  };
})();
