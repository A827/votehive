/* VoteHive guards (safe, non-breaking, superadmin-aware) */
(function () {
  // ----- helpers -----
  function currentSession() {
    try {
      if (window.VHAuth && typeof window.VHAuth.current === 'function') {
        return window.VHAuth.current();
      }
      const raw = localStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function hasRole(u, role) { return !!(u && u.role === role); }
  function isSuperadmin(u)   { return hasRole(u, 'superadmin'); }
  // Treat superadmin as admin (back-compat for pages that check admin)
  function isAdmin(u)        { return !!(u && (u.role === 'admin' || u.role === 'superadmin')); }

  function usernameOrGuest() {
    const me = currentSession();
    return (me && me.username) ? me.username : 'guest';
    // (exported below for pages that already call this)
  }

  function buildNextParam() {
    const path = location.pathname + location.search + (location.hash || '');
    return encodeURIComponent(path);
  }

  function goLogin() {
    const next = buildNextParam();
    location.href = `login.html?next=${next}`;
  }

  // Await seeding if available, without forcing callers to await
  async function waitAuthReadyIfAny() {
    try {
      if (window.VHAuth && typeof window.VHAuth.ready === 'function') {
        await window.VHAuth.ready();
      }
    } catch { /* ignore */ }
  }

  // ----- public guards -----
  // Require an authenticated user; if missing, redirect to login with ?next=
  window.requireLogin = function () {
    (async () => {
      await waitAuthReadyIfAny();
      const me = currentSession();
      if (!me) goLogin();
    })();
  };

  // Require admin (admin OR superadmin). If no session -> login; if not allowed -> home
  window.requireAdmin = function () {
    (async () => {
      await waitAuthReadyIfAny();
      const me = currentSession();
      if (!me) { goLogin(); return; }
      if (!isAdmin(me)) { location.href = 'index.html'; }
    })();
  };

  // Require superadmin specifically
  window.requireSuperadmin = function () {
    (async () => {
      await waitAuthReadyIfAny();
      const me = currentSession();
      if (!me) { goLogin(); return; }
      if (!isSuperadmin(me)) { location.href = 'index.html'; }
    })();
  };

  // Optional: use on pages where logged-in users shouldn't be (e.g., login/signup)
  // If already logged in, go to ?next= or home.
  window.requireLoggedOut = function () {
    (async () => {
      await waitAuthReadyIfAny();
      const me = currentSession();
      if (me) {
        const params = new URLSearchParams(location.search);
        const next = params.get('next') || 'index.html';
        location.href = next;
      }
    })();
  };

  // ----- expose helpers (back-compat + new) -----
  window.getCurrentUser   = currentSession;
  window.isAdmin          = isAdmin;       // now includes superadmin
  window.isSuperadmin     = isSuperadmin;  // new
  window.usernameOrGuest  = usernameOrGuest;

  // (Optional) react to cross-tab auth changes if your auth emits __vh_emit__
  window.addEventListener('storage', (e) => {
    if (e && (e.key === '__vh_emit__' || e.key === 'currentUser')) {
      // No hard redirects here to avoid surprising users mid-action; pages can re-check if they want.
      // You could also dispatch a custom event if needed:
      // window.dispatchEvent(new Event('vh-auth-updated'));
    }
  });
})();