/* VoteHive unified header (role-aware, consistent across pages)
   Requirements on each page:
   - Tailwind included
   - <div id="vh-header"></div>
   - scripts loaded in order: auth.js -> guard.js -> header.js
*/
(function () {
  var MOUNT_ID = 'vh-header';
  var EMIT_KEY = '__vh_emit__';

  // ------- helpers -------
  function getSession() {
    // returns a Promise that resolves with the current session (or null)
    return new Promise(function (resolve) {
      try {
        if (window.VHAuth && typeof window.VHAuth.ready === 'function') {
          var p = window.VHAuth.ready();
          if (p && typeof p.then === 'function') {
            p.then(function () {
              try {
                if (window.VHAuth && typeof window.VHAuth.current === 'function') {
                  resolve(window.VHAuth.current());
                  return;
                }
              } catch (e) {}
              try {
                resolve(JSON.parse(localStorage.getItem('currentUser') || 'null'));
              } catch (e2) { resolve(null); }
            }).catch(function(){ resolve(fallbackSession()); });
            return;
          }
        }
      } catch (e) {}
      resolve(fallbackSession());
    });
  }
  function fallbackSession() {
    try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); }
    catch (e) { return null; }
  }

  function isAdmin(user) { return !!(user && (user.role === 'admin' || user.role === 'superadmin')); }
  function isSuper(user) { return !!(user && user.role === 'superadmin'); }
  function safeInitial(name) {
    name = name || 'U';
    return (name[0] ? name[0] : 'U').toUpperCase();
  }

  function currentPageKey() {
    var file = location.pathname.split('/').pop() || '';
    if (!file) file = 'index.html';
    return file.toLowerCase();
  }

  function isActiveHref(href) {
    var here = currentPageKey();
    var key  = (href || '').toLowerCase();
    return key === here || (key === 'index.html' && (here === '' || here === 'index.html'));
  }

  function navLink(href, text, extraClasses) {
    extraClasses = extraClasses || '';
    var active = isActiveHref(href);
    var base = 'px-3 py-2 text-sm rounded hover:bg-white/10';
    var on   = 'bg-white/20';
    return '<a href="' + href + '" class="' + base + ' ' + (active ? on : '') + ' ' + extraClasses + '" ' + (active ? 'aria-current="page"' : '') + '>' + text + '</a>';
  }

  function withNext(url) {
    var next = encodeURIComponent(location.pathname + location.search + location.hash);
    var hasQ = url.indexOf('?') >= 0;
    return url + (hasQ ? '&' : '?') + 'next=' + next;
  }

  // Robust logout: clear all known keys, emit cross-tab event, hard reload
  function hardLogout() {
    try { window.VHAuth && typeof window.VHAuth.logout === 'function' && window.VHAuth.logout(); } catch (e) {}
    try { localStorage.removeItem('currentUser'); } catch (e1) {}
    try { localStorage.removeItem('session'); } catch (e2) {}        // legacy
    try { localStorage.removeItem('vh_is_admin'); } catch (e3) {}    // legacy
    try { localStorage.setItem(EMIT_KEY, 'logout:' + Date.now()); } catch (e4) {}
    location.reload();
  }

  // ------- render -------
  function render() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    getSession().then(function (me) {
      mount.innerHTML =
        '<header class="bg-gradient-to-r from-indigo-700 to-purple-700 text-white">' +
          '<div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">' +
            '<a href="index.html" class="flex items-center gap-3">' +
              '<img src="/logo.svg" alt="VoteHive" class="w-8 h-8">' +
              '<span class="text-xl font-bold">VoteHive</span>' +
            '</a>' +

            '<nav class="hidden md:flex items-center gap-1">' +
              navLink('index.html', 'Home') +
              navLink('browse.html', 'Browse') +
              navLink('leaderboard.html', 'Leaderboard') +
              (me ? navLink('applications.html', 'Applications') : '') +
              (me ? navLink('my-polls.html', 'My Polls') : '') +
              (me ? navLink('create.html', 'Apply to Create') : '') +
              (isAdmin(me) ? navLink('moderation.html', 'Moderation') : '') +
              (isSuper(me) ? navLink('users.html', 'Users') : '') +
            '</nav>' +

            '<div class="flex items-center gap-2">' +
              (!me
                ? (
                  '<a id="vh-login"  href="login.html"  class="hidden md:inline-block bg-white text-purple-700 px-3 py-2 rounded text-sm hover:bg-gray-100">Log In</a>' +
                  '<a id="vh-signup" href="signup.html" class="hidden md:inline-block border border-white/80 px-3 py-2 rounded text-sm hover:bg-white hover:text-purple-700">Sign Up</a>' +
                  '<button id="vh-open-menu" class="md:hidden p-2 rounded hover:bg-white/10" aria-label="Open Menu" aria-expanded="false" aria-controls="vh-mobile">☰</button>'
                )
                : (
                  '<a href="profile.html?u=' + encodeURIComponent(me.username) + '" class="hidden md:flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10">' +
                    '<div class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-semibold">' + safeInitial(me.username) + '</div>' +
                    '<span class="text-sm">' + me.username + '</span>' +
                  '</a>' +
                  '<button id="vh-logout" class="hidden md:inline-block bg-white/10 hover:bg-white/20 px-3 py-2 rounded text-sm">Log Out</button>' +
                  '<button id="vh-open-menu" class="md:hidden p-2 rounded hover:bg-white/10" aria-label="Open Menu" aria-expanded="false" aria-controls="vh-mobile">☰</button>'
                )
              ) +
            '</div>' +
          '</div>' +

          '<!-- Mobile sheet -->' +
          '<div id="vh-mobile" class="md:hidden hidden border-t border-white/10 bg-gradient-to-r from-indigo-700 to-purple-700">' +
            '<div class="px-4 py-3 flex flex-col gap-2">' +
              navLink('index.html', 'Home', 'block') +
              navLink('browse.html', 'Browse', 'block') +
              navLink('leaderboard.html', 'Leaderboard', 'block') +
              (me ? navLink('applications.html', 'Applications', 'block') : '') +
              (me ? navLink('my-polls.html', 'My Polls', 'block') : '') +
              (me ? navLink('create.html', 'Apply to Create', 'block') : '') +
              (isAdmin(me) ? navLink('moderation.html', 'Moderation', 'block') : '') +
              (isSuper(me) ? navLink('users.html', 'Users', 'block') : '') +
              (!me
                ? (
                  '<a id="vh-login-m"  href="login.html"  class="block px-3 py-2 text-sm rounded bg-white text-purple-700">Log In</a>' +
                  '<a id="vh-signup-m" href="signup.html" class="block px-3 py-2 text-sm rounded border border-white/60">Sign Up</a>'
                )
                : (
                  '<a href="profile.html?u=' + encodeURIComponent(me.username) + '" class="block px-3 py-2 text-sm rounded hover:bg-white/10">Profile</a>' +
                  '<button id="vh-logout-m" class="block text-left px-3 py-2 text-sm rounded bg-white/10 hover:bg-white/20">Log Out</button>'
                )
              ) +
            '</div>' +
          '</div>' +
        '</header>';

      // --- actions ---
      var mobile  = document.getElementById('vh-mobile');
      var menuBtn = document.getElementById('vh-open-menu');

      function toggleMobile(open) {
        if (!mobile || !menuBtn) return;
        var willOpen = (typeof open === 'boolean') ? open : mobile.classList.contains('hidden');
        mobile.classList.toggle('hidden', !willOpen);
        menuBtn.setAttribute('aria-expanded', String(willOpen));
      }

      if (menuBtn) {
        menuBtn.onclick = function () { toggleMobile(); };
        window.addEventListener('keydown', function (e) {
          if (e && e.key === 'Escape') toggleMobile(false);
        });
      }

      if (mobile) {
        var links = mobile.querySelectorAll('a');
        for (var i = 0; i < links.length; i++) {
          links[i].addEventListener('click', function(){ toggleMobile(false); });
        }
      }

      // Add ?next= to auth links so users return after auth
      function addNext(id, url) {
        var el = document.getElementById(id);
        if (el) el.href = withNext(url);
      }
      addNext('vh-login',  'login.html');
      addNext('vh-signup', 'signup.html');
      addNext('vh-login-m',  'login.html');
      addNext('vh-signup-m', 'signup.html');

      // Logout wiring (desktop + mobile)
      var lo  = document.getElementById('vh-logout');
      var lom = document.getElementById('vh-logout-m');
      if (lo)  lo.addEventListener('click', function (e) { e.preventDefault(); hardLogout(); });
      if (lom) lom.addEventListener('click', function (e) { e.preventDefault(); hardLogout(); });
    });
  }

  // Initial render
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  // Re-render when auth or route changes
  window.addEventListener('storage', function (e) {
    if (!e) return;
    if (e.key === 'currentUser' || e.key === EMIT_KEY) render();
  });
  window.addEventListener('popstate', render);
  window.addEventListener('hashchange', render);

  // Expose a tiny API so pages can force a rerender after actions
  window.VHHeader = { render: render };
})();