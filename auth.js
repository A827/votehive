/*
  VoteHive Auth — ES5-only, superadmin tools + permissions
  Storage:
    - Users in localStorage 'vh_users'
      user = { passHash, role, blocked, createdAt, lastLogin, perms }
    - Session in 'currentUser' = { username, role }
  Seed:
    - superadmin / admin123
*/
(function () {
  if (window.VHAuth) return;

  var LS_USERS   = 'vh_users';
  var LS_SESSION = 'currentUser';
  var LS_EMIT    = '__vh_emit__';

  // ---------- storage ----------
  function loadUsers() {
    try { var raw = localStorage.getItem(LS_USERS); return raw ? JSON.parse(raw) : {}; }
    catch (e) { return {}; }
  }
  function saveUsers(db) { try { localStorage.setItem(LS_USERS, JSON.stringify(db)); } catch (e) {} }
  function getSession()  { try { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); } catch (e) { return null; } }
  function setSession(s) { try { localStorage.setItem(LS_SESSION, JSON.stringify(s)); } catch (e) {} }
  function clearSession(){ try { localStorage.removeItem(LS_SESSION); } catch (e) {} }
  function emit(type)    { try { localStorage.setItem(LS_EMIT, type + ':' + Date.now()); } catch (e) {} }

  // ---------- hashing ----------
  function sha256(txt) {
    return new Promise(function (resolve) {
      try {
        if (window.crypto && window.crypto.subtle && window.TextEncoder) {
          var enc = new TextEncoder().encode(txt);
          window.crypto.subtle.digest('SHA-256', enc).then(function (buf) {
            var arr = new Uint8Array(buf);
            var i, s = '';
            for (i=0;i<arr.length;i++) { var h = arr[i].toString(16); if (h.length===1) h='0'+h; s+=h; }
            resolve(s);
          }).catch(function () { resolve(fallbackHash(txt)); });
          return;
        }
      } catch (e) {}
      resolve(fallbackHash(txt));
    });
  }
  function fallbackHash(txt){
    var h=5381,i; for(i=0;i<txt.length;i++) h=((h<<5)+h)^txt.charCodeAt(i);
    var x = (h>>>0).toString(16); while (x.length<8) x='0'+x;
    return x;
  }

  // ---------- defaults ----------
  function defaultPerms(){
    return {
      canVote: true,
      canComment: true,
      canShare: true,
      canApply: true,
      canCreate: false
    };
  }

  // ---------- seed superadmin ----------
  var seedDoneResolve;
  var seedDone = new Promise(function(res){ seedDoneResolve=res; });

  (function seed(){
    var db = loadUsers();
    if (!Object.keys(db).length) {
      sha256('admin123').then(function(hash){
        db['superadmin'] = {
          passHash: hash,
          role: 'superadmin',
          blocked: false,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          perms: defaultPerms()
        };
        saveUsers(db);
        seedDoneResolve();
      });
      return;
    }
    // backfill perms for existing users
    for (var u in db) if (db.hasOwnProperty(u)) {
      if (!db[u].perms) db[u].perms = defaultPerms();
    }
    saveUsers(db);
    seedDoneResolve();
  })();

  // ---------- helpers ----------
  function isSuper(u){ return !!(u && u.role === 'superadmin'); }
  function isAdmin(u){ return !!(u && (u.role === 'admin' || u.role === 'superadmin')); }
  function superCount(db){
    var n=0, u;
    for (u in db) if (db.hasOwnProperty(u)) {
      var r=db[u]; if (r && r.role==='superadmin' && !r.blocked) n++;
    }
    return n;
  }
  function requireSuper(){
    var me = getSession();
    if (!isSuper(me)) throw new Error('Superadmin required');
  }

  // ---------- API ----------
  window.VHAuth = {
    ready: function(){ return seedDone; },

    current: function(){ return getSession(); },
    isSuper: isSuper,
    isAdmin: isAdmin,

    login: function(username, password){
      return seedDone.then(function(){ return sha256(password||''); })
      .then(function(hash){
        username = (username||'').trim();
        var db = loadUsers();
        var rec = db[username];
        if (!rec) return { ok:false, error:'User not found' };
        if (rec.blocked) return { ok:false, error:'Account is blocked' };
        if (rec.passHash !== hash) return { ok:false, error:'Incorrect password' };
        rec.lastLogin = new Date().toISOString();
        saveUsers(db);
        var sess = { username: username, role: rec.role || 'user' };
        setSession(sess);
        emit('login');
        return { ok:true, user:sess };
      });
    },

    logout: function(){
      clearSession();
      emit('logout');
      return { ok:true };
    },

    register: function(opts){
      return seedDone.then(function(){
        var username = (opts && opts.username || '').trim();
        var password = (opts && opts.password || '');
        if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return { ok:false, error:'Username must be 3–24 letters/numbers/underscore' };
        if (password.length < 6) return { ok:false, error:'Password must be at least 6 characters' };
        var db = loadUsers(); if (db[username]) return { ok:false, error:'Username already taken' };
        return sha256(password).then(function(hash){
          db[username] = {
            passHash: hash,
            role: 'user',
            blocked: false,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            perms: defaultPerms()
          };
          saveUsers(db);
          var sess = { username: username, role:'user' };
          setSession(sess);
          emit('register');
          return { ok:true, user:sess };
        });
      });
    },

    // ----- Users (superadmin) -----
    listUsers: function(){
      requireSuper();
      var db = loadUsers(), out=[], u, rec;
      for (u in db) if (db.hasOwnProperty(u)) {
        rec = db[u] || {};
        out.push({
          username: u,
          role: rec.role || 'user',
          blocked: !!rec.blocked,
          createdAt: rec.createdAt || null,
          lastLogin: rec.lastLogin || null,
          perms: rec.perms || defaultPerms()
        });
      }
      return out;
    },

    getUser: function(username){
      requireSuper();
      var db = loadUsers(); var rec = db[username];
      if (!rec) throw new Error('User not found');
      return {
        username: username,
        role: rec.role || 'user',
        blocked: !!rec.blocked,
        createdAt: rec.createdAt || null,
        lastLogin: rec.lastLogin || null,
        perms: rec.perms || defaultPerms()
      };
    },

    setRole: function(username, role){
      requireSuper();
      var ok = ['user','admin','superadmin']; if (ok.indexOf(role)===-1) throw new Error('Invalid role');
      var db = loadUsers(); var rec = db[username]; if (!rec) throw new Error('User not found');
      var wasSuper = rec.role==='superadmin' && !rec.blocked;
      if (wasSuper && role!=='superadmin' && superCount(db)<=1) throw new Error('Cannot demote the last active superadmin');
      rec.role = role; saveUsers(db); emit('users:role');
      var sess = getSession(); if (sess && sess.username===username){ setSession({username:username, role:role}); emit('login'); }
      return { ok:true };
    },

    blockUser: function(username){
      requireSuper();
      var db = loadUsers(); var rec = db[username]; if (!rec) throw new Error('User not found');
      if (rec.role==='superadmin' && !rec.blocked && superCount(db)<=1) throw new Error('Cannot block the last active superadmin');
      rec.blocked = true; saveUsers(db); emit('users:block');
      var sess = getSession(); if (sess && sess.username===username){ clearSession(); emit('logout'); }
      return { ok:true };
    },

    unblockUser: function(username){
      requireSuper();
      var db = loadUsers(); var rec = db[username]; if (!rec) throw new Error('User not found');
      rec.blocked = false; saveUsers(db); emit('users:unblock'); return { ok:true };
    },

    changePassword: function(username, newPassword){
      return seedDone.then(function(){
        var me = getSession(); if (!me) throw new Error('Login required');
        if (me.username!==username && !isSuper(me)) throw new Error('Superadmin required');
        if (!newPassword || newPassword.length<6) throw new Error('Password must be at least 6 characters');
        var db = loadUsers(); var rec = db[username]; if (!rec) throw new Error('User not found');
        return sha256(newPassword).then(function(hash){
          rec.passHash = hash; saveUsers(db); emit('users:password'); return { ok:true };
        });
      });
    },

    // ----- Permissions (superadmin) -----
    setPermissions: function(username, patch){
      requireSuper();
      var db = loadUsers(); var rec = db[username]; if (!rec) throw new Error('User not found');
      if (!rec.perms) rec.perms = defaultPerms();
      patch = patch || {};
      for (var k in patch) if (patch.hasOwnProperty(k)) {
        rec.perms[k] = !!patch[k];
      }
      saveUsers(db); emit('users:perms');
      return { ok:true, perms: rec.perms };
    }
  };
})();