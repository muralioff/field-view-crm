/* ============================================================
   Notifications — the wizard's step 5
   Behaviour contract: beat-planner-specs/04-notifications.md

   An event × channel table. Mobile App is always on: ticked, and
   aria-disabled rather than disabled so keyboard users can still reach
   it and read why. Email toggles one row and is written to the wizard
   state, so the choice survives leaving the step.

   The Beat approval events can only fire for a Bottom Up planner that
   requires approval. Otherwise those rows stay in the table, disabled,
   under a note saying why (D2: the table does not jump when the model
   changes).

   Nothing here can be invalid. Finish validates every step in order and
   opens the first that fails (src/planner-wizard.js).
   ============================================================ */
(function () {
  const S = Planner.state;
  const { NOTIFICATION_EVENTS, escape } = Planner;
  const $ = id => document.getElementById(id);

  const approvalLive = S.model === 'bottom-up' && S.approval;

  const GROUPS = [
    { key: 'visit', label: 'Visit events' },
    { key: 'approval', label: 'Beat approval events' },
  ];

  if (!approvalLive) {
    const note = $('nt-approval-note');
    note.innerHTML = '<b>Note:</b> Beat approval events apply only to Bottom Up planners that require approval.';
    note.hidden = false;
  }

  function row(event) {
    const off = event.group === 'approval' && !approvalLive;
    const email = Boolean(S.notifications[event.name]);
    return `
      <tr class="${off ? 'is-off' : ''}">
        <th scope="row" class="nt-event">${escape(event.name)}</th>
        <td class="nt-recipient">${escape(event.recipient)}</td>
        <td class="nt-channel">
          <span class="nt-check pw-has-tip">
            <input type="checkbox" checked aria-disabled="true" data-locked
                   aria-label="Mobile App for ${escape(event.name)}" aria-describedby="nt-inapp-why" />
            <span class="pw-tip" aria-hidden="true">You can't disable the In-app notifications.</span>
          </span>
        </td>
        <td class="nt-channel">
          <span class="nt-check">
            <input type="checkbox" data-event="${escape(event.name)}" ${email ? 'checked' : ''}
                   ${off ? 'aria-disabled="true" data-locked' : ''}
                   aria-label="Email for ${escape(event.name)}" />
          </span>
        </td>
      </tr>`;
  }

  $('nt-rows').innerHTML = GROUPS.map(g => `
    <tr class="nt-group"><th colspan="4" scope="colgroup">${g.label}</th></tr>
    ${NOTIFICATION_EVENTS.filter(e => e.group === g.key).map(row).join('')}`).join('')
    + '<tr hidden><td><span id="nt-inapp-why">You can\'t disable the In-app notifications.</span></td></tr>';

  /* A locked box ignores clicks and Space but keeps its focus */
  $('nt-rows').addEventListener('click', e => {
    const box = e.target.closest('input[type="checkbox"]');
    if (!box) return;
    if (box.hasAttribute('data-locked')) { e.preventDefault(); return; }
    S.notifications[box.dataset.event] = box.checked;
    Planner.save();
  });

  Planner.initPage({ index: 4, validate: () => true });
})();
