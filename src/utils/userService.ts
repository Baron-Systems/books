import { t } from 'fyo';
import type { Doc } from 'fyo/model/doc';
import { ModelNameEnum } from 'models/types';
import { fyo } from 'src/initFyo';
import type { PermissionCode } from './permissions';
import { PERMISSIONS } from './permissions';
import { adminResetPassword, requirePermission } from './authService';

export type UserListItem = {
  id: string;
  username: string;
  fullName?: string | null;
  role: 'admin' | 'user';
  isActive: boolean;
  lastLoginAt?: string | null;
  permissions: PermissionCode[];
  /** قائمة معرفات الواجهات المسموحة؛ إن وُجدت تُستخدم بدل اشتقاق الواجهات من الصلاحيات */
  allowedInterfaces: string[] | null;
};

function getDocData(doc: Doc): Record<string, unknown> {
  return doc as unknown as Record<string, unknown>;
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

function allowedInterfacesFromRaw(raw: string | null | undefined): string[] | null {
  if (raw === undefined || raw === null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : null;
  } catch {
    return null;
  }
}

function toListItem(userDoc: Doc, row?: { allowedInterfaces?: string | null }): UserListItem {
  const data = getDocData(userDoc);
  const rawAllowed =
    row?.allowedInterfaces ??
    (typeof data.allowedInterfaces === 'string' ? data.allowedInterfaces : null);
  const allowed = allowedInterfacesFromRaw(rawAllowed);
  const roleRaw = data.role;
  const role: 'admin' | 'user' = roleRaw === 'admin' ? 'admin' : 'user';
  return {
    id: String(userDoc.name ?? ''),
    username: typeof data.username === 'string' ? data.username : '',
    fullName: typeof data.fullName === 'string' ? data.fullName : null,
    role,
    isActive: !!data.isActive,
    lastLoginAt: typeof data.lastLoginAt === 'string' ? data.lastLoginAt : null,
    permissions: permissionsFromDoc(userDoc),
    allowedInterfaces: allowed,
  };
}

export async function listUsers(): Promise<UserListItem[]> {
  requirePermission(PERMISSIONS.USERS_MANAGE);
  const rows = (await fyo.db.getAll(ModelNameEnum.User, {
    fields: ['name', 'username', 'fullName', 'role', 'isActive', 'lastLoginAt', 'permissions', 'allowedInterfaces'],
    orderBy: 'username',
    order: 'asc',
  })) as {
    name: string;
    username?: string | null;
    fullName?: string | null;
    role?: string | null;
    isActive?: 0 | 1 | boolean | null;
    lastLoginAt?: string | null;
    permissions?: string | null;
    allowedInterfaces?: string | null;
  }[];

  return rows.map((row) => {
    const doc = { name: row.name } as Doc;
    return {
      id: row.name,
      username: row.username ?? '',
      fullName: row.fullName ?? null,
      role: (row.role as 'admin' | 'user') || 'user',
      isActive: !!row.isActive,
      lastLoginAt: row.lastLoginAt ?? null,
      permissions: (() => {
        if (!row.permissions) return [];
        try {
          const parsed = JSON.parse(row.permissions) as unknown;
          return Array.isArray(parsed)
            ? parsed.filter((p): p is PermissionCode => typeof p === 'string')
            : [];
        } catch {
          return [];
        }
      })(),
      allowedInterfaces: allowedInterfacesFromRaw(row.allowedInterfaces),
    };
  });
}

export type UserCreatePayload = {
  username: string;
  fullName?: string;
  role: 'admin' | 'user';
  isActive?: boolean;
  password: string;
  permissions?: PermissionCode[];
  allowedInterfaces?: string[] | null;
};

export type UserUpdatePayload = {
  username?: string;
  fullName?: string | null;
  role?: 'admin' | 'user';
  isActive?: boolean;
  permissions?: PermissionCode[];
  allowedInterfaces?: string[] | null;
};

export async function createUser(payload: UserCreatePayload): Promise<UserListItem> {
  requirePermission(PERMISSIONS.USERS_MANAGE);

  const existing = await fyo.db.count(ModelNameEnum.User, {
    filters: { username: payload.username },
  });
  if (existing > 0) {
    throw new Error(t`اسم المستخدم مستخدم بالفعل`);
  }

  const { password, permissions = [], allowedInterfaces = null, ...rest } = payload;
  const { hashPassword } = await import('./authService');
  const passwordHash = await hashPassword(password);

  const doc = fyo.doc.getNewDoc(ModelNameEnum.User, {
    name: payload.username,
    ...rest,
    isActive: payload.isActive ?? true,
    passwordHash,
  });

  await doc.set('permissions', JSON.stringify(permissions));
  await doc.set(
    'allowedInterfaces',
    Array.isArray(allowedInterfaces) && allowedInterfaces.length > 0
      ? JSON.stringify(allowedInterfaces)
      : null
  );
  await doc.sync();
  return toListItem(doc);
}

export async function updateUser(
  id: string,
  changes: UserUpdatePayload
): Promise<UserListItem> {
  requirePermission(PERMISSIONS.USERS_MANAGE);
  const doc = await fyo.doc.getDoc(ModelNameEnum.User, id);

  if (changes.username !== undefined) {
    await doc.set('username', changes.username);
    // أبقِ name متطابقًا مع username حتى لا تبقى أسماء قديمة مثل "جديد User 01"
    await doc.set('name', changes.username);
  }
  if (changes.fullName !== undefined) {
    await doc.set('fullName', changes.fullName);
  }
  if (changes.role !== undefined) {
    await doc.set('role', changes.role);
  }
  if (changes.isActive !== undefined) {
    await doc.set('isActive', !!changes.isActive);
  }
  if (changes.permissions !== undefined) {
    await doc.set('permissions', JSON.stringify(changes.permissions));
  }
  if (changes.allowedInterfaces !== undefined) {
    const value =
      Array.isArray(changes.allowedInterfaces) && changes.allowedInterfaces.length > 0
        ? JSON.stringify(changes.allowedInterfaces)
        : null;
    await doc.set('allowedInterfaces', value);
  }

  await doc.sync();
  return toListItem(doc);
}

export async function setActive(
  id: string,
  isActive: boolean
): Promise<UserListItem> {
  return await updateUser(id, { isActive });
}

export async function setPermissions(
  id: string,
  permissions: PermissionCode[]
): Promise<UserListItem> {
  return await updateUser(id, { permissions });
}

export async function resetPassword(
  id: string,
  newPassword: string
): Promise<void> {
  await adminResetPassword(id, newPassword);
}

export async function deleteUser(id: string): Promise<void> {
  requirePermission(PERMISSIONS.USERS_MANAGE);
  const doc = await fyo.doc.getDoc(ModelNameEnum.User, id);
  await doc.delete();
}

