/* VoteHive – Global Auth & Header Mount (localStorage demo)
   - Session: localStorage.session = { username, role, loggedInAt }
   - Users:   localStorage.userList = [{ username, role, createdAt, lastLoginAt }]
   - Auto-injects a username pill + dropdown into the page header.
*/

(function () {
  const LS = {
    session: 'session',
    users: 'userList'
  };

  function getSession() {
    try { return JSON.parse(localStorage.getItem(LS.session) || 'null'); } catch { return null; }
  }
  function setSession(s) { localStorage.setItem(LS.session, JSON.stringify(s)); }
  function clearSession() { localStorage.removeItem(LS.session); }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(LS.users) || '[]'); } catch { return []; }
  }
  function setUsers(list) { localStorage.setItem(LS.users, JSON.stringify(list)); }

  function ensureUser(username, role) {
    const users = getUsers();
    const found = users.find(u => u.username === username);
    const now = new Date().toISOString();
    if (found) {
      found.role = role || found.role || 'user';
      found.lastLoginAt = now;
    } else {
      users.push({ username, role: role || 'user', createdAt: now, lastLoginAt: now });
    }
    setUsers(users);
  }

  // Public API for login/logout so login.html can call it
  window.VHAuth = {
    isLoggedIn() { return !!getSession(); },
    current() { return getSession(); },
    login(username, role) {
      const payload = { username, role: role || 'user', loggedInAt: new Date().toISOString() };
      setSession(payload);
      ensureUser(username, payload.role);
      try { window.dispatchEvent(new CustomEvent('vh-auth-change', { detail: payload })); } catch {}
      return payload;
    },
    logout() {
      clearSession();
      try { window.dispatchEvent(new CustomEvent('vh-auth-change', { detail: null })); } catch {}
    }
  };

  // ---- Header UI injection ----
  function createMenuItem(href, label) {
    const a = document.createElement('a');
    a.href = href; a.textContent = label;
    a.className = 'block px-4 py-2 text-sm hover:bg-gray-100';
    return a;
  }

  function mountHeaderAuth() {
    // Find the first header nav; fallback to header root
    const header = document.querySelector('header');
    if (!header) return;

    // Create container on the right side of the header nav area
    let nav = header.querySelector('nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'flex gap-3 text-sm items-center';
      header.querySelector('div')?.appendChild(nav);
    }

    let mount = document.getElementById('vh-auth');
    if (!mount) {
      mount = document.createElement('div');
      mount.id = 'vh-auth';
      nav.appendChild(mount);
    }

    const sess = getSession();
    if (!sess) {
      mount.innerHTML = `
        <a href="login.html" class="bg-white text-purple-700 px-3 py-1 rounded hover:bg-gray-200">Log In</a>
      `;
      return;
    }

    // Logged-in UI (pill + dropdown)
    const { username, role } = sess;
    mount.innerHTML = `
      <div class="relative">
        <button id="vh-userbtn" class="bg-white text-purple-700 px-3 py-1 rounded hover:bg-gray-200 flex items-center gap-2">
          <span class="inline-block rounded-full bg-purple-600 text-white w-6 h-6 grid place-items-center text-xs">${username.slice(0,1).toUpperCase()}</span>
          <span class="font-medium">${username}</span>
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 11.19l3.71-3.96a.75.75 0 111.08 1.04l-4.25 4.53a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"/></svg>
        </button>
        <div id="vh-menu" class="hidden absolute right-0 mt-2 w-44 bg-white border rounded shadow z-50">
          <a href="my-polls.html" class="block px-4 py-2 text-sm hover:bg-gray-100">My Polls</a>
          <a href="applications.html" class="block px-4 py-2 text-sm hover:bg-gray-100">Applications</a>
          <a href="rewards.html" class="block px-4 py-2 text-sm hover:bg-gray-100">Rewards</a>
          ${role === 'superadmin' ? '<a href="admin-dashboard.html" class="block px-4 py-2 text-sm hover:bg-gray-100">Admin</a>' : ''}
          <button id="vh-logout" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Log Out</button>
        </div>
      </div>
    `;

    const btn = mount.querySelector('#vh-userbtn');
    const menu = mount.querySelector('#vh-menu');
    const logoutBtn = mount.querySelector('#vh-logout');

    btn.addEventListener('click', () => {
      menu.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!mount.contains(e.target)) menu.classList.add('hidden');
    });
    logoutBtn.addEventListener('click', () => {
      VHAuth.logout();
      location.href = 'index.html';
    });
  }

  // Mount now and on auth changes
  document.addEventListener('DOMContentLoaded', mountHeaderAuth);
  window.addEventListener('vh-auth-change', mountHeaderAuth);
})();