// guard.js — single source of truth for auth (localStorage.currentUser)
// Backward-compatible: reads legacy keys and migrates to currentUser.

(function(){
  function readLegacy() {
    const keys = ['currentUser','VHAuth_user','auth_user','user','vhauth'];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const val = JSON.parse(raw);
        if (val && (val.username || val.name)) {
          return { username: val.username || val.name, role: (val.role || 'user').toLowerCase() };
        }
      } catch {
        // maybe it was just a username string
        return { username: raw, role: 'user' };
      }
    }
    return null;
  }

  function normalize(u){
    if (!u) return null;
    return {
      username: (u.username || u.name || 'user').toString(),
      role: (u.role || 'user').toString().toLowerCase()
    };
  }

  // migrate once
  const legacy = readLegacy();
  if (legacy) localStorage.setItem('currentUser', JSON.stringify(normalize(legacy)));

  window.VHAuth = {
    current() {
      try {
        const raw = localStorage.getItem('currentUser');
        if (!raw) return null;
        return normalize(JSON.parse(raw));
      } catch { return null; }
    },
    login(user) {
      const u = normalize(user);
      localStorage.setItem('currentUser', JSON.stringify(u));
    },
    logout() {
      localStorage.removeItem('currentUser');
      location.href = 'index.html';
    }
  };

  window.requireLogin = function(redirect='login.html'){
    if (!window.VHAuth.current()) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = `${redirect}?next=${next}`;
    }
  };

  window.requireAdmin = function(redirect='index.html'){
    const me = window.VHAuth.current();
    if (!me || (me.role !== 'admin' && me.role !== 'superadmin')) {
      location.href = redirect;
    }
  };

  window.usernameOrGuest = function(){ return window.VHAuth.current()?.username || 'guest'; };
})();