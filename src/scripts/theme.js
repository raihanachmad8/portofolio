/**
 * Theme management — applies theme, persists to localStorage, updates ARIA.
 */
(function() {
  var currentTheme = document.documentElement.getAttribute('data-theme') || 'gallery';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    currentTheme = theme;
    document.querySelectorAll('.theme-btn').forEach(function(b) {
      b.setAttribute('aria-checked', b.getAttribute('data-theme') === theme ? 'true' : 'false');
    });
    if (window.switchMermaidTheme) window.switchMermaidTheme();
  }

  applyTheme(currentTheme);

  window.switchTheme = function(theme) {
    applyTheme(theme);
  };

  document.querySelectorAll('.theme-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var theme = btn.getAttribute('data-theme');
      if (theme) applyTheme(theme);
    });
  });
})();
