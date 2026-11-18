/* ============================================================
   Beat Engine — Select Users (Rep Selection)
   Two panes. Available on the left: a source (Users / Groups / Roles),
   a group picker when the source is Groups, a search box, and rows
   that offer Add on hover or focus, or show ✓ Added. Selected on the
   right: collapsible Users / Groups / Roles headings with counts, a
   sub-heading per group, and removable chips.

   The dialog edits a copy; Cancel, Escape and the backdrop throw it
   away, Done hands it back. A person already brought in by a group is
   not added again as a user, and the row says which group has them.

   Selection shape: { users: [id], groups: { name: [id] }, roles: [name] }
   ============================================================ */
window.BEUsers = (function () {
  const { USERS, GROUPS, ROLES, userById, initials } = BEData;
  const { escape } = Planner;

  const $ = id => document.getElementById(id);
  const overlay = $('be-users-overlay');
  const listEl = $('be-users-list');
  const selectedEl = $('be-users-selected');
  const sourceEl = $('be-users-source');
  const groupEl = $('be-users-group');
  const searchEl = $('be-users-search');

  const dlg = Planner.dialog(overlay, { onDismiss: () => close() });

  let draft = null;
  let onDone = null;
  const collapsed = new Set();

  const clone = reps => ({
    users: [...reps.users],
    groups: Object.fromEntries(Object.entries(reps.groups).map(([g, ids]) => [g, [...ids]])),
    roles: [...reps.roles],
  });

  groupEl.innerHTML = Object.keys(GROUPS).map(g => `<option value="${escape(g)}">${escape(g)}</option>`).join('');

  /* Which selected group already brings this person in, if any */
  const groupHolding = id => Object.entries(draft.groups).find(([, ids]) => ids.includes(id))?.[0];

  const avatar = name => `<span class="be-avatar" aria-hidden="true">${escape(initials(name))}</span>`;

  /* ── Available ─────────────────────────────────────── */
  function availableRows() {
    const q = searchEl.value.trim().toLowerCase();
    const match = (...texts) => !q || texts.some(t => t.toLowerCase().includes(q));
    const source = sourceEl.value;

    if (source === 'roles') {
      return Object.entries(ROLES)
        .filter(([role]) => match(role))
        .map(([role, ids]) => ({
          key: role,
          html: `${avatar(role)}<span class="be-who"><span class="be-name">${escape(role)}</span>
                 <span class="be-email">${ids.length} user${ids.length === 1 ? '' : 's'}</span></span>`,
          name: role,
          added: draft.roles.includes(role) ? '✓ Added' : '',
        }));
    }

    const group = groupEl.value;
    const people = source === 'groups' ? (GROUPS[group] || []).map(userById) : USERS;
    return people
      .filter(u => match(u.name, u.email))
      .map(u => {
        let added = '';
        if (source === 'groups') {
          if (draft.groups[group]?.includes(u.id)) added = '✓ Added';
          else if (draft.users.includes(u.id)) added = '✓ Added as a user';
        } else if (draft.users.includes(u.id)) added = '✓ Added';
        else if (groupHolding(u.id)) added = `✓ In ${groupHolding(u.id)}`;
        return {
          key: u.id,
          name: u.name,
          html: `${avatar(u.name)}<span class="be-who"><span class="be-name">${escape(u.name)}</span>
                 <span class="be-email">${escape(u.email)}</span></span>`,
          added,
        };
      });
  }

  function renderAvailable() {
    const rows = availableRows();
    const q = searchEl.value.trim();
    if (!rows.length) {
      const what = sourceEl.value === 'roles' ? 'roles' : 'users';
      listEl.innerHTML = `<li class="be-avail-empty">${q
        ? `No ${what} match “${escape(q)}”.`
        : sourceEl.value === 'groups' ? 'This group has no members.' : `No ${what} to show.`}</li>`;
      return;
    }
    listEl.innerHTML = rows.map(r => `
      <li class="be-avail-row${r.added ? ' is-added' : ''}">
        ${r.html}
        ${r.added
          ? `<span class="be-added">${escape(r.added)}</span>`
          : `<button class="be-add" type="button" data-key="${escape(r.key)}" aria-label="Add ${escape(r.name)}">Add</button>`}
      </li>`).join('');
  }

  /* ── Selected ──────────────────────────────────────── */
  function chip(label, attrs) {
    return `<span class="pw-chip">
      ${avatar(label)}<span>${escape(label)}</span>
      <button class="be-chip-x" type="button" ${attrs} aria-label="Remove ${escape(label)}"><i class="ti ti-x" aria-hidden="true"></i></button>
    </span>`;
  }

  function block(key, title, count, inner) {
    const open = !collapsed.has(key);
    return `
      <div class="be-sel-block">
        <button class="be-sel-head" type="button" data-collapse="${key}" aria-expanded="${open}">
          <i class="ti ti-chevron-${open ? 'down' : 'right'}" aria-hidden="true"></i>${title} - ${count}
        </button>
        <div class="be-sel-body" ${open ? '' : 'hidden'}>${inner}</div>
      </div>`;
  }

  function renderSelected() {
    const parts = [];
    if (draft.users.length) {
      parts.push(block('users', 'Users', draft.users.length,
        `<div class="pw-chips">${draft.users.map(id => chip(userById(id).name, `data-remove-user="${id}"`)).join('')}</div>`));
    }
    const groupEntries = Object.entries(draft.groups).filter(([, ids]) => ids.length);
    if (groupEntries.length) {
      const total = groupEntries.reduce((n, [, ids]) => n + ids.length, 0);
      parts.push(block('groups', 'Groups', total, groupEntries.map(([g, ids]) => `
        <p class="be-sel-sub">${escape(g)} - ${ids.length}</p>
        <div class="pw-chips">${ids.map(id => chip(userById(id).name, `data-remove-group="${escape(g)}" data-id="${id}"`)).join('')}</div>`).join('')));
    }
    if (draft.roles.length) {
      parts.push(block('roles', 'Roles', draft.roles.length,
        `<div class="pw-chips">${draft.roles.map(r => chip(r, `data-remove-role="${escape(r)}"`)).join('')}</div>`));
    }
    selectedEl.innerHTML = parts.join('') || '<p class="be-sel-empty">Nothing selected yet. Add users, groups or roles from the list.</p>';
  }

  function render() {
    groupEl.hidden = sourceEl.value !== 'groups';
    renderAvailable();
    renderSelected();
  }

  /* ── Events ────────────────────────────────────────── */
  /* Switching source reloads the left list; Selected is untouched */
  sourceEl.addEventListener('change', () => { searchEl.value = ''; render(); });
  groupEl.addEventListener('change', () => { searchEl.value = ''; renderAvailable(); });
  searchEl.addEventListener('input', renderAvailable);

  listEl.addEventListener('click', e => {
    const btn = e.target.closest('.be-add');
    if (!btn) return;
    const key = btn.dataset.key;
    const source = sourceEl.value;
    if (source === 'users') draft.users.push(key);
    if (source === 'roles') draft.roles.push(key);
    if (source === 'groups') {
      const g = groupEl.value;
      (draft.groups[g] = draft.groups[g] || []).push(key);
    }
    /* Keep the keyboard on the list: the next row's Add, or the search box */
    const li = btn.closest('li');
    const index = [...listEl.children].indexOf(li);
    render();
    const next = [...listEl.querySelectorAll('.be-add')].find(b => [...listEl.children].indexOf(b.closest('li')) >= index);
    (next || searchEl).focus();
  });

  selectedEl.addEventListener('click', e => {
    const head = e.target.closest('.be-sel-head');
    if (head) {
      const key = head.dataset.collapse;
      if (collapsed.has(key)) collapsed.delete(key); else collapsed.add(key);
      renderSelected();
      selectedEl.querySelector(`[data-collapse="${key}"]`).focus();
      return;
    }
    const x = e.target.closest('.be-chip-x');
    if (!x) return;
    if (x.dataset.removeUser) draft.users = draft.users.filter(id => id !== x.dataset.removeUser);
    if (x.dataset.removeRole) draft.roles = draft.roles.filter(r => r !== x.dataset.removeRole);
    if (x.dataset.removeGroup) {
      const g = x.dataset.removeGroup;
      draft.groups[g] = draft.groups[g].filter(id => id !== x.dataset.id);
      if (!draft.groups[g].length) delete draft.groups[g];
    }
    render();
    (selectedEl.querySelector('.be-chip-x') || searchEl).focus();
  });

  /* ── Open / close ──────────────────────────────────── */
  function open(reps, opener, done) {
    draft = clone(reps);
    onDone = done;
    collapsed.clear();
    sourceEl.value = 'users';
    searchEl.value = '';
    render();
    dlg.open(opener, sourceEl);
  }

  function close() {
    draft = null;
    dlg.close();
  }

  $('be-users-cancel').addEventListener('click', close);
  /* Done with nothing selected is allowed; Next catches an empty field */
  $('be-users-done').addEventListener('click', () => {
    const result = draft;
    close();
    onDone(result);
  });

  /* Everyone the selection reaches, as user ids */
  function resolve(reps) {
    const ids = new Set(reps.users);
    Object.values(reps.groups).forEach(list => list.forEach(id => ids.add(id)));
    reps.roles.forEach(r => (ROLES[r] || []).forEach(id => ids.add(id)));
    return [...ids];
  }

  return { open, resolve };
})();
