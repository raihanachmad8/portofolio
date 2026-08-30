/**
 * Mermaid diagram rendering — lazy-loads mermaid, renders on theme change.
 */
(function() {
  var mThemes = {
    terminal: { primaryColor:'#1a1f2e', primaryTextColor:'#E9EDF1', primaryBorderColor:'#D8FF3E', lineColor:'#D8FF3E', secondaryColor:'#10141A', tertiaryColor:'#0A0C0F', fontSize:'14px', fontFamily:'monospace' },
    editorial: { primaryColor:'#EDE8DC', primaryTextColor:'#181510', primaryBorderColor:'#E8480C', lineColor:'#E8480C', secondaryColor:'#E6E0D2', tertiaryColor:'#F4F1EA', fontSize:'14px', fontFamily:'serif' },
    gallery: { primaryColor:'#2B121C', primaryTextColor:'#EFE6D6', primaryBorderColor:'#D9A44B', lineColor:'#D9A44B', secondaryColor:'#220E17', tertiaryColor:'#171310', fontSize:'14px', fontFamily:'sans-serif' },
    swiss: { primaryColor:'#FFFFFF', primaryTextColor:'#141414', primaryBorderColor:'#1B3BDB', lineColor:'#141414', secondaryColor:'#F5F3EC', tertiaryColor:'#F5F3EC', fontSize:'14px', fontFamily:'sans-serif' },
  };
  var mermaidReady = false;

  function renderMermaid() {
    if (!window.mermaid || !mermaidReady) return;
    var t = document.documentElement.getAttribute('data-theme') || 'terminal';

    document.querySelectorAll('pre > code.language-mermaid, code[class*="language-mermaid"]').forEach(function(el) {
      var pre = el.closest('pre');
      if (pre && !pre.classList.contains('mermaid')) {
        var div = document.createElement('div');
        div.className = 'mermaid';
        div.textContent = el.textContent;
        pre.replaceWith(div);
      }
    });

    try {
      window.mermaid.initialize({
        startOnLoad: false, theme: 'base', securityLevel: 'loose',
        themeVariables: mThemes[t] || mThemes.terminal,
      });
      document.querySelectorAll('.mermaid svg').forEach(function(el) { el.remove(); });
      window.mermaid.run({ querySelector: '.mermaid' }).then(function() { mermaidReady = true; });
    } catch(e) { console.warn('Mermaid:', e); }
  }

  window.switchMermaidTheme = function() { mermaidReady = false; renderMermaid(); };

  var ms = document.createElement('script');
  ms.src = '/mermaid.min.js';
  ms.onload = function() { mermaidReady = true; setTimeout(renderMermaid, 100); };
  document.head.appendChild(ms);
})();
