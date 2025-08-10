<script>
/*
  VoteHive Auth (Local Demo)
  - Non-destructive: only defines window.VHAuth if missing.
  - Users stored in localStorage: key 'vh_users'
  - Session stored at    : key 'currentUser'  ( {username, role} )
  - Seeds: superadmin / admin123  (role: 'admin') if no users exist.
  - Methods:
      VHAuth.current() -> {username, role} | null
      VHAuth.login(username, password) -> {ok, error?}
      VHAuth.logout()
      VHAuth.register({username, password}) -> {ok, error?}
*/
(function(){
  if (window.VHAuth) return; // don’t override if already defined

  const LS_USERS = 'vh_users';
  const LS_SESSION = 'currentUser';

  function loadUsers(){
    try { return JSON.parse(localStorage.getItem(LS_USERS) || '{}'); }
    catch { return {}; }
  }
  function saveUsers(db){ localStorage.setItem(LS_USERS, JSON.stringify(db)); }
  async function sha256(txt){
    const enc = new TextEncoder().encode(txt);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  // seed admin on first run
  (async function seed(){
    const db = loadUsers();
    if (!Object.keys(db).length){
      db['superadmin'] = {
        passHash: await sha256('admin123'),
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      saveUsers(db);
    }
  })();

  window.VHAuth = {
    current(){
      try { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); }
      catch { return null; }
    },
    async login(username, password){
      username = (username||'').trim();
      const db = loadUsers();
      if (!db[username]) return {ok:false, error:'User not found'};
      const hash = await sha256(password||'');
      if (db[username].passHash !== hash) return {ok:false, error:'Incorrect password'};
      const session = {username, role: db[username].role || 'user'};
      localStorage.setItem(LS_SESSION, JSON.stringify(session));
      return {ok:true};
    },
    logout(){
      localStorage.removeItem(LS_SESSION);
      return {ok:true};
    },
    async register({username, password}){
      username = (username||'').trim();
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return {ok:false, error:'Username must be 3–24 letters/numbers/underscore'};
      if ((password||'').length < 6) return {ok:false, error:'Password must be at least 6 characters'};
      const db = loadUsers();
      if (db[username]) return {ok:false, error:'Username already taken'};
      db[username] = {
        passHash: await sha256(password),
        role: 'user',
        createdAt: new Date().toISOString()
      };
      saveUsers(db);
      // Auto-login after signup
      localStorage.setItem(LS_SESSION, JSON.stringify({username, role:'user'}));
      return {ok:true};
    }
  };
})();
</script>