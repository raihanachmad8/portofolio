/**
 * Aruna chatbot — barrel export.
 * Only re-exports what's used by external consumers.
 * @module aruna
 */

export type {
  ArunaLocale,
  KBEntry,
  ChatResponse,
  NavAction,
  ThinkingStep,
} from './types';

export { buildKB } from './kb';
export type { KBBuildInput, CVData } from './kb';

export { initLookup } from './lookup';

export {
  setChatOpen,
  isChatOpen,
  setTheme,
} from './storage';

export { processInput } from './engine';
