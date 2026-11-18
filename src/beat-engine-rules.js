/* ============================================================
   Beat Engine — what the frequency and assignment rules share
   1. The criteria builder used inside both rule dialogs
      (record criteria, and the "Users matching certain conditions"
      builder): number badge, field · operator · value, AND between rows,
      ⊖ on every row while more than one is left, ⊕ on the last row,
      and a read-only Criteria Pattern that Edit Pattern unlocks.
   2. The rule table: rules grouped under their module in evaluation
      order, a drag handle and ⋯ menu (Edit, Move up, Move down, Remove)
      on hover or focus, drag to reorder within a module only, See More
      past two criteria, and removal that confirms for a saved rule.
   ============================================================ */
window.BERules = (function () {
  const { escape, patternOf } = Planner;
  const { OPERATORS, VALUELESS } = BEData;

  /* ── 1. Criteria builder ───────────────────────────── */
  const blankRow = () => ({ field: '', op: 'is', value: '' });
  const blankBuilder = () => ({ rows: [blankRow()], pattern: '', editPattern: false });

  const option = (value, selected) =>
    `<option value="${escape(value)}"${value === selected ? ' selected' : ''}>${escape(value)}</option>`;

  function builderHtml(b, key, label) {
    const rows = b.rows.map((c, i) => `
      <div class="pc-crit-row" data-i="${i}">
        <span class="pc-crit-index">
          <span class="pc-crit-badge">${i + 1}</span>
          <span class="pc-crit-join"><span>AND</span></span>
        </span>
        <span class="pc-crit-fields">
          <span class="pc-field-cell attr">
            <select class="pc-field pc-crit-attr" aria-label="${label} ${i + 1} field"></select>
          </span>
          <span class="pc-field-cell op">
            <select class="pc-field pc-crit-op" aria-label="${label} ${i + 1} operator">
              ${OPERATORS.map(op => option(op, c.op)).join('')}
            </select>
          </span>
          <span class="pc-field-cell val">
            <input class="pc-field pc-crit-val" type="text" aria-label="${label} ${i + 1} value"
                   value="${escape(c.value)}" ${VALUELESS.has(c.op) ? 'disabled' : ''} />
          </span>
        </span>
        <span class="pc-crit-actions">
          <button class="pc-icon-btn remove" type="button" aria-label="Remove ${label.toLowerCase()} ${i + 1}"
                  ${b.rows.length === 1 ? 'hidden' : ''}>
            <i class="ti ti-circle-minus" aria-hidden="true"></i>
          </button>
          <button class="pc-icon-btn add" type="button" aria-label="Add ${label.toLowerCase()}"
                  ${i !== b.rows.length - 1 ? 'hidden' : ''}>
            <i class="ti ti-circle-plus" aria-hidden="true"></i>
          </button>
        </span>
      </div>`).join('');

    return `
      <div class="be-builder" data-builder="${key}">
        <div class="mb-crit-rows">${rows}</div>
        <div class="pc-crit-pattern">
          <span class="pc-crit-pattern-label">Criteria Pattern</span>
          <span class="pc-crit-pattern-value">
            <input class="pc-field be-pattern" aria-label="${label} pattern"
                   value="${escape(b.editPattern ? b.pattern : patternOf(b.rows.length))}"
                   ${b.editPattern ? '' : 'readonly'} />
            <button class="pc-link-btn be-edit-pattern" type="button" aria-pressed="${b.editPattern}">
              ${b.editPattern ? 'Use Generated Pattern' : 'Edit Pattern'}</button>
          </span>
        </div>
      </div>`;
  }

  /* Field selects are filled after render so each keeps its own value */
  function fillBuilder(root, b, fields) {
    root.querySelectorAll('.pc-crit-row').forEach(row => {
      const c = b.rows[Number(row.dataset.i)];
      const sel = row.querySelector('.pc-crit-attr');
      sel.innerHTML = `<option value="" ${c.field ? '' : 'selected'} disabled>Select Field</option>`
        + fields.map(f => option(f, c.field)).join('');
    });
  }

  /* One listener set per dialog body; `builders(key)` returns the draft's
     builder for that key, `rerender()` redraws the dialog */
  function bindBuilders(container, builders, rerender, errors) {
    const rowOf = el => {
      const b = builders(el.closest('.be-builder').dataset.builder);
      return { b, c: b.rows[Number(el.closest('.pc-crit-row').dataset.i)] };
    };

    container.addEventListener('change', e => {
      const t = e.target;
      if (t.classList.contains('pc-crit-attr')) rowOf(t).c.field = t.value;
      if (t.classList.contains('pc-crit-op')) {
        const { c } = rowOf(t);
        c.op = t.value;
        /* A valueless operator clears and disables the value */
        if (VALUELESS.has(c.op)) {
          c.value = '';
          const val = t.closest('.pc-crit-row').querySelector('.pc-crit-val');
          val.value = '';
          val.disabled = true;
          errors.clear(val);
        } else {
          t.closest('.pc-crit-row').querySelector('.pc-crit-val').disabled = false;
        }
      }
    });

    container.addEventListener('input', e => {
      const t = e.target;
      if (t.classList.contains('pc-crit-val')) rowOf(t).c.value = t.value;
      if (t.classList.contains('be-pattern')) builders(t.closest('.be-builder').dataset.builder).pattern = t.value;
    });

    container.addEventListener('click', e => {
      const btn = e.target.closest('.pc-icon-btn, .be-edit-pattern');
      if (!btn || !btn.closest('.be-builder')) return;
      /* Read before the redraw detaches the button */
      const key = btn.closest('.be-builder').dataset.builder;
      const b = builders(key);
      const scopeOf = () => container.querySelector(`[data-builder="${key}"]`);
      if (btn.classList.contains('be-edit-pattern')) {
        b.editPattern = !b.editPattern;
        b.pattern = b.editPattern ? patternOf(b.rows.length) : '';
        rerender();
        scopeOf()?.querySelector(b.editPattern ? '.be-pattern' : '.be-edit-pattern')?.focus();
        return;
      }
      const adding = btn.classList.contains('add');
      const i = Number(btn.closest('.pc-crit-row').dataset.i);
      if (adding) b.rows.push(blankRow());
      else b.rows.splice(i, 1);
      /* Adding or removing a row regenerates the pattern */
      b.editPattern = false;
      b.pattern = '';
      rerender();
      const rows = scopeOf()?.querySelectorAll('.pc-crit-row') || [];
      const focusRow = adding ? rows[rows.length - 1] : rows[Math.min(i, rows.length - 1)];
      focusRow?.querySelector('.pc-crit-attr')?.focus();
    });
  }

  /* An empty row is not "no criteria": its field and value are flagged */
  function validateBuilder(root, b, errors) {
    root.querySelectorAll('.pc-crit-row').forEach(row => {
      const c = b.rows[Number(row.dataset.i)];
      if (!c.field) errors.set(row.querySelector('.pc-crit-attr'), Planner.MESSAGES.empty);
      if (!VALUELESS.has(c.op) && !c.value.trim()) errors.set(row.querySelector('.pc-crit-val'), Planner.MESSAGES.empty);
    });
    if (b.editPattern && !b.pattern.trim()) errors.set(root.querySelector('.be-pattern'), Planner.MESSAGES.empty);
  }

  /* What a builder saves: its rows, and the pattern in force */
  const builderValue = b => ({
    criteria: b.rows.map(r => ({ ...r, value: VALUELESS.has(r.op) ? '' : r.value.trim() })),
    pattern: b.editPattern ? b.pattern.trim() : patternOf(b.rows.length),
  });

  const builderFrom = (criteria, pattern) => criteria && criteria.length
    ? { rows: criteria.map(c => ({ ...c })), pattern: pattern || '', editPattern: Boolean(pattern && pattern !== patternOf(criteria.length)) }
    : blankBuilder();

  /* ── Criteria as table text ────────────────────────── */
  function critLines(criteria, { prefix = '' } = {}) {
    return criteria.map((c, i) => `
      <p><span class="pw-crit-i">${i + 1}</span>${prefix}${escape(c.field)} <span class="pw-op">${escape(c.op.toUpperCase())}</span>${VALUELESS.has(c.op) ? '' : ' ' + escape(c.value)}</p>`);
  }

  /* All Records for scoped rules; otherwise the numbered criteria, the
     first two with See More past that, then the pattern */
  function conditionHtml(rule, expanded, ruleLabel) {
    if (rule.scope !== 'specific' || !rule.criteria.length) return '<div class="pw-crit"><p>All Records</p></div>';
    const lines = critLines(rule.criteria);
    const many = lines.length > 2;
    const shown = many && !expanded ? lines.slice(0, 2) : lines;
    const pattern = rule.criteria.length > 1
      ? `<p class="pw-crit-pattern"><span>Criteria Pattern</span>${escape(rule.pattern)}</p>` : '';
    const toggle = many
      ? `<button class="pw-see" type="button" data-see="${rule.id}" aria-expanded="${expanded}"
                 aria-label="${expanded ? 'See less' : 'See more'} criteria for ${escape(ruleLabel)}">${expanded ? 'See Less' : 'See More'}</button>`
      : '';
    return `<div class="pw-crit">${shown.join('')}${pattern}${toggle}</div>`;
  }

  /* ── 2. Rule table ─────────────────────────────────── */
  /* cfg: {
       host, kind ('frequency rule' | 'assignment rule'),
       cols, headers[],
       getRules(), setRules(rules),
       moduleOrder() → module names in step-1 order,
       mappedModules() → modules still mapped in step 1,
       cells(rule, ctx) → html per column after Condition,
       rowError(rule) → message or '' (marks the row),
       onEdit(rule), onChange()
     } */
  function mountTable(cfg) {
    const { host } = cfg;
    const expanded = new Set();
    let dragId = null;

    host.setAttribute('role', 'table');
    host.setAttribute('aria-label', cfg.kind === 'frequency rule' ? 'Frequency rules' : 'Assignment rules');
    host.style.setProperty('--pw-cols', cfg.cols);

    /* Modules in step-1 order, then any whose mapping has since gone */
    function groups() {
      const rules = cfg.getRules();
      const order = cfg.moduleOrder();
      const extra = [...new Set(rules.map(r => r.module))].filter(m => !order.includes(m));
      return [...order, ...extra]
        .map(module => ({ module, rules: rules.filter(r => r.module === module) }))
        .filter(g => g.rules.length);
    }

    const labelOf = (rule, g) => `rule ${g.rules.indexOf(rule) + 1} in ${rule.module}`;

    function render() {
      const mapped = cfg.mappedModules();
      const head = `
        <div class="pw-tr pw-thead" role="row">
          <span role="columnheader"><span class="pw-sr">Actions</span></span>
          ${cfg.headers.map(h => `<span role="columnheader">${h}</span>`).join('')}
        </div>`;
      const body = groups().map(g => `
        <div class="pw-module-row" role="row">
          <span role="rowheader">${escape(g.module)}${mapped.includes(g.module) ? '' : '<span class="pw-missing">No longer mapped in Planner Configuration</span>'}</span>
        </div>
        ${g.rules.map(rule => {
          const label = labelOf(rule, g);
          const error = cfg.rowError(rule);
          return `
          <div class="pw-tr pw-rule${error ? ' has-error' : ''}" role="row" data-id="${rule.id}" data-module="${escape(rule.module)}">
            <span class="pw-row-actions" role="cell">
              <span class="pw-drag" draggable="true" title="Drag to reorder" aria-hidden="true"><i class="ti ti-grip-vertical"></i></span>
              <button class="pw-more" type="button" aria-haspopup="menu" aria-expanded="false"
                      aria-label="Actions for ${escape(label)}"><i class="ti ti-dots" aria-hidden="true"></i></button>
            </span>
            <span role="cell">${conditionHtml(rule, expanded.has(rule.id), label)}</span>
            ${cfg.cells(rule, { label, error }).map(c => `<span role="cell">${c}</span>`).join('')}
          </div>`;
        }).join('')}`).join('');
      host.innerHTML = head + body;
    }

    function move(id, delta) {
      const rules = cfg.getRules().slice();
      const i = rules.findIndex(r => r.id === id);
      const sameModule = rules.map((r, k) => [r, k]).filter(([r]) => r.module === rules[i].module).map(([, k]) => k);
      const pos = sameModule.indexOf(i);
      const j = sameModule[pos + delta];
      if (j === undefined) return;
      [rules[i], rules[j]] = [rules[j], rules[i]];
      cfg.setRules(rules);
      cfg.onChange();
      host.querySelector(`.pw-rule[data-id="${id}"] .pw-more`)?.focus();
      Planner.toast(delta < 0 ? 'Rule moved up.' : 'Rule moved down.');
    }

    async function remove(rule) {
      if (rule.saved) {
        const ok = await Planner.confirm({
          title: `Remove ${cfg.kind}`,
          message: 'This rule will be deleted when you save the Planner.',
          action: 'Remove',
        });
        if (!ok) return;
      }
      cfg.setRules(cfg.getRules().filter(r => r.id !== rule.id));
      expanded.delete(rule.id);
      cfg.onChange();
      Planner.toast(`${cfg.kind[0].toUpperCase()}${cfg.kind.slice(1)} removed.`);
    }

    host.addEventListener('click', e => {
      const see = e.target.closest('.pw-see');
      if (see) {
        const id = see.dataset.see;
        if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
        render();
        host.querySelector(`.pw-see[data-see="${id}"]`)?.focus();
        return;
      }
      const more = e.target.closest('.pw-more');
      if (!more) return;
      const id = more.closest('.pw-rule').dataset.id;
      const rule = cfg.getRules().find(r => r.id === id);
      const siblings = cfg.getRules().filter(r => r.module === rule.module);
      const pos = siblings.indexOf(rule);
      const items = [{ act: 'edit', label: 'Edit' }];
      if (pos > 0) items.push({ act: 'up', label: 'Move up' });
      if (pos < siblings.length - 1) items.push({ act: 'down', label: 'Move down' });
      items.push({ act: 'remove', label: 'Remove', danger: true });
      Planner.menu(more, items, item => {
        if (item.act === 'edit') cfg.onEdit(rule, more);
        if (item.act === 'up') move(id, -1);
        if (item.act === 'down') move(id, 1);
        if (item.act === 'remove') remove(rule);
      });
    });

    /* Drag within a module only: a row of another module refuses the drop */
    function clearDrop() {
      host.querySelectorAll('.drop-before, .drop-after').forEach(el => el.classList.remove('drop-before', 'drop-after'));
    }

    host.addEventListener('dragstart', e => {
      const handle = e.target.closest?.('.pw-drag');
      if (!handle) return;
      const row = handle.closest('.pw-rule');
      dragId = row.dataset.id;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragId);
      e.dataTransfer.setDragImage(row, 20, 20);
    });

    host.addEventListener('dragover', e => {
      const row = e.target.closest('.pw-rule');
      if (!dragId || !row) return;
      const from = cfg.getRules().find(r => r.id === dragId);
      clearDrop();
      if (!from || row.dataset.module !== from.module || row.dataset.id === dragId) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const r = row.getBoundingClientRect();
      row.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after');
    });

    host.addEventListener('dragleave', e => { if (!host.contains(e.relatedTarget)) clearDrop(); });

    host.addEventListener('drop', e => {
      const row = e.target.closest('.pw-rule');
      if (!dragId || !row) return;
      e.preventDefault();
      const before = row.classList.contains('drop-before');
      clearDrop();
      const rules = cfg.getRules().slice();
      const from = rules.findIndex(r => r.id === dragId);
      const [moved] = rules.splice(from, 1);
      if (moved.module !== row.dataset.module) return;
      let to = rules.findIndex(r => r.id === row.dataset.id);
      if (!before) to += 1;
      rules.splice(to, 0, moved);
      cfg.setRules(rules);
      cfg.onChange();
    });

    host.addEventListener('dragend', () => {
      dragId = null;
      clearDrop();
      host.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    });

    return { render };
  }

  return {
    blankBuilder, builderHtml, fillBuilder, bindBuilders, validateBuilder,
    builderValue, builderFrom, critLines, conditionHtml, mountTable,
  };
})();
