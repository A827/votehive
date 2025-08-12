/* VoteHive header + collapsible sidebar (ES5 only)
   Requires on each page:
   - Tailwind CSS
   - <div id="vh-header"></div>
   - Scripts in order: auth.js -> guard.js -> header.js
*/
(function () {
  var MOUNT_ID = 'vh-header';
  var EMIT_KEY = '__vh_emit__';

  // -------- helpers --------
  function getSession() {
    try {
      if (window.VHAuth && typeof window.VHAuth.current === 'function') {
        return window.VHAuth.current();
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch (e2) { return null; }
  }
  function isAdmin(u){ return !!(u && (u.role === 'admin' || u.role === 'superadmin')); }
  function isSuper(u){ return !!(u && u.role === 'superadmin'); }
  function safeInitial(name){ name = name || 'U'; return (name.charAt(0) || 'U').toUpperCase(); }

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
    var active = isActiveHref(href);
    var base = 'px-3 py-2 text-sm rounded hover:bg-white/10';
    var on   = 'bg-white/20';
    return '<a href="' + href + '" class="' + base + (active ? ' ' + on : '') + (extraClasses ? ' ' + extraClasses : '') + '"' + (active ? ' aria-current="page"' : '') + '>' + text + '</a>';
  }
  function sideLink(href, text, icon, danger) {
    var active = isActiveHref(href);
    var base = 'flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100';
    var on   = ' bg-gray-100';
    var color = danger ? ' text-red-700' : (active ? ' text-indigo-700' : ' text-gray-700');
    var ic = icon || '•';
    return '<a href="' + href + '" class="' + base + (active ? on : '') + '"><span class="w-5 text-center">' + ic + '</span><span class="' + color + '">' + text + '</span></a>';
  }
  function withNext(url) {
    var next = encodeURIComponent(location.pathname + location.search + location.hash);
    var hasQ = url.indexOf('?') >= 0;
    return url + (hasQ ? '&' : '?') + 'next=' + next;
  }

  // -------- render --------
  function render() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    // wait for auth seeding if available
    try {
      if (window.VHAuth && typeof window.VHAuth.ready === 'function') {
        var p = window.VHAuth.ready();
        if (p && typeof p.then === 'function') {
          p.then(doRender, function(){ doRender(); });
          return;
        }
      }
    } catch (e) {}
    doRender();

    function doRender() {
      var me = getSession();

      var topHtml = ''
        + '<header class="bg-gradient-to-r from-indigo-700 to-purple-700 text-white relative z-40">'
        + '  <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">'
        + '    <div class="flex items-center gap-3">'
        + '      <button id="vh-open-sidebar" class="p-2 rounded hover:bg-white/10" aria-label="Open Menu" aria-expanded="false" aria-controls="vh-sidebar">☰</button>'
        + '      <a href="index.html" class="flex items-center gap-2">'
        + '        <img src="/logo.svg" alt="VoteHive" class="w-8 h-8">'
        + '        <span class="text-xl font-bold">VoteHive</span>'
        + '      </a>'
        + '    </div>'
        + '    <nav class="hidden md:flex items-center gap-1">'
        +         navLink('index.html','Home')
        +         navLink('browse.html','Browse')
        +         navLink('leaderboard.html','Leaderboard')
        +         (me ? navLink('applications.html','Applications') : '')
        +         (me ? navLink('my-polls.html','My Polls') : '')
        +         (me ? navLink('create.html','Apply to Create') : '')
        +         (isAdmin(me) ? navLink('moderation.html','Moderation') : '')
        +         (isAdmin(me) ? navLink('analytics.html','Analytics') : '')
        +         (isSuper(me) ? navLink('users.html','Users') : '')
        + '    </nav>'
        + '    <div class="flex items-center gap-2">'
        +       (!me
                  ? ('<a id="vh-login" href="login.html" class="hidden md:inline-block bg-white text-purple-700 px-3 py-2 rounded text-sm hover:bg-gray-100">Log In</a>'
                     + '<a id="vh-signup" href="signup.html" class="hidden md:inline-block border border-white/80 px-3 py-2 rounded text-sm hover:bg-white hover:text-purple-700">Sign Up</a>')
                  : ('<a href="profile.html?u=' + encodeURIComponent(me.username) + '" class="hidden md:flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10">'
                     + '<div class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-semibold">' + safeInitial(me.username) + '</div>'
                     + '<span class="text-sm">' + me.username + '</span>'
                     + '</a>'
                     + '<button id="vh-logout" class="hidden md:inline-block bg-white/10 hover:bg-white/20 px-3 py-2 rounded text-sm">Log Out</button>')
                )
        + '    </div>'
        + '  </div>'
        + '</header>'
        + '<div id="vh-overlay" class="fixed inset-0 bg-black/40 hidden z-40"></div>'
        + '<aside id="vh-sidebar" class="fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-200 shadow-xl transform -translate-x-full transition-transform duration-200 z-50">'
        + '  <div class="px-4 py-4 border-b flex items-center justify-between">'
        + '    <div class="flex items-center gap-2">'
        + '      <img src="/logo.svg" alt="" class="w-6 h-6"><span class="font-semibold">Menu</span>'
        + '    </div>'
        + '    <button id="vh-close-sidebar" class="p-2 rounded hover:bg-gray-100" aria-label="Close Menu">✕</button>'
        + '  </div>'
        + '  <nav class="px-2 py-3 space-y-1 text-sm">'
        +       sideLink('index.html','Home','H')
        +       sideLink('browse.html','Browse','B')
        +       sideLink('leaderboard.html','Leaderboard','L')
        +       (me ? sideLink('applications.html','Applications','A') : '')
        +       (me ? sideLink('my-polls.html','My Polls','P') : '')
        +       (me ? sideLink('create.html','Apply to Create','C') : '')
        +       (isAdmin(me) ? sideLink('moderation.html','Moderation','M') : '')
        +       (isAdmin(me) ? sideLink('analytics.html','Analytics','N') : '')
        +       (isSuper(me) ? sideLink('users.html','Users','U') : '')
        +       (!me
                  ? ('<hr class="my-2">'
                     + '<a id="vh-login-m" href="login.html" class="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100"><span class="w-5 text-center">IN</span><span>Log In</span></a>'
                     + '<a id="vh-signup-m" href="signup.html" class="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100"><span class="w-5 text-center">UP</span><span>Sign Up</span></a>')
                  : ('<hr class="my-2">'
                     + '<a href="profile.html?u=' + encodeURIComponent(me.username) + '" class="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100"><span class="w-5 text-center">PR</span><span>Profile</span></a>'
                     + '<button id="vh-logout-m" class="w-full text-left flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100"><span class="w-5 text-center">LO</span><span>Log Out</span></button>')
                )
        + '  </nav>'
        + '</aside>';

      mount.innerHTML = topHtml;

      // add ?next=
      function addNext(id, url){
        var el = document.getElementById(id);
        if (el) el.href = withNext(url);
      }
      addNext('vh-login', 'login.html');
      addNext('vh-signup','signup.html');
      addNext('vh-login-m','login.html');
      addNext('vh-signup-m','signup.html');

      // sidebar open/close
      var sidebar = document.getElementById('vh-sidebar');
      var overlay = document.getElementById('vh-overlay');
      var openBtn = document.getElementById('vh-open-sidebar');
      var closeBtn= document.getElementById('vh-close-sidebar');

      function hasClass(el, cls){ return el.className.indexOf(cls) !== -1; }
      function addClass(el, cls){ if (!hasClass(el, cls)) el.className += ' ' + cls; }
      function removeClass(el, cls){ el.className = el.className.replace(new RegExp('\\b' + cls + '\\b','g'), '').replace(/\s{2,}/g,' ').trim(); }

      function openSide(){
        if (!sidebar || !overlay) return;
        removeClass(sidebar, '-translate-x-full');
        removeClass(overlay, 'hidden');
        if (openBtn) openBtn.setAttribute('aria-expanded','true');
      }
      function closeSide(){
        if (!sidebar || !overlay) return;
        addClass(sidebar, '-translate-x-full');
        addClass(overlay, 'hidden');
        if (openBtn) openBtn.setAttribute('aria-expanded','false');
      }

      if (openBtn) openBtn.onclick = openSide;
      if (closeBtn) closeBtn.onclick = closeSide;
      if (overlay) overlay.onclick = closeSide;
      window.addEventListener('keydown', function(e){ if (e && e.key === 'Escape') closeSide(); });

      // close on sidebar link click
      try {
        var links = sidebar.getElementsByTagName('a');
        for (var i=0;i<links.length;i++){
          links[i].addEventListener('click', closeSide);
        }
      } catch (e3) {}

      // logout
      function doLogout() {
        try { if (window.VHAuth && typeof window.VHAuth.logout === 'function') window.VHAuth.logout(); } catch (e) {}
        try { localStorage.setItem(EMIT_KEY, 'logout:' + Date.now()); } catch (e2) {}
        render();
      }
      var lo = document.getElementById('vh-logout');
      if (lo) lo.addEventListener('click', doLogout);
      var lom = document.getElementById('vh-logout-m');
      if (lom) lom.addEventListener('click', doLogout);
    }
  }

  // initial render
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  // re-render on auth/route changes
  window.addEventListener('storage', function (e) {
    if (e && (e.key === 'currentUser' || e.key === EMIT_KEY)) render();
  });
  window.addEventListener('popstate', render);
  window.addEventListener('hashchange', render);

  // tiny API
  window.VHHeader = { render: render };
})();