/*
  VoteHive Auth (Local Demo) — robust version (+ready +events +superadmin tools +migration)
  - Users in localStorage: 'vh_users'
  - Session in 'currentUser'  ({ username, role })
  - Seeds: superadmin / admin123  (role: superadmin)
  - Cross-tab events via localStorage '__vh_emit__'
*/

/* ---- tiny polyfills (safe to keep) ---- */
if (!Object.entries) {
  Object.entries = function (obj) {
    var ownProps = Object.keys(obj), i = 0, res = [];
    for (; i < ownProps.length; i++) res[i] = [ownProps[i], obj[ownProps[i]]];
    return res;
  };
}
if (!Object.values) {
  Object.values = function (obj) {
    var ownProps = Object.keys(obj), i = 0, res = [];
    for (; i < ownProps.length; i++) res[i] = obj[ownProps[i]];
    return res;
  };
}

(function () {
  if (window.VHAuth) return; // don't override if already present

  var LS_USERS   = 'vh_users';
  var LS_SESSION = 'currentUser';
  var LS_EMIT    = '__vh_emit__';

  // ---------- storage helpers ----------
  function loadUsers() {
    try {
      var raw = localStorage.getItem(LS_USERS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function saveUsers(db) {
    try { localStorage.setItem(LS_USERS, JSON.stringify(db)); } catch (e) {}
  }
  function getSession() {
    try { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); }
    catch (e) { return null; }
  }
  function setSession(sess) {
    try { localStorage.setItem(LS_SESSION, JSON.stringify(sess)); } catch (e) {}
  }
  function clearSession() {
    try { localStorage.removeItem(LS_SESSION); } catch (e) {}
  }
  function emit(type) {
    try { localStorage.setItem(LS_EMIT, type + ':' + Date.now()); } catch (e) {}
  }

  // ---------- hashing ----------
  function sha256(txt) {
    return new Promise(function (resolve) {
      try {
        if (window.crypto && window.crypto.subtle && window.TextEncoder) {
          var enc = new TextEncoder().encode(txt);
          window.crypto.subtle.digest('SHA-256', enc).then(function (buf) {
            var out = Array.prototype.map.call(new Uint8Array(buf), function (b) {
              return b.toString(16).padStart(2, '0');
            }).join('');
            resolve(out);
          }, function () { resolve(fallbackHash(txt)); });
          return;
        }
      } catch (e) {}
      resolve(fallbackHash(txt));
    });
  }
  function fallbackHash(txt) {
    // djb2 xor — demo only (not secure)
    var h = 5381, i;
    for (i = 0; i < txt.length; i++) h = ((h << 5) + h) ^ txt.charCodeAt(i);
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  // ---------- migration (fix older installs where superadmin wasn't 'superadmin') ----------
  function migrateUsersIfNeeded() {
    var db = loadUsers();
    var changed = false;

    if (db && db.superadmin) {
      if (db.superadmin.role !== 'superadmin') {
        db.superadmin.role = 'superadmin';
        changed = true;
      }
      if (db.superadmin.blocked) {
        db.superadmin.blocked = false;
        changed = true;
      }
      if (changed) saveUsers(db);
    }

    // If the current session is superadmin but role is wrong, fix it
    try {
      var sess = getSession();
      if (sess && sess.username === 'superadmin' && sess.role !== 'superadmin') {
        setSession({ username: 'superadmin', role: 'superadmin' });
        emit('login');
      }
    } catch (e) {}
  }

  // ---------- seed admin ----------
  var _seedDoneResolve;
  var seedDone = new Promise(function (res) { _seedDoneResolve = res; });

  (function seed() {
    var db = loadUsers();
    if (!Object.keys(db).length) {
      // first run — create superadmin / admin123
      sha256('admin123').then(function (hash) {
        db['superadmin'] = {
          passHash: hash,
          role: 'superadmin',
          blocked: false,
          createdAt: new Date().toISOString(),
          lastLogin: null
        };
        saveUsers(db);
        _seedDoneResolve();
      });
      return;
    }
    // existing DB: run migration
    migrateUsersIfNeeded();
    _seedDoneResolve();
  })();

  // ---------- guards & helpers ----------
  function isSuper(u) { return !!(u && u.role === 'superadmin'); }
  function isAdmin(u) { return !!(u && (u.role === 'admin' || u.role === 'superadmin')); }
  function superCount(db) {
    var arr = Object.values(db);
    var i, c = 0;
    for (i = 0; i < arr.length; i++) {
      if (arr[i] && arr[i].role === 'superadmin' && !arr[i].blocked) c++;
    }
    return c;
  }
  function requireSuper() {
    var me = getSession();
    if (!isSuper(me)) throw new Error('Superadmin required');
  }

  // ---------- API ----------
  window.VHAuth = {
    // wait for seeding/migration to finish
    ready: function () { return seedDone; },

    current: function () { return getSession(); },
    isSuper: isSuper,
    isAdmin: isAdmin,
    whoami: function(){ return getSession(); },

    login: function (username, password) {
      return seedDone.then(function () { return sha256(password || ''); })
        .then(function (hash) {
          username = (username || '').trim();
          var db = loadUsers();
          var rec = db[username];
          if (!rec) return { ok: false, error: 'User not found' };
          if (rec.blocked) return { ok: false, error: 'Account is blocked' };
          if (rec.passHash !== hash) return { ok: false, error: 'Incorrect password' };

          rec.lastLogin = new Date().toISOString();
          saveUsers(db);

          var session = { username: username, role: rec.role || 'user' };
          setSession(session);
          emit('login');
          return { ok: true, user: session };
        });
    },

    logout: function () {
      clearSession();
      emit('logout');
      return { ok: true };
    },

    register: function (opts) {
      return seedDone.then(function () {
        var username = (opts && opts.username || '').trim();
        var password = (opts && opts.password) || '';

        if (!/^[a-zA-Z0-9_]{3,24}$/.test(username))
          return { ok: false, error: 'Username must be 3–24 letters/numbers/underscore' };
        if (password.length < 6)
          return { ok: false, error: 'Password must be at least 6 characters' };

        var db = loadUsers();
        if (db[username]) return { ok: false, error: 'Username already taken' };

        return sha256(password).then(function (hash) {
          db[username] = {
            passHash: hash,
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
        });
      });
    },

    // ---- Superadmin tools ----
    listUsers: function () {
      requireSuper();
      var db = loadUsers();
      return Object.entries(db).map(function (pair) {
        var u = pair[0], rec = pair[1];
        return {
          username: u,
          role: rec.role || 'user',
          blocked: !!rec.blocked,
          createdAt: rec.createdAt || null,
          lastLogin: rec.lastLogin || null
        };
      });
    },

    setRole: function (username, role) {
      requireSuper();
      var okRoles = ['user', 'admin', 'superadmin'];
      if (okRoles.indexOf(role) === -1) throw new Error('Invalid role');

      var db = loadUsers();
      var rec = db[username];
      if (!rec) throw new Error('User not found');

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
        emit('login'); // nudge headers to update nav
      }
      return { ok: true };
    },

    blockUser: function (username) {
      requireSuper();
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

    unblockUser: function (username) {
      requireSuper();
      var db = loadUsers();
      if (!db[username]) throw new Error('User not found');
      db[username].blocked = false;
      saveUsers(db);
      emit('users:unblock');
      return { ok: true };
    },

    changePassword: function (username, newPassword) {
      return seedDone.then(function () {
        var me = getSession();
        if (!me) throw new Error('Login required');

        if (me.username !== username && !isSuper(me)) {
          throw new Error('Superadmin required');
        }
        if (!newPassword || newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        var db = loadUsers();
        if (!db[username]) throw new Error('User not found');

        return sha256(newPassword).then(function (hash) {
          db[username].passHash = hash;
          saveUsers(db);
          emit('users:password');
          return { ok: true };
        });
      });
    }
  };
})();