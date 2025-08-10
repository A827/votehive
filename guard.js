// guard.js — simple auth helpers using localStorage.currentUser
// currentUser shape: { username: "name", role: "user" | "admin" }

window.VHAuth = {
  current() {
    try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); }
    catch { return null; }
  },
  logout() {
    localStorage.removeItem('currentUser');
    location.href = 'index.html';
  }
};

function requireLogin(redirect='login.html') {
  const me = VHAuth.current();
  if (!me) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = `${redirect}?next=${next}`;
  }
}

function requireAdmin(redirect='index.html') {
  const me = VHAuth.current();
  if (!me || (me.role !== 'admin' && me.role !== 'superadmin')) {
    location.href = redirect;
  }
}

function usernameOrGuest() {
  return VHAuth.current()?.username || 'guest';
}