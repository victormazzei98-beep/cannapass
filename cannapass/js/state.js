/* ═══════════════════════════════════════════
   CANNAPASS — Global State
   Pub/Sub reactive state management
   ═══════════════════════════════════════════ */

const State = (() => {
  // ─── Internal state ───
  const _state = {
    user: null,           // Supabase auth user
    profile: null,        // profiles table row (role, full_name, etc.)
    patient: null,        // patients table row (registration data)
    currentPage: null,    // current page/route identifier
    theme: null,          // 'dark' | 'light'
    sidebarOpen: false,   // mobile sidebar toggle
    loading: true         // global loading state
  };

  // ─── Subscribers: { key: [callback, ...] } ───
  const _listeners = {};

  // ─── Get a single value ───
  function get(key) {
    if (!(key in _state)) {
      console.warn(`[State] Unknown key: ${key}`);
      return undefined;
    }
    return _state[key];
  }

  // ─── Get all state (shallow copy) ───
  function getAll() {
    return { ..._state };
  }

  // ─── Set a value and notify subscribers ───
  function set(key, value) {
    if (!(key in _state)) {
      console.warn(`[State] Unknown key: ${key}`);
      return;
    }
    const prev = _state[key];
    if (prev === value) return;
    _state[key] = value;
    _notify(key, value, prev);
  }

  // ─── Batch update multiple keys ───
  function update(updates) {
    const changed = [];
    for (const [key, value] of Object.entries(updates)) {
      if (!(key in _state)) {
        console.warn(`[State] Unknown key: ${key}`);
        continue;
      }
      const prev = _state[key];
      if (prev !== value) {
        _state[key] = value;
        changed.push({ key, value, prev });
      }
    }
    changed.forEach(({ key, value, prev }) => _notify(key, value, prev));
  }

  // ─── Subscribe to a key change ───
  function on(key, callback) {
    if (!_listeners[key]) _listeners[key] = [];
    _listeners[key].push(callback);
    // Return unsubscribe function
    return () => {
      _listeners[key] = _listeners[key].filter(cb => cb !== callback);
    };
  }

  // ─── Subscribe to multiple keys ───
  function onAny(keys, callback) {
    const unsubs = keys.map(key => on(key, callback));
    return () => unsubs.forEach(fn => fn());
  }

  // ─── Notify subscribers ───
  function _notify(key, value, prev) {
    if (!_listeners[key]) return;
    _listeners[key].forEach(cb => {
      try {
        cb(value, prev, key);
      } catch (err) {
        console.error(`[State] Listener error for "${key}":`, err);
      }
    });
  }

  // ─── Reset state (on logout) ───
  function reset() {
    const theme = _state.theme; // preserve theme
    Object.keys(_state).forEach(key => {
      if (key === 'theme') return;
      const prev = _state[key];
      _state[key] = key === 'loading' ? true : key === 'sidebarOpen' ? false : null;
      if (prev !== _state[key]) _notify(key, _state[key], prev);
    });
  }

  return Object.freeze({ get, getAll, set, update, on, onAny, reset });
})();
