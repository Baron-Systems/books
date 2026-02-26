import { computed, ref } from 'vue';
import type { PermissionCode } from './permissions';

export type AuthRole = 'admin' | 'user';

export interface AuthUser {
  id: string;
  username: string;
  fullName?: string | null;
  role: AuthRole;
  isActive: boolean;
  permissions: PermissionCode[];
  /** قائمة معرفات الواجهات المسموحة؛ إن وُجدت تُستخدم بدل اشتقاق الواجهات من الصلاحيات */
  allowedInterfaces: string[] | null;
  lastLoginAt?: string | null;
}

export interface AuthSession {
  currentUser: AuthUser | null;
  loggedInAt: string | null;
  sessionToken: string | null;
}

const STORAGE_KEY = 'authSession';

function loadInitialSession(): AuthSession {
  const empty: AuthSession = {
    currentUser: null,
    loggedInAt: null,
    sessionToken: null,
  };

  if (typeof window === 'undefined') {
    return empty;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return empty;
    }

    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    return {
      currentUser: parsed.currentUser ?? null,
      loggedInAt: parsed.loggedInAt ?? null,
      sessionToken: parsed.sessionToken ?? null,
    };
  } catch {
    return empty;
  }
}

const state = ref<AuthSession>(loadInitialSession());

export const currentUser = computed(() => state.value.currentUser);
export const isLoggedIn = computed(() => !!state.value.currentUser);
export const currentRole = computed<AuthRole | null>(
  () => state.value.currentUser?.role ?? null
);

export function setSession(
  user: AuthUser | null,
  sessionToken: string | null
): void {
  if (!user) {
    state.value = {
      currentUser: null,
      loggedInAt: null,
      sessionToken: null,
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    return;
  }

  state.value = {
    currentUser: user,
    loggedInAt: new Date().toISOString(),
    sessionToken,
  };

  try {
    localStorage.setItem('lastUsername', user.username);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value));
  } catch {
    // ignore
  }
}

export function clearSession(): void {
  setSession(null, null);
}

