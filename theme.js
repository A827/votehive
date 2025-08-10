/* VoteHive Theme Toggle
   - Toggles 'vh-dark' on <html>
   - Persists preference in localStorage.theme = 'dark' | 'light'
   - Syncs across tabs and respects OS preference (if user hasn't chosen yet)
*/

(function initTheme() {
  try {
    const saved = localStorage.getItem('theme'); // 'dark' | 'light' | null
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const startDark = saved ? (saved === 'dark') : prefersDark;
    document.documentElement.classList.toggle('vh-dark', !!startDark);

    // If no explicit choice saved, keep tracking OS changes
    if (!saved && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const apply = (e) => {
        // Only apply OS changes if user hasn't explicitly chosen a theme
        if (!localStorage.getItem('theme')) {
          document.documentElement.classList.toggle('vh-dark', e.matches);
        }
      };
      // Modern browsers: addEventListener; fallback to addListener
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', apply);
      else if (typeof mq.addListener === 'function') mq.addListener(apply);
    }
  } catch (_) {}
})();

window.toggleTheme = function () {
  const html = document.documentElement;
  const willDark = !html.classList.contains('vh-dark');
  html.classList.toggle('vh-dark', willDark);
  try { localStorage.setItem('theme', willDark ? 'dark' : 'light'); } catch (_) {}
  // Optional: defocus a visible toggle button with id="themeToggle"
  const btn = document.getElementById('themeToggle');
  if (btn) btn.blur();
};

// Keep tabs in sync
window.addEventListener('storage', (e) => {
  if (e.key === 'theme') {
    const val = e.newValue; // 'dark' | 'light' | null
    const isDark = val ? (val === 'dark') : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('vh-dark', !!isDark);
  }
});