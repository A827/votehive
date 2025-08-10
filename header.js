/* VoteHive unified header (role-aware, consistent across pages)
   Requirements on each page:
   - Tailwind included
   - <div id="vh-header"></div>
   - scripts loaded in order: auth.js -> guard.js -> header.js
*/
(function () {
  const MOUNT_ID = 'vh-header';
  const EMIT_KEY = '__vh_emit__';

  // ------- helpers -------
  async function getSession() {
    try {
      if (window.VHAuth && typeof window.VHAuth.ready === 'function') {
        await window.VHAuth.ready();
      }
    } catch {}
    try {
      return (window.VHAuth && typeof window.VHAuth.current === 'function')
        ? window.VHAuth.current()
        : JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch { return null; }
  }

  // superadmins count as admins for nav visibility
  function isAdmin(user) { return !!(user && (user.role === 'admin' || user.role === 'superadmin')); }
  function isSuper(user) { return !!(user && user.role === 'superadmin'); }
  function safeInitial(name = 'U') { return (name && name[0] ? name[0] : 'U').toUpperCase(); }

  function currentPageKey() {
    // Normalize: treat "/" and "" as "index.html"; strip query/hash
    let file = location.pathname.split('/').pop() || '';
    if (!file) file = 'index.html';
    return file.toLowerCase();
  }

  function isActiveHref(href) {
    const here = currentPageKey();
    const key  = (href || '').toLowerCase();
    return key === here || (key === 'index.html' && (here === '' || here === 'index.html'));
  }

  function navLink(href, text, extraClasses = '') {
    const active = isActiveHref(href);
    const base = 'px-3 py-2 text-sm rounded hover:bg-white/10';
    const on   = 'bg-white/20';
    return `<a href="${href}" class="${base} ${active ? on : ''} ${extraClasses}" ${active ? 'aria-current="page"' : ''}>${text}</a>`;
  }

  function withNext(url) {
    // Preserve current location (path+query+hash) as ?next= for auth flows
    const next = encodeURIComponent(location.pathname + location.search + location.hash);
    const hasQ = url.includes('?');
    return `${url}${hasQ ? '&' : '?'}next=${next}`;
  }

  // ------- render -------
  async function render() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    const me = await getSession();

    mount.innerHTML = `
      <header class="bg-gradient-to-r from-indigo-700 to-purple-700 text-white">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="index.html" class="flex items-center gap-3">
            <img src="/logo.svg" alt="VoteHive" class="w-8 h-8">
            <span class="text-xl font-bold">VoteHive</span>
          </a>

          <nav class="hidden md:flex items-center gap-1">
            ${navLink('index.html', 'Home')}
            ${navLink('browse.html', 'Browse')}
            ${navLink('leaderboard.html', 'Leaderboard')}
            ${me ? navLink('applications.html', 'Applications') : ''}
            ${me ? navLink('my-polls.html', 'My Polls') : ''}
            ${me ? navLink('create.html', 'Apply to Create') : ''}
            ${isAdmin(me) ? navLink('moderation.html', 'Moderation') : ''}
            ${isSuper(me) ? navLink('users.html', 'Users') : ''}
          </nav>

          <div class="flex items-center gap-2">
            ${!me ? `
              <a id="vh-login"  href="login.html"  class="hidden md:inline-block bg-white text-purple-700 px-3 py-2 rounded text-sm hover:bg-gray-100">Log In</a>
              <a id="vh-signup" href="signup.html" class="hidden md:inline-block border border-white/80 px-3 py-2 rounded text-sm hover:bg-white hover:text-purple-700">Sign Up</a>
              <button id="vh-open-menu" class="md:hidden p-2 rounded hover:bg-white/10" aria-label="Open Menu" aria-expanded="false" aria-controls="vh-mobile">☰</button>
            ` : `
              <a href="profile.html?u=${encodeURIComponent(me.username)}" class="hidden md:flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10">
                <div class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-semibold">
                  ${safeInitial(me.username)}
                </div>
                <span class="text-sm">${me.username}</span>
              </a>
              <button id="vh-logout" class="hidden md:inline-block bg-white/10 hover:bg-white/20 px-3 py-2 rounded text-sm">Log Out</button>
              <button id="vh-open-menu" class="md:hidden p-2 rounded hover:bg-white/10" aria-label="Open Menu" aria-expanded="false" aria-controls="vh-mobile">☰</button>
            `}
          </div>
        </div>

        <!-- Mobile sheet -->
        <div id="vh-mobile" class="md:hidden hidden border-t border-white/10 bg-gradient-to-r from-indigo-700 to-purple-700">
          <div class="px-4 py-3 flex flex-col gap-2">
            ${navLink('index.html', 'Home', 'block')}
            ${navLink('browse.html', 'Browse', 'block')}
            ${navLink('leaderboard.html', 'Leaderboard', 'block')}
            ${me ? navLink('applications.html', 'Applications', 'block') : ''}
            ${me ? navLink('my-polls.html', 'My Polls', 'block') : ''}
            ${me ? navLink('create.html', 'Apply to Create', 'block') : ''}
            ${isAdmin(me) ? navLink('moderation.html', 'Moderation', 'block') : ''}
            ${isSuper(me) ? navLink('users.html', 'Users', 'block') : ''}
            ${!me ? `
              <a id="vh-login-m"  href="login.html"  class="block px-3 py-2 text-sm rounded bg-white text-purple-700">Log In</a>
              <a id="vh-signup-m" href="signup.html" class="block px-3 py-2 text-sm rounded border border-white/60">Sign Up</a>
            ` : `
              <a href="profile.html?u=${encodeURIComponent(me.username)}" class="block px-3 py-2 text-sm rounded hover:bg-white/10">Profile</a>
              <button id="vh-logout-m" class="block text-left px-3 py-2 text-sm rounded bg-white/10 hover:bg-white/20">Log Out</button>
            `}
          </div>
        </div>
      </header>
    `;

    // --- actions ---
    const mobile  = document.getElementById('vh-mobile');
    const menuBtn = document.getElementById('vh-open-menu');

    function toggleMobile(open) {
      if (!mobile || !menuBtn) return;
      const willOpen = (typeof open === 'boolean') ? open : mobile.classList.contains('hidden');
      mobile.classList.toggle('hidden', !willOpen);
      menuBtn.setAttribute('aria-expanded', String(willOpen));
    }

    if (menuBtn) {
      menuBtn.onclick = () => toggleMobile();
      // Close on Esc (persistent)
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') toggleMobile(false);
      });
    }

    // Close mobile when navigating
    if (mobile) {
      mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMobile(false)));
    }

    // Add ?next= to auth links so users return after auth
    const addNext = (id, url) => {
      const el = document.getElementById(id);
      if (el) el.href = withNext(url);
    };
    addNext('vh-login',  'login.html');
    addNext('vh-signup', 'signup.html');
    addNext('vh-login-m',  'login.html');
    addNext('vh-signup-m', 'signup.html');

    function doLogout() {
      try { window.VHAuth && window.VHAuth.logout && window.VHAuth.logout(); } catch {}
      try { localStorage.setItem(EMIT_KEY, 'logout:' + Date.now()); } catch {}
      render(); // re-render header immediately
    }

    document.getElementById('vh-logout')?.addEventListener('click', doLogout);
    document.getElementById('vh-logout-m')?.addEventListener('click', doLogout);
  }

  // Initial render
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  // Re-render when auth or route changes
  window.addEventListener('storage', (e) => {
    if (e.key === 'currentUser' || e.key === EMIT_KEY) render();
  });
  window.addEventListener('popstate', render);
  window.addEventListener('hashchange', render);

  // Expose a tiny API so pages can force a rerender after actions
  window.VHHeader = { render };
})();