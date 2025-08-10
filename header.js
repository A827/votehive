/* VoteHive unified header (role-aware, consistent across pages)
   Requirements on each page:
   - Tailwind included
   - <div id="vh-header"></div>
   - scripts loaded in order: auth.js -> guard.js -> header.js
*/
(function () {
  const mountId = 'vh-header';

  function getSession() {
    try {
      return (window.VHAuth && window.VHAuth.current && window.VHAuth.current()) ||
             JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch { return null; }
  }

  function isAdmin(user) { return !!(user && user.role === 'admin'); }

  function navLink(href, text, extraClasses='') {
    const here = location.pathname.split('/').pop() || 'index.html';
    const isActive = (href === here);
    const base = 'px-3 py-2 text-sm rounded hover:bg-white/10';
    const active = 'bg-white/20';
    return `<a href="${href}" class="${base} ${isActive ? active : ''} ${extraClasses}">${text}</a>`;
  }

  function render() {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    const me = getSession();

    // Gradient bar matches site style
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
            ${me ? navLink('my-polls.html', 'My Polls') : ''}
            ${me ? navLink('create.html', 'Apply to Create') : ''}
            ${me && isAdmin(me) ? navLink('moderation.html', 'Moderation') : ''}
          </nav>

          <div class="flex items-center gap-2">
            ${!me ? `
              <a href="login.html" class="hidden md:inline-block bg-white text-purple-700 px-3 py-2 rounded text-sm hover:bg-gray-100">Log In</a>
              <a href="signup.html" class="hidden md:inline-block border border-white/80 px-3 py-2 rounded text-sm hover:bg-white hover:text-purple-700">Sign Up</a>
              <button id="vh-open-menu" class="md:hidden p-2 rounded hover:bg-white/10" aria-label="Open Menu">☰</button>
            ` : `
              <a href="profile.html" class="hidden md:flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10">
                <div class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-semibold">
                  ${(me.username[0] || 'U').toUpperCase()}
                </div>
                <span class="text-sm">${me.username}</span>
              </a>
              <button id="vh-logout" class="hidden md:inline-block bg-white/10 hover:bg-white/20 px-3 py-2 rounded text-sm">Log Out</button>
              <button id="vh-open-menu" class="md:hidden p-2 rounded hover:bg-white/10" aria-label="Open Menu">☰</button>
            `}
          </div>
        </div>

        <!-- Mobile sheet -->
        <div id="vh-mobile" class="md:hidden hidden border-t border-white/10 bg-gradient-to-r from-indigo-700 to-purple-700">
          <div class="px-4 py-3 flex flex-col gap-2">
            ${navLink('index.html', 'Home', 'block')}
            ${navLink('browse.html', 'Browse', 'block')}
            ${navLink('leaderboard.html', 'Leaderboard', 'block')}
            ${me ? navLink('my-polls.html', 'My Polls', 'block') : ''}
            ${me ? navLink('create.html', 'Apply to Create', 'block') : ''}
            ${me && isAdmin(me) ? navLink('moderation.html', 'Moderation', 'block') : ''}
            ${!me ? `
              <a href="login.html" class="block px-3 py-2 text-sm rounded bg-white text-purple-700">Log In</a>
              <a href="signup.html" class="block px-3 py-2 text-sm rounded border border-white/60">Sign Up</a>
            ` : `
              <a href="profile.html" class="block px-3 py-2 text-sm rounded hover:bg-white/10">Profile</a>
              <button id="vh-logout-m" class="block text-left px-3 py-2 text-sm rounded bg-white/10 hover:bg-white/20">Log Out</button>
            `}
          </div>
        </div>
      </header>
    `;

    // Wire up actions
    const menuBtn = document.getElementById('vh-open-menu');
    const mobile = document.getElementById('vh-mobile');
    if (menuBtn && mobile) {
      menuBtn.onclick = () => mobile.classList.toggle('hidden');
    }

    function doLogout() {
      try { window.VHAuth && window.VHAuth.logout && window.VHAuth.logout(); } catch {}
      // Broadcast to other tabs and re-render
      try { localStorage.setItem('__vh_emit__', 'logout:'+Date.now()); } catch {}
      render();
    }

    const lo = document.getElementById('vh-logout');
    const lom = document.getElementById('vh-logout-m');
    if (lo) lo.onclick = doLogout;
    if (lom) lom.onclick = doLogout;
  }

  // Initial render
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  // Update header when auth state changes (even across tabs)
  window.addEventListener('storage', (e) => {
    if (e.key === 'currentUser' || e.key === '__vh_emit__') render();
  });

  // Expose a tiny API so pages can force a rerender after actions
  window.VHHeader = { render };
})();