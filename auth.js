<script>
/*
  VoteHive Auth (Local Demo) — robust version (+ready +events +superadmin tools)
  - Users in localStorage: 'vh_users'
  - Session in 'currentUser'  ({ username, role })
  - Seeds: superadmin / admin123     (role: superadmin)
  - Hashing via SubtleCrypto with safe fallback
  - Cross-tab events via localStorage '__vh_emit__'
  - Superadmin APIs: listUsers, setRole, blockUser, unblockUser, changePassword
*/
(function () {
  if (window.VHAuth) return;

  var LS_USERS   = 'vh_users';
  var LS_SESSION = 'currentUser';
  var LS_EMIT    = '__vh_emit__';

  // -------- storage helpers --------
  function loadUsers() {
    try {
      var raw = localStorage.getItem(LS_USERS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function saveUsers(db) {
    try { localStorage.setItem(LS_USERS, JSON.stringify(db)); }
    catch (e) {}
  }
  function getSession() {
    try { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); }
    catch (e) { return null; }
  }
  function setSession(sess) {
    try { localStorage.setItem(LS_SESSION, JSON.stringify(sess)); }
    catch (e) {}
  }
  function clearSession() {
    try { localStorage.removeItem(LS_SESSION); }
    catch (e) {}
  }
  function emit(type) {
    try { localStorage.setItem(LS_EMIT, type + ':' + Date.now()); }
    catch (e) {}
  }

  // -------- hashing --------
  async function sha256(txt) {
    try {
      if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        var enc = new TextEncoder().encode(txt);
        var buf = await window.crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      }
    } catch (e) {}
    // Fallback (demo only)
    var h = 5381;
    for (var i = 0; i < txt.length; i++) h = ((h << 5) + h) ^ txt.charCodeAt(i);
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  // -------- seed admin --------
  var _seedDoneResolve;
  var seedDone = new Promise(function (res) { _seedDoneResolve = res; });

  (async function seed() {
    var db = loadUsers();
    if (!Object.keys(db).length) {
      db['superadmin'] = {
        passHash: await sha256('admin123'),
        role: 'superadmin',
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
  function isAdmin(u){ return !!(u && (u.role === 'admin' || u.role === 'superadmin')); }
  function superCount(db){
    var n = 0;
    for (var k in db) {
      if (db.hasOwnProperty(k)) {
        var u = db[k];
        if (u && u.role === 'superadmin' && !u.blocked) n++;
      }
    }
    return n;
  }

  async function requireSuper() {
    var me = getSession();
    if (!isSuper(me)) throw new Error('Superadmin required');
  }

  // -------- API --------
  window.VHAuth = {
    ready: function () { return seedDone; },
    current: function () { return getSession(); },
    isSuper: isSuper,
    isAdmin: isAdmin,

    login: async function (username, password) {
      await seedDone;
      username = (username || '').trim();
      var db = loadUsers();
      var rec = db[username];
      if (!rec) return { ok: false, error: 'User not found' };
      if (rec.blocked) return { ok: false, error: 'Account is blocked' };

      var hash = await sha256(password || '');
      if (rec.passHash !== hash) return { ok: false, error: 'Incorrect password' };

      rec.lastLogin = new Date().toISOString();
      saveUsers(db);

      var session = { username: username, role: rec.role || 'user' };
      setSession(session);
      emit('login');
      return { ok: true, user: session };
    },

    logout: function () {
      clearSession();
      emit('logout');
      return { ok: true };
    },

    // NOTE: no parameter destructuring to avoid "Expression expected" in some environments
    register: async function (payload) {
      await seedDone;
      var username = payload && payload.username ? String(payload.username).trim() : '';
      var password = payload && payload.password ? String(payload.password) : '';

      if (!/^[a-zA-Z0-9_]{3,24}$/.test(username))
        return { ok: false, error: 'Username must be 3–24 letters/numbers/underscore' };
      if (password.length < 6)
        return { ok: false, error: 'Password must be at least 6 characters' };

      var db = loadUsers();
      if (db[username]) return { ok: false, error: 'Username already taken' };

      db[username] = {
        passHash: await sha256(password),
        role: 'user',
        blocked: false,
        createdAt: new Date().toISOString(),
        lastLogin: null
      };
      saveUsers(db);

      var session = { username: username, role: 'user' };
      setSession(session);
      emit('register');
      return { ok: true, user: session };
    },

    // ---------- Superadmin tools ----------
    listUsers: async function () {
      await requireSuper();
      var db = loadUsers();
      var out = [];
      for (var u in db) {
        if (!db.hasOwnProperty(u)) continue;
        var rec = db[u] || {};
        out.push({
          username: u,
          role: rec.role || 'user',
          blocked: !!rec.blocked,
          createdAt: rec.createdAt || null,
          lastLogin: rec.lastLogin || null
        });
      }
      return out;
    },

    setRole: async function (username, role) {
      await requireSuper();
      var okRoles = { user:1, admin:1, superadmin:1 };
      if (!okRoles[role]) throw new Error('Invalid role');
      var db = loadUsers();
      var rec = db[username];
      if (!rec) throw new Error('User not found');

      // prevent removing the last active superadmin
      var wasSuper = rec.role === 'superadmin' && !rec.blocked;
      if (wasSuper && role !== 'superadmin' && superCount(db) <= 1) {
        throw new Error('Cannot demote the last active superadmin');
      }

      rec.role = role;
      saveUsers(db);
      emit('users:role');

      var sess = getSession();
      if (sess && sess.username === username) {
        setSession({ username: username, role: role });
        emit('login');
      }
      return { ok: true };
    },

    blockUser: async function (username) {
      await requireSuper();
      var db = loadUsers();
      var rec = db[username];
      if (!rec) throw new Error('User not found');

      if (rec.role === 'superadmin' && !rec.blocked && superCount(db) <= 1) {
        throw new Error('Cannot block the last active superadmin');
      }

      rec.blocked = true;
      saveUsers(db);
      emit('users:block');

      var sess = getSession();
      if (sess && sess.username === username) {
        clearSession();
        emit('logout');
      }
      return { ok: true };
    },

    unblockUser: async function (username) {
      await requireSuper();
      var db = loadUsers();
      if (!db[username]) throw new Error('User not found');
      db[username].blocked = false;
      saveUsers(db);
      emit('users:unblock');
      return { ok: true };
    },

    changePassword: async function (username, newPassword) {
      await seedDone;
      var me = getSession();
      if (!me) throw new Error('Login required');

      if (me.username !== username && !isSuper(me)) {
        throw new Error('Superadmin required');
      }
      if (!newPassword || String(newPassword).length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      var db = loadUsers();
      if (!db[username]) throw new Error('User not found');

      db[username].passHash = await sha256(String(newPassword));
      saveUsers(db);
      emit('users:password');
      return { ok: true };
    }
  };
})();
</script>