/**
 * localStorage persistence for Aruna chat.
 * Handles user name, theme, and chat open state.
 * @module aruna/storage
 */

const KEYS = {
  USER_NAME: 'aruna_user_name',
} as const;

/**
 * In-memory fallback store — used when localStorage is unavailable (privacy
 * mode, SSR, or test environments).
 */
const memory = new Map<string, string>();

function store(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // localStorage access threw — fall through to memory.
  }
  return null;
}

function get(key: string): string | null {
  const s = store();
  if (s) {
    try {
      return s.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  }
  return memory.get(key) ?? null;
}

function set(key: string, value: string): void {
  const s = store();
  if (s) {
    try {
      s.setItem(key, value);
      return;
    } catch {
      // persist to memory below
    }
  }
  memory.set(key, value);
}

function remove(key: string): void {
  const s = store();
  if (s) {
    try {
      s.removeItem(key);
      return;
    } catch {
      // fall through
    }
  }
  memory.delete(key);
}

export function getUserName(): string | null {
  return get(KEYS.USER_NAME);
}

export function setUserName(name: string): void {
  set(KEYS.USER_NAME, name);
}

export function clearAll(): void {
  remove(KEYS.USER_NAME);
}

const THEME_KEY = 'theme';

export function setTheme(theme: string): void {
  set(THEME_KEY, theme);
}

export function getTheme(): string | null {
  return get(THEME_KEY);
}

const CHAT_OPEN_KEY = 'aruna_chat_open';

export function isChatOpen(): boolean {
  return get(CHAT_OPEN_KEY) === 'true';
}

export function setChatOpen(open: boolean): void {
  set(CHAT_OPEN_KEY, String(open));
}
