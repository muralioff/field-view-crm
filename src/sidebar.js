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
  /* Content keys (src/strings.js) where the page loads them; the text
     here is the fallback for pages that do not */
  const T = (key, fallback) => (window.Strings ? Strings.t(key, null, fallback) : fallback);

  /* Items and icons from Figma 7454:81940 (src/nav-icons). Planner
     Configuration has moved to Settings, so it is no longer listed. */
  const TOP_ITEMS = [
    { key: 'home',      tkey: 'home',      label: 'Home',      icon: 'home',      href: 'home.html' },
    { key: 'reports',   tkey: 'reports',   label: 'Reports',   icon: 'reports',   href: '#' },
    { key: 'dashboard', tkey: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '#' },
    { key: 'agents',    tkey: 'agents',    label: 'Agents',    icon: 'agents',    href: '#' },
    { key: 'mcp',       tkey: 'mcp',       label: 'MCP',       icon: 'mcp',       href: '#' },
  ];

  const MODULE_ITEMS = [
    { key: 'beats',        tkey: 'beats',        label: 'Beats',         icon: 'beats',         href: 'beat-list.html' },
    { key: 'tracking',     tkey: 'liveTracking', label: 'Live Tracking', icon: 'live-tracking', href: '#' },
    { key: 'field-view',   tkey: 'fieldView',    label: 'Field View',    icon: 'field-view',    href: 'non-map.html' },
    { key: 'visits',       tkey: 'visits',       label: 'Beat Visits',   icon: 'beat-visits',   href: '#' },
    { key: 'expenses',     tkey: 'expenses',     label: 'Beat Expenses', icon: 'beat-expenses', href: '#' },
    { key: 'address-book', tkey: 'addressBook',  label: 'Address Book',  icon: 'address-book',  href: '#' },
  ];

  /* The CRM's own modules, grouped in a folder the way the CRM sidebar
     groups them: open by default, the choice remembered per viewer */
  const CRM_FOLDER = { key: 'crm-modules', label: 'CRM Modules' };
  const CRM_ITEMS = [
    { key: 'contacts',    tkey: 'contacts',     label: 'Contacts',      icon: 'contacts',      href: '#' },
    { key: 'deals',       tkey: 'deals',        label: 'Deals',         icon: 'deals',         href: '#' },
    { key: 'accounts',    tkey: 'accounts',     label: 'Accounts',      icon: 'accounts',      href: '#' },
    { key: 'orders',      tkey: 'salesOrders',  label: 'Sales Orders',  icon: 'sales-orders',  href: '#' },
  ];
  const FOLDER_KEY = 'sb-folder-crm-modules';

  function itemHtml(it, active) {
    const cls = 'sb-item' + (it.key === active ? ' active' : '');
    return `<a class="${cls}" data-key="${it.key}" href="${it.href}">
      <span class="sb-icon"><img src="src/nav-icons/${it.icon}.svg" alt="" aria-hidden="true" /></span><span>${T(`sidebar.item.${it.tkey}`, it.label)}</span>
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
        <div class="sb-logo-icon"><img src="src/nav-icons/logo.svg" alt="" aria-hidden="true" /></div>
        <span class="sb-logo-name">${T('sidebar.logo.name', 'Beat Planner')}</span>
        <img class="sb-logo-caret" src="src/nav-icons/logo-caret.svg" alt="" aria-hidden="true" />
        <button class="sb-collapse" aria-label="${T('sidebar.collapse.ariaLabel', 'Collapse sidebar')}">
          <img src="src/nav-icons/collapse.svg" alt="" aria-hidden="true" />
        </button>
      </div>` : '';
    root.innerHTML = `
      ${logoHtml}
      <ul class="sb-nav">
        ${shown(TOP_ITEMS).map(it => `<li>${itemHtml(it, active)}</li>`).join('')}
      </ul>

      <div class="sb-divider"></div>

      <div class="sb-section">
        <img class="sb-section-icon" src="src/nav-icons/modules.svg" alt="" aria-hidden="true" />
        <span class="sb-section-title">${T('sidebar.section.modules', 'Modules')}</span>
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
        <span class="sb-icon"><img src="src/nav-icons/folder.svg" alt="" aria-hidden="true" /></span><span>${T('sidebar.folder.crmModules', CRM_FOLDER.label)}</span>
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

  /* On a page with content keys, wait for them so the labels never flash */
  const start = () => (window.Strings ? Strings.ready.then(init) : init());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
