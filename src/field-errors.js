/* ============================================================
   Field errors — shared by the Planner Configuration wizard steps
   Figma 4145:782695 (the tooltip), 4115:775129 (fields in error)

   Two presentations, both red-outlining the field:

   tooltip (default) — one shared tooltip carries the message, opening
     on the first invalid field and handing over to whichever invalid
     field the pointer reaches. Used where a row must not grow, e.g.
     the visit-types table.

   inline — an 11px message under the field (Figma 4968:800480). Used
     in dialogs, where there is room to grow and the message can sit
     with the field it belongs to. Needs the field inside a
     `.pc-field-cell`, which stacks the two.

   Usage:
     const errors = PCErrors.create({ scope, scroller, tip })
     const errors = PCErrors.create({ scope, inline: true })
     errors.set(field, 'Cannot be empty')
     errors.clear(field)
     errors.clearAll()
     errors.showFirst()           // after a failed validation
   ============================================================ */
window.PCErrors = (function () {

  function create({ scope, scroller, tip, inline = false }) {
    let tipField = null;

    /* ── inline: the message lives with the field ── */
    function setInline(field, message) {
      const cell = field.closest('.pc-field-cell');
      if (!cell) return;
      const msg = document.createElement('span');
      msg.className = 'pc-field-msg';
      msg.setAttribute('role', 'alert');
      msg.textContent = message;
      cell.appendChild(msg);
    }

    function clearInline(field) {
      const msg = field.closest('.pc-field-cell')?.querySelector('.pc-field-msg');
      if (msg) msg.remove();
    }

    function place() {
      if (!tipField) return;
      const r = tipField.getBoundingClientRect();
      /* Hide rather than float loose when the field scrolls out of view */
      const bounds = (scroller || document.documentElement).getBoundingClientRect();
      if (r.bottom < bounds.top || r.top > bounds.bottom) {
        tip.classList.remove('show');
        return;
      }
      tip.classList.add('show');
      tip.style.top = `${r.bottom + 6}px`;
      /* Left-align with the field, pulled in if it would leave the viewport */
      const left = Math.min(r.left, window.innerWidth - tip.offsetWidth - 12);
      tip.style.left = `${left}px`;
      /* Arrow points at the field even after that nudge */
      tip.style.setProperty('--tip-arrow', `${Math.max(10, r.left - left + 24)}px`);
    }

    function show(field) {
      if (!field || !field.dataset.error) return hide();
      tipField = field;
      tip.textContent = field.dataset.error;
      tip.classList.add('show');
      tip.setAttribute('aria-hidden', 'false');
      place();
    }

    function hide() {
      tipField = null;
      if (!tip) return;
      tip.classList.remove('show');
      tip.setAttribute('aria-hidden', 'true');
    }

    /* Always leave one tooltip up: fall back to the first field still invalid */
    function retarget() {
      if (inline) return;
      if (tipField && tipField.isConnected && tipField.dataset.error) return place();
      const next = scope.querySelector('.invalid');
      if (next) show(next); else hide();
    }

    function set(field, message) {
      clear(field);
      field.classList.add('invalid');
      field.setAttribute('aria-invalid', 'true');
      field.dataset.error = message;
      if (inline) setInline(field, message);
    }

    function clear(field) {
      field.classList.remove('invalid');
      field.removeAttribute('aria-invalid');
      delete field.dataset.error;
      if (inline) clearInline(field);
      if (tipField === field) tipField = null;
    }

    function clearAll() {
      scope.querySelectorAll('.invalid').forEach(clear);
      hide();
    }

    /* Walks the user to the first invalid field; false when there is one */
    function showFirst() {
      const first = scope.querySelector('.invalid');
      if (!first) { hide(); return true; }
      if (inline) first.focus(); else show(first);
      return false;
    }

    /* Hovering another invalid field hands the tooltip over to it */
    if (!inline) {
      scope.addEventListener('mouseover', e => {
        const field = e.target.closest('.invalid');
        if (field && field !== tipField) show(field);
      });
    }

    /* An error clears as soon as its field is edited */
    const onEdit = e => {
      const field = e.target;
      if (field.classList && field.classList.contains('invalid')) { clear(field); retarget(); }
    };
    scope.addEventListener('input', onEdit);
    scope.addEventListener('change', onEdit);

    if (!inline) {
      if (scroller) scroller.addEventListener('scroll', place);
      window.addEventListener('resize', place);
    }

    return { set, clear, clearAll, retarget, showFirst, hide, place };
  }

  return { create };
})();
