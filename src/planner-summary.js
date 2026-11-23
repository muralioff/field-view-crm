/* ============================================================
   Planner summary — where Finish lands
   A read-only account of what the five steps saved. Edit reopens the
   wizard on Notifications with every step navigable; each section's own
   Edit opens that step.
   ============================================================ */
(function () {
  const S = Planner.state;
  const E = S.engine;
  const F = S.fieldRules;
  const { escape, STEPS, NOTIFICATION_EVENTS } = Planner;
  const $ = id => document.getElementById(id);

  const yes = on => (on ? 'On' : 'Off');
  const plural = (n, one) => `${n} ${n === 1 ? one : one + 's'}`;
  const facts = pairs => `<dl class="ps-facts">${pairs
    .map(([k, v]) => `<div><dt>${escape(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

  function time12(wire) {
    const [h, m] = String(wire).split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }

  const topDown = S.model === 'top-down';
  const repTotal = Planner.repCount(E.reps);
  const approvalLive = S.model === 'bottom-up' && S.approval;
  const emails = NOTIFICATION_EVENTS
    .filter(ev => S.notifications[ev.name] && (ev.group === 'visit' || approvalLive))
    .map(ev => ev.name);

  const sections = [
    facts([
      ['Operating Model', topDown ? 'Top-Down' : 'Bottom-Up'],
      ...(topDown ? [] : [['Beat Approval', S.approval ? 'Required' : 'Not required']]),
      ['Modules', escape(S.modules.map(m => m.module).join(', ') || '—')],
    ]),
    facts([
      ['Visit Types', escape(S.visitTypes.map(v => `${v.name} (${v.duration} min)`).join(', ') || '—')],
    ]),
    facts([
      ['Max Visits per day', escape(E.visits)],
      ['Max days per Beat', escape(E.days)],
      ...(topDown ? [['Auto-create Beats', yes(E.auto)]] : []),
      ...(topDown && E.auto ? [
        ['Assign Auto-Created Beats To', plural(repTotal, 'user')],
        ['Run scheduler at', time12(E.time)],
        ['Visit Frequency', plural(E.freqRules.length, 'rule')],
        ['Assign Visits based on', E.conditional ? `CRM Assignment Rule (${plural(E.assignRules.length, 'rule')})` : 'Optimized Route'],
      ] : []),
    ]),
    facts([
      ['Max Distance per Day', `${escape(F.mileage)} ${escape(F.unit)}`],
      ['Buffer Between Visits', `${escape(F.buffer)} min`],
      ['Ad Hoc Visits', yes(F.adhoc)],
      ['Preferred Start and End Locations', yes(F.prefLocation)],
      ['Check-In and Check-Out Radius', `${escape(F.radius)} m`],
      ['Check-In Mode', escape(F.mode)],
      ['Check-Out Mode', 'Manual'],
      ['Beat Expense Tracking', yes(F.expense.on)],
      ...(F.expense.on ? [
        ['Fuel Expense', F.expense.fuel === 'automatic'
          ? `Recorded automatically, USD ${escape(F.expense.allowance)} per ${escape(F.unit)}` : 'Recorded manually'],
        ['Other Expenses', escape(F.expense.types
          .map(t => `${t.name}${t.receipt ? ' (receipt required)' : ''}`).join(', ') || 'None')],
        ['Expense Manager Approval', yes(F.expense.approval)],
      ] : []),
    ]),
    facts([
      ['Mobile App', 'Every event'],
      ['Email', escape(emails.join(', ') || 'None')],
    ]),
  ];

  $('ps-name').textContent = S.name || 'Untitled planner';
  $('ps-sub').textContent = S.saved ? 'Planner saved. Review what it does below.' : 'This planner has not been saved yet.';

  $('ps-sections').innerHTML = STEPS.map((step, i) => `
    <section class="ps-card" aria-labelledby="ps-s${i}">
      <div class="ps-card-head">
        <h3 class="pw-title" id="ps-s${i}">${step.label}</h3>
        <a class="ps-edit-link" href="${step.href}" aria-label="Edit ${step.label}">Edit</a>
      </div>
      ${sections[i]}
    </section>`).join('');

  /* Every step stays reachable from the stepper once the planner exists */
  S.furthest = STEPS.length - 1;
  Planner.save();

  $('ps-edit').addEventListener('click', () => Planner.go(STEPS.length - 1));
  Planner.showFlash();
})();
