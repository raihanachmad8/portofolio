/**
 * Aruna chat client — orchestrates modules for DOM, state, and rendering.
 * @module aruna/chat-client
 */

import {
  initLookup,
  isChatOpen,
  processInput,
  setChatOpen,
  setTheme,
} from '../../lib/aruna';
import type { ArunaLocale, ChatResponse, KBEntry, NavAction } from '../../lib/aruna';
import { renderMessage, renderMessageInto, openingText, openingChips, renderSuggestions } from './chat-render';
import { renderThinking, collapseThinking } from './chat-thinking';
import { buildCommands, filterCommands, renderCmdPalette, setActive, isPaletteOpen, closePalette } from './chat-cmds';

type Elements = {
  toggle: HTMLButtonElement;
  chatWindow: HTMLDivElement;
  close: HTMLButtonElement;
  messages: HTMLDivElement;
  suggestions: HTMLDivElement;
  input: HTMLInputElement;
  send: HTMLButtonElement;
  tip: HTMLDivElement;
  cmdPalette: HTMLDivElement;
};

interface ArunaInitPayload {
  entries: KBEntry[];
  locale: ArunaLocale;
}

const TIP_DELAY_MS = 4500;
const TIP_HOLD_MS = 6000;

export function initArunaChat(payload: ArunaInitPayload): void {
  const elements = getElements();
  if (!elements) return;

  initLookup(payload.entries);

  const locale = payload.locale ?? 'en';
  const cmds = buildCommands(locale);
  let isOpen = false;
  let tipShown = false;
  let cmdActiveIdx = -1;

  const submitText = (text: string) => {
    elements.input.value = text;
    submit();
  };

  const renderHistory = () => {
    elements.messages.textContent = '';
    renderMessage(elements.messages, 'aruna', openingText(payload.entries, locale));
    renderSuggestions(elements, openingChips(locale), submitText);
  };

  const setChatVisible = (open: boolean): void => {
    elements.chatWindow.classList.toggle('aruna-hidden', !open);
    elements.chatWindow.setAttribute('aria-hidden', String(!open));
    elements.toggle.setAttribute('aria-expanded', String(open));
    setChatOpen(open);
  };

  const openChat = () => {
    isOpen = true;
    setChatVisible(true);
    elements.tip.classList.remove('show');
    tipShown = true;
    renderHistory();
    elements.input.focus();
  };

  const closeChat = () => {
    isOpen = false;
    setChatVisible(false);
  };

  const submit = () => {
    const input = elements.input.value.trim();
    if (!input) return;

    elements.input.value = '';
    renderSuggestions(elements);
    renderMessage(elements.messages, 'user', input);

    const result = processInput(input, { locale });
    if (result.shouldClear) elements.messages.textContent = '';

    const thinking = renderThinking(elements.messages, result.thinking, locale);
    applyResponseAction(result.response);

    const messageNode = document.createElement('div');
    messageNode.className = 'aruna-msg aruna-msg-aruna';
    renderMessageInto(messageNode, result.response.text, result.response.sources, result.response.actions);

    const finish = (
      text: string,
      sources?: { label: string; url?: string }[],
      actions?: NavAction[],
    ) => {
      messageNode.textContent = '';
      renderMessageInto(messageNode, text, sources, actions);
      elements.messages.appendChild(messageNode);
      renderSuggestions(elements, result.response.suggestions, submitText);
      elements.messages.scrollTop = elements.messages.scrollHeight;
    };

    const showAnswer = (
      text: string,
      sources?: { label: string; url?: string }[],
      opts: { extraSteps?: number; actions?: NavAction[]; beforeCollapse?: () => void } = {},
    ) => {
      thinking.done.then(() => {
        opts.beforeCollapse?.();
        collapseThinking(thinking.el, result.thinking.length + (opts.extraSteps ?? 0), locale);
        finish(text, sources, opts.actions);
      });
    };

    showAnswer(result.response.text, result.response.sources, { actions: result.response.actions });
  };

  const handleCmdSelect = (cmd: string) => {
    elements.input.value = cmd + ' ';
    elements.input.focus();
  };

  elements.toggle.addEventListener('click', () => (isOpen ? closeChat() : openChat()));
  elements.close.addEventListener('click', closeChat);
  elements.send.addEventListener('click', submit);

  elements.input.addEventListener('input', () => {
    const val = elements.input.value;
    if (val.startsWith('/') && val.indexOf(' ') === -1) {
      cmdActiveIdx = renderCmdPalette(elements, filterCommands(cmds, val), handleCmdSelect);
    } else {
      closePalette(elements);
    }
  });

  elements.input.addEventListener('keydown', (event) => {
    const paletteOpen = isPaletteOpen(elements);

    if (paletteOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const items = elements.cmdPalette.querySelectorAll('.aruna-cmd-item');
      const len = items.length;
      if (event.key === 'ArrowDown') {
        cmdActiveIdx = (cmdActiveIdx + 1) % len;
      } else {
        cmdActiveIdx = cmdActiveIdx <= 0 ? len - 1 : cmdActiveIdx - 1;
      }
      setActive(elements, cmdActiveIdx);
      return;
    }

    if (paletteOpen && event.key === 'Enter') {
      event.preventDefault();
      const items = elements.cmdPalette.querySelectorAll('.aruna-cmd-item');
      if (cmdActiveIdx >= 0 && cmdActiveIdx < items.length) {
        (items[cmdActiveIdx] as HTMLElement).click();
        return;
      }
    }

    if (paletteOpen && event.key === 'Escape') {
      closePalette(elements);
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      closePalette(elements);
      submit();
    }
  });

  window.setTimeout(() => {
    if (!tipShown && !isOpen) {
      elements.tip.classList.add('show');
      window.setTimeout(() => elements.tip.classList.remove('show'), TIP_HOLD_MS);
    }
  }, TIP_DELAY_MS);

  if (isChatOpen()) openChat();
}

function applyResponseAction(response: ChatResponse): void {
  if (response.action === 'theme-change') {
    const theme = typeof response.data?.theme === 'string' ? response.data.theme : null;
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
      setTheme(theme);
      if (typeof window.switchMermaidTheme === 'function') window.switchMermaidTheme();
    }
  }
  if (response.action === 'open-case' && typeof response.data?.url === 'string') {
    window.location.href = response.data.url;
  }
}

function getElements(): Elements | null {
  const toggle = document.getElementById('aruna-toggle');
  const chatWindow = document.getElementById('aruna-window');
  const close = document.getElementById('aruna-close');
  const messages = document.getElementById('aruna-messages');
  const suggestions = document.getElementById('aruna-suggestions');
  const input = document.getElementById('aruna-input');
  const send = document.getElementById('aruna-send');
  const tip = document.getElementById('aruna-tip');
  const cmdPalette = document.getElementById('aruna-cmd-palette');

  if (
    !(toggle instanceof HTMLButtonElement) ||
    !(chatWindow instanceof HTMLDivElement) ||
    !(close instanceof HTMLButtonElement) ||
    !(messages instanceof HTMLDivElement) ||
    !(suggestions instanceof HTMLDivElement) ||
    !(input instanceof HTMLInputElement) ||
    !(send instanceof HTMLButtonElement) ||
    !(tip instanceof HTMLDivElement) ||
    !(cmdPalette instanceof HTMLDivElement)
  ) {
    return null;
  }

  return { toggle, chatWindow, close, messages, suggestions, input, send, tip, cmdPalette };
}

declare global {
  interface Window {
    switchMermaidTheme?: () => void;
  }
}
