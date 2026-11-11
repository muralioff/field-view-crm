/* ============================================================
   Create Beat — the rep, the dates, the days and their visits

   Figma section 3104:167448. The left panel holds three views, one at a
   time:

   Beats Information — Assign Rep and Beat Duration, then one card per
     date once both dates are in (30 days at most, from today on). One
     day is always the selected day (blue border): picks off the map and
     Add Visits land there. Any day opens and folds on its chevron;
     clicking a day's header selects and opens it.
   Records selected — a pin click or a lasso lists records here, each
     with a visit type. Unticking a record frees its pin but keeps its
     row until Add Visits; only ticked rows become visits. A record
     already on the selected day is skipped.
   Unassigned visits — the rep's visits not on a beat yet, each assigned
     to a day from here, with Undo on the message that follows.

   A day's visits can be dragged into a new order; the day then says its
   route won't be optimized, and Optimize Route puts the order back.
   Preview (the route on the map) comes later.
   ============================================================ */
const CbVisits = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* `keys` is [one, other], written out in full so tools/sync_strings.py
     finds both */
  const plural = (keys, count, vars = {}) => t(keys[count === 1 ? 0 : 1], { count, ...vars });

  /* ── Prototype data ─────────────────────────────────── */
  const REPS = ['Kevin Griffin', 'Savannah Nguyen', 'Kathryn Murphy', 'Cameron Williamson', 'Cody Fisher'];

  /* Planner Configuration's visit types — one list for every module
     chosen there — each with the duration a visit of it starts with */
  const VISIT_TYPES = [
    { name: 'Order Delivery', mins: 10 },
    { name: 'Gate Approval',  mins: 10 },
    { name: 'Shop Delivery',  mins: 10 },
    { name: 'Order Approval', mins: 15 },
    { name: 'Quality Check',  mins: 30 },
    { name: 'Client Meeting', mins: 30 },
    { name: 'Product Sales',  mins: 30 },
    { name: 'Product Demo',   mins: 45 },
  ];
  const typeMins = name => (VISIT_TYPES.find(v => v.name === name) || { mins: 10 }).mins;
  /* A visit's time is typed in whole minutes, as on Beat Detail */
  const MAX_VISIT_MINUTES = 480;

  /* The rep's addresses, from the Address Book module */
  const ADDRESSES = [
    { key: 'home',      name: 'Home',           line: '789 Pine Road, Hillcrest, CA 92040' },
    { key: 'office',    name: 'Office',         line: '123 Maple Street, Springfield, IL 62704' },
    { key: 'event',     name: 'Event Location', line: '321 Elm Drive, Lakeview, FL 33460' },
    { key: 'warehouse', name: 'Warehouse',      line: '456 Oak Avenue, Rivertown, TX 75001' },
  ];
  const address = key => ADDRESSES.find(a => a.key === key);

  /* The rep's visits not on any beat yet */
  const UNASSIGNED = [
    { name: 'Reliance - T Nagar’s Visit',          module: 'Accounts', due: '24 May 2026', type: 'Product Sales', repeat: 'Weekly' },
    { name: 'Metro Wholesale - Ambattur’s Visit',  module: 'Accounts', due: '12 May 2026', type: 'Product Demo',  repeat: 'Monthly' },
    { name: 'Apollo Pharmacy - Velachery’s Visit', module: 'Accounts', due: '12 May 2026', type: 'Product Demo',  repeat: 'Monthly' },
  ];

  const MAX_DAYS = 30;

  /* ── State ──────────────────────────────────────────── */
  const state = {
    rep: '',
    start: null, end: null,
    days: [],             // [{ date, visits: [visit], manual: bool, from, at, to }]
    selected: 0,
    open: new Set(),
    picked: [],           // [{ rec, type, checked }]
    view: 'info',         // info | picked | unassigned
    unassigned: UNASSIGNED.slice(),
  };
  let seq = 0;            // the order visits were added in — Optimize Route's order

  /* visit: { rec, name, module, type, mins, desc, seq } */
  const visitName = rec => t('createBeat.visit.name', { name: rec.label });
  function makeVisit(rec, type) {
    return { rec, name: rec.isUnassigned ? rec.label : visitName(rec), module: rec.module,
             type, mins: typeMins(type), desc: '', seq: ++seq };
  }
  const timeLabel = v => t('createBeat.visit.duration.mins', { count: v.mins });

  const ready = () => Boolean(state.rep && state.start && state.end && !dateProblem());
  const curDay = () => state.days[state.selected];
  const onDay = (day, rec) => day.visits.some(v => v.rec === rec);

  let fieldMap;

  /* ── Dates ─────────────────────────────────────────── */
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  /* The date picker's value, yyyy-mm-dd, as a local date */
  const parseDate = v => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const shortDate = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const dayLabel = i => t('createBeat.day.title', { n: i + 1 });

  /* The pickers block what is out of range; a date typed into them can
     still be, so it is checked as well */
  function dateProblem() {
    const s = parseDate($('cb-start-date').value), e = parseDate($('cb-end-date').value);
    if (s && s < today()) return { field: 'start', msg: t('createBeat.info.error.pastStart') };
    if (s && e && e < s) return { field: 'end', msg: t('createBeat.info.error.endBeforeStart') };
    if (s && e && (e - s) / 864e5 + 1 > MAX_DAYS) return { field: 'end', msg: t('createBeat.info.error.tooLong', { max: MAX_DAYS }) };
    return null;
  }

  /* Start: today on. End: the start to 30 days in, counting the start */
  function limitDates() {
    const start = $('cb-start-date'), end = $('cb-end-date');
    const from = parseDate(start.value);
    start.min = isoDate(today());
    end.min = isoDate(from && from > today() ? from : today());
    end.max = from ? isoDate(addDays(from, MAX_DAYS - 1)) : '';
    /* An end the new start puts out of reach is cleared */
    const to = parseDate(end.value);
    if (from && to && (to < from || to > addDays(from, MAX_DAYS - 1))) end.value = '';
  }

  /* The dates the day cards were last built for */
  const applied = { start: null, end: null };

  /* Changing the dates once days exist:
       a new start moves the whole beat — the end moves with it, the length
         stays, and every day keeps its visits by day number (Day 1 stays
         Day 1 on its new date, with its times, order and order flag)
       a later end adds empty days at the end
       an earlier end drops days off the end — if they hold visits, a
         confirmation asks whether those go to Unassigned visits or are
         removed, with Undo after
     While a date is half-picked the cards stay on screen, greyed. */
  function onDatesChanged(changed) {
    const startIn = $('cb-start-date'), endIn = $('cb-end-date');
    const newStart = parseDate(startIn.value);
    if (changed === startIn && state.days.length && newStart) {
      endIn.value = isoDate(addDays(newStart, state.days.length - 1));
    }
    limitDates();
    const problem = dateProblem();
    ['start', 'end'].forEach(f =>
      $(`cb-${f}-date`).closest('.cb-input').classList.toggle('is-invalid', problem && problem.field === f));
    const msg = $('cb-date-msg');
    msg.hidden = !problem;
    msg.textContent = problem ? problem.msg : '';

    state.start = parseDate(startIn.value);
    state.end = parseDate(endIn.value);
    if (!ready()) { render(); return; }
    if (!state.days.length) buildDays();
    else if (!fitDays()) return;      // waiting on the confirmation
    applied.start = state.start;
    applied.end = state.end;
    render();
  }

  /* Bring the days in line with the dates. False while a confirmation
     is open — it finishes the change itself. */
  function fitDays() {
    const n = Math.round((state.end - state.start) / 864e5) + 1;
    const redate = () => state.days.forEach((d, i) => { d.date = addDays(state.start, i); });
    if (n >= state.days.length) {
      while (state.days.length < n) state.days.push(newDay());
      redate();
      return true;
    }
    const dropped = state.days.slice(n);
    const count = dropped.reduce((sum, d) => sum + d.visits.length, 0);
    if (!count) { cutDays(n); redate(); return true; }

    const lines = dropped.map((d, k) => d.visits.length
      ? `<li>${esc(t(d.visits.length === 1 ? 'createBeat.confirm.shorten.dayLine.one' : 'createBeat.confirm.shorten.dayLine.other',
            { day: dayLabel(n + k), date: shortDate(d.date), count: d.visits.length }))}</li>` : '').join('');
    confirmDialog({
      title: t('createBeat.confirm.shorten.title'),
      body: `<p>${esc(plural(['createBeat.confirm.shorten.body.one', 'createBeat.confirm.shorten.body.other'], count))}</p><ul class="cbc-list">${lines}</ul>`,
      actions: [
        { label: t('createBeat.confirm.cancel'), run() {
          /* Keep the old dates */
          $('cb-end-date').value = isoDate(applied.end);
          onDatesChanged(null);
        } },
        { label: t('createBeat.confirm.shorten.remove'), run: () => shorten(n, false, count) },
        { label: t('createBeat.confirm.shorten.move'), primary: true, run: () => shorten(n, true, count) },
      ],
    });
    return false;
  }

  function cutDays(n) {
    state.days.length = n;
    state.selected = Math.min(state.selected, n - 1);
    state.open = new Set([...state.open].filter(i => i < n));
    [...startPickers.keys()].forEach(i => { if (i >= n) startPickers.delete(i); });
  }

  /* Drop the days past `n`; their visits go back to Unassigned visits
     (`toUnassigned`) or are removed. Undo puts everything back. */
  function shorten(n, toUnassigned, count) {
    const snap = {
      days: state.days.map(d => ({ ...d, visits: d.visits.slice() })),
      unassigned: state.unassigned.slice(),
      selected: state.selected, open: new Set(state.open), end: applied.end,
    };
    if (toUnassigned) {
      state.days.slice(n).forEach(d => d.visits.forEach(v => state.unassigned.push({
        name: v.name, module: v.module, type: v.type, repeat: '', visit: v,
        due: d.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      })));
    }
    cutDays(n);
    state.days.forEach((d, i) => { d.date = addDays(state.start, i); });
    applied.start = state.start;
    applied.end = state.end;
    render();
    toast(plural(toUnassigned
      ? ['createBeat.toast.moved.one', 'createBeat.toast.moved.other']
      : ['createBeat.toast.removed.one', 'createBeat.toast.removed.other'], count), () => {
      state.days = snap.days;
      state.unassigned = snap.unassigned;
      state.selected = snap.selected;
      state.open = snap.open;
      $('cb-end-date').value = isoDate(snap.end);
      onDatesChanged(null);
    });
  }

  /* ── Confirmation dialog ───────────────────────────── */
  /* actions: [{ label, run, primary }] — the first is the way out, also
     taken on Escape or a click outside */
  let confirmOpen = null;
  function confirmDialog({ title, body, actions }) {
    $('cbc-title').textContent = title;
    $('cbc-body').innerHTML = body;
    const foot = $('cbc-foot');
    foot.innerHTML = actions.map((a, i) =>
      `<button class="cb-btn ${a.primary ? 'cbf-btn-primary' : 'cbf-btn-default'}" type="button" data-i="${i}">${esc(a.label)}</button>`).join('');
    const close = i => { $('cbc-overlay').hidden = true; confirmOpen = null; actions[i].run(); };
    foot.onclick = e => { const b = e.target.closest('button'); if (b) close(Number(b.dataset.i)); };
    confirmOpen = () => close(0);
    $('cbc-overlay').hidden = false;
    foot.querySelector('.cbf-btn-primary, button:last-child').focus();
  }

  const newDay = () => ({ date: null, visits: [], manual: false, from: 'home', at: '9:00 AM', to: 'office' });

  function buildDays() {
    state.days = [];
    for (let d = new Date(state.start); d <= state.end; d.setDate(d.getDate() + 1)) {
      state.days.push({ ...newDay(), date: new Date(d) });
    }
    applied.start = state.start;
    applied.end = state.end;
    state.selected = 0;
    state.open = new Set([0]);
    startPickers.clear();
  }

  /* A click anywhere in the box opens the browser's calendar, and the
     date can still be typed while it is open */
  function wireDate(input) {
    input.addEventListener('change', () => onDatesChanged(input));
    input.addEventListener('click', () => {
      try { input.showPicker(); } catch (err) { /* not offered here: typing still works */ }
    });
  }

  /* ── Rendering ─────────────────────────────────────── */
  function render() {
    const panel = $('cb-panel');
    ['info', 'picked', 'unassigned'].forEach(v => { $(`cbv-${v}`).hidden = state.view !== v; });
    panel.classList.toggle('is-sheet', state.view !== 'info');

    const show = ready();
    /* Days already built stay on screen, greyed, while a date is being
       changed; they come back to life once the dates are whole again */
    $('cbv-visits').hidden = !state.days.length;
    $('cbv-visits').classList.toggle('is-stale', !show);
    const ua = state.unassigned.length;
    $('cbv-banner').hidden = !(show && ua);
    if (show && ua) $('cbv-banner-text').textContent = plural(['createBeat.unassigned.banner.one', 'createBeat.unassigned.banner.other'], ua);

    if (state.view === 'info' && state.days.length) renderDays();
    if (state.view === 'picked') renderPicked();
    if (state.view === 'unassigned') renderUnassigned();
    refreshSave();
    /* What a pin is may have just changed under the pointer */
    $('cbv-pin-tip').hidden = true;
    fieldMap.draw();
  }

  function refreshSave() {
    const ok = ready() && state.days.some(d => d.visits.length);
    const btn = $('cb-save');
    btn.disabled = !ok;
    btn.classList.toggle('enabled', ok);
  }

  /* Small dropdown: the 3px strip slot, the value, the caret. `bare`
     drops the outline, as the time beside "at" and a visit's duration
     have none. */
  function smallDd({ cls = '', value, label, bare = false, width = '' }) {
    return `
      <button class="cbv-sdd${bare ? ' is-bare' : ''} ${cls}" type="button" aria-haspopup="listbox" aria-expanded="false"
              ${label ? `aria-label="${esc(label)}"` : ''} ${width ? `style="width:${width}"` : ''}>
        <span class="cbv-sdd-strip" aria-hidden="true"></span>
        <span class="cbv-sdd-text">${esc(value)}</span>
        <img class="cbv-sdd-caret" src="src/cb-filter/caret.svg" alt="" aria-hidden="true" />
      </button>`;
  }

  /* The address menu: name over its line, New Address below a rule */
  function addressMenu(selected) {
    const tick = '<span class="cb-menu-tick" aria-hidden="true"><img src="src/cb-filter/dropdown-tick.svg" alt="" /></span>';
    return `
      <div class="cb-menu cbv-addr-menu">
        <ul class="cb-menu-list" role="listbox">
          ${ADDRESSES.map(a => `
            <li class="cb-menu-opt cbv-addr-opt${a.key === selected ? ' is-selected' : ''}" role="option"
                aria-selected="${a.key === selected}" data-value="${a.key}">
              ${tick}
              <span class="cbv-addr-text"><span class="cbv-addr-name">${esc(a.name)}</span>
                <span class="cbv-addr-line">${esc(a.line)}</span></span>
            </li>`).join('')}
        </ul>
        <button class="cbv-addr-new" type="button">${esc(t('createBeat.address.new'))}</button>
      </div>`;
  }

  function dayHtml(day, i) {
    const sel = i === state.selected;
    const open = state.open.has(i);
    const n = day.visits.length;
    const label = dayLabel(i);
    const head = `
      <div class="cbv-day-head">
        <button class="day-chev" type="button" data-act="chev" aria-expanded="${open}"
                aria-label="${esc(t(open ? 'createBeat.day.collapseAriaLabel' : 'createBeat.day.expandAriaLabel', { day: label }))}">
          <img src="src/day-chevron.svg" alt="" aria-hidden="true" /></button>
        <p class="cbv-day-title">${esc(label)}<span class="dot">&nbsp;&nbsp;•&nbsp;&nbsp;</span><span class="date">${esc(shortDate(day.date))}</span></p>
        ${!open && day.manual ? `<span class="cbv-day-order" role="img"
              aria-label="${esc(t('createBeat.day.customOrder'))}" title="${esc(t('createBeat.day.customOrder'))}">
              <i class="ti ti-arrows-sort" aria-hidden="true"></i></span>` : ''}
        ${n ? `<span class="cbv-day-count">${esc(plural(['createBeat.day.count.one', 'createBeat.day.count.other'], n))}</span>` : ''}
      </div>`;
    let body = '';
    if (open && !n) {
      body = `
        <div class="cbv-day-empty">
          <span>${esc(t('createBeat.day.empty'))}</span>
          <button class="cbv-link" type="button" data-act="add">${esc(t('createBeat.day.addVisit'))}</button>
        </div>`;
    } else if (open) {
      const from = address(day.from), to = address(day.to);
      body = `
        <div class="cbv-route">
          <div class="cbv-stop cbv-stop-start">
            <span class="cbv-stop-icon"><img src="src/create-beat/loc-start.svg" alt="" aria-hidden="true" /></span>
            <div class="cbv-stop-main">
              <div class="cbv-stop-row">
                <div class="cb-module-wrap cbv-dd-wrap" data-dd="from">
                  ${smallDd({ value: from.name, width: '93px', label: t('createBeat.day.start.ariaLabel', { value: from.name }) })}
                  ${addressMenu(day.from)}
                </div>
                <span class="cbv-at">${esc(t('createBeat.day.at'))}</span>
                <!-- Beat Detail's time component, without its box -->
                <span class="cbv-tp-slot" data-day="${i}"></span>
              </div>
              <p class="cbv-stop-line">${esc(from.line)}</p>
            </div>
          </div>
          <ol class="cbv-visits">
            ${day.visits.map((v, vi) => visitHtml(v, vi)).join('')}
          </ol>
          <button class="cbv-add-row" type="button" data-act="add">
            <span class="cbv-add-icon" aria-hidden="true"><img src="src/add-visit.svg" alt="" /></span>
            <span class="cbv-link-text">${esc(t('createBeat.day.addVisit'))}</span>
          </button>
          <div class="cbv-stop cbv-stop-end">
            <span class="cbv-stop-icon"><img src="src/create-beat/loc-end.svg" alt="" aria-hidden="true" /></span>
            <div class="cbv-stop-main">
              <div class="cb-module-wrap cbv-dd-wrap" data-dd="to">
                ${smallDd({ value: to.name, width: '93px', label: t('createBeat.day.end.ariaLabel', { value: to.name }) })}
                ${addressMenu(day.to)}
              </div>
              <p class="cbv-stop-line is-clipped">${esc(to.line)}</p>
            </div>
            <!-- Preview draws the day's route on the map: not built yet -->
            <button class="cbv-ghost is-shown is-soon" type="button" aria-disabled="true"
                    data-tip="${esc(t('createBeat.day.previewSoon'))}"
                    aria-label="${esc(t('createBeat.day.preview'))}, ${esc(t('createBeat.day.previewSoon'))}">${esc(t('createBeat.day.preview'))}</button>
          </div>
        </div>
        ${day.manual ? `
          <div class="cbv-day-note">
            <i class="ti ti-info-circle" aria-hidden="true"></i>
            <p>${esc(t('createBeat.day.reordered'))}</p>
            <button class="cbv-link" type="button" data-act="optimize">${esc(t('createBeat.day.optimize'))}</button>
          </div>` : ''}`;
    }
    return `
      <div class="cbv-day${sel ? ' is-selected' : ''}${open ? ' is-open' : ''}${open && n ? ' has-visits' : ''}${day.manual && open ? ' has-note' : ''}" data-day="${i}">
        ${head}${body}
      </div>`;
  }

  function visitHtml(v, vi) {
    return `
      <li class="cbv-visit" data-visit="${vi}">
        <button class="cbv-drag" type="button" data-act="move"
                aria-label="${esc(t('createBeat.visit.move.ariaLabel', { name: v.name }))}"><img src="src/create-beat/drag.svg" alt="" aria-hidden="true" /></button>
        <span class="cbv-num">${vi + 1}</span>
        <div class="cbv-visit-main">
          <p class="cbv-visit-title"><span class="name">${esc(v.name)}</span><span class="dot">&nbsp;&nbsp;•&nbsp;&nbsp;</span><span class="module">${esc(v.module)}</span></p>
          <div class="cbv-visit-meta">
            <span class="cbv-visit-type">${esc(v.type)}</span>
            <span class="cbv-visit-sep" aria-hidden="true">-</span>
            <!-- Minutes, typed: the visit type's duration to start with -->
            <input class="cbv-mins" type="text" inputmode="numeric" maxlength="3" autocomplete="off"
                   value="${v.mins}" aria-label="${esc(t('createBeat.visit.duration.ariaLabel', { name: v.name, value: timeLabel(v) }))}" />
          </div>
        </div>
        <div class="cbv-visit-acts">
          <button class="cbv-icon-btn" type="button" data-act="edit" aria-label="${esc(t('createBeat.visit.edit.ariaLabel', { name: v.name }))}">
            <img src="src/create-beat/edit.svg" alt="" aria-hidden="true" /></button>
          <button class="cbv-icon-btn" type="button" data-act="remove" aria-label="${esc(t('createBeat.visit.remove.ariaLabel', { name: v.name }))}">
            <img src="src/create-beat/remove.svg" alt="" aria-hidden="true" /></button>
        </div>
      </li>`;
  }

  /* One start-time picker per day, made once and moved into each fresh
     render, so a render never leaves an old one listening */
  const startPickers = new Map();
  function startPicker(i) {
    if (!startPickers.has(i)) {
      const host = document.createElement('span');
      host.className = 'cbv-tp';
      const day = state.days[i];
      TimePicker.create(host, {
        value: day.at,
        ariaLabel: t('createBeat.day.startTime.ariaLabel', { value: day.at }),
        onChange(display) { state.days[i].at = display; },
      });
      startPickers.set(i, host);
    }
    return startPickers.get(i);
  }

  function renderDays() {
    const host = $('cbv-days');
    host.innerHTML = state.days.map(dayHtml).join('');
    host.querySelectorAll('.cbv-tp-slot').forEach(slot => slot.replaceWith(startPicker(Number(slot.dataset.day))));
  }

  /* ── Day events ────────────────────────────────────── */
  function closeMenus(except) {
    document.querySelectorAll('.cbv-dd-wrap.open, .cbv-row-dd.open').forEach(w => {
      if (w === except) return;
      w.classList.remove('open');
      const b = w.querySelector('[aria-expanded]');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }

  function wireDays() {
    const host = $('cbv-days');

    host.addEventListener('click', e => {
      if (justDropped) return;   // the click a drop ends on is not a fold
      const dayEl = e.target.closest('.cbv-day');
      if (!dayEl) return;
      const i = Number(dayEl.dataset.day);
      const day = state.days[i];
      const visitEl = e.target.closest('.cbv-visit');
      const v = visitEl ? day.visits[Number(visitEl.dataset.visit)] : null;

      /* A menu inside the day: open it, or take what was picked */
      const opt = e.target.closest('.cbv-dd-wrap .cb-menu-opt');
      if (opt) { pickFromMenu(opt.closest('.cbv-dd-wrap').dataset.dd, opt.dataset.value, day, v); return; }
      if (e.target.closest('.cbv-addr-new')) { closeMenus(); return; }   // New Address: nothing yet
      const dd = e.target.closest('.cbv-sdd');
      if (dd) {
        const wrap = dd.closest('.cbv-dd-wrap');
        const open = !wrap.classList.contains('open');
        closeMenus(wrap);
        wrap.classList.toggle('open', open);
        dd.setAttribute('aria-expanded', String(open));
        return;
      }
      if (e.target.closest('.cbv-mins, .cbv-tp')) return;

      /* Opening and folding:
           a folded day — a click anywhere on it opens and selects it
           an open day — a click on it selects it; only the chevron folds
             it, and folding leaves the selection where it is
         so a stray click in a day being worked on never collapses it */
      const act = e.target.closest('[data-act]');
      if (!act) {
        if (e.target.closest('button, input, .cb-module-wrap, .cbv-visit-acts')) return;
        if (state.open.has(i) && state.selected === i) return;
        state.open.add(i);
        state.selected = i;
        render();
        return;
      }
      switch (act.dataset.act) {
        case 'chev':
          if (state.open.has(i)) state.open.delete(i);
          else { state.open.add(i); state.selected = i; }
          break;
        case 'add':
          state.selected = i;
          state.open.add(i);
          render();
          openModal('add', i);
          return;
        case 'edit': openModal('edit', i, v); return;
        case 'remove': {
          const at = day.visits.indexOf(v);
          day.visits.splice(at, 1);
          render();
          toast(t('createBeat.toast.visitRemoved', { name: v.name }), () => {
            if (!onDay(day, v.rec) || v.rec.isUnassigned) day.visits.splice(Math.min(at, day.visits.length), 0, v);
            render();
          });
          return;
        }
        case 'move': return;
        case 'optimize':
          day.visits.sort((a, b) => a.seq - b.seq);
          day.manual = false;
          break;
        case 'preview': return;
        default: return;
      }
      render();
    });

    function pickFromMenu(which, value, day, v) {
      closeMenus();
      if (which === 'from') day.from = value;
      else if (which === 'to') day.to = value;
      render();
    }

    /* A visit's minutes: digits only as typed, kept when left or on
       Enter; empty or 0 goes back to what it was, past the most a visit
       can run it stops there */
    host.addEventListener('input', e => {
      if (e.target.matches('.cbv-mins')) e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
    });
    host.addEventListener('keydown', e => {
      if (e.target.matches('.cbv-mins') && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
    });
    /* A value that won't do stays in the box, red, with the dialogs'
       message under the row; the visit keeps its last good minutes */
    host.addEventListener('change', e => {
      if (!e.target.matches('.cbv-mins')) return;
      const input = e.target;
      const day = state.days[Number(input.closest('.cbv-day').dataset.day)];
      const v = day.visits[Number(input.closest('.cbv-visit').dataset.visit)];
      const meta = input.closest('.cbv-visit-main');
      const problem = timeProblem(input);
      meta.querySelector('.cbv-mins-msg')?.remove();
      input.classList.toggle('invalid', Boolean(problem));
      if (problem) {
        meta.insertAdjacentHTML('beforeend', `<p class="cbv-mins-msg" role="alert">${esc(problem)}</p>`);
        return;
      }
      v.mins = Number(input.value);
      render();
    });

    /* Keyboard reordering: on the handle, ↑ / ↓ move the visit within its
       day, the same as a drag (so the day keeps the user's order) */
    host.addEventListener('keydown', e => {
      if (!e.target.matches('.cbv-drag') || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      const di = Number(e.target.closest('.cbv-day').dataset.day);
      const day = state.days[di];
      const from = Number(e.target.closest('.cbv-visit').dataset.visit);
      const to = from + (e.key === 'ArrowUp' ? -1 : 1);
      if (to < 0 || to >= day.visits.length) return;
      const [moved] = day.visits.splice(from, 1);
      day.visits.splice(to, 0, moved);
      day.manual = true;
      render();
      $('cbv-live').textContent = t('createBeat.visit.moved', { name: moved.name, n: to + 1, total: day.visits.length });
      const handle = $('cbv-days').querySelector(`.cbv-day[data-day="${di}"] .cbv-visit[data-visit="${to}"] .cbv-drag`);
      if (handle) handle.focus();
    });

    /* ── Drag to reorder, within a day or onto another ──
       Press a visit row and move: its name and module lift off as a
       floating chip, and the row stays behind as an empty slot (its
       number only) that moves to where the visit would land. Over a
       folded day, or one with no visits, the visit joins its end. A day
       that already has the record does not take it. Escape puts it back. */
    let drag = null;
    let justDropped = false;
    const DRAG_START = 4;   // px of travel before a press becomes a drag

    host.addEventListener('pointerdown', e => {
      const li = e.target.closest('.cbv-visit');
      if (!li || e.button !== 0 || e.target.closest('input, button:not(.cbv-drag), .cbv-tp')) return;
      const dayEl = li.closest('.cbv-day');
      const from = Number(dayEl.dataset.day);
      drag = {
        li, from, index: Number(li.dataset.visit),
        visit: state.days[from].visits[Number(li.dataset.visit)],
        x0: e.clientX, y0: e.clientY, on: false,
        ghost: null, target: null,
      };
    });

    function startDrag(e) {
      closeMenus();
      drag.on = true;
      const title = drag.li.querySelector('.cbv-visit-title');
      const r = title.getBoundingClientRect();
      drag.dx = e.clientX - r.left + 20;   // the chip's handle sits before the name
      drag.dy = e.clientY - r.top + 8;
      const ghost = document.createElement('div');
      ghost.className = 'cbv-drag-chip';
      ghost.innerHTML = `<img src="src/create-beat/drag.svg" alt="" aria-hidden="true" />${title.outerHTML}`;
      document.body.appendChild(ghost);
      drag.ghost = ghost;
      drag.li.classList.add('is-dragging');
      document.body.classList.add('cbv-dragging');
    }

    /* Where the visit would land under the pointer: { day, before } with
       `before` the row it goes ahead of (null: the end) */
    function dropAt(x, y) {
      const el = document.elementFromPoint(x, y);
      const dayEl = el && el.closest('.cbv-day');
      if (!dayEl || !host.contains(dayEl)) return null;
      const day = Number(dayEl.dataset.day);
      const list = dayEl.querySelector('.cbv-visits');
      if (!list) return { day, dayEl, list: null, before: null };
      const rows = [...list.children].filter(n => n !== drag.li);
      const before = rows.find(n => { const r = n.getBoundingClientRect(); return y < r.top + r.height / 2; }) || null;
      return { day, dayEl, list, before };
    }

    function moveDrag(e) {
      drag.ghost.style.left = `${e.clientX - drag.dx}px`;
      drag.ghost.style.top = `${e.clientY - drag.dy}px`;

      /* Near the panel's edges the list scrolls */
      const panel = $('cb-panel'), pr = panel.getBoundingClientRect();
      if (e.clientY < pr.top + 40) panel.scrollTop -= 12;
      else if (e.clientY > pr.bottom - 40) panel.scrollTop += 12;

      const at = dropAt(e.clientX, e.clientY);
      host.querySelectorAll('.is-drop-day').forEach(n => n.classList.remove('is-drop-day'));
      const blocked = at && at.day !== drag.from && onDay(state.days[at.day], drag.visit.rec);
      drag.ghost.classList.toggle('is-blocked', Boolean(blocked));
      if (!at || blocked) { drag.target = null; return; }
      drag.target = at;
      if (at.list) {
        /* The empty slot moves to where the visit would go */
        if (at.before !== drag.li.nextElementSibling || drag.li.parentElement !== at.list) at.list.insertBefore(drag.li, at.before);
        /* The numbers are places in the order, not the visits': they stay
           1, 2, 3 down each list while the slot moves */
        host.querySelectorAll('.cbv-visits').forEach(list =>
          [...list.children].forEach((li, n) => { li.querySelector('.cbv-num').textContent = n + 1; }));
      } else {
        at.dayEl.classList.add('is-drop-day');
      }
    }

    function endDrag(commit) {
      const d = drag;
      drag = null;
      document.body.classList.remove('cbv-dragging');
      if (!d || !d.on) return;
      justDropped = true;
      setTimeout(() => { justDropped = false; }, 0);
      d.ghost.remove();
      const at = d.target;
      if (commit && at) {
        const src = state.days[d.from];
        src.visits.splice(src.visits.indexOf(d.visit), 1);
        const dest = state.days[at.day];
        let to = dest.visits.length;
        if (at.list) {
          /* The slot's place among the rows left in that day */
          const rows = [...at.list.children].filter(n => n !== d.li);
          to = rows.indexOf(d.li.nextElementSibling);
          if (to < 0) to = rows.length;
        }
        const before = at.day === d.from ? d.index : -1;
        dest.visits.splice(to, 0, d.visit);
        /* A chosen place in a day's order is the user's order, not the
           optimized one */
        if (at.day === d.from ? to !== before : (at.list && to < dest.visits.length - 1)) dest.manual = true;
        /* A folded day the visit lands on opens to show it */
        state.open.add(at.day);
      }
      render();
    }

    window.addEventListener('pointermove', e => {
      if (!drag) return;
      if (!drag.on) {
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < DRAG_START) return;
        startDrag(e);
      }
      e.preventDefault();
      moveDrag(e);
    });
    window.addEventListener('pointerup', () => { if (drag) endDrag(true); });
    window.addEventListener('pointercancel', () => { if (drag) endDrag(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && drag && drag.on) endDrag(false); });
  }

  /* ── Records selected ──────────────────────────────── */
  const typeOptions = VISIT_TYPES.map(v => [v.name, v.name]);

  function addToPicked(recs) {
    const day = curDay();
    let added = false;
    recs.forEach(rec => {
      if (onDay(day, rec)) return;                         // already on the selected day: skipped
      const row = state.picked.find(p => p.rec === rec);
      if (row) { row.checked = true; return; }
      state.picked.push({ rec, type: VISIT_TYPES[0].name, checked: true });
      added = true;
    });
    if (state.picked.length) state.view = 'picked';
    return added;
  }

  function renderPicked() {
    const n = state.picked.filter(p => p.checked).length;
    /* "4 records to [Day 1 • 15 Nov ▾]": the count runs into the day it goes to */
    $('cbv-picked-count').textContent = plural(['createBeat.picked.countTo.one', 'createBeat.picked.countTo.other'], n);
    $('cbv-picked-add').disabled = n === 0;
    const opts = dayOptions();
    $('cbv-pick-day').innerHTML = smallDd({ value: opts[state.selected][1], cls: 'cbv-pick-day-dd',
      label: t('createBeat.picked.day.ariaLabel', { day: opts[state.selected][1] }) })
      + CbMenu.html({ options: opts, selected: String(state.selected) });
    $('cbv-picked-list').innerHTML = state.picked.map((p, i) => {
      const name = visitName(p.rec);
      return `
        <li class="cbv-pick" data-i="${i}">
          <button class="cbv-check" type="button" role="checkbox" aria-checked="${p.checked}"
                  aria-label="${esc(t('createBeat.picked.check.ariaLabel', { name }))}">
            ${p.checked ? '<img src="src/create-beat/checkbox-on.svg" alt="" aria-hidden="true" />'
                        : '<span class="cbv-check-box" aria-hidden="true"></span>'}</button>
          <div class="cbv-pick-text">
            <p class="cbv-pick-name" title="${esc(name)}">${esc(name)}</p>
            <p class="cbv-pick-module">${esc(p.rec.module)}</p>
          </div>
          <div class="cb-module-wrap cbv-row-dd">
            ${smallDd({ value: p.type, width: '160px', label: t('createBeat.picked.type.ariaLabel', { name, type: p.type }) })}
            ${CbMenu.html({ options: typeOptions, selected: p.type })}
          </div>
        </li>`;
    }).join('');
  }

  function wirePicked() {
    const list = $('cbv-picked-list');
    list.addEventListener('click', e => {
      const row = e.target.closest('.cbv-pick');
      if (!row) return;
      const p = state.picked[Number(row.dataset.i)];
      const opt = e.target.closest('.cb-menu-opt');
      if (opt) { p.type = opt.dataset.value; closeMenus(); render(); return; }
      const dd = e.target.closest('.cbv-sdd');
      if (dd) {
        const wrap = dd.closest('.cbv-row-dd');
        const open = !wrap.classList.contains('open');
        closeMenus(wrap);
        wrap.classList.toggle('open', open);
        dd.setAttribute('aria-expanded', String(open));
        return;
      }
      if (e.target.closest('.cbv-check')) { p.checked = !p.checked; render(); }
    });

    /* The day the visits go to. Changing it changes the selected day, so
       the map's pins and the skip rule follow it. */
    $('cbv-pick-day').addEventListener('click', e => {
      const wrap = $('cbv-pick-day');
      const opt = e.target.closest('.cb-menu-opt');
      if (opt) {
        state.selected = Number(opt.dataset.value);
        state.open.add(state.selected);
        closeMenus();
        render();
        return;
      }
      if (e.target.closest('.cbv-sdd')) {
        const open = !wrap.classList.contains('open');
        closeMenus(wrap);
        wrap.classList.toggle('open', open);
        wrap.querySelector('.cbv-sdd').setAttribute('aria-expanded', String(open));
      }
    });

    /* Apply to all: every row, ticked or not */
    const applyWrap = $('cbv-apply-wrap');
    applyWrap.insertAdjacentHTML('beforeend', CbMenu.html({ options: typeOptions }));
    CbMenu.attach(applyWrap, {
      trigger: $('cbv-apply'),
      onPick(type) { state.picked.forEach(p => { p.type = type; }); render(); },
    });

    $('cbv-picked-cancel').addEventListener('click', () => {
      state.picked = [];
      state.view = 'info';
      render();
    });
    $('cbv-picked-add').addEventListener('click', () => {
      const day = curDay();
      state.picked.filter(p => p.checked && !onDay(day, p.rec))
        .forEach(p => day.visits.push(makeVisit(p.rec, p.type)));
      state.open.add(state.selected);
      state.picked = [];
      state.view = 'info';
      render();
    });
  }

  /* ── Unassigned visits ─────────────────────────────── */
  function dayOptions() {
    return state.days.map((d, i) => [String(i), `${dayLabel(i)}  •  ${shortDate(d.date)}`]);
  }

  function renderUnassigned() {
    const host = $('cbv-ua-list');
    if (!state.unassigned.length) {
      host.innerHTML = `<p class="cbv-ua-empty">${esc(t('createBeat.unassigned.empty'))}</p>`;
      return;
    }
    const opts = dayOptions();
    host.innerHTML = state.unassigned.map((u, i) => {
      const pick = u._day != null ? u._day : state.selected;
      return `
        <div class="cbv-ua" data-i="${i}">
          <div class="cbv-ua-text">
            <div class="cbv-ua-top">
              <p class="cbv-ua-name">${esc(u.name)}</p>
              <p class="cbv-ua-date">${esc(u.due)}</p>
            </div>
            <p class="cbv-ua-sub">${esc(u.repeat ? t('createBeat.unassigned.repeat', { type: u.type, frequency: u.repeat }) : u.type)}</p>
          </div>
          <div class="cbv-ua-assign">
            <span class="cbv-ua-label">${esc(t('createBeat.unassigned.assign.label'))}</span>
            <div class="cb-module-wrap cbv-row-dd cbv-ua-dd">
              <button class="cb-input cbv-ua-day" type="button" aria-haspopup="listbox" aria-expanded="false"
                      aria-label="${esc(t('createBeat.unassigned.day.ariaLabel', { name: u.name, day: opts[pick][1] }))}">
                <span class="cb-fill">${esc(opts[pick][1])}</span>
                <img class="cbv-caret" src="src/cb-filter/caret.svg" alt="" aria-hidden="true" />
              </button>
              ${CbMenu.html({ options: opts, selected: String(pick) })}
            </div>
            <button class="cbv-outline-btn" type="button" data-act="assign">${esc(t('createBeat.unassigned.assign.button'))}</button>
          </div>
        </div>`;
    }).join('');
  }

  function wireUnassigned() {
    $('cbv-banner-link').addEventListener('click', () => { state.view = 'unassigned'; render(); });
    $('cbv-unassigned-back').addEventListener('click', () => { state.view = 'info'; render(); });

    $('cbv-ua-list').addEventListener('click', e => {
      const card = e.target.closest('.cbv-ua');
      if (!card) return;
      const i = Number(card.dataset.i);
      const u = state.unassigned[i];
      const opt = e.target.closest('.cb-menu-opt');
      if (opt) { u._day = Number(opt.dataset.value); closeMenus(); render(); return; }
      const dd = e.target.closest('.cbv-ua-day');
      if (dd) {
        const wrap = dd.closest('.cbv-row-dd');
        const open = !wrap.classList.contains('open');
        closeMenus(wrap);
        wrap.classList.toggle('open', open);
        dd.setAttribute('aria-expanded', String(open));
        return;
      }
      if (!e.target.closest('[data-act="assign"]')) return;

      /* The visit joins the day with its own type, and that type's duration */
      const dayIndex = u._day != null ? u._day : state.selected;
      const day = state.days[dayIndex];
      /* A visit sent back here by shorter dates comes back as it was */
      const visit = u.visit || makeVisit({ label: u.name, module: u.module, isUnassigned: true }, u.type);
      day.visits.push(visit);
      state.unassigned.splice(i, 1);
      delete u._day;
      render();
      toast(t('createBeat.toast.assigned', { name: u.name, day: dayLabel(dayIndex), date: shortDate(day.date) }), () => {
        const at = day.visits.indexOf(visit);
        if (at > -1) day.visits.splice(at, 1);
        state.unassigned.splice(Math.min(i, state.unassigned.length), 0, u);
        render();
      });
    });
  }

  /* ── Toast ─────────────────────────────────────────── */
  let toastTimer;
  function toast(message, undo) {
    const el = $('cbv-toast');
    el.innerHTML = `
      <img class="cbv-toast-icon" src="src/toast-tick.svg" alt="" aria-hidden="true" />
      <span class="cbv-toast-text">${esc(message)}</span>
      ${undo ? `<button class="cbv-toast-undo" type="button">${esc(t('createBeat.toast.undo'))}</button>` : ''}
      <button class="cbv-toast-close" type="button" aria-label="${esc(t('createBeat.toast.dismiss.ariaLabel'))}">
        <img src="src/toast-close.svg" alt="" aria-hidden="true" /></button>`;
    const hide = () => el.classList.remove('show');
    el.querySelector('.cbv-toast-close').onclick = hide;
    if (undo) el.querySelector('.cbv-toast-undo').onclick = () => { hide(); undo(); };
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hide, 8000);
  }

  /* ── Add Visit / Edit Visit ────────────────────────── */
  let modal = null;   // { mode, day, visit }
  let picker;
  const pickerModules = {};   // module → names, rebuilt as the dialog opens

  function setMsg(field, text) {
    const msg = field.closest('.cbm-control').querySelector('.cbm-msg');
    field.classList.toggle('invalid', Boolean(text));
    msg.textContent = text || '';
    msg.hidden = !text;
  }

  /* Records not on the day the dialog adds to, by module, names once */
  function refreshPickerModules(day) {
    Object.keys(pickerModules).forEach(k => { pickerModules[k].length = 0; });
    CB_RECORDS.forEach(rec => {
      if (onDay(day, rec)) return;
      const list = pickerModules[rec.module];
      if (!list.includes(rec.label)) list.push(rec.label);
    });
  }

  /* Visit Time: minutes, locked until a visit type gives it its start */
  function setTimeField(type, mins) {
    const input = $('cbm-time');
    input.disabled = !type;
    input.value = type ? String(mins != null ? mins : typeMins(type)) : '';
  }

  function timeProblem(input) {
    const raw = input.value.trim();
    if (!raw) return t('createBeat.modal.error.time');
    const n = Number(raw);
    if (n < 1) return t('createBeat.modal.error.timeMin');
    if (n > MAX_VISIT_MINUTES) return t('createBeat.modal.error.timeMax', { max: MAX_VISIT_MINUTES });
    return '';
  }

  function openModal(mode, dayIndex, v) {
    const day = state.days[dayIndex];
    modal = { mode, day, visit: v };
    const title = mode === 'add'
      ? t('createBeat.modal.add.title', { day: dayLabel(dayIndex), date: shortDate(day.date) })
      : t('createBeat.modal.edit.title', { name: v.name });
    $('cbm-title').innerHTML = esc(title).replace('•', '<span class="dot">•</span>');
    $('cbm-record-row').hidden = mode !== 'add';
    $('cbm-submit').textContent = t(mode === 'add' ? 'createBeat.modal.add.submit' : 'createBeat.modal.edit.submit');

    const typeSel = $('cbm-type');
    typeSel.classList.toggle('mandatory', mode === 'add');
    typeSel.innerHTML = `<option value="" disabled>${esc(t('createBeat.modal.type.placeholder'))}</option>`
      + VISIT_TYPES.map(vt => `<option>${esc(vt.name)}</option>`).join('');
    typeSel.value = v ? v.type : '';
    typeSel.classList.toggle('is-placeholder', !typeSel.value);
    setTimeField(typeSel.value, v ? v.mins : null);
    $('cbm-desc').value = v ? v.desc : '';
    $('cbm-status').value = '';
    [typeSel, $('cbm-time')].forEach(f => setMsg(f, ''));

    if (mode === 'add') {
      refreshPickerModules(day);
      picker.clear();
      setMsg(picker.field, '');
    }
    $('cbm-overlay').hidden = false;
    (mode === 'add' ? picker.field : typeSel).focus();
  }

  function closeModal() { $('cbm-overlay').hidden = true; modal = null; }

  function wireModal() {
    ['Leads', 'Contacts', 'Deals', 'Vendors'].forEach(m => { pickerModules[m] = []; });
    picker = RecordPicker.create($('cbm-record-host'), {
      modules: pickerModules, placeholder: t('createBeat.modal.record.placeholder'),
      mandatory: true, fieldId: 'cbm-record',
      onChange: () => setMsg(picker.field, ''),
    });

    const typeSel = $('cbm-type');
    typeSel.addEventListener('change', () => {
      setMsg(typeSel, '');
      typeSel.classList.remove('is-placeholder');
      /* A new type brings its own duration */
      setTimeField(typeSel.value, null);
      setMsg($('cbm-time'), '');
    });
    $('cbm-time').addEventListener('input', () => {
      const input = $('cbm-time');
      input.value = input.value.replace(/\D/g, '').slice(0, 3);
      setMsg(input, '');
    });
    $('cbm-status').addEventListener('change', () => $('cbm-status').classList.remove('is-placeholder'));

    $('cbm-cancel').addEventListener('click', closeModal);
    $('cbm-overlay').addEventListener('click', e => { if (e.target === $('cbm-overlay')) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal) closeModal(); });

    $('cbm-submit').addEventListener('click', () => {
      let ok = true;
      if (modal.mode === 'add' && !picker.value) { setMsg(picker.field, t('createBeat.modal.error.record')); ok = false; }
      if (!typeSel.value) { setMsg(typeSel, t('createBeat.modal.error.type')); ok = false; }
      const timeMsg = typeSel.value ? timeProblem($('cbm-time')) : '';
      if (timeMsg) { setMsg($('cbm-time'), timeMsg); ok = false; }
      if (!ok) return;

      let v = modal.visit;
      if (modal.mode === 'add') {
        const rec = CB_RECORDS.find(r => r.label === picker.value && r.module === picker.module && !onDay(modal.day, r));
        v = makeVisit(rec, typeSel.value);
        modal.day.visits.push(v);
      }
      v.type = typeSel.value;
      v.mins = Number($('cbm-time').value);
      v.desc = $('cbm-desc').value.trim();
      closeModal();
      render();
    });
  }

  /* ── Map: pins, tooltip, lasso ─────────────────────── */
  const pinImg = src => { const img = new Image(); img.onload = () => fieldMap.draw(); img.src = src; return img; };
  let PIN;
  const PIN_W = 24, PIN_H = 34.2857;

  /* Unselected (blue outline, blue dot) · Selected — ticked in Records
     selected (purple, ring) · Selected, current day (purple, its number)
     · Selected, other day (lighter purple, ring) */
  function pinState(rec) {
    if (state.view === 'picked' && state.picked.some(p => p.rec === rec && p.checked)) return { kind: 'picked' };
    const day = curDay();
    if (day) {
      const n = day.visits.findIndex(v => v.rec === rec);
      if (n > -1) return { kind: 'current', n: n + 1 };
    }
    if (state.days.some(d => onDay(d, rec))) return { kind: 'other' };
    return { kind: 'off' };
  }

  function drawPin(ctx, pin, { x, tipY, scale }) {
    const s = pinState(pin);
    const w = PIN_W / scale, h = PIN_H / scale;
    const top = tipY - h;
    ctx.save();
    if (s.kind === 'other') ctx.globalAlpha *= 0.8;
    const img = s.kind === 'off' ? PIN.off : PIN.on;
    if (img.complete) ctx.drawImage(img, x - w / 2, top, w, h);
    ctx.beginPath();
    if (s.kind === 'off') {
      ctx.arc(x, top + 12 / scale, 6 / scale, 0, Math.PI * 2);
      ctx.fillStyle = '#5464f2';
      ctx.fill();
    } else if (s.kind === 'current') {
      ctx.arc(x, top + 12 / scale, 8.25 / scale, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5 / scale;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `600 ${(s.n > 9 ? 11 : 14) / scale}px 'Zoho Puvi', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(s.n), x, top + 12.5 / scale);
    } else {
      ctx.arc(x, top + 12 / scale, 6 / scale, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 / scale;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* The lasso, in world points, drawn under the pins */
  let lasso = null;          // [[x, y], …] while drawing or until the picks are dealt with
  let lassoOn = false;
  function drawLasso(ctx, scale) {
    if (!lasso || lasso.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lasso[0][0], lasso[0][1]);
    lasso.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.fillStyle = 'rgba(84, 100, 242, 0.08)';
    ctx.fill();
    ctx.setLineDash([4 / scale, 4 / scale]);
    ctx.lineWidth = 1.5 / scale;
    ctx.strokeStyle = '#5464f2';
    ctx.stroke();
    ctx.restore();
  }
  const inPolygon = (x, y, poly) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };

  function wireMap() {
    PIN = { off: pinImg('src/create-beat/pin-off.svg'), on: pinImg('src/distribute/pin-selected.svg') };
    fieldMap.setPinRenderer(drawPin);
    const drawPins = fieldMap._drawPins.bind(fieldMap);
    fieldMap._drawPins = () => { drawLasso(fieldMap.ctx, fieldMap.scale); drawPins(); };

    const canvas = fieldMap.canvas;
    const area = $('map-area');
    const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const pinAt = e => fieldMap.pinAtScreen(...local(e));

    /* A pin lists its record — or ticks it in and out once listed */
    canvas.addEventListener('click', e => {
      if (fieldMap.didDrag || lassoOn || !ready()) return;
      const pin = pinAt(e);
      if (!pin || onDay(curDay(), pin)) return;
      const row = state.picked.find(p => p.rec === pin);
      if (row && state.view === 'picked') row.checked = !row.checked;
      else addToPicked([pin]);
      render();
    });

    /* Hover: the visit a pin already is, on whichever day */
    const tip = $('cbv-pin-tip');
    canvas.addEventListener('mousemove', e => {
      const pin = !fieldMap.isDragging && !lassoOn ? pinAt(e) : null;
      canvas.classList.toggle('cbv-over-pin', Boolean(pin) && ready());
      const at = pin ? pinVisit(pin) : null;
      if (!at) { tip.hidden = true; return; }
      tip.innerHTML = `
        <p class="cbv-tip-title">${esc(t('createBeat.tooltip.title', { day: dayLabel(at.i), name: at.v.name }))}</p>
        <p class="cbv-tip-line">${esc(at.v.type)}<span class="dot">•</span>${esc(timeLabel(at.v))}</p>
        <p class="cbv-tip-line">${esc(at.v.module)}</p>`;
      tip.hidden = false;
      const [sx, sy] = fieldMap.worldToScreen(pin.x, pin.y);
      tip.style.left = `${sx - 39}px`;
      tip.style.top = `${sy - PIN_H - tip.offsetHeight - 10}px`;
    });
    canvas.addEventListener('mouseleave', () => { tip.hidden = true; });

    /* ── Lasso ── */
    const lassoBtn = $('cb-lasso');
    const setLasso = on => {
      lassoOn = on;
      lassoBtn.classList.toggle('is-active', on);
      lassoBtn.setAttribute('aria-pressed', String(on));
      canvas.classList.toggle('cbv-lasso-mode', on);
      $('cbv-lasso-hint').hidden = !on;
      tip.hidden = true;
    };
    lassoBtn.addEventListener('click', () => setLasso(!lassoOn));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && lassoOn && !modal) setLasso(false); });

    /* While the lasso is on, a press draws instead of panning: taken in
       the capture phase, before the map's own handler sees it */
    let drawing = false;
    area.addEventListener('mousedown', e => {
      if (!lassoOn || e.target !== canvas || e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      drawing = true;
      lasso = [fieldMap.screenToWorld(...local(e))];
    }, true);
    window.addEventListener('mousemove', e => {
      if (!drawing) return;
      lasso.push(fieldMap.screenToWorld(...local(e)));
      fieldMap.draw();
    });
    window.addEventListener('mouseup', () => {
      if (!drawing) return;
      drawing = false;
      if (lasso.length > 2 && ready()) {
        const inside = fieldMap._visiblePins().filter(p => inPolygon(p.x, p.y, lasso));
        addToPicked(inside);
      }
      lasso = null;
      render();
    });
  }

  /* The visit a record is: on the selected day first, else the first day */
  function pinVisit(rec) {
    const order = [state.selected, ...state.days.keys()];
    for (const i of order) {
      const v = state.days[i] && state.days[i].visits.find(x => x.rec === rec);
      if (v) return { i, v };
    }
    return null;
  }

  /* ── Rep ───────────────────────────────────────────── */
  /* Visits belong to the rep they are planned for: changing the rep
     erases them, after a confirmation. The days stay, fresh. */
  function wireRep() {
    const wrap = $('cb-rep-wrap');
    wrap.insertAdjacentHTML('beforeend', CbMenu.html({ id: 'cb-rep-list', options: REPS.map(r => [r, r]) }));
    const menu = wrap.querySelector('.cb-menu');

    function applyRep(rep) {
      state.rep = rep;
      const val = $('cb-rep-value');
      val.textContent = rep;
      val.classList.remove('cb-placeholder');
      val.removeAttribute('data-t');
      state.picked = [];
      state.view = 'info';
      state.unassigned = UNASSIGNED.slice();
      if (ready()) buildDays();
      else {
        /* Dates mid-change: the greyed days keep their dates, lose the rest */
        state.days = state.days.map(d => ({ ...newDay(), date: d.date }));
        startPickers.clear();
      }
      render();
    }

    CbMenu.attach(wrap, {
      trigger: $('cb-assign-rep'),
      onPick(rep) {
        if (rep === state.rep) return;
        const has = state.days.some(d => d.visits.length) || state.picked.length;
        if (!state.rep || !has) { applyRep(rep); return; }
        confirmDialog({
          title: t('createBeat.confirm.rep.title'),
          body: `<p>${esc(t('createBeat.confirm.rep.body', { rep: state.rep }))}</p>`,
          actions: [
            { label: t('createBeat.confirm.cancel'), run: () => CbMenu.select(menu, state.rep) },
            { label: t('createBeat.confirm.rep.submit'), primary: true, run: () => applyRep(rep) },
          ],
        });
      },
    });
  }

  /* After Save the page starts over for the next beat */
  function resetPage() {
    state.rep = '';
    const val = $('cb-rep-value');
    val.textContent = t('createBeat.info.rep.placeholder');
    val.classList.add('cb-placeholder');
    CbMenu.select($('cb-rep-wrap').querySelector('.cb-menu'), '');
    $('cb-start-date').value = '';
    $('cb-end-date').value = '';
    limitDates();
    $('cb-date-msg').hidden = true;
    document.querySelectorAll('.cb-duration .cb-input').forEach(b => b.classList.remove('is-invalid'));
    state.start = state.end = null;
    applied.start = applied.end = null;
    state.days = [];
    state.selected = 0;
    state.open = new Set();
    state.picked = [];
    state.view = 'info';
    state.unassigned = UNASSIGNED.slice();
    startPickers.clear();
    $('cb-panel').scrollTop = 0;
    render();
  }

  /* ── Init ──────────────────────────────────────────── */
  async function init(map) {
    fieldMap = map;
    await Strings.ready;
    wireRep();
    wireDate($('cb-start-date'));
    wireDate($('cb-end-date'));
    limitDates();
    wireDays();
    wirePicked();
    wireUnassigned();
    wireModal();
    wireMap();

    document.addEventListener('click', e => {
      if (!e.composedPath().some(n => n.classList && (n.classList.contains('cbv-dd-wrap') || n.classList.contains('cbv-row-dd')))) closeMenus();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && confirmOpen) { e.stopImmediatePropagation(); confirmOpen(); return; }
      if (e.key === 'Escape') closeMenus();
    }, true);
    $('cbc-overlay').addEventListener('click', e => { if (e.target === $('cbc-overlay') && confirmOpen) confirmOpen(); });

    /* Cancel: straight back to the beat list, unless there is something
       to lose — then a Discard changes confirmation first */
    $('cb-cancel').addEventListener('click', () => {
      const leave = () => { window.location.href = 'beat-list.html'; };
      if (!state.days.some(d => d.visits.length) && !state.picked.length) { leave(); return; }
      confirmDialog({
        title: t('createBeat.confirm.discard.title'),
        body: `<p>${esc(t('createBeat.confirm.discard.body'))}</p>`,
        actions: [
          { label: t('createBeat.confirm.discard.keep'), run() {} },
          { label: t('createBeat.confirm.discard.submit'), primary: true, run: leave },
        ],
      });
    });
    /* Save: the beat is saved and the page stays as it is. Optimizing the
       routes of days whose order was not changed happens on the server
       side when the beat is created — nothing to show here. */
    $('cb-save').addEventListener('click', () => {
      if ($('cb-save').disabled) return;
      resetPage();
      toast(t('createBeat.toast.saved'));
    });
    render();
  }

  return { init };
})();
