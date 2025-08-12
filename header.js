/* VoteHive header + sidebar (ES5 + debug)
   Load on every page AFTER:
   <div id="vh-header"></div>
   <script src="auth.js"></script>
   <script src="guard.js"></script>
*/
(function(){
  var MOUNT_ID='vh-header';
  var EMIT_KEY='__vh_emit__';

  // --- tiny in-page debug toaster (shows errors briefly) ---
  (function(){
    if (document.getElementById('vh-debug')) return;
    var box=document.createElement('div');
    box.id='vh-debug';
    box.style.cssText='position:fixed;bottom:8px;left:8px;max-width:60vw;z-index:99999;background:#111827;color:#fff;border-radius:8px;padding:8px 10px;font:12px/1.4 ui-monospace,monospace;box-shadow:0 4px 16px rgba(0,0,0,.3);display:none';
    document.documentElement.appendChild(box);
    function show(msg){
      try{
        box.style.display='block';
        var p=document.createElement('div'); p.textContent=msg;
        box.appendChild(p);
        setTimeout(function(){ box.style.display='none'; box.innerHTML=''; }, 7000);
      }catch(e){}
    }
    window.addEventListener('error', function(e){ show('JS Error: '+(e && e.message ? e.message : 'unknown')); });
  })();

  // --- CSS (inline, ES5-safe) ---
  function injectCSS(){
    if (document.getElementById('vh-header-styles')) return;
    var css=''
      +'.vh-top{background:linear-gradient(90deg,#4f46e5,#7c3aed);color:#fff}'
      +'.vh-wrap{max-width:72rem;margin:0 auto;padding:0 16px}'
      +'.vh-btn{padding:8px 12px;border-radius:8px;font-size:14px;background:rgba(255,255,255,.12);color:#fff;border:0;cursor:pointer}'
      +'.vh-btn:hover{background:rgba(255,255,255,.2)}'
      +'.vh-avatar{width:28px;height:28px;border-radius:9999px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:600}'
      +'.vh-nav a{padding:8px 12px;border-radius:8px;color:#fff;text-decoration:none;display:inline-block}'
      +'.vh-nav a.active{background:rgba(255,255,255,.18)}'
      +'.vh-side{position:fixed;top:0;left:0;height:100%;width:260px;background:#fff;box-shadow:0 12px 28px rgba(0,0,0,.18);transform:translateX(-100%);transition:transform .2s ease;z-index:600;display:flex;flex-direction:column}'
      +'.vh-side.open{transform:translateX(0)}'
      +'.vh-side-hd{padding:12px 14px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between}'
      +'.vh-side nav{padding:8px}'
      +'.vh-side nav a{display:block;padding:10px 12px;border-radius:8px;color:#111827;text-decoration:none}'
      +'.vh-side nav a:hover{background:#f3f4f6}'
      +'.vh-side nav a.active{background:#eef2ff;color:#3730a3}'
      +'.vh-ov{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.35);opacity:0;pointer-events:none;transition:opacity .2s;z-index:590}'
      +'.vh-ov.show{opacity:1;pointer-events:auto}'
      +'@media(min-width:768px){.vh-hide-md{display:none}}'
      +'@media(max-width:767.98px){.vh-show-md{display:none}}'
    ;
    var s=document.createElement('style');
    s.id='vh-header-styles';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  }

  // --- utils ---
  function safeInitial(name){ name=name||'U'; return (name.charAt(0)||'U').toUpperCase(); }
  function pageKey(){ var f=location.pathname.split('/').pop(); if(!f) f='index.html'; return f.toLowerCase(); }
  function isActive(href){ var here=pageKey(); var key=(href||'').toLowerCase(); return key===here || (key==='index.html' && (here===''||here==='index.html')); }
  function withNext(url){ var next=encodeURIComponent(location.pathname+location.search+location.hash); return url+(url.indexOf('?')>-1?'&':'?')+'next='+next; }
  function getSession(cb){
    try{
      if (window.VHAuth && typeof window.VHAuth.ready==='function'){
        var p=window.VHAuth.ready();
        if (p && typeof p.then==='function'){
          p.then(function(){ cb(read()); })["catch"](function(){ cb(read()); });
          return;
        }
      }
    }catch(e){}
    cb(read());
    function read(){
      try{
        if (window.VHAuth && typeof window.VHAuth.current==='function') return window.VHAuth.current();
        var raw=localStorage.getItem('currentUser'); return raw?JSON.parse(raw):null;
      }catch(e2){ return null; }
    }
  }
  function isAdmin(u){ return !!(u && (u.role==='admin' || u.role==='superadmin')); }
  function isSuper(u){ return !!(u && u.role==='superadmin'); }

  // --- builders ---
  function navLink(href,text){
    var act=isActive(href)?' active':'';
    return '<a href="'+href+'" class="'+act+'">'+text+'</a>';
  }
  function buildTop(me){
    var left =
      '<a href="index.html" style="display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none">'
      +'<img src="/logo.svg" alt="VoteHive" style="width:32px;height:32px">'
      +'<strong style="font-size:20px">VoteHive</strong>'
      +'</a>';
    var center =
      '<nav class="vh-nav vh-show-md" style="display:flex;gap:6px">'
      +navLink('index.html','Home')
      +navLink('browse.html','Browse')
      +navLink('leaderboard.html','Leaderboard')
      +(me?navLink('create.html','Apply'):'')
      +'</nav>';
    var right;
    if (!me){
      right =
        '<a id="vh-login"  href="login.html"  class="vh-btn vh-show-md" style="background:#fff;color:#4f46e5">Log In</a>'
       +'<a id="vh-signup" href="signup.html" class="vh-btn vh-show-md" style="border:1px solid rgba(255,255,255,.8)">Sign Up</a>'
       +'<button id="vh-burger" class="vh-btn vh-hide-md" aria-label="Menu">☰</button>';
    } else {
      right =
        '<a href="profile.html?u='+encodeURIComponent(me.username)+'" class="vh-show-md" style="display:inline-flex;gap:8px;align-items:center;text-decoration:none;color:#fff">'
       +'<span class="vh-avatar">'+safeInitial(me.username)+'</span><span style="font-size:14px">'+me.username+'</span></a>'
       +'<button id="vh-logout" class="vh-btn vh-show-md">Log Out</button>'
       +'<button id="vh-burger" class="vh-btn vh-hide-md" aria-label="Menu">☰</button>';
    }
    return ''
      +'<header class="vh-top">'
      +  '<div class="vh-wrap" style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:8px">'
      +    left + center + '<div style="display:flex;gap:8px;align-items:center">'+ right +'</div>'
      +  '</div>'
      +'</header>';
  }
  function buildSidebar(me){
    var links=[ ['index.html','Home'], ['browse.html','Browse'], ['leaderboard.html','Leaderboard'] ];
    if (me){
      links.push(['applications.html','Applications']);
      links.push(['my-polls.html','My Polls']);
      links.push(['create.html','Apply to Create']);
      if (isAdmin(me)) links.push(['moderation.html','Moderation']);
      if (isSuper(me)) links.push(['users.html','Users']);
      links.push(['feed.html','Feed']);
    } else {
      links.push(['login.html','Log In']);
      links.push(['signup.html','Sign Up']);
    }
    var out='', i;
    for (i=0;i<links.length;i++){
      var href=links[i][0], txt=links[i][1];
      out += '<a href="'+href+'" class="'+(isActive(href)?'active':'')+'">'+txt+'</a>';
    }
    return ''
      +'<aside id="vh-side" class="vh-side">'
      +  '<div class="vh-side-hd"><strong>Menu</strong><button id="vh-close" class="vh-btn">✕</button></div>'
      +  '<nav>'+ out +'</nav>'
      +'</aside>'
      +'<div id="vh-ov" class="vh-ov"></div>';
  }

  // --- toggle ---
  function openSide(){ var s=document.getElementById('vh-side'); var o=document.getElementById('vh-ov'); if (s) s.classList.add('open'); if (o) o.classList.add('show'); }
  function closeSide(){ var s=document.getElementById('vh-side'); var o=document.getElementById('vh-ov'); if (s) s.classList.remove('open'); if (o) o.classList.remove('show'); }

  // --- render ---
  function render(){
    try{
      injectCSS();
      var mount=document.getElementById(MOUNT_ID);
      if (!mount) return;
      getSession(function(me){
        mount.innerHTML = buildTop(me);
        // rebuild sidebar
        try {
          var oldS=document.getElementById('vh-side'); if (oldS && oldS.parentNode) oldS.parentNode.removeChild(oldS);
          var oldO=document.getElementById('vh-ov');   if (oldO && oldO.parentNode) oldO.parentNode.removeChild(oldO);
        }catch(e){}
        var wrap=document.createElement('div'); wrap.innerHTML=buildSidebar(me);
        while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

        // add ?next= to auth links
        var L1=document.getElementById('vh-login'); if (L1) L1.setAttribute('href', withNext('login.html'));
        var S1=document.getElementById('vh-signup'); if (S1) S1.setAttribute('href', withNext('signup.html'));
        var L2=document.querySelector('.vh-side nav a[href="login.html"]'); if (L2) L2.setAttribute('href', withNext('login.html'));
        var S2=document.querySelector('.vh-side nav a[href="signup.html"]'); if (S2) S2.setAttribute('href', withNext('signup.html'));

        // wire toggles
        var burger=document.getElementById('vh-burger');
        var close=document.getElementById('vh-close');
        var ov=document.getElementById('vh-ov');
        if (burger) burger.onclick=function(){ openSide(); };
        if (close)  close.onclick=function(){ closeSide(); };
        if (ov)     ov.onclick=function(){ closeSide(); };
        window.addEventListener('keydown', function(e){ if (e && e.key==='Escape') closeSide(); });

        // logout
        var lo=document.getElementById('vh-logout');
        if (lo) lo.onclick=function(){
          try{ if (window.VHAuth && typeof window.VHAuth.logout==='function') window.VHAuth.logout(); }catch(e){}
          try{ localStorage.setItem(EMIT_KEY,'logout:'+Date.now()); }catch(e){}
          closeSide(); render();
        };
      });
    }catch(err){
      try{ var box=document.getElementById('vh-debug'); if (box){ box.style.display='block'; box.textContent='Header render failed: '+err.message; } }catch(e){}
      try{ console.error('Header render failed:', err); }catch(e2){}
    }
  }

  // initial + listeners
  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', render); } else { render(); }
  window.addEventListener('storage', function(e){ if (e && (e.key==='currentUser' || e.key===EMIT_KEY)) render(); });
  window.addEventListener('popstate', render);
  window.addEventListener('hashchange', render);

  // expose
  window.VHHeader={ render:render, open:openSide, close:closeSide };
})();