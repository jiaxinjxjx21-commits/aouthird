import { UserProfile } from '../types';

/**
 * Typed helpers around localStorage. All reads are guarded: corrupted or
 * missing data falls back to an empty value instead of throwing.
 */

export const CURRENT_USER_KEY = 'naddd_current_user';
export const LARGE_TEXT_KEY = 'naddd_large_text';

/** Per-user collections persisted as `naddd_<uid>_<collection>`. */
export const SCOPED_COLLECTIONS = ['events', 'tasks', 'groups', 'notifications'] as const;
export type ScopedCollection = (typeof SCOPED_COLLECTIONS)[number];

const scopedKey = (uid: string, collection: ScopedCollection) => `naddd_${uid}_${collection}`;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Could not write ${key} to localStorage:`, err);
  }
}

// --- Current user ---------------------------------------------------------

export function createGuestUser(): UserProfile {
  return {
    id: 'guest',
    name: 'Guest Explorer',
    email: 'guest@naddd.app',
    avatarColor: '#8A9A5B',
    avatarEmoji: '🌿',
    role: 'member',
    tagline: 'Exploring gathering planner',
  };
}

export function getStoredUser(): UserProfile | null {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  if (!raw || raw === 'null') return null;
  if (raw === 'guest') return createGuestUser();
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveStoredUser(user: UserProfile | null) {
  localStorage.setItem(CURRENT_USER_KEY, user ? JSON.stringify(user) : 'null');
}

export function clearStoredUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

// --- Per-user collections -------------------------------------------------

export function loadScoped<T>(uid: string | null | undefined, collection: ScopedCollection): T[] {
  if (!uid) return [];
  return readJSON<T[]>(scopedKey(uid, collection), []);
}

export function saveScoped(uid: string, collection: ScopedCollection, value: unknown[]) {
  writeJSON(scopedKey(uid, collection), value);
}

export function clearScoped(uid: string) {
  SCOPED_COLLECTIONS.forEach((c) => localStorage.removeItem(scopedKey(uid, c)));
}

/** Remove un-scoped keys left behind by earlier demo versions. */
export function clearLegacyData() {
  SCOPED_COLLECTIONS.forEach((c) => {
    localStorage.removeItem(`naddd_${c}`);
    localStorage.removeItem(`naddd_guest_${c}`);
  });
}

// --- UI preferences -------------------------------------------------------

export const getLargeTextMode = () => localStorage.getItem(LARGE_TEXT_KEY) === 'true';
export const saveLargeTextMode = (value: boolean) => localStorage.setItem(LARGE_TEXT_KEY, String(value));

// --- Invite code waiting for the user to sign in -------------------------

const PENDING_JOIN_KEY = 'naddd_pending_join_code';

export const savePendingJoinCode = (code: string) => localStorage.setItem(PENDING_JOIN_KEY, code);

export function takePendingJoinCode(): string | null {
  const code = localStorage.getItem(PENDING_JOIN_KEY);
  if (code) localStorage.removeItem(PENDING_JOIN_KEY);
  return code;
}
