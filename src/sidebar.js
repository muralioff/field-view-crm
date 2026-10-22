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
  ];

  /* The CRM's own modules, grouped in a folder the way the CRM sidebar
     groups them: open by default, the choice remembered per viewer */
  const CRM_FOLDER = { key: 'crm-modules', label: 'CRM Modules' };
  const CRM_ITEMS = [
    { key: 'contacts',    label: 'Contacts',      icon: 'ti-users',          href: '#' },
    { key: 'deals',       label: 'Deals',         icon: 'ti-topology-star',  href: '#' },
    { key: 'accounts',    label: 'Accounts',      icon: 'ti-building',       href: '#' },
    { key: 'orders',      label: 'Sales Orders',  icon: 'ti-shopping-cart',  href: '#' },
  ];
  const FOLDER_KEY = 'sb-folder-crm-modules';

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
        ${folderHtml(shown(CRM_ITEMS), active)}
      </ul>
    `;

    const folder = root.querySelector('.sb-folder');
    if (folder) {
      folder.addEventListener('click', () => {
        const open = folder.getAttribute('aria-expanded') !== 'true';
        setFolder(root, open);
        try { localStorage.setItem(FOLDER_KEY, open ? '1' : '0'); } catch { /* private mode */ }
      });
    }
  }

  function folderOpen(items, active) {
    /* The page being shown is never hidden inside a closed folder */
    if (items.some(it => it.key === active)) return true;
    try { return localStorage.getItem(FOLDER_KEY) !== '0'; } catch { return true; }
  }

  function folderHtml(items, active) {
    if (!items.length) return '';
    const open = folderOpen(items, active);
    const id = `sb-${CRM_FOLDER.key}`;
    return `<li class="sb-folder-wrap">
      <button class="sb-item sb-folder" type="button" aria-expanded="${open}" aria-controls="${id}">
        <svg class="sb-folder-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 5.5A2.5 2.5 0 0 1 4.5 3h3.4c.6 0 1.2.24 1.65.66L10.9 5H15.5A2.5 2.5 0 0 1 18 7.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 2 14.5v-9Z"/></svg><span>${CRM_FOLDER.label}</span>
        <i class="ti ti-chevron-down sb-folder-caret" aria-hidden="true"></i>
      </button>
      <ul class="sb-sub" id="${id}"${open ? '' : ' hidden'}>
        ${items.map(it => `<li>${itemHtml(it, active)}</li>`).join('')}
      </ul>
    </li>`;
  }

  function setFolder(root, open) {
    const folder = root.querySelector('.sb-folder');
    folder.setAttribute('aria-expanded', String(open));
    root.querySelector('.sb-sub').hidden = !open;
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
