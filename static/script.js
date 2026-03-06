function toggleTheme() {
  const h = document.documentElement;
  const t = document.getElementById('t');
  const dark = h.getAttribute('data-theme') === 'dark';
  const next = dark ? 'light' : 'dark';
  h.setAttribute('data-theme', next);
  t.textContent = dark ? '[dark]' : '[light]';
  localStorage.setItem('theme', next);
}

(function () {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.addEventListener('DOMContentLoaded', function () {
    const t = document.getElementById('t');
    if (t) t.textContent = saved === 'dark' ? '[light]' : '[dark]';
  });
})();
