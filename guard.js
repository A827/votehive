/* VoteHive guards (safe, non-breaking, superadmin-aware, ES5-compatible) */
(function () {
  // ----- helpers -----
  function currentSession() {
    try {
      if (window.VHAuth && typeof window.VHAuth.current === 'function') {
        return window.VHAuth.current();
      }
      var raw = localStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function hasRole(u, role) { return !!(u && u.role === role); }
  function isSuperadmin(u)  { return hasRole(u, 'superadmin'); }
  // Treat superadmin as admin (back-compat)
  function isAdmin(u)       { return !!(u && (u.role === 'admin' || u.role === 'superadmin')); }

  function usernameOrGuest() {
    var me = currentSession();
    return (me && me.username) ? me.username : 'guest';
  }

  function buildNextParam() {
    var path = location.pathname + location.search + (location.hash || '');
    return encodeURIComponent(path);
  }

  function getQueryParam(name) {
    // Simple query param reader without URLSearchParams
    var q = location.search.replace(/^\?/, '');
    if (!q) return null;
    var parts = q.split('&');
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split('=');
      if (decodeURIComponent(kv[0] || '') === name) {
        return decodeURIComponent(kv[1] || '');
      }
    }
    return null;
  }

  function goLogin() {
    var next = buildNextParam();
    location.href = 'login.html?next=' + next;
  }

  // Await seeding if available, without forcing callers to await
  function waitAuthReadyIfAny() {
    try {
      if (window.VHAuth && typeof window.VHAuth.ready === 'function') {
        var p = window.VHAuth.ready();
        if (p && typeof p.then === 'function') {
          return p['catch'](function(){});
        }
      }
    } catch (e) {}
    return Promise.resolve();
  }

  // ----- public guards -----
  // Require an authenticated user; if missing, redirect to login with ?next=
  window.requireLogin = function () {
    waitAuthReadyIfAny().then(function () {
      var me = currentSession();
      if (!me) goLogin();
    });
  };

  // Require admin (admin OR superadmin). If no session -> login; if not allowed -> home
  window.requireAdmin = function () {
    waitAuthReadyIfAny().then(function () {
      var me = currentSession();
      if (!me) { goLogin(); return; }
      if (!isAdmin(me)) { location.href = 'index.html'; }
    });
  };

  // Require superadmin specifically
  window.requireSuperadmin = function () {
    waitAuthReadyIfAny().then(function () {
      var me = currentSession();
      if (!me) { goLogin(); return; }
      if (!isSuperadmin(me)) { location.href = 'index.html'; }
    });
  };

  // Optional: use on pages where logged-in users shouldn’t be (e.g., login/signup)
  // If already logged in, go to ?next= or home.
  window.requireLoggedOut = function () {
    waitAuthReadyIfAny().then(function () {
      var me = currentSession();
      if (me) {
        var next = getQueryParam('next') || 'index.html';
        location.href = next;
      }
    });
  };

  // ----- expose helpers (back-compat + new) -----
  window.getCurrentUser  = currentSession;
  window.isAdmin         = isAdmin;       // includes superadmin
  window.isSuperadmin    = isSuperadmin;  // explicit check
  window.usernameOrGuest = usernameOrGuest;

  // (Optional) react to cross-tab auth changes if your auth emits __vh_emit__
  window.addEventListener('storage', function (e) {
    if (!e) return;
    if (e.key === '__vh_emit__' || e.key === 'currentUser') {
      // pages can re-check state if they want
    }
  });
})();