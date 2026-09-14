/* ============================================================
   TS.main — component registry. Loads LAST. Drains TS._pending.
   ============================================================ */
'use strict';
(function () {
  window.TS = window.TS || {};
  window.TS._pending = window.TS._pending || [];
  window.TS.components = window.TS.components || {};
  // components pushed ['name', mountFn] into TS._pending during their load
  while (window.TS._pending.length) {
    const [name, mount] = window.TS._pending.shift();
    window.TS.components[name] = mount;
  }
  // boot shell after all components registered
  document.addEventListener('DOMContentLoaded', function () {
    window.TS.shell.boot();
  });
  // jsdom safety: if DOM already loaded when main.js runs
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    Promise.resolve().then(function () { if (!window.TS._booted) { window.TS._booted = true; window.TS.shell.boot(); } });
  }
  // theme switcher: persist + apply immediately
  function initTheme() {
    const sel = document.getElementById('theme-select');
    if (!sel) return;
    try { sel.value = document.documentElement.getAttribute('data-theme') || 'default'; } catch (e) {}
    sel.addEventListener('change', function () {
      document.documentElement.setAttribute('data-theme', sel.value);
      try { localStorage.setItem(`${window.TS.shell.COURSE_META.id}-theme`, sel.value); } catch (e) {}
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initTheme);
  else initTheme();
})();
