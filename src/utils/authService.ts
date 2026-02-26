import { t } from 'fyo';
import type { Doc } from 'fyo/model/doc';
import { ModelNameEnum } from 'models/types';
import { fyo } from 'src/initFyo';
import { getRandomString } from 'utils';
import {
  currentUser,
  clearSession,
  setSession,
  type AuthUser,
} from './authState';
import {
  getAllPermissionCodes,
  type PermissionCode,
  PERMISSIONS,
} from './permissions';
import {
  type InterfaceId,
  getInterfacesFromPermissions,
} from './interfaces';

export async function hashPassword(password: string): Promise<string> {
  if (typeof window !== 'undefined' && window.ipc?.authHashPassword) {
    const res = await window.ipc.authHashPassword(password);
    if (res.ok) return res.hash;
    throw new Error(res.error ?? 'Password hash failed');
  }
  throw new Error(
    'hashPassword is only available in Electron (use IPC). Use window.ipc.authHashPassword.'
  );
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (typeof window !== 'undefined' && window.ipc?.authVerifyPassword) {
    const res = await window.ipc.authVerifyPassword(password, hash);
    if (res.ok) return res.result;
    return false;
  }
  throw new Error(
    'verifyPassword is only available in Electron (use IPC). Use window.ipc.authVerifyPassword.'
  );
}

function permissionsFromDoc(userDoc: Doc): PermissionCode[] {
  const raw = (userDoc as unknown as { permissions?: string | null })
    .permissions;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is PermissionCode => typeof p === 'string');
  } catch {
    return [];
  }
}

function allowedInterfacesFromDoc(userDoc: Doc): string[] | null {
  const raw = (userDoc as unknown as { allowedInterfaces?: string | null })
    .allowedInterfaces;
  if (raw === undefined || raw === null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((s): s is string => typeof s === 'string');
  } catch {
    return null;
  }
}

function getDocData(doc: Doc): Record<string, unknown> {
  return doc as unknown as Record<string, unknown>;
}

function toAuthUser(userDoc: Doc): AuthUser {
  const data = getDocData(userDoc);
  const name = String(userDoc.name ?? '');
  const username =
    typeof data.username === 'string' ? data.username : String(data.username ?? '');
  const fullName =
    typeof data.fullName === 'string' ? data.fullName : null;
  const roleRaw = data.role;
  const role: 'admin' | 'user' = roleRaw === 'admin' ? 'admin' : 'user';
  const isActive = !!data.isActive;
  const lastLoginAt =
    typeof data.lastLoginAt === 'string' ? data.lastLoginAt : null;
  const basePermissions = permissionsFromDoc(userDoc);
  const rawAllowedInterfaces = allowedInterfacesFromDoc(userDoc);

  const effectivePermissions: PermissionCode[] =
    role === 'admin' ? getAllPermissionCodes() : basePermissions;

  const allowedInterfaces: string[] | null =
    role === 'admin' ? null : rawAllowedInterfaces;

  return {
    id: name,
    username,
    fullName: fullName ?? undefined,
    role,
    isActive,
    lastLoginAt: lastLoginAt ?? undefined,
    permissions: effectivePermissions,
    allowedInterfaces,
  };
}

export async function ensureDefaultAdminExists(): Promise<void> {
  // 1) إذا كان هناك مستخدم باسم admin بالفعل، تأكد من تفعيله وضبط بياناته الأساسية
  const existingAdmins = (await fyo.db.getAll(ModelNameEnum.User, {
    filters: { username: 'admin' },
    limit: 1,
  })) as { name: string }[];

  if (existingAdmins.length) {
    // getAll يرجّع صفوف خام من قاعدة البيانات، نحتاج Doc كامل عبر fyo.doc.getDoc
    const row = existingAdmins[0];
    const doc = (await fyo.doc.getDoc(
      ModelNameEnum.User,
      row.name
    )) as Doc & {
      username?: string;
      fullName?: string;
      role?: string;
      isActive?: unknown;
      passwordHash?: string;
      permissions?: string | null;
      _setDirty?: (dirty: boolean) => void;
    };

    let changed = false;

    if (!doc.isActive) {
      await doc.set('isActive', true);
      changed = true;
    }

    if (doc.role !== 'admin') {
      await doc.set('role', 'admin');
      changed = true;
    }

    if (!doc.passwordHash) {
      const passwordHash = await hashPassword('admin123');
      await doc.set('passwordHash', passwordHash);
      changed = true;
    }

    if (!doc.permissions) {
      await doc.set('permissions', JSON.stringify(getAllPermissionCodes()));
      changed = true;
    }

    if (changed) {
      await doc.sync();
    }

    return;
  }

  // 2) إذا لم يوجد أي مستخدمين على الإطلاق، أنشئ admin جديد
  const count = await fyo.db.count(ModelNameEnum.User, {});
  if (count > 0) {
    // يوجد مستخدمون لكن لا يوجد admin باسم "admin" — لا ننشئ Admin جديد لتفادي المفاجآت
    return;
  }

  const passwordHash = await hashPassword('admin123');
  const doc = fyo.doc.getNewDoc(ModelNameEnum.User, {
    username: 'admin',
    fullName: 'Administrator',
    role: 'admin',
    isActive: true,
    passwordHash,
  });

  // grant all permissions explicitly (even though admin bypasses checks)
  await doc.set('permissions', JSON.stringify(getAllPermissionCodes()));
  await doc.sync();
}

