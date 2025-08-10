/* dataClient.js
 * Swap localStorage → API later without touching UI.
 * Includes lightweight client-side rate limiting & device fingerprint.
 */
(function () {
  const DC = {};
  const NS = {
    polls: 'customPolls',
    votes: 'pollVotes',
    votesByUser: 'vh_votesByUser',
    deviceVotes: 'vh_pollDeviceVotes',
    flags: 'pollFlags',
    flagsByUser: 'vh_flagsByUser',
    points: 'userPoints',
    earned: 'vh_pointsEarned',
    comments: 'pollComments',
    profiles: 'vh_profiles',
    rl: 'vh_rateLimits'
  };

  // --------- utils ----------
  function parse(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || fallback); } catch { return JSON.parse(fallback); }
  }
  function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function now() { return Date.now(); }

  function getDeviceId() {
    let id = localStorage.getItem('vh_device');
    if (!id) { id = 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('vh_device', id); }
    return id;
  }

  // --------- rate limit ----------
  // sliding window per (action:key)
  DC.rateLimit = {
    check(action, key, limit = 5, windowMs = 60_000) {
      const table = parse(NS.rl, '{}');
      const k = `${action}:${key}`;
      const nowTs = now();
      let arr = table[k] || [];
      // prune old
      arr = arr.filter(ts => nowTs - ts < windowMs);
      if (arr.length >= limit) {
        table[k] = arr; save(NS.rl, table);
        return { ok: false, remaining: 0, resetMs: windowMs - (nowTs - arr[0]) };
      }
      arr.push(nowTs);
      table[k] = arr; save(NS.rl, table);
      return { ok: true, remaining: Math.max(0, limit - arr.length), resetMs: windowMs - (nowTs - arr[0]) };
    }
  };

  // --------- identity ----------
  DC.session = () => (window.VHAuth?.current?.() || { username: 'guest', role: 'user' });
  DC.deviceId = getDeviceId;

  // --------- polls ----------
  DC.polls = {
    all() { return parse(NS.polls, '{}'); },
    get(id) { return this.all()[id]; },
    listVisible() {
      return Object.entries(this.all()).filter(([id, p]) => p && !p.hidden);
    },
    saveAll(obj) { save(NS.polls, obj); },
    create(id, data) {
      const all = this.all();
      all[id] = data;
      save(NS.polls, all);
      return id;
    },
    update(id, patch) {
      const all = this.all(); all[id] = { ...(all[id] || {}), ...patch }; save(NS.polls, all);
    }
  };

  // --------- votes ----------
  DC.votes = {
    _all() { return parse(NS.votes, '{}'); },
    forPoll(pollId) { return this._all()[pollId] || {}; },
    totalFor(pollId) { return Object.values(this.forPoll(pollId)).reduce((a, b) => a + b, 0); },
    add(pollId, option) {
      const v = this._all();
      const map = v[pollId] || {};
      map[option] = (map[option] || 0) + 1;
      v[pollId] = map; save(NS.votes, v);
    },
    markUserVoted(user, pollId, option) {
      const vu = parse(NS.votesByUser, '{}'); const mine = vu[user] || {};
      mine[pollId] = option; vu[user] = mine; save(NS.votesByUser, vu);
    },
    userChoice(user, pollId) {
      const vu = parse(NS.votesByUser, '{}'); return (vu[user] || {})[pollId];
    },
    markDeviceVoted(pollId, deviceId) {
      const dv = parse(NS.deviceVotes, '{}'); const row = dv[pollId] || {};
      row[deviceId] = true; dv[pollId] = row; save(NS.deviceVotes, dv);
    },
    deviceVoted(pollId, deviceId) {
      const dv = parse(NS.deviceVotes, '{}'); return !!((dv[pollId] || {})[deviceId]);
    }
  };

  // --------- flags ----------
  DC.flags = {
    add(pollId, user) {
      const f = parse(NS.flags, '{}'); f[pollId] = (f[pollId] || 0) + 1; save(NS.flags, f);
      const fu = parse(NS.flagsByUser, '{}'); const mine = fu[user] || {}; mine[pollId] = true; fu[user] = mine; save(NS.flagsByUser, fu);
    },
    userFlagged(user, pollId) { const fu = parse(NS.flagsByUser, '{}'); return !!((fu[user] || {})[pollId]); },
    count(pollId) { return (parse(NS.flags, '{}')[pollId] || 0); }
  };

  // --------- comments ----------
  DC.comments = {
    all() { return parse(NS.comments, '{}'); },
    list(pollId) { return this.all()[pollId] || []; },
    add(pollId, item) {
      const all = this.all(); const list = all[pollId] || [];
      list.push(item); all[pollId] = list; save(NS.comments, all);
    },
    delete(pollId, id) {
      const all = this.all(); const list = (all[pollId] || []).filter(x => x.id !== id);
      all[pollId] = list; save(NS.comments, all);
    }
  };

  // --------- points / earned ----------
  DC.points = {
    all() { return parse(NS.points, '{}'); },
    add(user, amount) { const p = this.all(); p[user] = (p[user] || 0) + amount; save(NS.points, p); },
    get(user) { return this.all()[user] || 0; }
  };
  DC.earned = {
    all() { return parse(NS.earned, '{}'); },
    has(key) { return !!this.all()[key]; },
    mark(key) { const e = this.all(); e[key] = true; save(NS.earned, e); }
  };

  // --------- profiles ----------
  DC.profiles = {
    all() { return parse(NS.profiles, '{}'); },
    get(user) { return this.all()[user] || null; },
    save(user, profile) { const all = this.all(); all[user] = profile; save(NS.profiles, all); }
  };

  // expose
  window.DataClient = DC;
})();