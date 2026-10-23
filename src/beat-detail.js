/* ============================================================
   Beat detail — day by day
   Figma "Detail View" frames (1963:69357, 2055:44041, 3255:124174)

   The beat is not started and ended in one go. The rep logs in each
   morning, starts that day, works its visits, and ends the day. So:

     · every day carries its own status and its own clock
     · only one day can be open for work at a time, and days are worked
       in order — Day 2 cannot start before Day 1 has ended
     · a visit is completed or missed while its day is running
     · ending a day settles whatever is left on it as missed
     · the beat's own status is derived: Upcoming until the first day
       starts, In Progress while any day is running or part-done,
       Completed once the last day ends

   The layout, the day accordion and the visit cards come from
   style-bottom-up.css; only the day-flow pieces are new.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Data ──────────────────────────────────────────── */
  /* `drive` is the planned leg out of a stop; `actualDrive` is what it really
     took, and replaces the estimate once the rep has driven it. */
  const HOME   = { title: 'Home', time: '10:45 AM',
                   drive: '8 min (1.5 km)', actualDrive: '9 min (1.6 km)',
                   addr: '721 Broadway, New York, NY 10003, USA' };
  const OFFICE = { title: 'Office', addr: '33 3rd Ave, New York, NY 10003, US' };

  /* `pins` are the day's stops on the route map */
  const DAYS = [
    {
      label: 'Day 1', date: '4 May',
      pins: [{ x: 180, y: 350 }, { x: 220, y: 450 }, { x: 320, y: 490 }, { x: 370, y: 550 }],
      visits: [
        { name: 'Alex Newman Visit',  module: 'Contacts',
          address: '533 Broadway, New York, NY 10105, USA', type: 'Order Delivery',  time: '10:53 AM to 11:03 AM', drive: '20 min (2.5 km)',
          actual: '10:55 AM to 11:06 AM', actualDrive: '22 min (2.6 km)' },
        { name: 'Jordan Smith Visit', module: 'Contacts',
          address: '512 Broadway, New York, NY 10004, USA', type: 'Gate Approval',   time: '11:30 AM to 11:45 AM', drive: '12 min (1.2 km)',
          actual: '11:33 AM to 11:49 AM', actualDrive: '14 min (1.3 km)' },
        { name: 'Taylor Smith Visit', module: 'Leads',
          address: '19 Washington Square N, New York, NY 10011, USA',    type: 'Shop Delivery',   time: '11:57 AM to 12:07 PM', drive: '15 min (2.5 km)',
          actual: '12:02 PM to 12:14 PM', actualDrive: '17 min (2.6 km)' },
        { name: 'Morgan Kite Visit',  module: 'Deals',
          address: '371 7th Ave, New York, NY 10001, USA',    type: 'Order Approval',  time: '12:22 PM to 12:32 PM', drive: '20 min (3.2 km)',
          actual: '12:31 PM to 12:44 PM', actualDrive: '21 min (3.3 km)' },
      ],
    },
    {
      label: 'Day 2', date: '5 May',
      pins: [{ x: 370, y: 240 }, { x: 450, y: 190 }, { x: 560, y: 200 }],
      visits: [
        { name: 'Priya Raman Visit',  module: 'Contacts',
          address: '350 5th Ave, New York, NY 10118, USA', type: 'Order Delivery', time: '10:15 AM to 10:30 AM', drive: '18 min (2.2 km)',
          actual: '10:18 AM to 10:34 AM', actualDrive: '19 min (2.3 km)' },
        { name: 'Vikram Shah Visit',  module: 'Accounts',
          address: '89 E 42nd St, New York, NY 10017, USA', type: 'Stock Check',    time: '11:00 AM to 11:20 AM', drive: '14 min (1.8 km)',
          actual: '11:04 AM to 11:26 AM', actualDrive: '15 min (1.9 km)' },
        { name: 'Nisha Kumar Visit',  module: 'Leads',
          address: '11 Wall St, New York, NY 10005, USA',    type: 'Shop Delivery',  time: '11:50 AM to 12:05 PM', drive: '22 min (3.4 km)',
          actual: '11:55 AM to 12:11 PM', actualDrive: '24 min (3.5 km)' },
      ],
    },
    {
      label: 'Day 3', date: '6 May',
      pins: [{ x: 560, y: 380 }, { x: 640, y: 470 }],
      visits: [
        { name: 'Arun Menon Visit',   module: 'Deals',
          address: '200 Park Ave, New York, NY 10166, USA',    type: 'Order Approval', time: '10:30 AM to 10:50 AM', drive: '16 min (2.1 km)',
          actual: '10:34 AM to 10:56 AM', actualDrive: '18 min (2.2 km)' },
        { name: 'Divya Nair Visit',   module: 'Contacts',
          address: '30 Rockefeller Plaza, New York, NY 10112, USA', type: 'Gate Approval',  time: '11:25 AM to 11:40 AM', drive: '19 min (2.7 km)',
          actual: '11:29 AM to 11:46 AM', actualDrive: '20 min (2.8 km)' },
      ],
    },
  ];

  /* What the rep spent on this beat, by day — { name, category, day, amount }.
     Empty for now, so Expenses shows its empty state and the summary's
     Total Expenses reads "—". */
  const EXPENSES = [];

  /* Files left on the beat — { file, size, by, on }. Empty for now, so
     Attachments shows "No Attachment". */
  const ATTACHMENTS = [];

  /* The business card shown on hovering a visit's name (Figma 6444:572006).
     Visits come from different modules, so each module brings the five
     fields the CRM card would show for it; `phone: true` marks a number
     that carries the call icon. The second header line is the record's
     company or account. */
  const CARD_FIELDS = {
    Contacts: [['Contact Owner', 'owner'], ['Email', 'email'], ['Phone', 'phone', true],
               ['Mobile', 'mobile', true], ['Preferred Communication', 'pref']],
    Leads:    [['Lead Owner', 'owner'], ['Email', 'email'], ['Phone', 'phone', true],
               ['Mobile', 'mobile', true], ['Lead Status', 'status']],
    Accounts: [['Account Owner', 'owner'], ['Website', 'website'], ['Phone', 'phone', true],
               ['Account Type', 'accType'], ['Industry', 'industry']],
    Deals:    [['Deal Owner', 'owner'], ['Contact Name', 'contact'], ['Amount', 'amount'],
               ['Stage', 'stage'], ['Closing Date', 'closing']],
  };

  const CARDS = {
    'Alex Newman Visit':  { owner: 'Cameron Williamson', sub: 'Royal Inc.', email: 'alexnewman@royalinc.com', phone: '044 58163540', mobile: '981113617', pref: 'Phone' },
    'Jordan Smith Visit': { owner: 'Olivia Bennett', sub: 'Hudson Retail', email: 'jordan.smith@hudsonretail.com', phone: '212 555 0147', mobile: '917 555 0182', pref: 'Email' },
    'Taylor Smith Visit': { owner: 'Ethan Brooks', sub: 'Greenleaf Grocers', email: 'taylor@greenleafgrocers.com', phone: '212 555 0193', mobile: '646 555 0121', status: 'Contacted' },
    'Morgan Kite Visit':  { owner: 'Sophia Turner', sub: 'Kite Distributors', contact: 'Morgan Kite', amount: '$12,400.00', stage: 'Negotiation', closing: 'May 20, 2026' },
    'Priya Raman Visit':  { owner: 'Liam Carter', sub: 'Empire Foods', email: 'priya.raman@empirefoods.com', phone: '212 555 0164', mobile: '917 555 0139', pref: 'Phone' },
    'Vikram Shah Visit':  { owner: 'Ava Mitchell', sub: 'New York', website: 'www.shahwholesale.com', phone: '212 555 0108', accType: 'Distributor', industry: 'Wholesale' },
    'Nisha Kumar Visit':  { owner: 'Noah Parker', sub: 'Wall St Mart', email: 'nisha@wallstmart.com', phone: '212 555 0175', mobile: '646 555 0156', status: 'Qualified' },
    'Arun Menon Visit':   { owner: 'Emma Collins', sub: 'Park Avenue Stores', contact: 'Arun Menon', amount: '$8,750.00', stage: 'Proposal', closing: 'May 28, 2026' },
    'Divya Nair Visit':   { owner: 'Lucas Reed', sub: 'Plaza Pharmacy', email: 'divya.nair@plazapharmacy.com', phone: '212 555 0130', mobile: '917 555 0117', pref: 'Email' },
  };

  /* The visit's ⋯ menu, by visit state (docs/beat-detail-view-spec.md §5.1).
     The destructive Cancel Visit comes last. A missed visit leads with
     Revise, for one that did happen but was never checked in. Edit opens
     on every visit; how much it lets change depends on the visit. */
  const VISIT_ACTIONS = {
    pending:   ['edit', 'reschedule', 'reassign', 'location', 'cancel'],
    active:    ['edit', 'reschedule', 'reassign', 'location', 'cancel'],
    missed:    ['revise', 'edit', 'reschedule', 'reassign'],
    cancelled: ['edit', 'reschedule'],
    done:      ['edit'],
  };

  const ACTION_LABEL = {
    cancel: 'Cancel Visit', edit: 'Edit Visit', reschedule: 'Reschedule Visit',
    reassign: 'Transfer Visit', location: 'Adjust Location',
    revise: 'Revise Visit',
  };

  /* Where each record in the Add Visit picker lives, so a visit added there
     shows its address like the planned ones */
  /* The records the Add Visit lookup offers, by module, in the order the
     module menu lists them (Figma 6678:569481) */
  const RECORDS = {
    Leads:    ['Karthik Rao', 'Anita Desai', 'Rohan Mehta', 'Sara Thomas', 'Vivek Nair', 'Lena Park'],
    Contacts: ['Rahul Verma', 'Meera Iyer', 'Daniel Brooks', 'Priya Shah'],
    Deals:    ['Q2 Renewal — Apollo', 'Fleet Upgrade — Northwind', 'Annual Contract — Zenith'],
    Accounts: ['Sunrise Traders', 'Metro Wholesale', 'Harbor Foods', 'Crescent Retail'],
  };

  const RECORD_ADDRESS = {
    'Rahul Verma':         '245 Park Ave S, New York, NY 10003, USA',
    'Meera Iyer':          '60 E 8th St, New York, NY 10003, USA',
    'Sunrise Traders':     '120 Lafayette St, New York, NY 10013, USA',
    'Metro Wholesale':     '401 Broadway, New York, NY 10013, USA',
    'Karthik Rao':         '75 Spring St, New York, NY 10012, USA',
    'Anita Desai':         '1 E 14th St, New York, NY 10003, USA',
    'Q2 Renewal — Apollo': '100 W 33rd St, New York, NY 10001, USA',
  };

  /* status: day 'pending' | 'active' | 'done' | 'missed' (its date passed unstarted)
     · visit 'pending' | 'active' | 'done' | 'missed' */
  DAYS.forEach(day => {
    day.status = 'pending';
    day.startedAt = null;
    day.endedAt = null;
    day.visits.forEach(v => { v.status = 'pending'; });
  });

  /* ── Simulated "today" (prototype only) ─────────────── */
  /* The beat runs 4–6 May 2026, so the real clock cannot show the Start
     rules. The header's Simulate picker sets the date, the time, whether
     the rep has a day running on another beat, and who is viewing — and
     every rule below reads the clock from here. */
  const BUSINESS = { start: 9 * 60, end: 19 * 60 };   /* Company Settings: 09:00 AM – 07:00 PM */
  const BEAT_YEAR = 2026, BEAT_MONTH = 'May';
  const SIM = { day: 4, minutes: 10 * 60, otherBeat: false, viewer: 'owner' };

  const dayNum = i => Number(DAYS[i].date.split(' ')[0]);
  const dayName = n => {
    const d = new Date(`${BEAT_MONTH} ${n}, ${BEAT_YEAR}`);
    return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}, ${BEAT_MONTH} ${n}`;
  };
  const isClosed = d => d.status === 'done' || d.status === 'missed' || d.status === 'cancelled';

  /* Set by Cancel Beat; the simulator's reset clears it */
  let beatCancelled = false;
  let beatCancelReason = '';
  let beatCancelledAt = '';

  /* What the clock has made true since it last moved. A running day closes
     itself at the end of business hours, or once its date is behind us —
     whatever was not worked is marked missed. A day whose date passed
     without being started is missed outright. */
  function applyClock() {
    DAYS.forEach((day, i) => {
      const n = dayNum(i);
      const over = n < SIM.day || (n === SIM.day && SIM.minutes >= BUSINESS.end);
      if (day.status === 'active' && over) {
        day.visits.forEach(v => { if (v.status === 'pending' || v.status === 'active') v.status = 'missed'; });
        day.status = 'done';
        day.endedAt = `${minutesToClock(BUSINESS.end)} (auto)`;
        day.endedMin = BUSINESS.end;
      }
      if (day.status === 'pending' && n < SIM.day) {
        day.visits.forEach(v => { v.status = 'missed'; });
        day.status = 'missed';
      }
    });
  }

  /* Two separate things: which day is selected — highlighted, and the one
     the route map draws — and whether its visits are showing. A selected day
     can be collapsed, so the rep can see all the days at once without
     losing the one they are on. */
  let selectedDay = 0;
  let expanded = true;

  /* The stop picked on either side — its row in the list, its pin on the
     map — so both show the same one. { day, visit } for a visit,
     { day, place: 'home' | 'office' } for the day's start or end, or null. */
  let focused = null;
  const sameStop = (a, b) => Boolean(a && b) &&
    a.day === b.day && a.visit === b.visit && a.place === b.place;

  /* Which of the three arrangements is showing. Type 3 is Type 2 with the
     day's action moved onto the day itself, so it wears both classes — see
     setLayout(). Read here because where the Start / End button goes
     depends on it. */
  let layout = '1';

  /* ── Elements ──────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const daysEl   = $('bd-days');
  const statusEl = $('bd-beat-status');
  const band     = $('bd-band');
  const bandIcon = $('bd-band-icon');
  const bandText = $('bd-band-text');
  const toastEl  = $('bd-toast');
  const dayAction = $('bd-day-action');

  const escape = s => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* The time as the simulated day has it */
  const clock = () => minutesToClock(SIM.minutes);

  /* ── Derived state ─────────────────────────────────── */
  const activeIndex = () => DAYS.findIndex(d => d.status === 'active');

  /* A day opens for work only when it is next in line and nothing else
     is running — the rep works the beat in order, one day at a time. */
  function canStart(index) {
    if (DAYS[index].status !== 'pending') return false;
    if (activeIndex() !== -1) return false;
    return DAYS.slice(0, index).every(isClosed);
  }

  /* The day next in line: the first one not yet worked, with every day
     before it closed one way or the other */
  const nextIndex = () => DAYS.findIndex((d, i) =>
    d.status === 'pending' && DAYS.slice(0, i).every(isClosed));

  /* Why the next day cannot be started right now, or null when it can.
     Checked in this order, so the reason given is the one to act on first. */
  function startBlock(i) {
    const day = DAYS[i], n = dayNum(i);
    if (n > SIM.day) return `You can start this day on ${BEAT_MONTH} ${n}`;
    const running = activeIndex();
    if (running !== -1 && running !== i) return `End ${DAYS[running].label} before starting ${day.label}.`;
    if (!day.visits.length) return 'Add a visit to start this day.';
    if (SIM.minutes < BUSINESS.start) return `You can start this day from ${minutesToClock(BUSINESS.start)}.`;
    if (SIM.minutes >= BUSINESS.end) return 'Business hours for today have ended.';
    if (SIM.otherBeat) return 'End Day 1 of BP-002 before starting this one.';
    return null;
  }

  /* What this day offers the rep, if anything — Type 3 only, where the
     action sits on the day rather than in the record header. The order
     falls straight out of canStart(): at the outset only Day 1 can be
     started, and each later day earns its button when the one before it is
     closed. A day that is done offers nothing, and nor does one still
     waiting its turn. */
  function dayAct(i) {
    /* Only the beat owner logs their own day; anyone else sees none */
    if (SIM.viewer !== 'owner') return null;
    if (DAYS[i].status === 'active') {
      return { act: 'end', label: 'End', cls: 'bd-day-act-end' };
    }
    /* The next day in line always shows its Start — greyed, with the
       reason on hover, when it cannot be used yet */
    if (i === nextIndex()) {
      return { act: 'start', label: 'Start', cls: 'bd-day-act-start', blocked: startBlock(i) };
    }
    return null;
  }

  /* The record's own badge — a solid pill, not the pastel tags the days and
     visits use (Figma 2383:48054 · 2055:44440 · 2055:44842) */
  function beatStatus() {
    /* Cancelled after some of it was worked: what was done stands, so the
       beat reads Partially Completed (green), not Cancelled */
    if (beatCancelled) {
      return DAYS.some(d => d.status === 'done')
        ? { label: 'Partially Completed', cls: 'bd-done' }
        : { label: 'Cancelled', cls: 'bd-missed' };
    }
    if (DAYS.every(d => d.status === 'missed')) return { label: 'Missed', cls: 'bd-missed' };
    if (DAYS.every(isClosed)) return { label: 'Completed', cls: 'bd-done' };
    if (DAYS.some(d => d.status !== 'pending')) return { label: 'In Progress', cls: 'bd-progress' };
    return { label: 'Upcoming', cls: 'bd-upcoming' };
  }

  /* ── Rendering ─────────────────────────────────────── */
  /* Only a finished day is tagged. A day still ahead needs no tag — that is
     what every day starts out as — and a running one is already named by the
     banner at the top of the record, marked by its border and dated by the
     "Started …" clock in its own header. */
  const DAY_TAG = {
    done:   { label: 'Completed', cls: 'approved' },
    missed: { label: 'Missed',    cls: 'rejected' },
    cancelled: { label: 'Cancelled', cls: 'rejected' },
  };

  /* A visit the rep has not reached yet carries no tag — the tags arrive one
     at a time as the day moves through the stops. `pending` is deliberately
     absent from this map. */
  const VISIT_TAG = {
    active:    { label: 'In Progress', cls: 'pending' },
    done:      { label: 'Completed',   cls: 'approved' },
    missed:    { label: 'Missed',      cls: 'rejected' },
    cancelled: { label: 'Cancelled',   cls: 'rejected' },
  };

  /* A cancelled visit says so even on a day not yet started */
  const tagFor = (day, visit) => (visit.status === 'cancelled' || day.status !== 'pending')
    ? VISIT_TAG[visit.status] || null : null;

  /* A day still ahead has nothing to be part-way through, so it states its
     size the way the frame does — "3 visits". The fraction only appears
     once there is progress to report. */
  function dayTally(day) {
    if (day.status === 'pending' || day.status === 'missed' || day.status === 'cancelled') return `${day.visits.length} visits`;
    /* Only visits actually completed count — a missed one is not progress */
    const completed = day.visits.filter(v => v.status === 'done').length;
    return `${completed} / ${day.visits.length} visits`;
  }

  /* Only a day that has been worked has a clock to show */
  function dayClockHtml(day) {
    if (day.status === 'active') return `<span class="bd-day-clock">Started ${escape(day.startedAt)}</span>`;
    return '';
  }

  /* What a finished day came to, at the top of its opened body (Type A,
     neutral): the travel actually driven and the time spent at the stops. The visit count is already the tally
     on the title row, so it is not repeated here. */
  function daySumHtml(day) {
    if (day.status !== 'done') return '';
    const { travelMin, travelKm, visitMin } = daySummary(day);
    return `
      <div class="bd-day-sum">
        <div class="bd-sum-col">
          <span class="bd-sum-label">Total Travel</span>
          <span class="bd-sum-row"><span class="bd-sum-value">${span(travelMin)}</span><span class="bd-sum-km">(${travelKm.toFixed(1)} km)</span></span>
        </div>
        <span class="bd-sum-divider" aria-hidden="true"></span>
        <div class="bd-sum-col">
          <span class="bd-sum-label">Total Visit Time</span>
          <span class="bd-sum-value">${span(visitMin)}</span>
        </div>
      </div>`;
  }

  /* "4 hrs 25 mins", "12 hrs", "39 mins" */
  function span(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    const hrs = h ? `${h} ${h === 1 ? 'hr' : 'hrs'}` : '';
    const min = m || !h ? `${m} ${m === 1 ? 'min' : 'mins'}` : '';
    return [hrs, min].filter(Boolean).join(' ');
  }

  /* What a finished day came to. Travel counts the legs actually driven —
     the same ones the rail draws blue: each leg into a stop the rep
     reached, and the last one into Office when every stop was done. Visit
     time adds up how long each completed stop really ran. */
  function daySummary(day) {
    const lastDone = day.visits.reduce((n, v, i) => (v.status === 'done' ? i : n), -1);
    const allDone = day.visits.length > 0 && day.visits.every(v => v.status === 'done');
    const legs = [];
    for (let i = 0; i <= lastDone; i++) legs.push(i === 0 ? HOME : day.visits[i - 1]);
    if (allDone) legs.push(day.visits[day.visits.length - 1]);
    let travelMin = 0, travelKm = 0;
    legs.forEach(from => {
      const text = from.actualDrive || from.drive || '';
      const m = text.match(/(\d+)\s*min/);
      travelMin += m ? Number(m[1]) : 0;
      const km = text.match(/([\d.]+)\s*km/);
      travelKm += km ? Number(km[1]) : 0;
    });
    const visitMin = day.visits.filter(v => v.status === 'done').reduce((n, v) => {
      const [from, to] = (v.actual || v.time).split(' to ');
      return n + (to ? Math.max(0, clockToMinutes(to) - clockToMinutes(from)) : 0);
    }, 0);
    return { travelMin, travelKm, visitMin };
  }

  /* ── The day's timeline ────────────────────────────── */
  /* One continuous rail from Home to Office. Every row draws its own slice
     of the line behind the circles, so consecutive rows join with no gap;
     Home starts its slice at its circle and Office ends there. The blue runs
     as far as the rep has got, grey from there on. */

  function placeHtml(place, kind, reached, edge, dayIndex) {
    const time = place.time
      ? `<span class="at">at</span><span class="time">${escape(place.time)}</span>` : '';
    const isFocused = focused && focused.day === dayIndex && focused.place === kind;
    return `
      <div class="bd-row bd-place bd-place-${kind} ${edge} ${reached ? 'reached' : ''} ${isFocused ? 'bd-focus' : ''}"
           data-place="${kind}">
        <span class="bd-rail">
          <span class="bd-place-icon"><img src="src/loc-${kind}.svg" alt="" aria-hidden="true" /></span>
        </span>
        <div class="bd-text">
          <p class="bd-place-line"><span class="name">${place.title}</span>${time}</p>
          <p class="bd-place-addr">${place.addr}</p>
        </div>
      </div>`;
  }

  /* The leg between two stops: a rule out to the right, then the car and the
     time (Figma 3479:98007). Until the rep has driven it that time is an
     estimate, marked with a ~; once they arrive it is replaced by what the
     leg actually took, and the ~ comes off. */
  function legHtml(from, travelled) {
    if (!from || !from.drive) return '';
    const done = travelled && from.actualDrive;
    return `
      <div class="bd-row bd-leg ${travelled ? 'reached' : ''}">
        <span class="bd-leg-rule"></span>
        <img class="bd-leg-car" src="src/car.svg" alt="" aria-hidden="true" />
        <span class="bd-leg-text ${done ? 'actual' : ''}">${done ? escape(from.actualDrive) : '~ ' + escape(from.drive)}</span>
      </div>`;
  }

  /* Read-only: completing a visit is the rep's job out in the field, so this
     page reports what happened rather than offering to change it. The tick
     and cross belong to the bottom-up screen, where a manager approves.
     No card either — the stop is plain text beside the rail. */
  function visitHtml(visit, i, day, reached, isCurrent) {
    const tag = tagFor(day, visit);
    /* Only the stop in hand answers to a click, and only while its day runs */
    const settle = day.status === 'active' && visit.status === 'active';
    /* A completed stop reports when it really happened, not when it was
       planned for; one never reached keeps its plan */
    const when = visit.status === 'done' && visit.actual ? visit.actual : visit.time;
    const isFocused = focused && DAYS[focused.day] === day && focused.visit === i;
    return `
      <div class="bd-row bd-visit ${reached ? 'reached' : ''} ${isCurrent ? 'bd-current' : ''} ${settle ? 'bd-settleable' : ''} ${isFocused ? 'bd-focus' : ''}"
           data-visit="${i}" ${settle ? 'title="Mark this visit completed"' : ''}>
        <span class="bd-rail ${visit.status === 'active' ? 'bd-pulsing' : ''}"><span class="bp-visit-num ${visit.status}">${i + 1}</span></span>
        <div class="bd-text">
          <p class="bd-visit-head">
            <span class="bd-visit-name"><span class="vname">${escape(visit.name)}</span></span>
            ${tag ? `<span class="bp-visit-tag ${tag.cls}">${tag.label}</span>` : ''}
          </p>
          <!-- Figma 6522:80059: time • type, then the address, 6 apart -->
          <div class="bd-visit-where">
            <p class="bd-visit-meta bd-visit-when"><span class="vtime">${escape(when)}</span><span class="dot">•</span><span class="vtype" data-trunc>${escape(visit.type)}</span></p>
            ${visit.address ? `<p class="bd-visit-addr" data-trunc>${escape(visit.address)}</p>` : ''}
          </div>
        </div>
        ${visitMenuHtml(visit)}
      </div>`;
  }

  function visitMenuHtml(visit) {
    const actions = VISIT_ACTIONS[visit.status || 'pending'] || [];
    if (!actions.length) return '';
    return `
        <div class="bd-vmenu-wrap">
          <button class="bd-vmore" type="button" aria-haspopup="menu" aria-expanded="false"
                  aria-label="Actions for ${escape(visit.name)}"><i class="ti ti-dots" aria-hidden="true"></i></button>
          <div class="bd-vmenu" role="menu" hidden>
            ${actions.map(a => `<button class="bd-vmenu-item${a === 'cancel' ? ' danger' : ''}" type="button"
                    role="menuitem" tabindex="-1" data-action="${a}">${ACTION_LABEL[a]}</button>`).join('')}
          </div>
        </div>`;
  }

  function timelineHtml(day, index) {
    /* The blue reaches the stop the rep is on, or the last one they finished */
    const current = day.visits.findIndex(v => v.status === 'active');
    const lastDone = day.visits.reduce((n, v, i) => (v.status === 'done' ? i : n), -1);
    const upto = current !== -1 ? current : lastDone;
    const allDone = day.visits.length > 0 && day.visits.every(v => v.status === 'done');
    const canAdd = index === selectedDay && day.status !== 'done';

    const rows = [placeHtml(HOME, 'home', upto >= 0, 'first', index)];
    day.visits.forEach((v, i) => {
      /* the leg into this stop, then the stop itself */
      rows.push(legHtml(i === 0 ? HOME : day.visits[i - 1], upto >= i));
      rows.push(visitHtml(v, i, day, upto >= i, i === upto && !allDone));
    });
    rows.push(legHtml(day.visits[day.visits.length - 1], allDone));
    if (canAdd) {
      rows.push(`
        <div class="bd-row bd-add-row">
          <span class="bd-rail">
            <span class="bp-visit-num bd-add-num"><img src="src/add-visit.svg" alt="" aria-hidden="true" /></span>
          </span>
          <div class="bd-text">
            <button class="bd-add-visit" type="button" data-act="add">Add Visit</button>
          </div>
        </div>`);
    }
    rows.push(placeHtml(OFFICE, 'office', allDone, 'last', index));
    return `<div class="bd-timeline">${rows.join('')}</div>`;
  }

  function dayHtml(day, index) {
    const tag = DAY_TAG[day.status];
    const act = layout === '3' ? dayAct(index) : null;
    return `
      <div class="bp-day bd-day ${index === selectedDay ? 'selected' : ''} ${index === selectedDay && expanded ? 'expanded' : ''} ${day.status}" data-day="${index}">
        <div class="bp-day-header" aria-expanded="${index === selectedDay && expanded}">
          <span class="bd-chev"><img src="src/day-chevron.svg" alt="" aria-hidden="true" /></span>
          <span class="bd-day-title">${day.label}<span class="dot">&nbsp;&nbsp;•&nbsp;&nbsp;</span><span class="date">${escape(day.date)}</span></span>
          ${tag ? `<span class="bp-visit-tag ${tag.cls}">${tag.label}</span>` : ''}
          <span class="bd-day-count">${dayTally(day)}</span>
          ${act ? `<button class="bd-day-act ${act.cls}${act.blocked ? ' is-blocked' : ''}" type="button"
                    data-act="${act.act}" data-day="${index}"
                    ${act.blocked ? `aria-disabled="true" data-tip="${escape(act.blocked)}"` : ''}
                    aria-label="${act.label} ${day.label}${act.blocked ? ` — ${escape(act.blocked)}` : ''}">${act.label}</button>` : ''}
          ${dayClockHtml(day)}
        </div>
        <div class="bp-day-body">${daySumHtml(day)}${timelineHtml(day, index)}</div>
      </div>`;
  }

  function renderBand() {
    const running = activeIndex();
    if (running !== -1) {
      band.hidden = false;
      band.className = 'bp-status-band bp-band-waiting';
      bandIcon.className = 'ti ti-clock-play';
      bandText.textContent =
        `${DAYS[running].label} in progress — started at ${DAYS[running].startedAt}.`;
      return;
    }
    /* A completed or cancelled beat says so in its badge; it needs no
       banner as well */
    band.hidden = true;
  }

  /* The one thing the rep is here to do, in the record header in both
     layouts, named after the day it acts on so they never have to hunt
     down the row first. Only ever one day is actionable, so there is only
     ever one button. */
  function renderDayAction() {
    /* Type 3 puts it on the day row instead — and on desktop this is a
       rarely used action, so it does not also hold the record's most
       prominent slot */
    if (layout === '3') { dayAction.hidden = true; return; }
    const running = activeIndex();
    if (running !== -1) {
      dayAction.hidden = false;
      dayAction.className = 'bp-btn bd-end';
      dayAction.textContent = `End ${DAYS[running].label}`;
      dayAction.dataset.act = 'end';
      dayAction.dataset.day = running;
      return;
    }
    const next = DAYS.findIndex((d, i) => canStart(i));
    if (next === -1) { dayAction.hidden = true; return; }
    dayAction.hidden = false;
    dayAction.className = 'bp-btn primary';
    dayAction.textContent = `Start ${DAYS[next].label}`;
    dayAction.dataset.act = 'start';
    dayAction.dataset.day = next;
  }

  /* The whole list is rebuilt on every change, so the details column would
     jump back to the top each time a day is folded. Hold its scroll. */
  const scroller = daysEl.closest('.bp-details');

  /* ── Related lists under Notes, and the summary's counts (Type 2) ── */
  const money = n => `$${n.toFixed(2)}`;
  const dayRef = i => `${DAYS[i].label} - ${DAYS[i].date}`;

  function tableHtml(head, rows, empty) {
    if (!rows.length) return `<p class="bd-rl-empty">${empty}</p>`;
    return `
      <table class="bd-rl-table">
        <thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;
  }

  const link = text => `<a href="#" class="bd-rl-link">${escape(text)}</a>`;

  function renderRelatedLists() {
    $('bd-expenses-body').innerHTML = tableHtml(
      ['Expense Name', 'Category', 'Beat Day', 'Amount'],
      EXPENSES.map(e => [link(e.name), escape(e.category), link(dayRef(e.day)), money(e.amount)]),
      'No records found');

    $('bd-attachments-body').innerHTML = tableHtml(
      ['File Name', 'Size', 'Attached By', 'Date Added'],
      ATTACHMENTS.map(a => [link(a.file), a.size, escape(a.by), a.on]),
      'No Attachment');

    renderInfo();

    /* Beat Details: what the beat is planned to be, summed over its days */
    $('bd-sum-visits').textContent = DAYS.reduce((n, day) => n + day.visits.length, 0);
    $('bd-sum-distance').textContent =
      `${DAYS.reduce((n, day) => n + plannedKm(day), 0).toFixed(1)} km`;
  }

  /* ── Show / Hide Details ─────────────────────────────── */
  /* The record's information as the CRM lists it: the beat's own facts —
     planned, then what actually happened — and the record's housekeeping.
     Actuals are read off the days, so they move as the beat is worked. */
  const infoToggle = $('bd-info-toggle'), infoBody = $('bd-info-body');
  infoToggle.addEventListener('click', () => {
    const open = infoBody.hidden;
    infoBody.hidden = !open;
    infoToggle.setAttribute('aria-expanded', String(open));
    infoToggle.querySelector('span').textContent = open ? 'Hide Details' : 'Show Details';
  });

  function renderInfo() {
    const visits = DAYS.reduce((n, d) => n + d.visits.length, 0);
    const doneVisits = DAYS.reduce((n, d) => n + d.visits.filter(v => v.status === 'done').length, 0);
    const doneDays = DAYS.filter(d => d.status === 'done').length;
    const travelled = DAYS.filter(d => d.status === 'done')
      .reduce((n, d) => n + daySummary(d).travelKm, 0);
    const spent = EXPENSES.reduce((n, e) => n + e.amount, 0);
    const none = '<span class="bd-info-empty">—</span>';
    const left = [
      ['Beat Name', 'BP - 003'],
      ['Beat Owner', 'Cameron Williamson'],
      ['Beat Duration', '4 May 2026 - 6 May 2026'],
      ['Total Planned Visits', String(visits)],
      ['Total Planned Distance', `${DAYS.reduce((n, d) => n + plannedKm(d), 0).toFixed(1)} km`],
      ['Completed Beat Days', `${doneDays} / ${DAYS.length}`],
      ['Actual Completed Visits', `${doneVisits} / ${visits}`],
      ['Actual Travelled Distance', doneDays ? `${travelled.toFixed(1)} km` : null],
      ['Total Expenses', EXPENSES.length ? money(spent) : null],
    ];
    const right = [
      ['Beat Status', beatStatus().label],
      ['Created By', 'Jenny Wilson<small>Mon, 27 Apr 2026 10:12 AM</small>', true],
      ['Modified By', 'Cameron Williamson<small>Mon, 4 May 2026 09:40 AM</small>', true],
      ['Layout', 'Standard'],
      ['Tag', null],
      ['Description', null],
    ];
    const col = rows => `<dl class="bd-info-col">${rows.map(([k, v, html]) => `
        <div class="bd-info-row"><dt>${k}</dt><dd>${v == null ? none : html ? v : escape(v)}</dd></div>`).join('')}
      </dl>`;
    $('bd-info-grid').innerHTML = col(left) + col(right);
  }

  /* ── Cancelled: the note on the tab row and its reason popover ── */
  const cancelNote = $('bd-cancel-note'), cancelLink = $('bd-cancel-link'), cancelPop = $('bd-cancel-pop');
  function renderCancelNote() {
    cancelNote.hidden = !beatCancelled;
    if (!beatCancelled) { setCancelPop(false); return; }
    $('bd-cancel-updated').textContent = `Last Updated: ${beatCancelledAt}`;
    $('bd-cancel-pop-text').textContent = beatCancelReason;
    $('bd-cancel-pop-meta').textContent = `Cancelled by Cameron Williamson · ${beatCancelledAt}`;
  }
  function setCancelPop(open) {
    cancelPop.hidden = !open;
    cancelLink.setAttribute('aria-expanded', String(open));
  }
  cancelLink.addEventListener('click', e => { e.stopPropagation(); setCancelPop(cancelPop.hidden); });
  document.addEventListener('click', e => {
    if (!cancelPop.hidden && !cancelPop.contains(e.target)) setCancelPop(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !cancelPop.hidden) { setCancelPop(false); cancelLink.focus(); }
  });

  function render() {
    const scrollTop = scroller ? scroller.scrollTop : 0;
    renderCancelNote();
    daysEl.innerHTML = DAYS.map(dayHtml).join('');
    renderRelatedLists();
    if (scroller) scroller.scrollTop = scrollTop;
    const s = beatStatus();
    statusEl.textContent = s.label;
    statusEl.className = `bp-badge ${s.cls}`;
    renderDayAction();
    renderBand();
    if (window.bdMap) { window.bdMap._activeBeatDay = selectedDay; window.bdMap.draw(); }
  }

  /* The product's message box (Figma 5988:150020): tick, message, close.
     Every confirmation on the page goes through it. */
  function toast(message) {
    toastEl.innerHTML = `
      <img class="bd-toast-icon" src="src/toast-tick.svg" alt="" aria-hidden="true" />
      <span class="bd-toast-text">${escape(message)}</span>
      <button class="bd-toast-close" type="button" aria-label="Dismiss">
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

  /* ── Actions ───────────────────────────────────────── */
  /* Completing the stop in hand hands the day on to the next one */
  function completeVisit(day, visit) {
    visit.status = 'done';
    const next = day.visits.find(v => v.status === 'pending');
    if (next) next.status = 'active';
    render();
  }

  function startDay(i) {
    DAYS[i].status = 'active';
    DAYS[i].startedAt = clock();
    DAYS[i].startedMin = SIM.minutes;
    /* The first stop is the one the rep is on */
    if (DAYS[i].visits[0]) DAYS[i].visits[0].status = 'active';
    selectedDay = i;
    expanded = true;
    render();
    revealDay(i);
    toast(`${DAYS[i].label} started at ${DAYS[i].startedAt}.`);
  }

  function endDay(i) {
    const day = DAYS[i];
    /* Whatever was not worked today did not happen today, the stop in hand
       included */
    const left = day.visits.filter(v => v.status === 'pending' || v.status === 'active');
    left.forEach(v => { v.status = 'missed'; });
    day.status = 'done';
    day.endedAt = clock();
    day.endedMin = SIM.minutes;
    /* Move the rep on to the next day they have to work */
    const next = DAYS.findIndex(d => d.status === 'pending');
    if (next !== -1) { selectedDay = next; expanded = true; }
    render();
    toast(left.length
      ? `${day.label} ended — ${left.length} visit${left.length === 1 ? '' : 's'} marked missed.`
      : `${day.label} ended at ${day.endedAt}.`);
  }

  /* Acting from the toolbar means the day the rep just opened may be far
     down the list, so bring it to them.

     Not in a related list, though: there the button is on the day row, so
     the day is already under the rep's finger — and scrollIntoView moves
     every scrollable ancestor it has, which now includes the page column,
     carrying the card's own header off the top of the screen. */
  function revealDay(i) {
    if (document.body.classList.contains('bd-in-list')) return;
    const el = daysEl.querySelector(`.bd-day[data-day="${i}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* Type 2 asks before starting, with the same confirmation Type 3 uses
     from the day row. Type 1 is the reference and still starts on the
     click, as it always did. */
  dayAction.addEventListener('click', () => {
    const i = Number(dayAction.dataset.day);
    if (dayAction.dataset.act !== 'start') openEndDay(i);
    else if (layout === '2') openStartDay(i);
    else startDay(i);
  });

  /* Distance is read off the legs: what was actually driven where we have
     it, the estimate where we do not. Both confirmations use it. */
  /* A day's planned route: the drive out of Home, then the drive out of each
     stop — estimates, before anything has been driven */
  const kmIn = text => { const m = (text || '').match(/([\d.]+)\s*km/); return m ? Number(m[1]) : 0; };
  function plannedKm(day) {
    return kmIn(HOME.drive) + day.visits.reduce((n, v) => n + kmIn(v.drive), 0);
  }

  const kmOf = visit => {
    const m = (visit.actualDrive || visit.drive || '').match(/([\d.]+)\s*km/);
    return m ? Number(m[1]) : 0;
  };

  /* ── Start Day confirmation ────────────────────────── */
  /* The click stamps a time that stands for "the rep began work, here,
     now", and nothing afterwards can correct it — so it is asked for
     rather than taken. Ending already asked; this closes the pair. */
  const startOverlay = $('bd-start-overlay');
  let startingDay = null;

  function openStartDay(i) {
    startingDay = i;
    const day = DAYS[i];
    const planned = plannedKm(day);   /* the same figure Beat Details adds up */
    const first = day.visits[0];

    /* The day and its date ride in the title; the count is in the summary */
    $('bd-start-title').textContent = `Start “${day.label} - ${day.date}”`;
    $('bd-start-note-day').textContent = day.label;
    $('bd-start-visits').textContent = String(day.visits.length);
    $('bd-start-km').textContent = `${planned.toFixed(1)} km`;
    $('bd-start-first').textContent = first ? first.name : '—';
    $('bd-start-clock').textContent = clock();

    startOverlay.hidden = false;
    $('bd-start-confirm').focus();
  }

  function closeStartDay() { startOverlay.hidden = true; startingDay = null; }

  $('bd-start-cancel').addEventListener('click', closeStartDay);
  $('bd-start-confirm').addEventListener('click', () => {
    const i = startingDay;
    closeStartDay();
    startDay(i);
  });
  startOverlay.addEventListener('click', e => {
    if (e.target === startOverlay) closeStartDay();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !startOverlay.hidden) closeStartDay();
  });

  /* ── End Day confirmation ──────────────────────────── */
  /* Ending a day is the moment the rep's log is closed, so it shows what the
     day came to before it is settled, and says what will happen to anything
     left open. */
  const endOverlay = $('bd-end-overlay');
  let endingDay = null;

  function elapsed(day) {
    if (day.startedMin == null) return '—';
    const mins = Math.max(1, (day.endedMin ?? SIM.minutes) - day.startedMin);
    return mins < 60 ? `${mins} min`
      : `${Math.floor(mins / 60)} hr${mins % 60 ? ` ${mins % 60} min` : ''}`;
  }

  /* What the day came to if it ends now. Missed counts what is already
     missed and whatever is still open, since ending the day closes those
     too; cancelled and rescheduled visits are counted apart. */
  function openEndDay(i) {
    endingDay = i;
    const day = DAYS[i];
    const count = (...states) => day.visits.filter(v => states.includes(v.status)).length;
    const done = day.visits.filter(v => v.status === 'done');
    /* Distance counts the legs actually driven — the ones out of a stop the
       rep reached */
    const km = done.reduce((n, v) => n + kmOf(v), 0);

    $('bd-end-title').textContent = `End “${day.label} - ${day.date}”`;
    $('bd-sum-done').textContent = `${done.length} of ${day.visits.length}`;
    $('bd-sum-missed').textContent = String(count('missed', 'pending', 'active'));
    $('bd-sum-canceled').textContent = String(count('cancelled'));
    $('bd-sum-rescheduled').textContent = String(count('rescheduled'));
    $('bd-sum-time').textContent = elapsed(day);
    $('bd-sum-km').textContent = `${km.toFixed(1)} km`;

    endOverlay.hidden = false;
    $('bd-end-confirm').focus();
  }

  function closeEndDay() { endOverlay.hidden = true; endingDay = null; }

  $('bd-end-cancel').addEventListener('click', closeEndDay);
  $('bd-end-confirm').addEventListener('click', () => {
    const i = endingDay;
    closeEndDay();
    endDay(i);
  });
  endOverlay.addEventListener('click', e => { if (e.target === endOverlay) closeEndDay(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !endOverlay.hidden) closeEndDay();
  });

  /* ── Visit ⋯ menu ───────────────────────────────────── */
  /* Handled before anything else on the row, so opening the menu on the
     visit in progress never also completes it (spec §5.1.3). */
  function closeVisitMenus(except) {
    daysEl.querySelectorAll('.bd-vmenu-wrap.open').forEach(w => {
      if (w === except) return;
      w.classList.remove('open');
      w.querySelector('.bd-vmenu').hidden = true;
      w.querySelector('.bd-vmore').setAttribute('aria-expanded', 'false');
    });
  }

  function toggleVisitMenu(wrap, focusFirst) {
    const open = !wrap.classList.contains('open');
    closeVisitMenus(wrap);
    wrap.classList.toggle('open', open);
    wrap.querySelector('.bd-vmenu').hidden = !open;
    wrap.querySelector('.bd-vmore').setAttribute('aria-expanded', String(open));
    if (open) {
      hideCard();
      if (focusFirst) wrap.querySelector('.bd-vmenu-item').focus();
    }
  }

  daysEl.addEventListener('click', e => {
    const more = e.target.closest('.bd-vmore');
    if (more) {
      e.stopPropagation();
      toggleVisitMenu(more.parentElement, e.detail === 0);   /* keyboard opens onto the first item */
      return;
    }
    const item = e.target.closest('.bd-vmenu-item');
    if (item) {
      e.stopPropagation();
      const row = item.closest('.bd-visit');
      const name = row.querySelector('.vname').textContent;
      closeVisitMenus();
      const d = Number(row.closest('.bd-day').dataset.day), v = Number(row.dataset.visit);
      const open = VISIT_ACTION_OPEN[item.dataset.action];
      if (open) open(d, v);
      else toast(`${ACTION_LABEL[item.dataset.action]} for ${name} is not part of this prototype yet.`);
      return;
    }
  }, true);

  document.addEventListener('click', e => {
    if (!e.target.closest('.bd-vmenu-wrap')) closeVisitMenus();
  });

  /* Escape closes and returns focus to the ⋯; arrows move through items */
  daysEl.addEventListener('keydown', e => {
    const wrap = e.target.closest('.bd-vmenu-wrap.open');
    if (!wrap) return;
    const items = [...wrap.querySelectorAll('.bd-vmenu-item')];
    const at = items.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      closeVisitMenus();
      wrap.querySelector('.bd-vmore').focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      items[(at + step + items.length) % items.length].focus();
    }
  });

  daysEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');

    if (btn && btn.dataset.act === 'add') {
      openAddVisit(Number(btn.closest('.bd-day').dataset.day));
      return;
    }

    /* Starting or ending the day from its own row. Returning here keeps the
       click off the card, which would otherwise fold the day away. */
    if (btn && (btn.dataset.act === 'start' || btn.dataset.act === 'end')) {
      if (btn.getAttribute('aria-disabled') === 'true') return;   /* the tooltip says why */
      const i = Number(btn.dataset.day);
      if (btn.dataset.act === 'start') openStartDay(i);
      else openEndDay(i);
      return;
    }

    /* A visit, or the day's Home or Office, in the list: take the map to its
       pin. The visit in progress still completes on its click, below — this
       only moves the map. */
    const vrow = e.target.closest('.bd-visit, .bd-place');
    if (vrow) {
      const d = Number(vrow.closest('.bd-day').dataset.day);
      focused = vrow.dataset.place
        ? { day: d, place: vrow.dataset.place }
        : { day: d, visit: Number(vrow.dataset.visit) };
      daysEl.querySelectorAll('.bd-focus').forEach(el => el.classList.remove('bd-focus'));
      vrow.classList.add('bd-focus');
      popPinned = true;
      placeVisitPop();    /* shows at once; the glide's redraws keep it on the pin */
      panToStop(focused);
    }

    /* Completing the stop in hand */
    const row = e.target.closest('.bd-settleable');
    if (row) {
      const day = DAYS[Number(row.closest('.bd-day').dataset.day)];
      completeVisit(day, day.visits[Number(row.dataset.visit)]);
      return;
    }

    /* Anywhere on the card counts, except inside the visit list — a
       collapsed card is all header, so the whole thing is the hit area */
    if (e.target.closest('.bp-day-body')) return;
    const card = e.target.closest('.bd-day');
    if (!card) return;
    const i = Number(card.dataset.day);
    /* Clicking the day already selected folds it away and leaves it
       selected; clicking another one selects and opens it */
    if (i === selectedDay) expanded = !expanded;
    else { selectedDay = i; expanded = true; focused = null; }
    render();
  });

  /* ── Add Visit modal (Figma 4007:113738) ───────────── */
  const overlay = $('bd-overlay');
  const avTitle = $('bd-av-title');
  /* Module & Record: the lookup in src/record-picker.js */
  const avRecord = RecordPicker.create($('av-record-host'), {
    modules: RECORDS, placeholder: 'Select Record', mandatory: true, fieldId: 'av-record',
    onChange: () => setMsg(avRecord.field, ''),
  });
  const avType   = $('av-type');
  const avDur    = $('av-dur');
  const avDesc   = $('av-desc');

  /* Half-hour slots across a working day */
  const SLOTS = (() => {
    const out = [];
    for (let m = 9 * 60; m <= 17 * 60; m += 30) out.push(minutesToClock(m));
    return out;
  })();

  function minutesToClock(mins) {
    const h24 = Math.floor(mins / 60) % 24;
    const h = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h}:${String(mins % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
  }

  function clockToMinutes(label) {
    const [, h, m, ap] = label.match(/(\d+):(\d+) (AM|PM)/);
    return ((Number(h) % 12) + (ap === 'PM' ? 12 : 0)) * 60 + Number(m);
  }

  let addingTo = null;   // the day index the modal is filling

  function setMsg(field, text) {
    /* The message sits in the field's control, beside any unit wrapper */
    const msg = (field.closest('.bd-control') || field.parentElement).querySelector('.bd-msg');
    field.classList.toggle('invalid', Boolean(text));
    if (!msg) return;
    msg.textContent = text || '';
    msg.hidden = !text;
  }

  /* Fifteen minutes is what the other visits on these beats run to */
  const VISIT_MINUTES = 15;

  /* Where a visit added without a time begins: TRAVEL_MINUTES after the
     latest end among the day's timed visits, or 9:00 AM on an empty day */
  const TRAVEL_MINUTES = 15;
  function nextFreeStart(day) {
    const ends = day.visits.map(v => v.time.split(' to ')[1]).filter(t => t && /^\d/.test(t))
      .map(clockToMinutes);
    return ends.length ? minutesToClock(Math.max(...ends) + TRAVEL_MINUTES) : '9:00 AM';
  }

  /* Start times the day's visits already hold (other than `except`) */
  const takenStarts = (dayIndex, except) => DAYS[dayIndex].visits
    .filter(v => v !== except).map(v => v.time.split(' to ')[0]).filter(t => /^\d/.test(t));

  /* Visit Duration is typed in minutes: whole numbers only, 1 to 480 */
  const MAX_VISIT_MINUTES = 480;
  function durationProblem(input) {
    const raw = input.value.trim();
    if (!raw) return 'Enter the duration in minutes.';
    const n = Number(raw);
    if (n < 1) return 'Must be at least 1 minute.';
    if (n > MAX_VISIT_MINUTES) return `Must be ${MAX_VISIT_MINUTES} minutes or less.`;
    return '';
  }
  /* Digits only, as they are typed or pasted */
  function wireDuration(input) {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 3);
      setMsg(input, '');
    });
  }
  /* How long a "9:00 AM to 9:15 AM" span runs, in minutes */
  const spanMinutes = span => {
    const [from, to] = (span || '').split(' to ');
    return to && /^\d/.test(from) ? Math.max(1, clockToMinutes(to) - clockToMinutes(from)) : VISIT_MINUTES;
  };

  function openAddVisit(dayIndex) {
    addingTo = dayIndex;
    const day = DAYS[dayIndex];
    avTitle.innerHTML =
      `Add Visit to ${escape(day.label)} <span class="dot">•</span> ${escape(day.date)}`;

    avRecord.clear(); setMsg(avRecord.field, '');
    avType.value = ''; setMsg(avType, '');
    avDesc.value = '';
    avDur.value = String(VISIT_MINUTES); setMsg(avDur, '');

    overlay.hidden = false;
    avRecord.field.focus();
  }

  function closeAddVisit() {
    overlay.hidden = true;
    addingTo = null;
  }

  avType.addEventListener('change', () => setMsg(avType, ''));

  wireDuration(avDur);

  $('av-cancel').addEventListener('click', closeAddVisit);

  overlay.addEventListener('click', e => { if (e.target === overlay) closeAddVisit(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.hidden) closeAddVisit();
  });

  $('av-add').addEventListener('click', () => {
    let ok = true;
    if (!avRecord.value) { setMsg(avRecord.field, 'Select a record.'); ok = false; }
    if (!avType.value)   { setMsg(avType, 'Select a visit type.'); ok = false; }
    const durMsg = durationProblem(avDur);
    if (durMsg) { setMsg(avDur, durMsg); ok = false; }
    if (!ok) return;

    /* No time is asked for: the visit joins the end of the day, starting
       a travel allowance after the last visit ends (or when the day's
       first visit would, on an empty day) */
    const day = DAYS[addingTo];
    const time = timeRange(nextFreeStart(day), Number(avDur.value));

    day.visits.push({
      name: avRecord.value,
      module: avRecord.module || 'Contacts',
      type: avType.value,
      address: RECORD_ADDRESS[avRecord.value] || '',
      time,
      drive: '',
      comments: avDesc.value.trim(),
      status: 'pending',
    });
    /* Keep the day in the order it will actually be worked */
    day.visits.sort((a, b) => {
      const at = a.time.match(/^\d/) ? clockToMinutes(a.time) : Infinity;
      const bt = b.time.match(/^\d/) ? clockToMinutes(b.time) : Infinity;
      return at - bt;
    });

    closeAddVisit();
    render();
    toast(`${avRecord.value} added to ${day.label}.`);
  });

  /* ── Route map ─────────────────────────────────────── */
  const BEAT_HOME   = { x: 250, y: 590 };
  const BEAT_OFFICE = { x: 700, y: 560 };

  /* Everything that makes a plain FieldMap draw *this beat*. Factored out
     because there are two of them now — the one in the card and the one in
     the full-map sheet — and they must draw the day identically. */
  function configureBeatMap(fieldMap) {
  fieldMap._beatDays      = DAYS.map(d => ({ visits: d.pins }));
  fieldMap._beatHome      = BEAT_HOME;
  fieldMap._beatOffice    = BEAT_OFFICE;
  fieldMap._activeBeatDay = 0;

  /* The canvas's backing store has to match its box, and the box changes
     for reasons no single event reports: switching layout, the card
     opening, the window or the embedding pane being dragged. Checking it
     as part of drawing keeps the two in step wherever the change came
     from, and costs two offset reads on a frame that was going to lay the
     map out anyway. */
  fieldMap.fit = function () {
    /* clientWidth, not offsetWidth: the sheet's map box carries a 1px
       border, and the canvas fills the content box inside it — measuring
       the border box made the backing store 2px bigger than the element
       and the whole map drew very slightly stretched. */
    const w = this.area.clientWidth, h = this.area.clientHeight;
    if (!w || !h || (this.canvas.width === w && this.canvas.height === h)) return false;
    this.canvas.width = w;
    this.canvas.height = h;
    this.scale = 0.65;
    this.panX = w / 2 - 450 * this.scale;
    this.panY = h / 2 - 390 * this.scale;
    return true;
  };

  fieldMap.draw = function () {
    this.fit();
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);
    this._drawBackground(); this._drawBlocks(); this._drawWater(); this._drawRoads();
    this._drawBeatRoutes(); this._drawBeatPins();
    ctx.restore();
  };

  fieldMap._drawBeatRoutes = function () {
    const { ctx } = this;
    this._beatDays.forEach((day, i) => {
      const active = i === this._activeBeatDay;
      const pts = [this._beatHome, ...day.visits, this._beatOffice];
      ctx.save();
      ctx.strokeStyle = active ? '#6c63ff' : '#c0c7d4';
      ctx.lineWidth   = (active ? 2.5 : 1.5) / this.scale;
      ctx.globalAlpha = active ? 1 : 0.65;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (!active) ctx.setLineDash([5 / this.scale, 4 / this.scale]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();
    });
  };

  /* A stop the rep has settled goes green on the map too, so the day's
     progress reads the same on both sides of the screen */
  fieldMap._drawBeatPins = function () {
    const { ctx } = this;
    const ACTIVE = '#6c63ff', GREY = '#9ca3af', DONE = '#12aa67', MISSED = '#ef4444';
    const r = 11 / this.scale;
    this._beatDays.forEach((day, i) => {
      const active = i === this._activeBeatDay;
      ctx.save();
      ctx.globalAlpha = active ? 1 : 0.5;
      day.visits.forEach((p, vi) => {
        const state = DAYS[i].visits[vi] ? DAYS[i].visits[vi].status : 'pending';
        const col = state === 'done' ? DONE : state === 'missed' ? MISSED
          : state === 'cancelled' ? GREY : active ? ACTIVE : GREY;
        const filled = state === 'cancelled' ? false
          : active || (state !== 'pending' && state !== 'active');
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = filled ? col : '#ffffff'; ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.5 / this.scale; ctx.stroke();
        ctx.fillStyle = filled ? '#ffffff' : col;
        ctx.font = `600 ${10 / this.scale}px system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(vi + 1, p.x, p.y);
        /* A ring round the stop picked in the list or on the map */
        if (focused && focused.day === i && focused.visit === vi) {
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 5 / this.scale, 0, Math.PI * 2);
          ctx.strokeStyle = ACTIVE; ctx.lineWidth = 2 / this.scale; ctx.stroke();
        }
      });
      ctx.restore();
    });
    this._drawSinglePin(this._beatHome.x,   this._beatHome.y,   '#10b981', 0, false);
    this._drawSinglePin(this._beatOffice.x, this._beatOffice.y, '#ef4444', 0, false);
  };

  fieldMap.resize = function () { this.fit(); this.draw(); };
  return fieldMap;
  }

  /* ── Picking a day off the map ──────────────────────── */
  /* The days a rep is not on are drawn dashed and grey behind the one they
     are. Clicking one of those routes moves the whole view onto that day —
     the timeline, the card's map and the sheet's, because all three draw
     from selectedDay. */
  function distToSegment(px, py, a, b) {
    const vx = b.x - a.x, vy = b.y - a.y;
    const len = vx * vx + vy * vy;
    let t = len ? ((px - a.x) * vx + (py - a.y) * vy) / len : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a.x + t * vx), py - (a.y + t * vy));
  }

  /* Which day a point landed on, or -1. Stops are tested before the lines
     between them, so a pin always wins over a route passing behind it. The
     tolerances are in screen pixels, hence the division by scale. */
  function dayAt(map, mx, my) {
    const [wx, wy] = map.screenToWorld(mx, my);
    let hit = -1, best = Infinity;

    const pinTol = 15 / map.scale;
    DAYS.forEach((day, i) => day.pins.forEach(p => {
      const d = Math.hypot(p.x - wx, p.y - wy);
      if (d <= pinTol && d < best) { best = d; hit = i; }
    }));
    if (hit !== -1) return hit;

    const lineTol = 10 / map.scale;
    DAYS.forEach((day, i) => {
      const pts = [BEAT_HOME, ...day.pins, BEAT_OFFICE];
      for (let k = 1; k < pts.length; k++) {
        const d = distToSegment(wx, wy, pts[k - 1], pts[k]);
        if (d <= lineTol && d < best) { best = d; hit = i; }
      }
    });
    return hit;
  }

  /* The stop under a point, or null — the pin test of dayAt() on its own */
  function visitAt(map, mx, my) {
    const [wx, wy] = map.screenToWorld(mx, my);
    const tol = 15 / map.scale;
    let hit = null, best = Infinity;
    DAYS.forEach((day, d) => day.pins.forEach((p, v) => {
      const dist = Math.hypot(p.x - wx, p.y - wy);
      if (dist <= tol && dist < best && day.visits[v]) { best = dist; hit = { day: d, visit: v }; }
    }));
    return hit;
  }

  /* Home and Office markers stand on their point: 28 wide, about 41 tall.
     A hit anywhere on the marker counts, for the day on the map. */
  const MARKER_H = 41;
  function placeAt(map, mx, my) {
    for (const [kind, pt] of [['home', BEAT_HOME], ['office', BEAT_OFFICE]]) {
      const [sx, sy] = map.worldToScreen(pt.x, pt.y);
      if (Math.abs(mx - sx) <= 14 && my <= sy + 4 && my >= sy - MARKER_H) {
        return { day: selectedDay, place: kind };
      }
    }
    return null;
  }

  /* A visit's pin wins over a marker it overlaps */
  const stopAt = (map, mx, my) => visitAt(map, mx, my) || placeAt(map, mx, my);

  const stopPoint = stop => stop.place
    ? (stop.place === 'home' ? BEAT_HOME : BEAT_OFFICE)
    : DAYS[stop.day].pins[stop.visit];

  const stopExists = stop => Boolean(stop && DAYS[stop.day] &&
    (stop.place || DAYS[stop.day].visits[stop.visit]));

  /* Glide the map onto one stop, zooming in if it is further out than
     this. A short ease rather than a jump, so the eye follows. */
  const FOCUS_SCALE = 1.6;
  function panToStop(stop) {
    const map = fieldMap, pin = stopPoint(stop);
    if (!pin) return;
    const from = { s: map.scale, x: map.panX, y: map.panY };
    const s1 = Math.max(map.scale, FOCUS_SCALE);
    const to = { s: s1, x: map.canvas.width / 2 - pin.x * s1, y: map.canvas.height / 2 - pin.y * s1 };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now(), DUR = reduce ? 0 : 350;
    cancelAnimationFrame(panToStop._raf);
    const step = now => {
      const t = DUR ? Math.min(1, (now - start) / DUR) : 1;
      const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;   /* ease-in-out */
      map.scale = from.s + (to.s - from.s) * k;
      map.panX = from.x + (to.x - from.x) * k;
      map.panY = from.y + (to.y - from.y) * k;
      map.draw();
      if (t < 1) panToStop._raf = requestAnimationFrame(step);
      else { map._clamp(); map.draw(); }
    };
    panToStop._raf = requestAnimationFrame(step);
  }

  /* Bring the focused row into the middle of the list, if it is not in view */
  function revealFocusedRow() {
    const row = daysEl.querySelector('.bd-focus');
    if (!row || !scroller) return;
    const box = scroller.getBoundingClientRect(), r = row.getBoundingClientRect();
    if (r.top >= box.top && r.bottom <= box.bottom) return;
    scroller.scrollTop += r.top - box.top - (box.height - r.height) / 2;
  }

  function bindDayPicking(map) {
    const at = e => {
      const r = map.canvas.getBoundingClientRect();
      return dayAt(map, e.clientX - r.left, e.clientY - r.top);
    };

    map.canvas.addEventListener('click', e => {
      if (map.didDrag) return;
      /* A stop: open its day in the list and point at its row */
      const r = map.canvas.getBoundingClientRect();
      const stop = stopAt(map, e.clientX - r.left, e.clientY - r.top);
      if (stop) {
        focused = stop;
        popPinned = true;
        selectedDay = stop.day;
        expanded = true;
        render();
        revealFocusedRow();
        placeVisitPop();
        return;
      }
      /* Anywhere else on the map puts a pinned card away */
      if (popPinned) { popPinned = false; placeVisitPop(); }
      const i = at(e);
      if (i === -1 || i === selectedDay) return;
      selectedDay = i;
      expanded = true;
      focused = null;
      render();
    });

    /* So the routes read as something you can click */
    map.canvas.addEventListener('mousemove', e => {
      if (map.isDragging) return;
      map.canvas.classList.toggle('bd-over-route', at(e) !== -1);
    });
    map.canvas.addEventListener('mouseleave', () => {
      map.canvas.classList.remove('bd-over-route');
    });
  }

  const fieldMap = configureBeatMap(new FieldMap('map-canvas', 'map-area'));
  window.bdMap = fieldMap;
  bindDayPicking(fieldMap);

  /* ── Visit card on the map ─────────────────────────── */
  /* Hovering a stop on the map shows its card; clicking a stop — on the
     map or in the list — pins the card there until a click lands outside
     it. The list itself never opens a card on hover. The card sits above
     its pin and follows it through every pan and zoom, because each
     redraw of the map places it again. */
  const VISIT_POP_DELAY = 250;
  const VISIT_POP_HIDE  = 150;
  const CRM_TAB = { Contacts: 'Contacts', Leads: 'Leads', Accounts: 'Accounts', Deals: 'Potentials' };

  const visitPop = document.createElement('div');
  visitPop.className = 'bd-vpop';
  visitPop.setAttribute('role', 'dialog');
  visitPop.setAttribute('aria-label', 'Visit details');
  visitPop.hidden = true;
  $('map-area').appendChild(visitPop);

  let popHover = null;        /* the stop under the pointer on the map */
  let popPinned = false;      /* the focused visit's card stays open */
  let popShown = null, popTimer = 0, popHideTimer = 0;

  /* One compact block, in the order a manager scans it: which stop and
     what for, then when, then where. The way into the record rides on
     the name's line, so the card needs no footer. */
  const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function visitPopHtml(d, v) {
    const day = DAYS[d], visit = day.visits[v];
    const when = visit.status === 'done' && visit.actual ? visit.actual : visit.time;
    const [dd, mon] = day.date.split(' ');
    const weekday = WEEKDAY[new Date(`${mon} ${dd}, 2026`).getDay()];
    const tag = tagFor(day, visit);
    const tab = CRM_TAB[visit.module] || 'Contacts';
    return `
      <div class="bd-vpop-head">
        <p class="bd-vpop-name">${escape(visit.name)}</p>
        <a class="bd-vpop-open" href="https://crm.zoho.com/crm/tab/${tab}" target="_blank" rel="noopener"
           aria-label="Open ${escape(visit.name)} in CRM">Open <i class="ti ti-external-link" aria-hidden="true"></i></a>
      </div>
      <p class="bd-vpop-sub">${escape(visit.type)}<span class="dot">•</span>${escape(visit.module)}${tag
        ? `<span class="dot">•</span><span class="bd-vpop-state ${tag.cls}">${tag.label}</span>` : ''}</p>
      <p class="bd-vpop-row"><i class="ti ti-clock" aria-hidden="true"></i>
        <span>${weekday}, ${mon} ${dd} · ${escape(when).replace(' to ', ' – ')}</span></p>
      <p class="bd-vpop-row bd-vpop-addr-row"><i class="ti ti-map-pin" aria-hidden="true"></i>
        <span class="bd-vpop-addr">${escape(visit.address || 'No address')}</span></p>`;
  }

  /* Home and Office: where the day starts or ends, and nothing more */
  function placePopHtml(kind) {
    const place = kind === 'home' ? HOME : OFFICE;
    return `
      <p class="bd-vpop-name">${escape(place.title)}</p>
      <p class="bd-vpop-row"><i class="ti ti-map-pin" aria-hidden="true"></i>
        <span class="bd-vpop-addr">${escape(place.addr)}</span></p>`;
  }

  /* Whatever the card should show now: the hovered stop, else the pinned one */
  function placeVisitPop() {
    const want = popHover || (popPinned && focused) || null;
    if (!stopExists(want)) { visitPop.hidden = true; popShown = null; return; }
    const key = `${want.day}:${want.place || want.visit}`;
    if (popShown !== key) {
      visitPop.innerHTML = want.place ? placePopHtml(want.place) : visitPopHtml(want.day, want.visit);
      visitPop.classList.toggle('bd-vpop-place', Boolean(want.place));
      popShown = key;
    }
    const pin = stopPoint(want);
    const [px, py] = fieldMap.worldToScreen(pin.x, pin.y);
    const W = fieldMap.canvas.width, H = fieldMap.canvas.height;
    /* A stop panned out of view takes its card with it */
    if (px < 0 || py < 0 || px > W || py > H) { visitPop.hidden = true; return; }
    visitPop.hidden = false;
    const w = visitPop.offsetWidth, h = visitPop.offsetHeight;
    /* A visit pin is a circle round its point; a marker stands above it */
    const topEdge = want.place ? py - MARKER_H - 8 : py - 18;
    const bottomEdge = want.place ? py + 10 : py + 18;
    const above = topEdge - h >= 8;
    const left = Math.min(Math.max(8, px - w / 2), W - w - 8);
    visitPop.style.left = `${left}px`;
    visitPop.style.top = `${above ? topEdge - h : bottomEdge}px`;
    visitPop.classList.toggle('below', !above);
    visitPop.style.setProperty('--arrow-x', `${Math.max(14, Math.min(px - left, w - 14))}px`);
  }

  const baseDraw = fieldMap.draw;
  fieldMap.draw = function () { baseDraw.call(this); placeVisitPop(); };

  fieldMap.canvas.addEventListener('mousemove', e => {
    if (fieldMap.isDragging) return;
    const r = fieldMap.canvas.getBoundingClientRect();
    const stop = stopAt(fieldMap, e.clientX - r.left, e.clientY - r.top);
    const same = sameStop(stop, popHover);
    if (same) { clearTimeout(popHideTimer); return; }
    clearTimeout(popTimer);
    if (stop) {
      clearTimeout(popHideTimer);
      popTimer = setTimeout(() => { popHover = stop; placeVisitPop(); }, VISIT_POP_DELAY);
    } else if (popHover) {
      popHideTimer = setTimeout(() => { popHover = null; placeVisitPop(); }, VISIT_POP_HIDE);
    }
  });

  fieldMap.canvas.addEventListener('mouseleave', () => {
    clearTimeout(popTimer);
    popHideTimer = setTimeout(() => { popHover = null; placeVisitPop(); }, VISIT_POP_HIDE);
  });

  /* The pointer may cross into the card, to reach Open in CRM */
  visitPop.addEventListener('mouseenter', () => clearTimeout(popHideTimer));
  visitPop.addEventListener('mouseleave', () => {
    popHideTimer = setTimeout(() => { popHover = null; placeVisitPop(); }, VISIT_POP_HIDE);
  });

  /* A click anywhere but the card, a stop or a visit row puts it away */
  document.addEventListener('click', e => {
    if (!popPinned) return;
    if (e.target.closest('.bd-vpop, .bd-visit, .bd-place, #map-canvas')) return;
    popPinned = false;
    placeVisitPop();
  });

  fieldMap.resize();

  /* A resized window changes the map's box too */
  window.addEventListener('resize', () => fieldMap.resize());

  /* ── Layout toggle ─────────────────────────────────── */
  /* Only the arrangement changes; every behaviour above is shared. */
  const content = $('bd-content');
  const LAYOUT_KEY = 'bd-layout';

  function setLayout(type) {
    layout = type;
    content.classList.toggle('type-1', type === '1');
    /* Type 3 is Type 2's arrangement with the day's action moved, so it
       wears type-2 as well and inherits the whole layout rather than
       copying thirty selectors */
    content.classList.toggle('type-2', type === '2' || type === '3');
    content.classList.toggle('type-3', type === '3');
    document.querySelectorAll('.bd-layout-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.layout === type));
    /* Reaches the rail and the toolbar button, both outside .bp-content */
    document.body.classList.toggle('bd-in-list', type === '2' || type === '3');
    try { localStorage.setItem(LAYOUT_KEY, type); } catch { /* private mode */ }
    render();   /* the action moves between the toolbar and the day rows */
    /* Flush the new arrangement, then fit the canvas to it */
    void content.offsetWidth;
    fieldMap.resize();
    if (window.bdMarkRail) window.bdMarkRail();   /* the column's travel changed */
  }

  document.querySelector('.bd-layout').addEventListener('click', e => {
    const btn = e.target.closest('.bd-layout-btn');
    if (btn) setLayout(btn.dataset.layout);
  });

  /* The switch is hidden and the page is fixed on Type 3 — Type 2's
     layout with Start / End on the day row — so a layout remembered from
     before must not win: with no switch, it could not be undone. Unhide
     .bd-layout to compare the types again. */
  const FIXED_LAYOUT = '3';
  const switchShown = !document.querySelector('.bd-layout').hidden;
  let savedLayout = FIXED_LAYOUT;
  if (switchShown) {
    try { savedLayout = localStorage.getItem(LAYOUT_KEY) || FIXED_LAYOUT; } catch { /* private mode */ }
    if (!['1', '2', '3'].includes(savedLayout)) savedLayout = FIXED_LAYOUT;
  }
  setLayout(savedLayout);


  /* ── The related-list rail (Type 2) ────────────────── */
  /* The related lists carry no expand/collapse of their own — this rail is
     what moves between them. Closed on arrival; the toggle beside the tab
     pill opens it, and an item brings its card to the top of the column.
     The highlight follows the column as it scrolls, so the rail always says
     where the reader is. */
  const rail = $('bd-rlist');
  const railToggle = $('bd-rlist-toggle');
  const railItems = [...rail.querySelectorAll('.bd-rlist-item')];

  railToggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('bd-rlist-open');
    railToggle.setAttribute('aria-expanded', String(open));
    railToggle.setAttribute('aria-label', `${open ? 'Hide' : 'Show'} related list`);
    /* The column just changed width, and the map canvas with it. Reading a
       layout property flushes the new width, so the canvas can be fitted
       here and now rather than from a frame that may never be scheduled. */
    void content.offsetWidth;
    fieldMap.resize();
  });

  rail.addEventListener('click', e => {
    const item = e.target.closest('.bd-rlist-item');
    if (!item) return;
    const card = $(item.dataset.target);
    if (!card) return;
    /* Relative, not card.offsetTop: the cards' offsetParent is the page,
       not the scrolling column. Assigning scrollTop rather than asking for
       behavior: 'smooth' — the column carries scroll-behavior in CSS, which
       animates where it can and lands the jump where it cannot. */
    content.scrollTop += card.getBoundingClientRect().top - content.getBoundingClientRect().top;
    /* Light the item up from the click rather than waiting for the scroll
       it causes: the glide takes a moment, and the last card can only come
       part of the way up when the column runs out of travel */
    railItems.forEach(i => i.classList.toggle('active', i === item));
    pinned = item;
  });

  /* A clicked item stays lit through the scroll it causes, even when the
     column bottoms out before its card reaches the top. The reader's own
     scrolling hands the highlight back to markRail(). */
  let pinned = null;
  ['wheel', 'touchmove', 'keydown', 'mousedown'].forEach(type =>
    content.addEventListener(type, () => { pinned = null; }, { passive: true }));

  /* The last listed card whose top has passed the top of the column is
     the one being read — except at the very bottom, where the last card may
     never reach the top and is nonetheless what the reader is looking at.
     Above Notes the reader is on the Beat Detail View or summary, which the
     rail does not list, so nothing is marked. */
  function markRail() {
    if (pinned) return;
    /* Only meaningful when there is travel to be at the end of */
    const travel = content.scrollHeight - content.clientHeight;
    const atEnd = travel > 2 && content.scrollTop >= travel - 2;
    let current = atEnd ? railItems[railItems.length - 1] : null;
    if (!atEnd) {
      const edge = content.getBoundingClientRect().top + 8;
      railItems.forEach(item => {
        const card = $(item.dataset.target);
        if (card && card.getBoundingClientRect().top <= edge) current = item;
      });
    }
    railItems.forEach(item => item.classList.toggle('active', item === current));
  }

  /* ── Business card on a visit's name ───────────────── */
  /* Opens after a short rest on the name, so passing the pointer over the
     timeline does not flash cards; stays while the pointer moves from the
     name into the card, and closes shortly after it leaves both. */
  const SHOW_DELAY = 500;
  const HIDE_DELAY = 150;
  const card = document.createElement('div');
  card.className = 'bd-bcard';
  card.setAttribute('role', 'tooltip');
  card.hidden = true;
  document.body.appendChild(card);
  let showTimer = 0, hideTimer = 0, cardFor = null;

  function cardHtml(visit) {
    const info = CARDS[visit.name] || {};
    const fields = CARD_FIELDS[visit.module] || CARD_FIELDS.Contacts;
    const rows = fields.map(([label, key, isPhone]) => {
      const value = info[key];
      const shown = value ? escape(value) : '—';
      return `<dt>${label}</dt><dd><span class="bd-bcard-val" data-trunc>${shown}</span>${isPhone && value
        ? '<img src="src/phone-small.svg" alt="" aria-hidden="true" />' : ''}</dd>`;
    }).join('');
    return `
      <div class="bd-bcard-head">
        <span class="bd-bcard-avatar" aria-hidden="true">${escape(visit.name.charAt(0))}</span>
        <div class="bd-bcard-title">
          <p class="bd-bcard-name">${escape(visit.name)}</p>
          <p class="bd-bcard-sub">${escape(info.sub || visit.module)}</p>
        </div>
      </div>
      <dl class="bd-bcard-fields">${rows}</dl>`;
  }

  /* Below the name with the arrow under its first letters; above it when
     there is no room below, and never past the window's edges */
  function placeCard(nameEl) {
    const r = nameEl.getBoundingClientRect();
    const w = card.offsetWidth, h = card.offsetHeight;
    const below = r.bottom + 10 + h <= window.innerHeight - 8;
    const left = Math.min(Math.max(8, r.left - 20), window.innerWidth - w - 8);
    card.style.left = `${left}px`;
    card.style.top = `${below ? r.bottom + 10 : r.top - 10 - h}px`;
    card.classList.toggle('above', !below);
    card.style.setProperty('--arrow-x', `${Math.max(12, Math.min(r.left - left + 10, w - 32))}px`);
  }

  function hideCard() {
    clearTimeout(showTimer);
    hideTruncTip();   /* a value's tooltip goes with its card */
    card.hidden = true;
    cardFor = null;
  }

  /* The visit's name is a link to its record, opened in a new tab: hover
     shows only the link colour and underline (the business card is off),
     and a click confirms with a toast. Capture phase, so the click does
     not also select the visit on the map. */
  daysEl.addEventListener('click', e => {
    const nameEl = e.target.closest('.vname');
    if (!nameEl) return;
    e.preventDefault();
    e.stopPropagation();
    toast(`${nameEl.textContent} opened in a new tab.`);
  }, true);

  card.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  card.addEventListener('mouseleave', () => { hideTimer = setTimeout(hideCard, HIDE_DELAY); });
  content.addEventListener('scroll', hideCard, { passive: true });
  if (scroller) scroller.addEventListener('scroll', hideCard, { passive: true });
  window.addEventListener('resize', hideCard);

  /* ── Tooltip for cut-off text (Figma 6444:572054) ───── */
  /* Anything marked data-trunc that ends in an ellipsis shows its full text
     here on hover — the address, the visit type, a business-card value.
     Text that fits shows nothing. One tooltip serves the timeline and the
     card, and it sits above the card. */
  const truncTip = document.createElement('div');
  truncTip.className = 'bd-trunc-tip';
  truncTip.setAttribute('role', 'tooltip');
  truncTip.hidden = true;
  document.body.appendChild(truncTip);
  let truncTimer = 0;

  const hideTruncTip = () => { clearTimeout(truncTimer); truncTip.hidden = true; };

  /* Also carries a fixed message for anything marked data-tip — the reason
     a greyed-out Start cannot be used — which shows whether or not the
     text is cut off */
  function onTruncOver(e) {
    const el = e.target.closest('[data-trunc], [data-tip]');
    if (!el) return;
    if (!el.dataset.tip && el.scrollWidth <= el.clientWidth) return;
    clearTimeout(truncTimer);
    truncTimer = setTimeout(() => {
      truncTip.textContent = el.dataset.tip || el.textContent.trim();
      truncTip.hidden = false;
      const r = el.getBoundingClientRect();
      const w = truncTip.offsetWidth, h = truncTip.offsetHeight;
      const below = r.bottom + 6 + h <= window.innerHeight - 8;
      truncTip.style.left = `${Math.min(Math.max(8, r.left), window.innerWidth - w - 8)}px`;
      truncTip.style.top = `${below ? r.bottom + 6 : r.top - 6 - h}px`;
    }, 300);
  }

  function onTruncOut(e) {
    const el = e.target.closest('[data-trunc], [data-tip]');
    if (el && !el.contains(e.relatedTarget)) hideTruncTip();
  }

  [daysEl, card].forEach(root => {
    root.addEventListener('mouseover', onTruncOver);
    root.addEventListener('mouseout', onTruncOut);
  });
  /* A blocked Start explains itself to the keyboard too */
  daysEl.addEventListener('focusin', e => { if (e.target.matches('[data-tip]')) onTruncOver(e); });
  daysEl.addEventListener('focusout', e => { if (e.target.matches('[data-tip]')) hideTruncTip(); });
  content.addEventListener('scroll', hideTruncTip, { passive: true });
  if (scroller) scroller.addEventListener('scroll', hideTruncTip, { passive: true });

  /* ── Show Address ──────────────────────────────────── */
  /* The visits' address line can be folded away for a tighter list with the
     icon toggle beside the heading. Shown by default; the choice is remembered for
     this viewer. Home and Office keep theirs — they say where the day starts
     and ends. */
  const ADDR_KEY = 'bd-show-address';
  const addrLink = $('bd-addr-link');

  /* Which of the three Figma icon sets the toggle draws (src/address-icons.js),
     picked in the simulator and remembered for this viewer */
  const ICON_SET_KEY = 'bd-addr-icon-set';
  /* Set 2 (building with pin) unless the simulator picked another */
  let addrIconSet = '2';
  try { addrIconSet = localStorage.getItem(ICON_SET_KEY) || '2'; } catch { /* private mode */ }
  if (!ADDRESS_ICONS[addrIconSet]) addrIconSet = '2';
  function drawAddrIcon() {
    const shown = !daysEl.classList.contains('bd-hide-addr');
    addrLink.innerHTML = ADDRESS_ICONS[addrIconSet][shown ? 'shown' : 'hidden'];
  }
  const simAddrIcon = $('bd-sim-addr-icon');
  simAddrIcon.value = addrIconSet;
  simAddrIcon.addEventListener('change', () => {
    addrIconSet = simAddrIcon.value;
    try { localStorage.setItem(ICON_SET_KEY, addrIconSet); } catch { /* private mode */ }
    drawAddrIcon();
  });
  function setShowAddress(on) {
    addrLink.setAttribute('aria-pressed', String(on));    /* pressed = shown */
    addrLink.dataset.tip = on ? 'Hide address' : 'Show address';
    /* The icon shows the current state — the set's plain icon while
       addresses show, its struck-out pair once hidden; the tooltip names
       what a click will do */
    if (!truncTip.hidden) truncTip.textContent = addrLink.dataset.tip;
    daysEl.classList.toggle('bd-hide-addr', !on);
    drawAddrIcon();
    try { localStorage.setItem(ADDR_KEY, on ? '1' : '0'); } catch { /* private mode */ }
  }
  addrLink.addEventListener('click', () =>
    setShowAddress(daysEl.classList.contains('bd-hide-addr')));
  /* Icon only, so it names itself in the shared tooltip */
  addrLink.addEventListener('mouseover', onTruncOver);
  addrLink.addEventListener('mouseout', onTruncOut);
  addrLink.addEventListener('focus', onTruncOver);
  addrLink.addEventListener('blur', hideTruncTip);
  let addrSaved = '1';
  try { addrSaved = localStorage.getItem(ADDR_KEY) ?? '1'; } catch { /* private mode */ }
  setShowAddress(addrSaved !== '0');

  /* ── Reschedule · Transfer · Cancel (from the visit's ⋯ menu) ──── */
  /* Each dialog opens its fields in order — a field waits, greyed, until the
     one above it is answered — and confirms by changing the beat itself:
     a visit rescheduled within this beat moves day and time, one sent to
     another beat or rep leaves this one, and a cancelled one stays in its
     day marked Cancelled. Beats and reps are sample data. */
  const THIS_REP = 'Cameron Williamson';
  const MONTH_DAYS = { May: 31, Jun: 30 };
  const beat = (id, month, start, days) => ({ id, month, start, days });
  const beatLabel = b => `${b.id} • ${b.start} ${b.month} - ${dayOfBeat(b, b.days - 1).date}`;
  function dayOfBeat(b, i) {
    let day = b.start + i, month = b.month;
    if (day > MONTH_DAYS[month]) { day -= MONTH_DAYS[month]; month = 'Jun'; }
    return { label: `Day ${i + 1}`, date: `${day} ${month}` };
  }

  /* This rep's active beats — BP-003 is the one on screen */
  const OWN_BEATS = [beat('BP-003', 'May', 4, 3), beat('BP-005', 'May', 28, 4), beat('BP-008', 'Jun', 8, 3)];
  const REP_BEATS = {
    'Cody Fisher':    [beat('BP-005', 'May', 28, 4), beat('BP-011', 'Jun', 2, 3)],
    'Olivia Bennett': [beat('BP-006', 'May', 12, 5)],
    'Ethan Brooks':   [beat('BP-009', 'May', 19, 3), beat('BP-012', 'Jun', 9, 2)],
  };
  const VISIT_TYPES = ['Order Delivery', 'Gate Approval', 'Shop Delivery', 'Order Approval',
                       'Stock Check', 'Relationship Check-in'];

  const fill = (sel, options, placeholder, value = '') => {
    sel.innerHTML = `<option value="" ${value ? '' : 'selected'} disabled>${placeholder}</option>` +
      options.map(([val, text]) => `<option value="${escape(val)}"${String(val) === String(value) ? ' selected' : ''}>${escape(text)}</option>`).join('');
  };
  /* Selects and time pickers both: a picker locks blank and opens filled */
  const lock = sel => {
    if (sel.setDisabled) { sel.setDisabled(true); sel.clear(); setMsg(sel.input, ''); return; }
    sel.innerHTML = '<option value="" selected disabled></option>'; sel.disabled = true; setMsg(sel, '');
  };
  const unlock = sel => { if (sel.setDisabled) sel.setDisabled(false); else sel.disabled = false; };

  let vaTarget = null;   /* { d, v } the dialog acts on */
  const vaVisit = () => DAYS[vaTarget.d].visits[vaTarget.v];

  const VA_OVERLAYS = ['va-resched-overlay', 'va-reassign-overlay', 'va-cancel-overlay',
                       'va-revise-overlay', 'va-edit-overlay'];
  function openOverlay(id) { $(id).hidden = false; }
  function closeOverlays() {
    VA_OVERLAYS.forEach(id => { $(id).hidden = true; });
    vaTarget = null;
  }
  document.querySelectorAll('[data-va-close]').forEach(b => b.addEventListener('click', closeOverlays));
  VA_OVERLAYS.forEach(id =>
    $(id).addEventListener('click', e => { if (e.target.id === id) closeOverlays(); }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && vaTarget) closeOverlays();
  });

  /* Beat → its days; day → a start time, and the visit type (kept from the
     visit) where the dialog asks for one. Reschedule does not — the visit
     keeps its type. */
  /* `timeSel` is a time picker: locked blank until a day is chosen, then
     it opens on the visit's own start time */
  function wireChain(beatSel, dateSel, typeSel, timeSel, beatsFor) {
    beatSel.addEventListener('change', () => {
      setMsg(beatSel, '');
      const b = beatsFor().find(x => x.id === beatSel.value);
      fill(dateSel, Array.from({ length: b.days }, (_, i) => {
        const day = dayOfBeat(b, i);
        return [i, `${day.label}  •  ${day.date}`];
      }), 'Select Date');
      /* On this beat, a day already closed cannot take a visit */
      if (b.id === 'BP-003') {
        [...dateSel.options].slice(1).forEach((o, i) => { o.disabled = isClosed(DAYS[i]); });
      }
      unlock(dateSel);
      if (typeSel) lock(typeSel);
      lock(timeSel);
    });
    dateSel.addEventListener('change', () => {
      setMsg(dateSel, '');
      if (typeSel) fill(typeSel, VISIT_TYPES.map(t => [t, t]), 'Select Visit Type', vaVisit().type);
      /* The time picker opens on the visit's own start time, or 9:00 AM */
      const own = vaVisit().time.split(' to ')[0];
      timeSel.setValue(/^\d/.test(own) ? own : '9:00 AM');
      /* On this beat, the day's other visits keep their start times */
      timeSel.setDisabledTimes(beatSel.value === 'BP-003'
        ? takenStarts(Number(dateSel.value), vaVisit()) : []);
      setMsg(timeSel.input, '');
      if (typeSel) unlock(typeSel);
      unlock(timeSel);
    });
    if (typeSel) typeSel.addEventListener('change', () => setMsg(typeSel, ''));
  }

  const need = (el, text) => { if (el.value.trim()) return true; setMsg(el.input || el, text); return false; };
  const timeRange = (start, mins = VISIT_MINUTES) => `${start} to ${minutesToClock(clockToMinutes(start) + mins)}`;

  /* Take a visit, and its pin, out of its day */
  function liftVisit(d, v) {
    const day = DAYS[d];
    const [visit] = day.visits.splice(v, 1);
    const [pin] = v < day.pins.length ? day.pins.splice(v, 1) : [];
    return { visit, pin };
  }

  /* Put a visit into a day in time order. Every visit keeps a pin of its
     own, so the map's numbers stay in step with the list. */
  function placeVisit(dayIndex, visit, pin) {
    const day = DAYS[dayIndex];
    const last = day.pins[day.pins.length - 1] || BEAT_HOME;
    const pairs = day.visits.map((vv, i) => ({ v: vv, p: day.pins[i] || { x: last.x + 30, y: last.y + 20 } }));
    pairs.push({ v: visit, p: pin || { x: last.x + 40, y: last.y + 30 } });
    const at = x => (/^\d/.test(x.v.time) ? clockToMinutes(x.v.time) : Infinity);
    pairs.sort((a, b) => at(a) - at(b));
    day.visits.splice(0, day.visits.length, ...pairs.map(x => x.v));
    day.pins.splice(0, day.pins.length, ...pairs.map(x => x.p));
  }

  /* The visit in hand handing the day on, when it is the one taken away */
  function handOn(d, wasActive) {
    if (!wasActive) return;
    const next = DAYS[d].visits.find(x => x.status === 'pending');
    if (next) next.status = 'active';
  }

  function afterChange() {
    focused = null;
    popPinned = false;
    render();
  }

  /* Reschedule — one of this rep's beats, a day, then the visit's type and
     how long it runs. No time: the visit keeps its start time. The day it
     is on now cannot be picked again; it shows greyed out and says why. */
  const rs = { beat: $('va-resched-beat'),
               date: SelectMenu.create($('va-resched-date-host'), {
                 placeholder: 'Select Date', mandatory: true, fieldId: 'va-resched-date',
                 onChange: () => setMsg(rs.date.field, ''),
               }),
               type: $('va-resched-type'), dur: $('va-resched-dur'),
               reason: $('va-resched-reason') };
  const SAME_DAY_TIP = 'Same day can not be chosen for rescheduling.';
  rs.beat.addEventListener('change', () => {
    setMsg(rs.beat, '');
    const b = OWN_BEATS.find(x => x.id === rs.beat.value);
    rs.date.setOptions(Array.from({ length: b.days }, (_, i) => {
      const day = dayOfBeat(b, i);
      const here = b.id === 'BP-003';
      const same = here && i === vaTarget.d;
      const closed = here && !same && isClosed(DAYS[i]);
      return { value: i, label: `${day.label}  •  ${day.date}`, disabled: same || closed,
               tip: same ? SAME_DAY_TIP : closed ? 'This day is already closed.' : '' };
    }));
    rs.date.setDisabled(false);
    setMsg(rs.date.field, '');
  });
  rs.type.addEventListener('change', () => setMsg(rs.type, ''));
  wireDuration(rs.dur);
  rs.reason.addEventListener('input', () => setMsg(rs.reason, ''));

  function openReschedule(d, v) {
    vaTarget = { d, v };
    const visit = vaVisit();
    $('va-resched-title').textContent = 'Reschedule Visit';
    fill(rs.beat, OWN_BEATS.map(b => [b.id, beatLabel(b)]), 'Select Beat');
    setMsg(rs.beat, '');
    rs.date.setOptions([]);
    rs.date.setDisabled(true);
    setMsg(rs.date.field, '');
    /* Type and length start as the visit has them */
    fill(rs.type, VISIT_TYPES.map(t => [t, t]), 'Select Visit Type', visit.type);
    setMsg(rs.type, '');
    rs.dur.value = String(spanMinutes(visit.time)); setMsg(rs.dur, '');
    rs.reason.value = ''; setMsg(rs.reason, '');
    openOverlay('va-resched-overlay');
    rs.beat.focus();
  }

  $('va-resched-go').addEventListener('click', () => {
    const ok = [need(rs.beat, 'Select a beat.'),
                need({ value: rs.date.value, input: rs.date.field }, 'Select a date.'),
                need(rs.type, 'Select a visit type.'), need(rs.reason, 'Enter a reason.')].every(Boolean);
    const durMsg = durationProblem(rs.dur);
    if (durMsg) setMsg(rs.dur, durMsg);
    if (!ok || durMsg) return;
    const { d, v } = vaTarget;
    const b = OWN_BEATS.find(x => x.id === rs.beat.value);
    const dayIdx = Number(rs.date.value), target = dayOfBeat(b, dayIdx);
    const wasActive = vaVisit().status === 'active';
    const { visit, pin } = liftVisit(d, v);
    /* Same start time; the new type and length */
    const start = visit.time.split(' to ')[0];
    Object.assign(visit, { time: /^\d/.test(start) ? timeRange(start, Number(rs.dur.value)) : visit.time,
                           type: rs.type.value, status: 'pending',
                           rescheduleReason: rs.reason.value.trim() });
    delete visit.actual;
    handOn(d, wasActive);
    if (b.id === 'BP-003') {
      placeVisit(dayIdx, visit, pin);
      toast(`Visit rescheduled to ${target.label} • ${target.date}.`);
    } else {
      toast(`${visit.name} rescheduled to ${b.id} • ${target.label} • ${target.date}.`);
    }
    closeOverlays();
    afterChange();
  });

  /* Transfer — another rep, one of their beats, a day, a type and a time */
  const ra = { rep: $('va-reassign-rep'), beat: $('va-reassign-beat'), date: $('va-reassign-date'),
               type: $('va-reassign-type'),
               time: TimePicker.create($('va-reassign-time-host'), {
                 inputId: 'va-reassign-time', value: '', disabled: true,
                 onChange: () => setMsg(ra.time.input, ''),
               }),
               reason: $('va-reassign-reason') };
  wireChain(ra.beat, ra.date, ra.type, ra.time, () => REP_BEATS[ra.rep.value] || []);
  const raDur = $('va-reassign-dur');
  wireDuration(raDur);
  ra.rep.addEventListener('change', () => {
    setMsg(ra.rep, '');
    fill(ra.beat, REP_BEATS[ra.rep.value].map(b => [b.id, beatLabel(b)]), 'Select Beat');
    unlock(ra.beat);
    [ra.date, ra.type, ra.time].forEach(lock);
  });

  function openReassign(d, v) {
    vaTarget = { d, v };
    $('va-reassign-title').textContent = 'Transfer Visit';
    fill(ra.rep, Object.keys(REP_BEATS).filter(r => r !== THIS_REP).map(r => [r, r]), 'Select Rep');
    setMsg(ra.rep, '');
    [ra.beat, ra.date, ra.type, ra.time].forEach(lock);
    ra.beat.innerHTML = '<option value="" selected disabled>Select Beat</option>';
    ra.reason.value = '';
    raDur.value = String(spanMinutes(vaVisit().time)); setMsg(raDur, '');
    openOverlay('va-reassign-overlay');
    ra.rep.focus();
  }

  $('va-reassign-go').addEventListener('click', () => {
    const ok = [need(ra.rep, 'Select a rep.'), need(ra.beat, 'Select a beat.'), need(ra.date, 'Select a date.'),
                need(ra.time, 'Select a time.')].every(Boolean);
    const durMsg = durationProblem(raDur);
    if (durMsg) setMsg(raDur, durMsg);
    if (!ok || durMsg) return;
    const { d, v } = vaTarget;
    const b = REP_BEATS[ra.rep.value].find(x => x.id === ra.beat.value);
    const target = dayOfBeat(b, Number(ra.date.value));
    const wasActive = vaVisit().status === 'active';
    const { visit } = liftVisit(d, v);
    handOn(d, wasActive);
    toast(`${visit.name} transferred to ${ra.rep.value} — ${b.id} • ${target.label} • ${target.date}.`);
    closeOverlays();
    afterChange();
  });

  /* Cancel — a reason, then the visit stays in its day marked Cancelled */
  const cancelReason = $('va-cancel-reason');
  cancelReason.addEventListener('input', () => setMsg(cancelReason, ''));

  function openCancel(d, v) {
    vaTarget = { d, v };
    $('va-cancel-title').textContent = `Cancel “${vaVisit().name}”`;
    cancelReason.value = ''; setMsg(cancelReason, '');
    openOverlay('va-cancel-overlay');
    cancelReason.focus();
  }

  $('va-cancel-go').addEventListener('click', () => {
    if (!need(cancelReason, 'Enter a reason.')) return;
    const { d } = vaTarget;
    const visit = vaVisit();
    const wasActive = visit.status === 'active';
    visit.status = 'cancelled';
    visit.cancelReason = cancelReason.value.trim();
    handOn(d, wasActive);
    toast(`${visit.name} cancelled.`);
    closeOverlays();
    afterChange();
  });

  /* Revise — a missed visit that did happen, logged with when it really
     ran. It then counts as completed, at those times. */
  const rv = { record: $('va-revise-record'), type: $('va-revise-type'),
               in: $('va-revise-in'), out: $('va-revise-out'), comments: $('va-revise-comments') };
  /* Five-minute steps across the working day */
  const CHECK_TIMES = (() => {
    const out = [];
    for (let m = 8 * 60; m <= 20 * 60; m += 5) out.push(minutesToClock(m));
    return out;
  })();
  [rv.in, rv.out].forEach(sel => sel.addEventListener('change', () => { setMsg(rv.in, ''); setMsg(rv.out, ''); }));

  function openRevise(d, v) {
    vaTarget = { d, v };
    const visit = vaVisit();
    const record = `${visit.name} • ${visit.module || 'Contacts'}`;
    fill(rv.record, [[record, record]], '', record);
    fill(rv.type, [[visit.type, visit.type]], '', visit.type);
    [rv.in, rv.out].forEach(sel => { fill(sel, CHECK_TIMES.map(t => [t, t]), 'Select Time'); setMsg(sel, ''); });
    rv.comments.value = visit.comments || '';
    openOverlay('va-revise-overlay');
    rv.in.focus();
  }

  $('va-revise-go').addEventListener('click', () => {
    const okIn = need(rv.in, 'Select the check-in time.');
    const okOut = need(rv.out, 'Select the check-out time.');
    if (!okIn || !okOut) return;
    if (clockToMinutes(rv.out.value) <= clockToMinutes(rv.in.value)) {
      setMsg(rv.out, 'Check-out must be after check-in.');
      return;
    }
    const visit = vaVisit();
    Object.assign(visit, { status: 'done', actual: `${rv.in.value} to ${rv.out.value}`,
                           comments: rv.comments.value.trim(), revised: true });
    toast(`${visit.name} revised as completed.`);
    closeOverlays();
    afterChange();
  });

  /* Edit — a visit not yet started can change its type and how long it
     runs; once it has run (or its chance has passed), only the comments
     stay open. No time: changing the duration re-plans the rest of the
     day around it, and the dialog says so before it is saved. */
  const ed = { type: $('va-edit-type'), dur: $('va-edit-dur'),
               comments: $('va-edit-comments'), note: $('va-edit-note') };
  let edMinutes = 0;   // the visit's length when the dialog opened
  wireDuration(ed.dur);
  ed.dur.addEventListener('input', () => {
    /* Emptied counts as changed, so the info stays; the error waits for
       Save */
    const empty = ed.dur.value === '';
    const changed = !ed.dur.disabled && (empty || Number(ed.dur.value) !== edMinutes);
    const day = DAYS[vaTarget.d];
    ed.note.textContent = `Beat plan for the day ${day.label} - ${day.date} will be reoptimized based on updated duration.`;
    ed.note.hidden = !changed;
  });

  function openEdit(d, v) {
    vaTarget = { d, v };
    const visit = vaVisit();
    const open = visit.status === 'pending';
    $('va-edit-title').textContent = `Edit “${visit.name}”`;
    fill(ed.type, VISIT_TYPES.map(t => [t, t]), 'Select Visit Type', visit.type);
    /* Its planned length, or how long it really ran once done */
    const when = visit.status === 'done' && visit.actual ? visit.actual : visit.time;
    edMinutes = spanMinutes(open ? visit.time : when);
    ed.dur.value = String(edMinutes);
    setMsg(ed.dur, '');
    ed.note.hidden = true;
    ed.type.disabled = ed.dur.disabled = !open;
    ed.comments.value = visit.comments || '';
    openOverlay('va-edit-overlay');
    (open ? ed.type : ed.comments).focus();
  }

  /* Re-plan a day after one visit's length changes: the visits still to
     come after it move by the difference, keeping their own lengths, so
     nothing overlaps and no gap opens up */
  function reoptimizeDay(d, visit, delta) {
    if (!delta) return;
    const day = DAYS[d];
    const from = day.visits.indexOf(visit);
    day.visits.slice(from + 1).forEach(x => {
      const [a, b] = x.time.split(' to ');
      if (x.status !== 'pending' || !b || !/^\d/.test(a)) return;
      x.time = timeRange(minutesToClock(clockToMinutes(a) + delta), spanMinutes(x.time));
    });
  }

  $('va-edit-go').addEventListener('click', () => {
    const { d } = vaTarget;
    const visit = vaVisit();
    if (visit.status === 'pending') {
      const durMsg = durationProblem(ed.dur);
      if (durMsg) { setMsg(ed.dur, durMsg); return; }
    }
    visit.comments = ed.comments.value.trim();
    let replanned = false;
    if (visit.status === 'pending') {
      visit.type = ed.type.value;
      const mins = Number(ed.dur.value);
      const start = visit.time.split(' to ')[0];
      if (mins !== edMinutes && /^\d/.test(start)) {
        visit.time = timeRange(start, mins);
        reoptimizeDay(d, visit, mins - edMinutes);
        replanned = true;
      }
    }
    const day = DAYS[d];
    toast(replanned ? `${visit.name} updated. ${day.label} - ${day.date} re-planned.` : `${visit.name} updated.`);
    closeOverlays();
    afterChange();
  });

  const VISIT_ACTION_OPEN = { reschedule: openReschedule, reassign: openReassign, cancel: openCancel,
                              revise: openRevise, edit: openEdit };

  /* ── Optimize Beat ─────────────────────────────────── */
  /* In the product this re-orders the visits for the shortest route. With
     no routing behind the prototype's map, it confirms and leaves the order
     as it is. */
  $('bd-optimize').addEventListener('click', () => toast('Route optimized for BP - 003.'));

  /* ── Beat ⋯ menu ───────────────────────────────────── */
  const beatMore = $('bd-more'), beatMenu = $('bd-beat-menu');
  const beatItems = [...beatMenu.querySelectorAll('.bd-vmenu-item')];
  function setBeatMenu(open, focusFirst) {
    beatMenu.hidden = !open;
    beatMore.setAttribute('aria-expanded', String(open));
    if (open && focusFirst) beatItems[0].focus();
  }
  beatMore.addEventListener('click', e => {
    e.stopPropagation();
    setBeatMenu(beatMenu.hidden, e.detail === 0);
  });
  beatMenu.addEventListener('click', e => {
    const item = e.target.closest('.bd-vmenu-item');
    if (!item) return;
    setBeatMenu(false);
    if (item.textContent === 'Cancel Beat') { openCancelBeat(); return; }
    toast(`${item.textContent} is not part of this prototype yet.`);
  });
  beatMenu.addEventListener('keydown', e => {
    const at = beatItems.indexOf(document.activeElement);
    if (e.key === 'Escape') { setBeatMenu(false); beatMore.focus(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      beatItems[(at + step + beatItems.length) % beatItems.length].focus();
    }
  });
  document.addEventListener('click', e => {
    if (!beatMenu.hidden && !e.target.closest('.bd-beat-menu-wrap')) setBeatMenu(false);
  });

  /* ── Cancel Beat ───────────────────────────────────── */
  /* Everything not yet done is called off: open visits are cancelled, a
     running day closes where it stands, and days still ahead are cancelled
     whole. Completed visits, and days already closed, stay as they are. */
  const cancelBeatOverlay = $('bd-cancel-beat-overlay');
  const closeCancelBeat = () => { cancelBeatOverlay.hidden = true; };

  const cancelBeatReason = $('bd-cancel-beat-reason');
  cancelBeatReason.addEventListener('input', () => setMsg(cancelBeatReason, ''));

  function openCancelBeat() {
    if (beatCancelled) { toast('BP-003 is already cancelled.'); return; }
    cancelBeatReason.value = ''; setMsg(cancelBeatReason, '');
    cancelBeatOverlay.hidden = false;
    cancelBeatReason.focus();
  }

  $('bd-cancel-beat-keep').addEventListener('click', closeCancelBeat);
  cancelBeatOverlay.addEventListener('click', e => { if (e.target === cancelBeatOverlay) closeCancelBeat(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !cancelBeatOverlay.hidden) closeCancelBeat();
  });

  $('bd-cancel-beat-go').addEventListener('click', () => {
    if (!cancelBeatReason.value.trim()) { setMsg(cancelBeatReason, 'Enter a reason.'); return; }
    beatCancelReason = cancelBeatReason.value.trim();
    DAYS.forEach(day => {
      if (day.status === 'done' || day.status === 'missed') return;
      day.visits.forEach(v => { if (v.status === 'pending' || v.status === 'active') v.status = 'cancelled'; });
      if (day.status === 'active') {
        day.status = 'done';
        day.endedAt = clock();
        day.endedMin = SIM.minutes;
      } else {
        day.status = 'cancelled';
      }
    });
    beatCancelled = true;
    beatCancelledAt = clock();
    closeCancelBeat();
    afterChange();
    toast('BP-003 cancelled.');
  });

  /* Record links in the related lists point nowhere in the prototype */
  content.addEventListener('click', e => {
    if (e.target.closest('.bd-rl-link')) e.preventDefault();
  });

  content.addEventListener('scroll', markRail);
  /* setLayout() is defined above this point and has to reach it */
  window.bdMarkRail = markRail;
  markRail();

  /* ── Map controls ──────────────────────────────────── */
  /* Zoom, back-to-the-day and terrain, riding on the card's own map. There
     is no separate full view: the map is large enough to work in where it
     stands, so the controls come to it. */
  const terrainBtn  = $('bd-terrain');
  const terrainMenu = $('bd-terrain-menu');

  /* The day the map answers for: the one running, else the one selected */
  const dayInView = () => (activeIndex() !== -1 ? activeIndex() : selectedDay);

  const dayPoints = i =>
    [BEAT_HOME, ...(DAYS[i] ? DAYS[i].pins : []), BEAT_OFFICE];

  /* The thumbnail previews whichever terrain is in use */
  function paintTerrain() {
    terrainBtn.style.background = FieldMap.TERRAINS[fieldMap.terrain].bg;
    terrainMenu.querySelectorAll('.bd-terrain-opt').forEach(opt =>
      opt.classList.toggle('active', opt.dataset.terrain === fieldMap.terrain));
  }
  paintTerrain();

  /* Zoom from the middle of the canvas, which is what the buttons imply */
  const ZOOM_STEP = 1.3;
  function zoomMap(factor) {
    fieldMap.zoom(factor, fieldMap.canvas.width / 2, fieldMap.canvas.height / 2);
  }
  $('bd-map-zoom-in').addEventListener('click', () => zoomMap(ZOOM_STEP));
  $('bd-map-zoom-out').addEventListener('click', () => zoomMap(1 / ZOOM_STEP));

  /* "Current location" is the day in hand for now — where the rep actually
     is is not something this prototype knows */
  $('bd-map-locate').addEventListener('click', () => {
    const day = dayInView();
    fieldMap._activeBeatDay = day;
    fieldMap.fitBounds(dayPoints(day));
  });

  terrainBtn.addEventListener('click', () => {
    const open = terrainMenu.hidden;
    terrainMenu.hidden = !open;
    terrainBtn.setAttribute('aria-expanded', String(open));
  });

  /* Anywhere else dismisses the terrain menu */
  document.addEventListener('click', e => {
    if (terrainMenu.hidden) return;
    if (e.target.closest('#bd-terrain, #bd-terrain-menu')) return;
    terrainMenu.hidden = true;
    terrainBtn.setAttribute('aria-expanded', 'false');
  });

  terrainMenu.addEventListener('click', e => {
    const opt = e.target.closest('.bd-terrain-opt');
    if (!opt) return;
    fieldMap.setTerrain(opt.dataset.terrain);
    paintTerrain();
    terrainMenu.hidden = true;
    terrainBtn.setAttribute('aria-expanded', 'false');
  });

  document.querySelectorAll('.bp-tabs .bp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.bp-tabs .bp-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  /* ── Simulate today (prototype only) ───────────────── */
  const simBtn = $('bd-sim-btn'), simPanel = $('bd-sim-panel');
  const simDate = $('bd-sim-date'), simTime = $('bd-sim-time');
  const simViewer = $('bd-sim-viewer'), simOther = $('bd-sim-other');

  /* The day before the beat, its three days, and the day after */
  for (let n = 3; n <= 7; n++) {
    const i = DAYS.findIndex((d, k) => dayNum(k) === n);
    simDate.add(new Option(`${dayName(n)}${i !== -1 ? ` — ${DAYS[i].label}` : n < 4 ? ' — before the beat' : ' — after the beat'}`, n));
  }
  for (let m = 7 * 60; m <= 22 * 60; m += 30) simTime.add(new Option(minutesToClock(m), m));

  function syncSim() {
    simDate.value = SIM.day;
    simTime.value = SIM.minutes;
    simViewer.value = SIM.viewer;
    simOther.checked = SIM.otherBeat;
    $('bd-sim-label').textContent = `Today: ${dayName(SIM.day)} · ${clock()}`;
  }

  /* Time only moves forward on a beat: stepping the clock back would
     un-happen what already closed, so going back asks for a reset */
  function setSim(patch) {
    const before = SIM.day * 1440 + SIM.minutes;
    /* A new date opens at the start of business hours */
    if (patch.day !== undefined && patch.day !== SIM.day) patch.minutes = BUSINESS.start;
    Object.assign(SIM, patch);
    const wentBack = SIM.day * 1440 + SIM.minutes < before;
    if (wentBack) resetBeat(false);
    applyClock();
    syncSim();
    hideTruncTip();
    render();
    if (wentBack) toast('Clock moved back — the beat was reset to not started.');
  }

  function resetBeat(announce = true) {
    DAYS.forEach(day => {
      day.status = 'pending';
      day.startedAt = day.endedAt = null;
      day.startedMin = day.endedMin = null;
      day.visits.forEach(v => { v.status = 'pending'; });
    });
    selectedDay = 0; expanded = true; focused = null;
    beatCancelled = false;
    if (announce) { applyClock(); render(); toast('Beat reset — every day is back to not started.'); }
  }

  simDate.addEventListener('change', () => setSim({ day: Number(simDate.value) }));
  simTime.addEventListener('change', () => setSim({ minutes: Number(simTime.value) }));
  simViewer.addEventListener('change', () => setSim({ viewer: simViewer.value }));
  simOther.addEventListener('change', () => setSim({ otherBeat: simOther.checked }));
  $('bd-sim-reset').addEventListener('click', () => resetBeat());

  simBtn.addEventListener('click', () => {
    const open = simPanel.hidden;
    simPanel.hidden = !open;
    simBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', e => {
    if (!simPanel.hidden && !e.target.closest('#bd-sim')) {
      simPanel.hidden = true;
      simBtn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !simPanel.hidden) { simPanel.hidden = true; simBtn.focus(); }
  });

  applyClock();
  syncSim();
  render();
});
