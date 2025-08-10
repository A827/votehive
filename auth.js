<script>
/*
  VoteHive Auth (Local Demo) — robust version
  - Stores users in localStorage: 'vh_users'
  - Session in 'currentUser' ( {username, role} )
  - Seeds admin: superadmin / admin123
  - Adds crypto fallback if crypto.subtle is unavailable.
*/
(function(){
  if (window.VHAuth) return; // don't override existing

  const LS_USERS = 'vh_users';
  const LS_SESSION = 'currentUser';

  function loadUsers(){
    try { return JSON.parse(localStorage.getItem(LS_USERS) || '{}'); }
    catch { return {}; }
  }
  function saveUsers(db){ localStorage.setItem(LS_USERS, JSON.stringify(db)); }

  // Hash with crypto.subtle if available, else a simple (not secure) fallback so login works in older browsers.
  async function sha256(txt){
    try {
      if (window.crypto?.subtle) {
        const enc = new TextEncoder().encode(txt);
        const buf = await crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
      }
    } catch(e){}
    // Fallback (weak): DJB2-style
    let h = 5381;
    for (let i=0;i<txt.length;i++) h = ((h<<5)+h) ^ txt.charCodeAt(i);
    return ('00000000'+(h>>>0).toString(16)).slice(-8);
  }

  async function seed(){
    const db = loadUsers();
    if (!Object.keys(db).length){
      db['superadmin'] = {
        passHash: await sha256('admin123'),
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      saveUsers(db);
    }
  }
  // Fire seed, but don't block usage
  seed();

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
      localStorage.setItem(LS_SESSION, JSON.stringify({username, role:'user'}));
      return {ok:true};
    }
  };
})();
</script>