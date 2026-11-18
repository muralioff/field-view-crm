/* ============================================================
   Beat Engine — Select Users (Assign Auto-Created Beats To)
   Users only: no groups or roles. Two panes. Available on the left: a
   search box and rows that offer Add on hover or focus, or show ✓ Added.
   Selected on the right: the chosen users as removable chips.

   The dialog edits a copy; Cancel, Escape and the backdrop throw it
   away, Done hands it back.
   ============================================================ */
window.BEUsers = (function () {
  const { USERS, userById, initials } = BEData;
  const { escape } = Planner;

  const $ = id => document.getElementById(id);
  const overlay = $('be-users-overlay');
  const listEl = $('be-users-list');
  const selectedEl = $('be-users-selected');
  const searchEl = $('be-users-search');

  const dlg = Planner.dialog(overlay, { onDismiss: () => close() });

  let draft = null;          // selected user ids
  let onDone = null;

  const avatar = name => `<span class="be-avatar" aria-hidden="true">${escape(initials(name))}</span>`;

  /* ── Available ─────────────────────────────────────── */
  function renderAvailable() {
    const q = searchEl.value.trim().toLowerCase();
    const rows = USERS.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    if (!rows.length) {
      listEl.innerHTML = `<li class="be-avail-empty">No users match “${escape(searchEl.value.trim())}”.</li>`;
      return;
    }
    listEl.innerHTML = rows.map(u => {
      const added = draft.includes(u.id);
      return `
      <li class="be-avail-row${added ? ' is-added' : ''}">
        ${avatar(u.name)}
        <span class="be-who"><span class="be-name">${escape(u.name)}</span>
          <span class="be-email">${escape(u.email)}</span></span>
        ${added
          ? '<span class="be-added">✓ Added</span>'
          : `<button class="be-add" type="button" data-id="${u.id}" aria-label="Add ${escape(u.name)}">Add</button>`}
      </li>`;
    }).join('');
  }

  /* ── Selected ──────────────────────────────────────── */
  function renderSelected() {
    selectedEl.innerHTML = draft.length
      ? `<p class="be-sel-sub">Users - ${draft.length}</p>
         <div class="pw-chips">${draft.map(id => {
           const name = userById(id).name;
           return `<span class="pw-chip">${avatar(name)}<span>${escape(name)}</span>
             <button class="be-chip-x" type="button" data-id="${id}" aria-label="Remove ${escape(name)}"><i class="ti ti-x" aria-hidden="true"></i></button>
           </span>`;
         }).join('')}</div>`
      : '<p class="be-sel-empty">No users selected yet. Add users from the list.</p>';
  }

  function render() {
    renderAvailable();
    renderSelected();
  }

  searchEl.addEventListener('input', renderAvailable);

  listEl.addEventListener('click', e => {
    const btn = e.target.closest('.be-add');
    if (!btn) return;
    const index = [...listEl.children].indexOf(btn.closest('li'));
    draft.push(btn.dataset.id);
    render();
    /* Keep the keyboard on the list: the next row's Add, or the search box */
    const next = [...listEl.querySelectorAll('.be-add')]
      .find(b => [...listEl.children].indexOf(b.closest('li')) >= index);
    (next || searchEl).focus();
  });

  selectedEl.addEventListener('click', e => {
    const x = e.target.closest('.be-chip-x');
    if (!x) return;
    draft = draft.filter(id => id !== x.dataset.id);
    render();
    (selectedEl.querySelector('.be-chip-x') || searchEl).focus();
  });

  /* ── Open / close ──────────────────────────────────── */
  function open(ids, opener, done) {
    draft = [...ids];
    onDone = done;
    searchEl.value = '';
    render();
    dlg.open(opener, searchEl);
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

  return { open };
})();
