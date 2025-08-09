/* ===========================================
   VoteHive – Local Auth (no backend) v1
   Stores users & sessions in localStorage.
   Keys:
     - vh_users       : { [username]: { password, email } }
     - vh_user        : { username, email }
     - vh_is_admin    : "1" | "0"
   =========================================== */

/* EDIT THIS: superadmin usernames or emails */
const VH_SUPERADMINS = [
  "admin",             // username
  "you@example.com"    // email
];

/* ---- Storage helpers ---- */
function vh_getUsers() {
  try { return JSON.parse(localStorage.getItem("vh_users") || "{}"); } catch { return {}; }
}
function vh_setUsers(u) { localStorage.setItem("vh_users", JSON.stringify(u)); }
function vh_getUser() { try { return JSON.parse(localStorage.getItem("vh_user") || "null"); } catch { return null; } }
function vh_setUser(u) { if (u) localStorage.setItem("vh_user", JSON.stringify(u)); else localStorage.removeItem("vh_user"); }
function vh_setAdminFlag(flag) { localStorage.setItem("vh_is_admin", flag ? "1" : "0"); }
function vh_isAdmin() { return localStorage.getItem("vh_is_admin") === "1"; }

/* ---- Auth API (exposed on window) ---- */
window.VHAuth = {
  register(username, password, email) {
    username = (username || "").trim().toLowerCase();
    email = (email || "").trim().toLowerCase();
    if (!username || !password) throw new Error("Username and password are required.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    const users = vh_getUsers();
    if (users[username]) throw new Error("Username already exists.");
    users[username] = { password, email };
    vh_setUsers(users);
    // auto-login after register
    VHAuth.login(username, password);
  },

  login(username, password) {
    username = (username || "").trim().toLowerCase();
    const users = vh_getUsers();
    const rec = users[username];
    if (!rec || rec.password !== password) throw new Error("Invalid username or password.");
    const email = rec.email || "";
    vh_setUser({ username, email });
    const isAdmin = VHAuth._isSuperadmin(username, email);
    vh_setAdminFlag(isAdmin);
  },

  logout() {
    vh_setUser(null);
    vh_setAdminFlag(false);
  },

  currentUser() { return vh_getUser(); },

  _isSuperadmin(username, email) {
    const u = (username || "").toLowerCase();
    const e = (email || "").toLowerCase();
    return VH_SUPERADMINS.includes(u) || VH_SUPERADMINS.includes(e);
  }
};

/* ---- Header injection (Login/Logout/Admin) ---- */
document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector("header nav");
  if (!nav) return;

  // Remove any existing "Log In" buttons so we control it
  [...nav.querySelectorAll("a")].forEach(a => {
    if ((a.textContent || "").trim().toLowerCase() === "log in") a.remove();
  });

  const user = vh_getUser();
  const wrap = document.createElement("div");
  wrap.className = "flex items-center gap-2";

  if (user) {
    // Logged-in: show username + Logout, and Admin if applicable
    if (vh_isAdmin()) {
      const adminLink = document.createElement("a");
      adminLink.href = "admin.html";
      adminLink.className = "bg-white text-purple-700 px-3 py-1 rounded hover:bg-gray-200 text-sm";
      adminLink.textContent = "Admin";
      wrap.appendChild(adminLink);
    }

    const userBadge = document.createElement("span");
    userBadge.className = "text-sm bg-white bg-opacity-20 px-2 py-1 rounded";
    userBadge.textContent = user.username || "User";
    wrap.appendChild(userBadge);

    const logoutBtn = document.createElement("button");
    logoutBtn.className = "bg-white text-purple-700 px-3 py-1 rounded hover:bg-gray-200 text-sm";
    logoutBtn.textContent = "Log Out";
    logoutBtn.addEventListener("click", () => {
      VHAuth.logout();
      location.reload();
    });
    wrap.appendChild(logoutBtn);
  } else {
    // Logged-out: show Login link
    const loginLink = document.createElement("a");
    const ret = encodeURIComponent(location.pathname + location.search);
    loginLink.href = `login.html?return=${ret}`;
    loginLink.className = "bg-white text-purple-700 px-3 py-1 rounded hover:bg-gray-200 text-sm";
    loginLink.textContent = "Log In";
    wrap.appendChild(loginLink);
  }

  nav.appendChild(wrap);
});