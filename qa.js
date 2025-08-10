// qa.js — loads each route in an iframe, runs checks inside, reports pass/fail.
(function(){
  const $ = (s)=>document.querySelector(s);
  const results = $('#results');
  const iframe  = $('#view');
  const runBtn  = $('#run');
  const routesEl= $('#routes');
  const headless= $('#headless');

  const TIMEOUT_MS = 8000;

  function row(title, path){
    const el = document.createElement('div');
    el.className = 'border rounded p-3';
    el.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="font-medium">${title} <span class="text-gray-500 text-xs">${path}</span></div>
        <div class="status"></div>
      </div>
      <div class="mono text-sm mt-2 hidden details"></div>
    `;
    return el;
  }

  function setStatus(el, kind, msg){
    const s = el.querySelector('.status');
    const d = el.querySelector('.details');
    s.innerHTML = `<span class="badge ${kind==='ok'?'ok':kind==='warn'?'warn':'err'}">${kind.toUpperCase()}</span>`;
    if (msg) { d.textContent = msg; d.classList.remove('hidden'); }
  }

  // Code executed inside the tested page (in iframe)
  function inpageChecks(){
    function def(name){ return typeof window[name] !== 'undefined'; }
    function txt(el){ return el ? el.textContent.trim() : ''; }
    const info = {
      location: location.pathname + location.search,
      hasHeaderMount: !!document.getElementById('vh-header'),
      hasHeaderLogout: !!document.querySelector('#vh-header #vh-logout'),
      scripts: {
        hasGuard: !!document.querySelector('script[src*="guard.js"]'),
        hasHeader: !!document.querySelector('script[src*="header.js"]'),
      },
      globals: {
        requireLogin: def('requireLogin') ? 'function' : 'missing',
        requireAdmin: def('requireAdmin') ? 'function' : 'missing',
        Auth: def('Auth') ? 'present' : 'missing',
        VHAuth: def('VHAuth') ? 'present' : 'missing'
      },
      storage: {
        currentUser: (function(){
          try { return JSON.parse(localStorage.getItem('currentUser')||'null'); } catch { return null; }
        })()
      },
      dom: {
        title: txt(document.querySelector('h1, h2'))
      },
      issues: []
    };

    // Page-specific expectations
    const path = location.pathname.toLowerCase();
    const isCreate = path.endsWith('/create.html') || location.search.includes('create.html');
    const isModeration = path.endsWith('/moderation.html') || location.search.includes('moderation.html');

    if (!info.hasHeaderMount) info.issues.push('Missing #vh-header mount.');
    if (!info.scripts.hasHeader) info.issues.push('header.js not included.');
    if (isCreate && !info.scripts.hasGuard) info.issues.push('create.html: guard.js not loaded.');
    if (isCreate && info.globals.requireLogin !== 'function') info.issues.push('create.html: requireLogin() missing.');
    if (isModeration && info.globals.requireAdmin !== 'function') info.issues.push('moderation.html: requireAdmin() missing.');

    // If logged out but on protected page, note it
    if (isCreate && !info.storage.currentUser) info.issues.push('create.html: not logged in (currentUser null).');
    if (isModeration && (!info.storage.currentUser || !['admin','superadmin'].includes((info.storage.currentUser.role||'').toLowerCase())))
      info.issues.push('moderation.html: not admin or not logged in.');

    return info;
  }

  function runOne(path, title){
    return new Promise((resolve)=>{
      const url = new URL(path, location.origin).toString();
      const r = row(title, path);
      results.appendChild(r);

      let done = false;
      const timer = setTimeout(()=>{
        if (done) return;
        done = true;
        setStatus(r, 'err', 'Timeout loading page.');
        resolve();
      }, TIMEOUT_MS);

      function finish(kind, msg){
        if (done) return;
        clearTimeout(timer);
        done = true;
        setStatus(r, kind, msg);
        resolve();
      }

      function loadHandler(){
        try {
          const win = iframe.contentWindow;
          const info = win.__qa_info__ || {};
          const issues = info.issues || ['No issues array returned.'];
          if (!issues.length) finish('ok', JSON.stringify(info, null, 2));
          else {
            const kind = issues.some(i=>/missing|not|error|fail|timeout/i.test(i)) ? 'err' : 'warn';
            finish(kind, JSON.stringify(info, null, 2));
          }
        } catch(e){
          finish('err', 'Cross-frame read error: ' + e.message);
        }
      }

      // Inject a small script into the tested page after it loads
      function inject(){
        try{
          const doc = iframe.contentDocument;
          const s = doc.createElement('script');
          s.type='text/javascript';
          s.textContent = `window.__qa_info__ = (${inpageChecks.toString()})();`;
          doc.documentElement.appendChild(s);
          // give it a tick to execute
          setTimeout(loadHandler, 50);
        }catch(e){
          setStatus(r,'err','Injection failed: '+e.message);
          resolve();
        }
      }

      iframe.removeEventListener('load', inject);
      iframe.addEventListener('load', inject);

      if (!headless.checked) iframe.src = url; else {
        // headless mode: create an off-DOM iframe
        const ifr = document.createElement('iframe');
        ifr.style.display='none';
        document.body.appendChild(ifr);
        const once = ()=>{
          try{
            const doc = ifr.contentDocument;
            const s = doc.createElement('script');
            s.textContent = `window.__qa_info__ = (${inpageChecks.toString()})();`;
            doc.documentElement.appendChild(s);
            setTimeout(()=>{
              try{
                const info = ifr.contentWindow.__qa_info__ || {};
                const issues = info.issues || ['No issues array returned.'];
                const kind = issues.length ? (issues.some(i=>/missing|not|error|fail|timeout/i.test(i)) ? 'err':'warn') : 'ok';
                setStatus(r, kind, JSON.stringify(info, null, 2));
              }catch(e){ setStatus(r,'err', 'Readback failed: '+e.message); }
              document.body.removeChild(ifr);
              resolve();
            }, 80);
          }catch(e){
            setStatus(r,'err','Headless injection failed: '+e.message);
            document.body.removeChild(ifr);
            resolve();
          }
        };
        ifr.addEventListener('load', once);
        ifr.src = url;
      }
    });
  }

  async function runAll(){
    results.innerHTML = '';
    const lines = routesEl.value.split('\n').map(s=>s.trim()).filter(Boolean);
    for (const p of lines) {
      const title = p === '/' ? 'Home' : p.replace(/^\//,'');
      await runOne(p, title);
    }
  }

  runBtn.addEventListener('click', runAll);
})();