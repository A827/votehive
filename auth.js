<script>
/*
  VoteHive Auth (Local Demo) — robust version (+ready +events +superadmin tools)
  - Users in localStorage: 'vh_users'
  - Session in 'currentUser'  ({ username, role })
  - Seeds: superadmin / admin123     (role: superadmin)
  - Hashing via SubtleCrypto with safe fallback
  - Cross-tab events via localStorage '__vh_emit__'
  - Adds superadmin APIs: listUsers, setRole, blockUser, unblockUser, changePassword
*/
(function () {
  if (window.VHAuth) return; // don't override an existing implementation

  const LS_USERS   = 'vh_users';
  const LS_SESSION = 'currentUser';
  const LS_EMIT    = '__vh_emit__'; // cross-tab ping

  // -------- storage helpers --------
  function loadUsers() {
    try {
      const raw = localStorage.getItem(LS_USERS);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }
  function saveUsers(db) {
    try { localStorage.setItem(LS_USERS, JSON.stringify(db)); }
    catch { /* ignore quota errors in demo */ }
  }
  function getSession() {
    try { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); }
    catch { return null; }
  }
  function setSession(sess) {
    try { localStorage.setItem(LS_SESSION, JSON.stringify(sess)); }
    catch { /* ignore */ }
  }
  function clearSession() {
    try { localStorage.removeItem(LS_SESSION); }
    catch { /* ignore */ }
  }
  function emit(type) {
    // Helpful for header.js / other tabs to re-render on auth or user admin changes
    try { localStorage.setItem(LS_EMIT, type + ':' + Date.now()); }
    catch { /* ignore */ }
  }

  // -------- hashing --------
  async function sha256(txt) {
    try {
      if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        const enc = new TextEncoder().encode(txt);
        const buf = await window.crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch {}
    // Fallback (not secure; demo only)
    let h = 5381;
    for (let i = 0; i < txt.length; i++) h = ((h << 5) + h) ^ txt.charCodeAt(i);
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  // -------- seed admin (deterministic) --------
  let _seedDoneResolve;
  const seedDone = new Promise(res => { _seedDoneResolve = res; });

  (async function seed() {
    const db = loadUsers();
    if (!Object.keys(db).length) {
      db['superadmin'] = {
        passHash: await sha256('admin123'),
        role: 'superadmin',             // <-- superadmin out of the box
        blocked: false,
        createdAt: new Date().toISOString(),
        lastLogin: null
      };
      saveUsers(db);
    }
    _seedDoneResolve();
  })();

  // -------- internal guards --------
  function isSuper(u){ return !!(u && u.role === 'superadmin'); }

  async function requireSuper() {
    const me = getSession();
    if (!isSuper(me)) {
      throw new Error('Superadmin required');
    }
  }

  // -------- API --------
  window.VHAuth = {
    // wait for seeding to finish (useful if logging in immediately on first load)
    ready: () => seedDone,

    current() {
      return getSession();
    },

    async login(username, password) {
      await seedDone;
      username = (username || '').trim();
      const db = loadUsers();
      const rec = db[username];
      if (!rec) return { ok: false, error: 'User not found' };
      if (rec.blocked) return { ok: false, error: 'Account is blocked' };

      const hash = await sha256(password || '');
      if (rec.passHash !== hash) return { ok: false, error: 'Incorrect password' };

      // stamp lastLogin
      rec.lastLogin = new Date().toISOString();
      saveUsers(db);

      const session = { username, role: rec.role || 'user' };
      setSession(session);
      emit('login');
      return { ok: true, user: session };
    },

    logout() {
      clearSession();
      emit('logout');
      return { ok: true };
    },

    async register({ username, password }) {
      await seedDone;
      username = (username || '').trim();

      if (!/^[a-zA-Z0-9_]{3,24}$/.test(username))
        return { ok: false, error: 'Username must be 3–24 letters/numbers/underscore' };
      if ((password || '').length < 6)
        return { ok: false, error: 'Password must be at least 6 characters' };

      const db = loadUsers();
      if (db[username]) return { ok: false, error: 'Username already taken' };

      db[username] = {
        passHash: await sha256(password),
        role: 'user',
        blocked: false,
        createdAt: new Date().toISOString(),
        lastLogin: null
      };
      saveUsers(db);

      const session = { username, role: 'user' };
      setSession(session);
      emit('register');
      return { ok: true, user: session };
    },

    // ---------- Superadmin tools ----------
    listUsers() {
      // safe summary (no password hashes)
      const db = loadUsers();
      return Object.entries(db).map(([u, rec]) => ({
        username: u,
        role: rec.role || 'user',
        blocked: !!rec.blocked,
        createdAt: rec.createdAt || null,
        lastLogin: rec.lastLogin || null
      }));
    },

    async setRole(username, role) {
      await requireSuper();
      const okRoles = ['user', 'admin', 'superadmin'];
      if (!okRoles.includes(role)) throw new Error('Invalid role');
      const db = loadUsers();
      if (!db[username]) throw new Error('User not found');
      db[username].role = role;
      saveUsers(db);
      emit('users:role');
      // If the currently logged-in user changed role, refresh session role
      const sess = getSession();
      if (sess && sess.username === username) {
        setSession({ username, role });
        emit('login'); // nudge headers to re-render role-based nav
      }
      return { ok: true };
    },

    async blockUser(username) {
      await requireSuper();
      const db = loadUsers();
      if (!db[username]) throw new Error('User not found');
      db[username].blocked = true;
      saveUsers(db);
      emit('users:block');

      // If the blocked user is the active session, log them out
      const sess = getSession();
      if (sess && sess.username === username) {
        clearSession();
        emit('logout');
      }
      return { ok: true };
    },

    async unblockUser(username) {
      await requireSuper();
      const db = loadUsers();
      if (!db[username]) throw new Error('User not found');
      db[username].blocked = false;
      saveUsers(db);
      emit('users:unblock');
      return { ok: true };
    },

    async changePassword(username, newPassword) {
      await seedDone;
      const me = getSession();
      if (!me) throw new Error('Login required');

      // self-service OR superadmin override
      if (me.username !== username && !isSuper(me)) {
        throw new Error('Superadmin required');
      }
      if ((newPassword || '').length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const db = loadUsers();
      if (!db[username]) throw new Error('User not found');

      db[username].passHash = await sha256(newPassword);
      saveUsers(db);
      emit('users:password');
      return { ok: true };
    }
  };
})();
</script>