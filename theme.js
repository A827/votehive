/* VoteHive Theme Toggle (no Tailwind dark plugin needed)
   - Adds/removes 'vh-dark' on <html>
   - Persists in localStorage.theme = 'dark' | 'light'
*/
(function initTheme(){
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const startDark = saved ? saved === 'dark' : prefersDark;
  document.documentElement.classList.toggle('vh-dark', startDark);
})();

window.toggleTheme = function(){
  const el = document.documentElement;
  const willDark = !el.classList.contains('vh-dark');
  el.classList.toggle('vh-dark', willDark);
  localStorage.setItem('theme', willDark ? 'dark' : 'light');
  // Focus ring feedback if button exists
  const btn = document.getElementById('themeToggle');
  if (btn) { btn.blur(); }
};