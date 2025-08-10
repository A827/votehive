// header.js — role-aware, mobile-first header for VoteHive
// Depends on Tailwind on the page, plus theme.js (toggleTheme), optional streak.js (renderStreakBadge)
// Uses window.VHAuth.current() -> { username, role } | null, window.VHAuth.logout()

(function () {
  const STATE = {
    getSession() {
      try {
        return window.VHAuth?.current?.() || null;
      } catch (e) { return null; }
    },
    roleOf(sess) {
      if (!sess) return 'guest';
      const r = (sess.role || 'user').toLowerCase();
      if (r === 'superadmin' || r === 'admin') return r;
      return 'user';
    }
  };

  function navLinks(role) {
    const common = [
      { href: 'browse.html', label: 'Browse' },
      { href: 'leaderboard.html', label: 'Leaderboard' },
      { href: 'feed.html', label: 'Feed' },
    ];

    if (role === 'guest') {
      return [
        ...common,
        { type: 'gap' },
        { href: 'login.html', label: 'Log In', btn: 'primary' }
      ];
    }

    const userOnly = [
      { href: 'rewards.html', label: 'Rewards' },
      { href: 'profile.html', label: 'Profile' },
      { href: 'create.html', label: 'Apply to Create', btn: 'primary' },
      { type: 'theme' },
      { type: 'logout' }
    ];

    const adminOnly = [
      { href: 'moderation.html', label: 'Moderation' },
    ];

    if (role === 'user') return [...common, ...userOnly];
    if (role === 'admin' || role === 'superadmin') return [...common, ...adminOnly, ...userOnly];
    return common;
  }

  function linkHtml(item, desktop) {
    if (item.type === 'gap') return desktop ? '<span class="mx-1"></span>' : '';
    if (item.type === 'theme') {
      return desktop
        ? `<button onclick="toggleTheme()" class="ml-1 border px-3 py-2 rounded text-indigo-700 border-indigo-200 dark:text-indigo-300 dark:border-indigo-800">Theme</button>`
        : `<button onclick="toggleTheme()" class="flex-1 text-center border px-3 py-3 rounded text-indigo-700 border-indigo-200 dark:text-indigo-300 dark:border-indigo-800">Theme</button>`;
    }
    if (item.type === 'logout') {
      return desktop
        ? `<button id="vh-logout" class="px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">Log Out</button>`
        : `<button id="vh-logout" class="px-3 py-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-left">Log Out</button>`;
    }

    const base = `href="${item.href}" class="${item.btn === 'primary'
      ? (desktop
        ? 'ml-1 bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700'
        : 'flex-1 text-center bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700')
      : (desktop
        ? 'px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800'
        : 'px-3 py-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800')}"`;

    return `<a ${base}>${item.label}</a>`;
  }

  function renderHeader() {
    const mount = document.getElementById('vh-header');
    if (!mount) return;

    const sess = STATE.getSession();
    const role = STATE.roleOf(sess);
    const desktopLinks = navLinks(role).map(i => linkHtml(i, true)).join('');
    const mobileLinks  = navLinks(role).map(i => linkHtml(i, false)).join('');

    mount.innerHTML = `
      <header class="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="index.html" class="flex items-center gap-3">
            <img src="/logo.svg" alt="VoteHive Logo" class="w-8 h-8">
            <span class="text-xl font-extrabold tracking-tight text-indigo-700 dark:text-indigo-300">VoteHive</span>
          </a>
          <nav class="hidden md:flex items-center gap-3 text-sm">
            ${desktopLinks}
          </nav>
          <div class="hidden md:flex items-center gap-2 text-xs" id="streakBadge"></div>
          <button id="vh-burger" aria-label="Open menu" class="md:hidden inline-flex items-center justify-center w-10 h-10 rounded border border-gray-200 dark:border-gray-800">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" class="text-gray-700 dark:text-gray-200">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div id="vh-mobileMenu" class="menu-enter md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div class="px-4 py-2 grid gap-1">
            ${mobileLinks}
          </div>
        </div>
      </header>
    `;

    const burger = document.getElementById('vh-burger');
    const menu   = document.getElementById('vh-mobileMenu');
    burger?.addEventListener('click', () => menu.classList.toggle('open'));

    try { window.renderStreakBadge?.(document.getElementById('streakBadge')); } catch(e){}

    const logoutBtn = document.getElementById('vh-logout');
    logoutBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      try { window.VHAuth?.logout?.(); } catch (err) {}
      renderHeader();
    });
  }

  // Initial render
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderHeader);
  } else {
    renderHeader();
  }

  // Refresh on tab focus or auth changes
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderHeader(); });
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.toLowerCase().includes('vhauth')) renderHeader();
  });

  window.VHHeader = { refresh: renderHeader };
})();