/* Minimal guards used across pages */
(function () {
  function session() {
    try {
      return (window.VHAuth && window.VHAuth.current && window.VHAuth.current()) ||
             JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch { return null; }
  }

  function isAdmin(u) { return !!(u && u.role === 'admin'); }

  // Redirect to login if not authenticated
  window.requireLogin = function () {
    const me = session();
    if (!me) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = `login.html?next=${next}`;
    }
  };

  // Redirect to home if not admin
  window.requireAdmin = function () {
    const me = session();
    if (!me) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = `login.html?next=${next}`;
      return;
    }
    if (!isAdmin(me)) {
      // Not authorized — send to home
      location.href = 'index.html';
    }
  };

  // Helper any page can use
  window.getCurrentUser = session;
  window.isAdmin = isAdmin;
})();