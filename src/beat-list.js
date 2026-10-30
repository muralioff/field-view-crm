/* ============================================================
   Beat list — the Beats module's list view (Figma 2055:43116)

   Three views — All Beats, Upcoming, In Progress — over one table. A tick
   on a row swaps the toolbar for the bulk actions; which actions the ⋯
   holds depends on the view (BULK_ACTIONS). Only Upcoming beats can be
   deleted or change owner: when All Beats mixes statuses, the dialog
   says so and only the Upcoming ones are acted on.

   Status pills use the detail page's colours (style-beat-detail.css,
   .bp-badge.bd-*), not the frame's.
   ============================================================ */
Strings.ready.then(() => {
  const { t } = Strings;
  const $ = id => document.getElementById(id);
  const escape = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Prototype assumption: the Beats module has an email field, so Send
     Email shows. Without one the button is left out. */
  const HAS_EMAIL_FIELD = true;

  /* The detail page's statuses, keys and pill classes */
  const STATUS = {
    upcoming:  { key: 'beatDetail.status.upcoming',           cls: 'bd-upcoming' },
    progress:  { key: 'beatDetail.status.inProgress',         cls: 'bd-progress' },
    completed: { key: 'beatDetail.status.completed',          cls: 'bd-done' },
    partial:   { key: 'beatDetail.status.partiallyCompleted', cls: 'bd-done' },
    cancelled: { key: 'beatDetail.status.cancelled',          cls: 'bd-missed' },
  };

  const BEATS = [
    { id: 'BP - 001', rep: 'Savannah Nguyen',    status: 'upcoming',  dates: '12 May - 15 May', visits: 6, km: 42.1, created: '31/02/2026' },
    { id: 'BP - 002', rep: 'Kathryn Murphy',     status: 'upcoming',  dates: '5 May - 7 May',   visits: 2, km: 18.7, created: '08/09/2026' },
    /* the record Beat Detail shows */
    { id: 'BP - 003', rep: 'Cameron Williamson', status: 'upcoming',  dates: '4 May - 6 May',   visits: 9, km: 26.1, created: '06/07/2026', href: 'beat-detail.html' },
    { id: 'BP - 004', rep: 'Cody Fisher',        status: 'partial',   dates: '7 Apr - 9 Apr',   visits: 4, km: 25.5, created: '13/01/2026' },
    { id: 'BP - 005', rep: 'Cameron Williamson', status: 'completed', dates: '8 Apr - 15 Apr',  visits: 8, km: 31.4, created: '24/12/2026' },
    { id: 'BP - 006', rep: 'Devon Lane',         status: 'progress',  dates: '13 Apr',          visits: 3, km: 51.9, created: '19/10/2026' },
    { id: 'BP - 007', rep: 'Jenny Wilson',       status: 'completed', dates: '12 May - 14 May', visits: 3, km: 9.3,  created: '30/04/2026' },
    { id: 'BP - 008', rep: 'Annette Black',      status: 'progress',  dates: '14 Apr - 16 Apr', visits: 2, km: 68.2, created: '15/05/2026' },
    { id: 'BP - 009', rep: 'Devon Lane',         status: 'cancelled', dates: '20 Apr - 21 Apr', visits: 5, km: 22.8, created: '02/04/2026' },
  ];

  const USERS = ['Savannah Nguyen', 'Kathryn Murphy', 'Cameron Williamson', 'Cody Fisher', 'Devon Lane', 'Jenny Wilson', 'Annette Black'];

  const VIEWS = {
    all:      () => true,
    upcoming: b => b.status === 'upcoming',
    progress: b => b.status === 'progress',
  };

  /* The ⋯ in the bulk toolbar, by view. In Progress beats cannot be
     deleted or change owner, so that view does not offer them. */
  const BULK_ACTIONS = {
    all:      ['runMacro', 'createTask', 'changeOwner', 'delete'],
    upcoming: ['runMacro', 'createTask', 'changeOwner', 'delete'],
    progress: ['runMacro', 'createTask'],
  };

  let view = 'all';
  const selected = new Set();     /* beat ids */

  const rows = () => BEATS.filter(VIEWS[view]);
  const picked = () => BEATS.filter(b => selected.has(b.id));
  const initials = name => name.split(' ').map(w => w[0]).join('').slice(0, 2);
  /* a steady colour per rep, so the same person reads the same everywhere */
  const AVATAR_COLOURS = ['#6865f1', '#12aa67', '#d48714', '#3359db', '#e5484d', '#0e9aa7', '#9b51e0'];
  const avatarColour = name => AVATAR_COLOURS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLOURS.length];

  /* ── Table ─────────────────────────────────────────── */
  function render() {
    const list = rows();
    $('bl-rows').innerHTML = list.map(b => {
      const s = STATUS[b.status];
      const on = selected.has(b.id);
      return `
        <tr class="${on ? 'selected' : ''}" data-id="${escape(b.id)}">
          <td class="bl-check-col"><input type="checkbox" class="bl-check" ${on ? 'checked' : ''}
                aria-label="${escape(t('beatList.row.select.ariaLabel', { beat: b.id }))}" /></td>
          <td class="bl-col-id"><a class="bl-link" href="${b.href || 'beat-detail.html'}">${escape(b.id)}</a></td>
          <td class="bl-col-rep"><span class="bl-rep"><span class="bl-avatar" style="background:${avatarColour(b.rep)}" aria-hidden="true">${escape(initials(b.rep))}</span><span class="bl-ellipsis">${escape(b.rep)}</span></span></td>
          <td class="bl-col-status"><span class="bp-badge ${s.cls}">${escape(t(s.key))}</span></td>
          <td class="bl-col-dates">${escape(b.dates)}</td>
          <td class="bl-col-visits">${b.visits}</td>
          <td class="bl-col-mileage">${escape(t('common.distance.km', { km: b.km }))}</td>
          <td class="bl-col-created">${escape(b.created)}</td>
          <td class="bl-col-settings"></td>
        </tr>`;
    }).join('');
    $('bl-empty').hidden = list.length > 0;
    $('bl-total').textContent = list.length;
    $('bl-range').textContent = list.length ? t('beatList.footer.range', { from: 1, to: list.length }) : '0';
    renderSelection();
  }

  function renderSelection() {
    const list = rows();
    const n = list.filter(b => selected.has(b.id)).length;
    const all = $('bl-check-all');
    all.checked = n > 0 && n === list.length;
    all.indeterminate = n > 0 && n < list.length;
    $('bl-tools').hidden = n > 0;
    $('bl-bulk').hidden = n === 0;
    $('bl-send-email').hidden = !HAS_EMAIL_FIELD;
    $('bl-bulk-count').textContent = t(n === 1 ? 'beatList.bulk.selected.one' : 'beatList.bulk.selected.other', { count: n });
    $('bl-more-menu').innerHTML = BULK_ACTIONS[view].map(a => `
      <button class="bd-vmenu-item${a === 'delete' ? ' danger' : ''}" type="button" role="menuitem" tabindex="-1"
              data-bulk="${a}">${escape(t(`beatList.bulk.${a}`))}</button>`).join('');
  }

  $('bl-rows').addEventListener('change', e => {
    if (!e.target.classList.contains('bl-check')) return;
    const tr = e.target.closest('tr');
    if (e.target.checked) selected.add(tr.dataset.id); else selected.delete(tr.dataset.id);
    tr.classList.toggle('selected', e.target.checked);
    renderSelection();
  });

  $('bl-check-all').addEventListener('change', e => {
    rows().forEach(b => (e.target.checked ? selected.add(b.id) : selected.delete(b.id)));
    render();
  });

  $('bl-clear').addEventListener('click', () => { selected.clear(); closeMenus(); render(); });

  /* A selection belongs to the view it was made in */
  $('bl-views').addEventListener('click', e => {
    const btn = e.target.closest('.bl-view');
    if (!btn) {
      if (e.target.closest('.bl-view-more')) toast(t('beatList.toast.notInPrototype', { action: t('beatList.view.more.ariaLabel') }));
      return;
    }
    view = btn.dataset.view;
    document.querySelectorAll('.bl-view').forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
    selected.clear();
    closeMenus();
    render();
  });

  /* Toolbar buttons the prototype does not build out */
  document.querySelectorAll('[data-proto]').forEach(btn => btn.addEventListener('click', () =>
    toast(t('beatList.toast.notInPrototype', { action: t(btn.dataset.proto) }))));

  /* ── Menus (Tags, ⋯) ───────────────────────────────── */
  function closeMenus(except) {
    document.querySelectorAll('.bl-menu').forEach(m => {
      if (m === except) return;
      m.hidden = true;
      document.querySelector(`[aria-controls="${m.id}"]`).setAttribute('aria-expanded', 'false');
    });
  }
  function toggleMenu(btn, focusFirst) {
    const menu = $(btn.getAttribute('aria-controls'));
    const open = menu.hidden;
    closeMenus(menu);
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open && focusFirst) menu.querySelector('.bd-vmenu-item').focus();
  }
  ['bl-tags-btn', 'bl-more-btn'].forEach(id => $(id).addEventListener('click', e => {
    e.stopPropagation();
    toggleMenu(e.currentTarget, e.detail === 0);
  }));
  document.addEventListener('click', e => { if (!e.target.closest('.bl-menu-wrap')) closeMenus(); });
  document.addEventListener('keydown', e => {
    const menu = e.target.closest && e.target.closest('.bl-menu');
    if (!menu) return;
    const items = [...menu.querySelectorAll('.bd-vmenu-item')];
    const at = items.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      closeMenus();
      document.querySelector(`[aria-controls="${menu.id}"]`).focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    }
  });

  /* ── Bulk actions ──────────────────────────────────── */
  $('bl-bulk').addEventListener('click', e => {
    const btn = e.target.closest('[data-bulk]');
    if (!btn) return;
    closeMenus();
    const act = btn.dataset.bulk;
    if (act === 'delete') openDelete();
    else if (act === 'changeOwner') openOwner();
    /* Run Macro acts on custom fields only; Send Email needs the module's
       email field. Neither, nor the rest, runs in the prototype. */
    else toast(t('beatList.toast.notInPrototype', { action: t(`beatList.bulk.${act}`) }));
  });

  /* Only Upcoming beats can be deleted or change owner */
  const eligible = () => picked().filter(b => b.status === 'upcoming');

  function openDelete() {
    const all = picked(), ok = eligible();
    const text = $('bl-delete-text');
    if (ok.length < all.length) text.textContent = t('beatList.delete.mixed');
    else text.textContent = t(all.length === 1 ? 'beatList.delete.text.one' : 'beatList.delete.text.other', { count: all.length });
    /* nothing that can go: the rule alone, and no Delete to press */
    $('bl-delete-go').hidden = ok.length === 0;
    openOverlay('bl-delete-overlay');
    (ok.length ? $('bl-delete-go') : document.querySelector('#bl-delete-overlay [data-bl-close]')).focus();
  }

  $('bl-delete-go').addEventListener('click', () => {
    const all = picked(), ok = eligible();
    ok.forEach(b => { BEATS.splice(BEATS.indexOf(b), 1); selected.delete(b.id); });
    selected.clear();
    closeOverlays();
    render();
    toast(ok.length < all.length
      ? t('beatList.toast.deleted.partial', { done: ok.length, total: all.length })
      : t(ok.length === 1 ? 'beatList.toast.deleted.one' : 'beatList.toast.deleted.other', { count: ok.length }));
  });

  const ownerPick = SelectMenu.create($('bl-owner-pick'), {
    placeholder: t('beatList.owner.placeholder'), mandatory: true, fieldId: 'bl-owner-field',
    onChange() { $('bl-owner-error').hidden = true; ownerPick.field.classList.remove('invalid'); },
  });
  ownerPick.setOptions(USERS.map(u => ({ value: u, label: u })));

  function openOwner() {
    const all = picked(), ok = eligible();
    $('bl-owner-warn').hidden = ok.length === all.length;
    ownerPick.clear();
    ownerPick.setDisabled(ok.length === 0);
    $('bl-owner-go').hidden = ok.length === 0;
    $('bl-owner-error').hidden = true;
    ownerPick.field.classList.remove('invalid');
    openOverlay('bl-owner-overlay');
    (ok.length ? ownerPick.field : document.querySelector('#bl-owner-overlay [data-bl-close]')).focus();
  }

  $('bl-owner-go').addEventListener('click', () => {
    if (!ownerPick.value) {
      $('bl-owner-error').hidden = false;
      ownerPick.field.classList.add('invalid');
      ownerPick.field.focus();
      return;
    }
    const all = picked(), ok = eligible();
    ok.forEach(b => { b.rep = ownerPick.value; });
    selected.clear();
    closeOverlays();
    render();
    toast(ok.length < all.length
      ? t('beatList.toast.ownerChanged.partial', { done: ok.length, total: all.length })
      : t(ok.length === 1 ? 'beatList.toast.ownerChanged.one' : 'beatList.toast.ownerChanged.other', { count: ok.length }));
  });

  /* ── Dialogs ───────────────────────────────────────── */
  let returnFocus = null;
  function openOverlay(id) {
    returnFocus = document.activeElement;
    $(id).hidden = false;
  }
  function closeOverlays() {
    document.querySelectorAll('.bd-overlay').forEach(o => { o.hidden = true; });
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
  }
  document.querySelectorAll('[data-bl-close]').forEach(b => b.addEventListener('click', closeOverlays));
  document.querySelectorAll('.bd-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeOverlays(); }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && [...document.querySelectorAll('.bd-overlay')].some(o => !o.hidden)) closeOverlays();
  });

  /* ── Toast (the detail page's) ─────────────────────── */
  const toastEl = $('bd-toast');
  function toast(message) {
    toastEl.innerHTML = `
      <img class="bd-toast-icon" src="src/toast-tick.svg" alt="" aria-hidden="true" />
      <span class="bd-toast-text">${escape(message)}</span>
      <button class="bd-toast-close" type="button" aria-label="${escape(t('beatDetail.toast.dismiss.ariaLabel'))}">
        <img src="src/toast-close.svg" alt="" aria-hidden="true" /></button>`;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }
  toastEl.addEventListener('click', e => {
    if (!e.target.closest('.bd-toast-close')) return;
    clearTimeout(toast._t);
    toastEl.classList.remove('show');
  });

  render();
});
