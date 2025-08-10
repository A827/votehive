// streak.js — daily streak tracker (localStorage only)
// - Keeps per-user streak in localStorage: vh_streaks + vh_lastSeen
// - Call renderStreakBadge(containerOrSelector?) to inject a "🔥 Day X" chip
// - If no arg is given, will render all [data-streak-badge] elements
// - Auto updates at midnight and on auth/user changes

(function () {
  const STREAKS_KEY = 'vh_streaks';
  const LAST_KEY    = 'vh_lastSeen';
  const EMIT_KEY    = '__vh_emit__'; // used by header/logout broadcasts

  // ------- utils -------
  function session() {
    try {
      return (window.VHAuth && typeof VHAuth.current === 'function')
        ? VHAuth.current()
        : JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch { return null; }
  }
  function usernameOrGuest() {
    const s = session();
    return (s && s.username) ? s.username : 'guest';
  }

  function todayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`; // local date
  }

  function diffDays(a, b) {
    // a/b in "YYYY-MM-DD" local form
    const da = new Date(a + 'T00:00:00');
    const db = new Date(b + 'T00:00:00');
    return Math.round((db - da) / 86400000);
  }

  function getJSON(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
    catch { return fallback; }
  }
  function setJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // ------- core -------
  function touch(u = usernameOrGuest()) {
    const streaks = getJSON(STREAKS_KEY, {});
    const last    = getJSON(LAST_KEY, {});
    const today   = todayKey();
    const prev    = last[u];

    if (!prev) {
      streaks[u] = 1;
      last[u] = today;
    } else {
      const delta = diffDays(prev, today);
      if (delta === 0) {
        // already counted today
      } else if (delta === 1) {
        streaks[u] = (streaks[u] || 0) + 1;
        last[u] = today;
      } else if (delta > 1) {
        // missed days — reset
        streaks[u] = 1;
        last[u] = today;
      } // delta < 0 (clock change) — ignore
    }

    setJSON(STREAKS_KEY, streaks);
    setJSON(LAST_KEY, last);
  }

  function get(u = usernameOrGuest()) {
    const streaks = getJSON(STREAKS_KEY, {});
    return streaks[u] || 0;
  }

  function badgeHtml(n) {
    if (!n) return '';
    return `<span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">🔥 Day ${n}</span>`;
  }

  // ------- rendering -------
  function renderOne(el, u) {
    if (!el) return;
    el.innerHTML = badgeHtml(get(u));
  }

  function renderAll(u) {
    document.querySelectorAll('[data-streak-badge]').forEach(el => renderOne(el, u));
  }

  // Public API
  window.renderStreakBadge = function (containerOrSelector) {
    const u = usernameOrGuest();
    if (!containerOrSelector) {
      renderAll(u);
      return;
    }
    if (typeof containerOrSelector === 'string') {
      document.querySelectorAll(containerOrSelector).forEach(el => renderOne(el, u));
      return;
    }
    // assume element
    renderOne(containerOrSelector, u);
  };

  // ------- midnight auto-refresh -------
  function msUntilNextMidnight() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0); // local midnight
    return next - now;
  }
  function scheduleMidnightRefresh() {
    const wait = Math.max(1000, msUntilNextMidnight());
    setTimeout(() => {
      // Touch won't increment unless the date actually advanced
      touch();
      window.renderStreakBadge();
      // schedule again for subsequent day
      scheduleMidnightRefresh();
    }, wait);
  }

  // ------- auth / tab sync -------
  function rerenderOnAuthChange() {
    // re-render on session changes or cross-tab logout
    window.addEventListener('storage', (e) => {
      if (e.key === 'currentUser' || e.key === EMIT_KEY) {
        // Touch for the new user (starts/continues their streak),
        // then re-render all badges
        try { touch(); } catch {}
        window.renderStreakBadge();
      }
    });
  }

  // ------- boot -------
  try { touch(); } catch {}
  window.renderStreakBadge();  // render any [data-streak-badge] on load
  scheduleMidnightRefresh();
  rerenderOnAuthChange();

  // Optional: expose simple getters for other modules
  window.VHStreak = {
    get,
    touch,
    render: window.renderStreakBadge
  };
})();