import { Fyo } from 'fyo';
import { Doc } from 'fyo/model/doc';
import { ListViewSettings } from 'fyo/model/types';

export type UserRole = 'admin' | 'user';

export type UserPermissionCode = string;

export class User extends Doc {
  username!: string;
  fullName?: string;
  passwordHash!: string;
  role!: UserRole;
  permissions?: string | null;
  isActive!: boolean;
  lastLoginAt?: Date | null;

  /**
   * Convenience helper to get permissions as a string array.
   */
  get permissionList(): UserPermissionCode[] {
    if (!this.permissions) {
      return [];
    }

    try {
      const parsed = JSON.parse(this.permissions) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((p): p is string => typeof p === 'string');
      }
    } catch {
      // ignore parse errors and treat as no permissions
    }

    return [];
  }

  set permissionList(list: UserPermissionCode[]) {
    this.permissions = JSON.stringify(Array.from(new Set(list)));
    this._setDirty(true);
  }

  static getListViewSettings(fyo: Fyo): ListViewSettings {
    return {
      columns: [
        'username',
        {
          label: fyo.t`Full Name`,
          fieldname: 'fullName',
          fieldtype: 'Data',
        },
        {
          label: fyo.t`Role`,
          fieldname: 'role',
          fieldtype: 'Data',
        },
        {
          label: fyo.t`Active`,
          fieldname: 'isActive',
          fieldtype: 'Check',
        },
        {
          label: fyo.t`Last Login`,
          fieldname: 'lastLoginAt',
          fieldtype: 'Datetime',
        },
        'modified',
      ],
    };
  }
}

