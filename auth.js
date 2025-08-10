// auth.js — Single source of truth for demo auth via localStorage
(function () {
  const KEY = 'currentUser';

  function parseSafe(raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }

  // Fire a cross-app event when auth changes
  function notify() {
    try { window.dispatchEvent(new Event('auth:change')); } catch {}
  }

  // Backward-compat: if legacy keys exist, migrate once
  (function migrate() {
    if (localStorage.getItem(KEY)) return;
    const legacyKeys = ['VHAuth_user', 'auth_user', 'user', 'vhauth'];
    for (const k of legacyKeys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      let val = parseSafe(raw);
      if (!val) val = { username: String(raw), role: 'user' };
      const user = {
        username: String(val.username || val.name || 'user'),
        role: String(val.role || 'user').toLowerCase()
      };
      localStorage.setItem(KEY, JSON.stringify(user));
      break;
    }
  })();

  const Auth = {
    get() {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const u = parseSafe(raw);
      if (!u) return null;
      return {
        username: String(u.username || 'user'),
        role: String(u.role || 'user').toLowerCase()
      };
    },
    set(user) {
      if (!user || !user.username) return;
      const u = {
        username: String(user.username),
        role: String(user.role || 'user').toLowerCase()
      };
      localStorage.setItem(KEY, JSON.stringify(u));
      notify();
    },
    login(username, role = 'user') {
      if (typeof username === 'object' && username) {
        Auth.set(username);
      } else {
        Auth.set({ username, role });
      }
    },
    logout() {
      localStorage.removeItem(KEY);
      notify();
      location.href = 'index.html';
    },
    requireLogin(redirect = 'login.html') {
      if (!Auth.get()) {
        const next = encodeURIComponent(location.pathname + location.search);
        location.replace(`${redirect}?next=${next}`);
      }
    },
    requireAdmin(redirect = 'index.html') {
      const me = Auth.get();
      if (!me || (me.role !== 'admin' && me.role !== 'superadmin')) {
        location.replace(redirect);
      }
    }
  };

  // Cross-tab sync
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) notify();
  });

  window.Auth = Auth;
})();