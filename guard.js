/* VoteHive guards (safe, non-breaking) */
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
  function isAdmin(u) { return !!(u && u.role === 'admin'); }

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

  // Require admin role; if missing session -> login; if non-admin -> home
  window.requireAdmin = function () {
    (async () => {
      await waitAuthReadyIfAny();
      const me = currentSession();
      if (!me) { goLogin(); return; }
      if (!isAdmin(me)) { location.href = 'index.html'; }
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

  // Expose helpers (same names you had)
  window.getCurrentUser = currentSession;
  window.isAdmin = isAdmin;
})();