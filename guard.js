// guard.js — minimal auth helpers (NO rewrites)
// Uses ONLY localStorage.currentUser with shape: { username, role }

(function () {
  function getUser() {
    try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); }
    catch { return null; }
  }

  window.Auth = {
    get: getUser,
    logout() { localStorage.removeItem('currentUser'); location.href = 'index.html'; }
  };

  window.requireLogin = function(redirect = 'login.html') {
    if (!getUser()) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = `${redirect}?next=${next}`;
    }
  };

  window.requireAdmin = function(redirect = 'index.html') {
    const me = getUser();
    if (!me || (me.role !== 'admin' && me.role !== 'superadmin')) {
      location.href = redirect;
    }
  };

  window.usernameOrGuest = function () {
    return (getUser() && getUser().username) || 'guest';
  };
})();