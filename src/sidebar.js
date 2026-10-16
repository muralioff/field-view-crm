/* ============================================================
   Left Navigation component
   Usage:
     <aside id="app-sidebar" class="app-sidebar" data-active="beats"></aside>
     <script src="src/sidebar.js"></script>
   The data-active value matches an item `key` below. data-hide takes a
   space-separated list of item keys to leave out on that page, e.g.
   data-hide="config".
   ============================================================ */
(function () {
  const TOP_ITEMS = [
    { key: 'home',   label: 'Home',                  icon: 'ti-home',     href: 'index.html' },
    { key: 'config', label: 'Planner Configuration', icon: 'ti-settings', href: 'planner-config.html' },
  ];

  const MODULE_ITEMS = [
    { key: 'beats',       label: 'Beats',         icon: 'ti-route',          href: 'bottom-up.html' },
    { key: 'tracking',    label: 'Live Tracking', icon: 'ti-navigation',     href: '#' },
    { key: 'field-view',  label: 'Field View',    icon: 'ti-map',            href: 'non-map.html' },
    { key: 'visits',      label: 'Visits',        icon: 'ti-briefcase',      href: '#' },
    { key: 'expenses',    label: 'Expenses',      icon: 'ti-receipt',        href: '#' },
    { key: 'contacts',    label: 'Contacts',      icon: 'ti-users',          href: '#' },
    { key: 'deals',       label: 'Deals',         icon: 'ti-topology-star',  href: '#' },
    { key: 'accounts',    label: 'Accounts',      icon: 'ti-building',       href: '#' },
    { key: 'orders',      label: 'Orders',        icon: 'ti-shopping-cart',  href: '#' },
  ];

  function itemHtml(it, active) {
    const cls = 'sb-item' + (it.key === active ? ' active' : '');
    return `<a class="${cls}" data-key="${it.key}" href="${it.href}">
      <i class="ti ${it.icon}" aria-hidden="true"></i><span>${it.label}</span>
    </a>`;
  }

  function render(root) {
    const active = root.getAttribute('data-active') || '';
    const showLogo = root.getAttribute('data-logo') !== 'false';
    const hidden = (root.getAttribute('data-hide') || '').split(/\s+/).filter(Boolean);
    const shown = items => items.filter(it => !hidden.includes(it.key));
    root.classList.add('app-sidebar');
    const logoHtml = showLogo ? `
      <div class="sb-logo">
        <div class="sb-logo-icon"><i class="ti ti-map-pin-2" aria-hidden="true"></i></div>
        <span class="sb-logo-name">Beat Planner</span>
        <i class="ti ti-chevron-down sb-logo-caret" aria-hidden="true"></i>
        <button class="sb-collapse" aria-label="Collapse sidebar">
          <i class="ti ti-layout-sidebar-left-collapse" aria-hidden="true"></i>
        </button>
      </div>` : '';
    root.innerHTML = `
      ${logoHtml}
      <ul class="sb-nav">
        ${shown(TOP_ITEMS).map(it => `<li>${itemHtml(it, active)}</li>`).join('')}
      </ul>

      <div class="sb-divider"></div>

      <div class="sb-section">
        <i class="ti ti-layout-grid sb-section-icon" aria-hidden="true"></i>
        <span class="sb-section-title">Modules</span>
        <i class="ti ti-dots sb-section-more" aria-hidden="true"></i>
      </div>

      <ul class="sb-nav">
        ${shown(MODULE_ITEMS).map(it => `<li>${itemHtml(it, active)}</li>`).join('')}
      </ul>
    `;
  }

  function init() {
    document.querySelectorAll('#app-sidebar, .app-sidebar[data-active]').forEach(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
