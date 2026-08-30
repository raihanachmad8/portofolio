/**
 * Message rendering helpers — DOM creation for chat messages, sources, actions.
 * Extracted from ArunaChatClient.ts for SRP.
 * @module aruna/chat-render
 */

import type { ArunaLocale, KBEntry, NavAction } from '../../lib/aruna';

const COPY_FEEDBACK_MS = 1500;
const COPY_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const CHECK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

type Elements = {
  messages: HTMLDivElement;
  suggestions: HTMLDivElement;
  input: HTMLInputElement;
};

function isArunaMessage(msg: HTMLElement): boolean {
  return msg.classList.contains('aruna-msg-aruna') && !msg.classList.contains('aruna-thinking');
}

/** Generate opening message with KB stats. */
export function openingText(entries: KBEntry[], locale: ArunaLocale): string {
  const projects = entries.filter((e) => e.kind === 'project').length;
  const skills = entries.filter((e) => e.kind === 'skill').length;
  return locale === 'id'
    ? `Hai, aku Aruna. Bisa kubantu jelajahi ${projects} proyek, ${skills} skill, kontak, dan tema.`
    : `Hi, I'm Aruna. I can help you explore ${projects} projects, ${skills} skills, contact info, and themes.`;
}

/** Opening suggestion chips for new chat. */
export function openingChips(locale: ArunaLocale): string[] {
  return locale === 'id'
    ? ['Siapa kamu?', 'Bisa apa?', 'Lihat proyek', 'Kontak']
    : ['Who are you?', 'What can you do?', 'Show projects', 'Contact'];
}

/** Create and append a chat message bubble to the container. */
export function renderMessage(
  container: HTMLDivElement,
  role: 'user' | 'aruna',
  content: string,
  sources?: { label: string; url?: string }[],
): void {
  const message = document.createElement('div');
  message.className = `aruna-msg aruna-msg-${role}`;
  renderMessageInto(message, content, sources);
  container.appendChild(message);
  container.scrollTop = container.scrollHeight;
}

/** Populate a message element with formatted content, sources, and copy button. */
export function renderMessageInto(
  message: HTMLElement,
  content: string,
  sources?: { label: string; url?: string }[],
  actions?: NavAction[],
): void {
  if (isArunaMessage(message)) {
    const tag = document.createElement('span');
    tag.className = 'aruna-tagname';
    tag.textContent = 'ARUNA';
    message.appendChild(tag);
  }
  appendFormattedText(message, content);
  if (sources?.length) {
    const row = document.createElement('div');
    row.className = 'aruna-sources';
    sources.forEach((source) => {
      const chip = document.createElement('span');
      chip.className = 'aruna-source-chip';
      chip.textContent = source.label;
      if (source.url) {
        chip.classList.add('aruna-source-link');
        chip.setAttribute('role', 'button');
        chip.tabIndex = 0;
        const go = () => { window.location.href = source.url; };
        chip.addEventListener('click', go);
        chip.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
        });
      }
      row.appendChild(chip);
    });
    message.appendChild(row);
  }
  if (actions?.length) {
    const row = document.createElement('div');
    row.className = 'aruna-actions';
    actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'aruna-action-btn';
      button.textContent = action.label;
      button.addEventListener('click', () => { window.location.href = action.target; });
      row.appendChild(button);
    });
    message.appendChild(row);
  }
  if (isArunaMessage(message)) {
    message.appendChild(buildCopyRow(content));
  }
}

/** Build a copy-to-clipboard button row. */
function buildCopyRow(text: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'aruna-actions-row';
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'aruna-action-icon';
  copyBtn.setAttribute('aria-label', 'Copy');
  copyBtn.title = 'Copy';
  copyBtn.innerHTML = COPY_ICON;
  copyBtn.addEventListener('click', () => {
    const done = () => {
      copyBtn.innerHTML = CHECK_ICON;
      copyBtn.classList.add('active');
      window.setTimeout(() => { copyBtn.innerHTML = COPY_ICON; copyBtn.classList.remove('active'); }, COPY_FEEDBACK_MS);
    };
    const copied = async () => {
      try {
        await navigator.clipboard.writeText(text);
        done();
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy'); ta.remove();
        if (ok) done();
      }
    };
    void copied();
  });
  row.appendChild(copyBtn);
  return row;
}

/** Render markdown-like text (bold with **, line breaks) into DOM nodes. */
export function appendFormattedText(parent: HTMLElement, text: string): void {
  const lines = text.split('\n');
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) parent.appendChild(document.createElement('br'));
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    parts.forEach((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const strong = document.createElement('strong');
        strong.textContent = part.slice(2, -2);
        parent.appendChild(strong);
      } else {
        parent.appendChild(document.createTextNode(part));
      }
    });
  });
}

/** Render clickable suggestion chips below the chat. */
export function renderSuggestions(
  elements: Elements,
  suggestions: string[] = [],
  onPick?: (suggestion: string) => void,
): void {
  elements.suggestions.textContent = '';
  if (!suggestions.length) return;
  const list = document.createElement('div');
  list.className = 'aruna-suggestions-inner';
  suggestions.forEach((suggestion) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'aruna-suggestion-chip';
    button.textContent = suggestion;
    button.addEventListener('click', () => {
      if (onPick) onPick(suggestion);
      else { elements.input.value = suggestion; elements.input.focus(); }
    });
    list.appendChild(button);
  });
  elements.suggestions.appendChild(list);
}
