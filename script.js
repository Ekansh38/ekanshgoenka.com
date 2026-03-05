function toggleTheme() {
  const h = document.documentElement;
  const t = document.getElementById('t');
  const dark = h.getAttribute('data-theme') === 'dark';
  h.setAttribute('data-theme', dark ? 'light' : 'dark');
  t.textContent = dark ? '[dark]' : '[light]';
}
