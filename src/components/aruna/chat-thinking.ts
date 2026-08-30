/**
 * Thinking chain animation — o1-style step-by-step display.
 * Extracted from ArunaChatClient.ts for SRP.
 * @module aruna/chat-thinking
 */

import type { ArunaLocale, ThinkingStep } from '../../lib/aruna';

const THINK_DELAY_MS = 140;
const THINK_LIMIT = 10;

/** Check if a thinking step indicates a warning (critique BLOCK). */
function warnStep(step: ThinkingStep): boolean {
  return step.phase === 'critique' && step.text.toUpperCase().includes('BLOCK');
}

/**
 * Render a bot "thinking" bubble: steps appear one-by-one (✓ ok / ✗ warn),
 * ending with "✓ selesai". Returns the element plus a `done` promise.
 */
export function renderThinking(
  container: HTMLDivElement,
  steps: ThinkingStep[],
  locale: ArunaLocale,
): { el: HTMLElement; done: Promise<void> } {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.className = 'aruna-msg aruna-msg-aruna aruna-thinking';
  const ttl = document.createElement('div');
  ttl.className = 'aruna-think-ttl';
  ttl.textContent = locale === 'id' ? '▸ berpikir…' : '▸ thinking…';
  const lines = document.createElement('div');
  lines.className = 'aruna-think-lines';
  el.appendChild(ttl);
  el.appendChild(lines);
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;

  const visible = steps.slice(0, THINK_LIMIT);

  if (reduced || visible.length === 0) {
    const row = document.createElement('i');
    row.textContent = locale === 'id' ? '✓ memproses…' : '✓ processing…';
    lines.appendChild(row);
    return { el, done: Promise.resolve() };
  }

  let i = 0;
  return {
    el,
    done: new Promise<void>((resolve) => {
      (function add() {
        if (i >= visible.length) {
          const doneLine = document.createElement('i');
          doneLine.className = 'aruna-think-done';
          doneLine.textContent = locale === 'id' ? '✓ selesai' : '✓ done';
          lines.appendChild(doneLine);
          container.scrollTop = container.scrollHeight;
          resolve();
          return;
        }
        const step = visible[i];
        const isWarn = warnStep(step);
        const row = document.createElement('i');
        row.className = isWarn ? 'aruna-think-warn' : 'aruna-think-ok';
        row.textContent = `${isWarn ? '✗' : '✓'} ${step.text}`;
        lines.appendChild(row);
        i++;
        container.scrollTop = container.scrollHeight;
        window.setTimeout(add, THINK_DELAY_MS);
      })();
    }),
  };
}

/** Append the agent's search_kb trace to an in-flight thinking bubble. */
export function appendAgentSteps(el: HTMLElement, steps: string[]): void {
  const lines = el.querySelector<HTMLElement>('.aruna-think-lines');
  if (!lines) return;
  steps.forEach((step) => {
    const row = document.createElement('i');
    row.className = 'aruna-think-ok';
    row.textContent = `✓ ${step}`;
    lines.appendChild(row);
  });
}

/** Collapse the thinking bubble into a persistent toggle block. */
export function collapseThinking(el: HTMLElement, count: number, locale: ArunaLocale): void {
  const ttl = el.querySelector<HTMLElement>('.aruna-think-ttl');
  const lines = el.querySelector<HTMLElement>('.aruna-think-lines');
  if (!ttl || !lines) return;
  lines.querySelector('.aruna-think-done')?.remove();
  ttl.textContent = `${locale === 'id' ? 'berpikir' : 'thinking'} (${Math.min(count, THINK_LIMIT)})`;
  const show = locale === 'id' ? 'lihat proses ▾' : 'show steps ▾';
  const hide = locale === 'id' ? 'sembunyikan proses ▴' : 'hide steps ▴';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'aruna-think-toggle';
  btn.setAttribute('aria-expanded', 'false');
  btn.textContent = show;
  ttl.insertAdjacentElement('afterend', btn);
  lines.hidden = true;
  btn.addEventListener('click', () => {
    const wasOpen = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!wasOpen));
    btn.textContent = wasOpen ? show : hide;
    lines.hidden = wasOpen;
  });
}
