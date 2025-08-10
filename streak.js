// streak.js — tiny daily streak tracker (localStorage only)
// Shows a "🔥 Day X" badge if streak >= 1 via renderStreakBadge(container)
// Also keeps a per-user count in localStorage: vh_streaks

(function(){
  function todayKey(d=new Date()){
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  const session = (window.VHAuth?.current?.() || {username:'guest', role:'user'});
  const user = session.username;
  const STREAKS_KEY = 'vh_streaks';
  const LAST_KEY    = 'vh_lastSeen';

  function getStreaks(){ try { return JSON.parse(localStorage.getItem(STREAKS_KEY)||'{}'); } catch { return {}; } }
  function setStreaks(d){ localStorage.setItem(STREAKS_KEY, JSON.stringify(d)); }
  function getLast(){ try { return JSON.parse(localStorage.getItem(LAST_KEY)||'{}'); } catch { return {}; } }
  function setLast(d){ localStorage.setItem(LAST_KEY, JSON.stringify(d)); }

  function diffDays(a, b){
    const da = new Date(a+'T00:00:00'), db = new Date(b+'T00:00:00');
    return Math.round((db - da)/86400000);
  }

  function touch(){
    const streaks = getStreaks();
    const last    = getLast();
    const today   = todayKey();
    const prev    = last[user];

    if (!prev){ // first time
      streaks[user] = 1;
      last[user] = today;
    } else {
      const delta = diffDays(prev, today);
      if (delta === 0){
        // already visited today — do nothing
      } else if (delta === 1){
        streaks[user] = (streaks[user]||0) + 1;
        last[user] = today;
      } else if (delta > 1){
        // missed days — reset
        streaks[user] = 1;
        last[user] = today;
      } // delta < 0 (clock change) — ignore
    }

    setStreaks(streaks);
    setLast(last);
  }

  function get(){
    const streaks = getStreaks();
    return streaks[user] || 0;
  }

  function badgeHtml(n){
    if (!n) return '';
    return `<span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">🔥 Day ${n}</span>`;
  }

  // Public API
  window.renderStreakBadge = function(container){
    if (!container) return;
    container.innerHTML = badgeHtml(get());
  };

  // On load, update today’s streak
  try { touch(); } catch(e){}
})();