export async function login(
  username: string,
  password: string
): Promise<AuthUser> {
  const invalidMsg = t`اسم المستخدم أو كلمة المرور غير صحيحة`;
  const rows = (await fyo.db.getAll(ModelNameEnum.User, {
    fields: ['name'],
    filters: { username },
    limit: 1,
  })) as { name: string }[];

  if (!rows.length) {
    throw new Error(invalidMsg);
  }

  // احصل على Doc كامل لضمان الحقول (isActive, passwordHash, إلخ)
  const row = rows[0];
  const userDoc = (await fyo.doc.getDoc(
    ModelNameEnum.User,
    row.name
  )) as Doc & {
    isActive?: unknown;
    passwordHash?: string;
  };

  const isActive = !!getDocData(userDoc).isActive;
  if (!isActive) {
    throw new Error(t`هذا المستخدم معطل، يرجى التواصل مع المسؤول (Admin).`);
  }

  const hash = userDoc.passwordHash;
  if (!hash || !(await verifyPassword(password, hash))) {
    throw new Error(invalidMsg);
  }

  // update last login
  await userDoc.set('lastLoginAt', new Date());
  await userDoc.sync();

  const authUser = toAuthUser(userDoc);
  const sessionToken = getRandomString();

  // keep fyo.auth.user in sync for createdBy/modifiedBy fields
  fyo.auth.user = authUser.username;
  setSession(authUser, sessionToken);

  return authUser;
}

export function logout(): void {
  clearSession();
  fyo.auth.user = '';
}

export function getCurrentUser(): AuthUser | null {
  return currentUser.value;
}

export function hasPermission(code: PermissionCode): boolean {
  const user = currentUser.value;
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions.includes(code);
}

/**
 * هل المستخدم الحالي مسموح له بالوصول إلى الواجهة المحددة؟
 * إن وُجدت قائمة allowedInterfaces للمستخدم تُستخدم؛ وإلا تُشتق من الصلاحيات.
 */
export function hasInterface(interfaceId: string): boolean {
  const user = currentUser.value;
  if (!user) return false;
  if (user.role === 'admin') return true;
  const allowed = user.allowedInterfaces;
  if (allowed !== null && allowed.length > 0) {
    return allowed.includes(interfaceId);
  }
  const fromPerms = getInterfacesFromPermissions(user.permissions);
  return fromPerms.includes(interfaceId as InterfaceId);
}

export function requirePermission(code: PermissionCode): void {
  if (!hasPermission(code)) {
    const error = new Error(t`ليس لديك صلاحية لتنفيذ هذا الإجراء`);
    error.name = 'PermissionError';
    throw error;
  }
}

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const userDoc = (await fyo.doc.getDoc(
    ModelNameEnum.User,
    userId
  )) as Doc & { passwordHash?: string };

  const current = currentUser.value;
  if (!current || current.id !== userId) {
    throw new Error(t`يمكنك تغيير كلمة المرور لحسابك فقط.`);
  }

  const hash = userDoc.passwordHash;
  if (!hash || !(await verifyPassword(oldPassword, hash))) {
    throw new Error(t`كلمة المرور الحالية غير صحيحة`);
  }

  const newHash = await hashPassword(newPassword);
  await userDoc.set('passwordHash', newHash);
  await userDoc.sync();
}

export async function adminResetPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  requirePermission(PERMISSIONS.USERS_MANAGE);
  const userDoc = (await fyo.doc.getDoc(
    ModelNameEnum.User,
    userId
  )) as Doc & { passwordHash?: string };

  const newHash = await hashPassword(newPassword);
  await userDoc.set('passwordHash', newHash);
  await userDoc.sync();
}

