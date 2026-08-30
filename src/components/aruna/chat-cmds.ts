/**
 * Command palette — /-command filtering, rendering, keyboard navigation.
 * Extracted from ArunaChatClient.ts for SRP.
 * @module aruna/chat-cmds
 */

import type { ArunaLocale } from '../../lib/aruna';

type Elements = {
  input: HTMLInputElement;
  cmdPalette: HTMLDivElement;
};

type CmdDef = { cmd: string; desc: string; icon: string };

/** Build the command list for the current locale. */
export function buildCommands(locale: ArunaLocale): CmdDef[] {
  return [
    { cmd: '/project', desc: locale === 'id' ? 'Cari proyek' : 'Search projects', icon: 'PR' },
    { cmd: '/skill', desc: locale === 'id' ? 'Cari skill' : 'Search skills', icon: 'SK' },
    { cmd: '/experience', desc: locale === 'id' ? 'Pengalaman kerja' : 'Work experience', icon: 'EX' },
    { cmd: '/blog', desc: locale === 'id' ? 'Artikel blog' : 'Blog articles', icon: 'BL' },
    { cmd: '/contact', desc: locale === 'id' ? 'Informasi kontak' : 'Contact info', icon: 'CT' },
    { cmd: '/about', desc: locale === 'id' ? 'Tentang saya' : 'About me', icon: 'AB' },
    { cmd: '/cv', desc: locale === 'id' ? 'Unduh CV' : 'Download CV', icon: 'CV' },
    { cmd: '/theme', desc: locale === 'id' ? 'Ganti tema' : 'Switch theme', icon: 'TH' },
    { cmd: '/help', desc: locale === 'id' ? 'Bantuan' : 'Help', icon: '??' },
    { cmd: '/reset', desc: locale === 'id' ? 'Hapus chat' : 'Clear chat', icon: 'RS' },
  ];
}

/** Filter commands by a partial query string. */
export function filterCommands(commands: CmdDef[], query: string): CmdDef[] {
  const q = query.toLowerCase();
  return commands.filter((c) => c.cmd.startsWith(q));
}

/** Render the command palette items. */
export function renderCmdPalette(elements: Elements, cmds: CmdDef[], onSelect: (cmd: string) => void): number {
  elements.cmdPalette.textContent = '';
  if (cmds.length === 0) {
    elements.cmdPalette.classList.add('aruna-hidden');
    return -1;
  }
  elements.cmdPalette.classList.remove('aruna-hidden');
  let activeIdx = -1;

  cmds.forEach((c, i) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'aruna-cmd-item';
    item.setAttribute('role', 'option');
    item.innerHTML = `<span class="aruna-cmd-icon">${c.icon}</span><span class="aruna-cmd-body"><span class="aruna-cmd-name">${c.cmd}</span><span class="aruna-cmd-desc">${c.desc}</span></span>`;
    item.addEventListener('click', () => {
      onSelect(c.cmd);
      elements.cmdPalette.classList.add('aruna-hidden');
      elements.input.focus();
    });
    item.addEventListener('mouseenter', () => {
      setActive(elements, i);
      activeIdx = i;
    });
    elements.cmdPalette.appendChild(item);
  });

  return activeIdx;
}

/** Set active highlight on a command palette item. */
export function setActive(elements: Elements, idx: number): void {
  const items = elements.cmdPalette.querySelectorAll('.aruna-cmd-item');
  items.forEach((el, i) => el.classList.toggle('aruna-cmd-active', i === idx));
}

/** Check if the command palette is currently open. */
export function isPaletteOpen(elements: Elements): boolean {
  return !elements.cmdPalette.classList.contains('aruna-hidden');
}

/** Close the command palette. */
export function closePalette(elements: Elements): void {
  elements.cmdPalette.classList.add('aruna-hidden');
}
