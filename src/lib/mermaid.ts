import mermaid from 'mermaid';

const mermaidThemes = {
  terminal: { primaryColor: '#1a1f2e', primaryTextColor: '#E9EDF1', primaryBorderColor: '#D8FF3E', lineColor: '#D8FF3E', secondaryColor: '#10141A', tertiaryColor: '#0A0C0F', fontFamily: 'monospace' },
  editorial: { primaryColor: '#EDE8DC', primaryTextColor: '#181510', primaryBorderColor: '#E8480C', lineColor: '#E8480C', secondaryColor: '#E6E0D2', tertiaryColor: '#F4F1EA', fontFamily: 'serif' },
  gallery: { primaryColor: '#2B121C', primaryTextColor: '#EFE6D6', primaryBorderColor: '#D9A44B', lineColor: '#D9A44B', secondaryColor: '#220E17', tertiaryColor: '#171310', fontFamily: 'sans-serif' },
  swiss: { primaryColor: '#FFFFFF', primaryTextColor: '#141414', primaryBorderColor: '#1B3BDB', lineColor: '#141414', secondaryColor: '#F5F3EC', tertiaryColor: '#F5F3EC', fontFamily: 'sans-serif' },
};

function getTheme() {
  if (typeof document === 'undefined') return 'terminal';
  return document.documentElement.getAttribute('data-theme') || 'terminal';
}

function getMermaidVars() {
  return mermaidThemes[getTheme()] || mermaidThemes.terminal;
}

let initialized = false;

export function initMermaid() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    themeVariables: getMermaidVars(),
  });
  initialized = true;
}

export async function renderMermaid() {
  initMermaid();
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    themeVariables: getMermaidVars(),
  });
  document.querySelectorAll('.mermaid svg').forEach(svg => svg.remove());
  await mermaid.run({ querySelector: '.mermaid' });
}
