import { t } from 'fyo';

export type PermissionCode =
  | 'USERS_MANAGE'
  | 'SALES_READ'
  | 'SALES_WRITE'
  | 'PURCHASE_READ'
  | 'PURCHASE_WRITE'
  | 'ITEMS_READ'
  | 'ITEMS_WRITE'
  | 'REPORTS_VIEW'
  | 'SETTINGS_VIEW'
  | 'SETTINGS_EDIT'
  | 'JOURNAL_ENTRY_READ'
  | 'JOURNAL_ENTRY_WRITE';

export const PERMISSIONS: Record<PermissionCode, PermissionCode> = {
  USERS_MANAGE: 'USERS_MANAGE',
  SALES_READ: 'SALES_READ',
  SALES_WRITE: 'SALES_WRITE',
  PURCHASE_READ: 'PURCHASE_READ',
  PURCHASE_WRITE: 'PURCHASE_WRITE',
  ITEMS_READ: 'ITEMS_READ',
  ITEMS_WRITE: 'ITEMS_WRITE',
  REPORTS_VIEW: 'REPORTS_VIEW',
  SETTINGS_VIEW: 'SETTINGS_VIEW',
  SETTINGS_EDIT: 'SETTINGS_EDIT',
  JOURNAL_ENTRY_READ: 'JOURNAL_ENTRY_READ',
  JOURNAL_ENTRY_WRITE: 'JOURNAL_ENTRY_WRITE',
};

export type PermissionGroup = {
  id: string;
  label: string;
  permissions: {
    code: PermissionCode;
    label: string;
    description?: string;
  }[];
};

export const permissionGroups: PermissionGroup[] = [
  {
    id: 'users',
    label: t`Users & Security`,
    permissions: [
      {
        code: 'USERS_MANAGE',
        label: t`Manage Users`,
        description: t`Create, edit, disable users and reset passwords.`,
      },
    ],
  },
  {
    id: 'sales',
    label: t`Sales`,
    permissions: [
      {
        code: 'SALES_READ',
        label: t`View Sales`,
        description: t`View sales invoices, quotes and related reports.`,
      },
      {
        code: 'SALES_WRITE',
        label: t`Create/Modify Sales`,
        description: t`Create and edit sales invoices, quotes and POS.`,
      },
    ],
  },
  {
    id: 'purchases',
    label: t`Purchases`,
    permissions: [
      {
        code: 'PURCHASE_READ',
        label: t`View Purchases`,
      },
      {
        code: 'PURCHASE_WRITE',
        label: t`Create/Modify Purchases`,
      },
    ],
  },
  {
    id: 'items',
    label: t`Items & Inventory`,
    permissions: [
      {
        code: 'ITEMS_READ',
        label: t`View Items & Inventory`,
      },
      {
        code: 'ITEMS_WRITE',
        label: t`Create/Modify Items & Inventory`,
      },
    ],
  },
  {
    id: 'reports',
    label: t`Reports`,
    permissions: [
      {
        code: 'REPORTS_VIEW',
        label: t`View Reports`,
      },
    ],
  },
  {
    id: 'settings',
    label: t`Settings`,
    permissions: [
      {
        code: 'SETTINGS_VIEW',
        label: t`View Settings`,
      },
      {
        code: 'SETTINGS_EDIT',
        label: t`Edit Settings`,
      },
    ],
  },
  {
    id: 'journal',
    label: t`Journal Entries`,
    permissions: [
      {
        code: 'JOURNAL_ENTRY_READ',
        label: t`View Journal Entries`,
      },
      {
        code: 'JOURNAL_ENTRY_WRITE',
        label: t`Create/Modify Journal Entries`,
      },
    ],
  },
];

export function getAllPermissionCodes(): PermissionCode[] {
  return Object.keys(PERMISSIONS) as PermissionCode[];
}

/** صلاحية القراءة المطلوبة لعرض قائمة (list) حسب الـ schema */
const SCHEMA_READ_PERMISSION: Partial<Record<string, PermissionCode>> = {
  Account: PERMISSIONS.SETTINGS_VIEW,
  SalesInvoice: PERMISSIONS.SALES_READ,
  SalesQuote: PERMISSIONS.SALES_READ,
  PurchaseInvoice: PERMISSIONS.PURCHASE_READ,
  PurchaseReceipt: PERMISSIONS.PURCHASE_READ,
  Payment: PERMISSIONS.SALES_READ, // يُحدد بدقة من pageTitle في الـ router
  Party: PERMISSIONS.ITEMS_READ, // يُحدد بدقة من pageTitle في الـ router
  Item: PERMISSIONS.ITEMS_READ,
  ItemGroup: PERMISSIONS.ITEMS_READ,
  JournalEntry: PERMISSIONS.JOURNAL_ENTRY_READ,
  JournalEntryTemplate: PERMISSIONS.JOURNAL_ENTRY_READ,
  StockMovement: PERMISSIONS.ITEMS_READ,
  Shipment: PERMISSIONS.ITEMS_READ,
  Tax: PERMISSIONS.SETTINGS_VIEW,
  PrintTemplate: PERMISSIONS.SETTINGS_VIEW,
  CustomForm: PERMISSIONS.SETTINGS_VIEW,
  PriceList: PERMISSIONS.ITEMS_READ,
  LoyaltyProgram: PERMISSIONS.SALES_READ,
  Lead: PERMISSIONS.SALES_READ,
  PricingRule: PERMISSIONS.SALES_READ,
  CouponCode: PERMISSIONS.SALES_READ,
};

/** صلاحية الكتابة المطلوبة لإنشاء/تعديل وثيقة حسب الـ schema */
const SCHEMA_WRITE_PERMISSION: Partial<Record<string, PermissionCode>> = {
  Account: PERMISSIONS.SETTINGS_EDIT,
  SalesInvoice: PERMISSIONS.SALES_WRITE,
  SalesQuote: PERMISSIONS.SALES_WRITE,
  PurchaseInvoice: PERMISSIONS.PURCHASE_WRITE,
  PurchaseReceipt: PERMISSIONS.PURCHASE_WRITE,
  Payment: PERMISSIONS.SALES_WRITE, // تُحدد من الوثيقة في getRequiredPermissionForDoc
  Party: PERMISSIONS.ITEMS_WRITE,
  Item: PERMISSIONS.ITEMS_WRITE,
  ItemGroup: PERMISSIONS.ITEMS_WRITE,
  JournalEntry: PERMISSIONS.JOURNAL_ENTRY_WRITE,
  JournalEntryTemplate: PERMISSIONS.JOURNAL_ENTRY_WRITE,
  StockMovement: PERMISSIONS.ITEMS_WRITE,
  Shipment: PERMISSIONS.ITEMS_WRITE,
  Tax: PERMISSIONS.SETTINGS_EDIT,
  PrintTemplate: PERMISSIONS.SETTINGS_EDIT,
  CustomForm: PERMISSIONS.SETTINGS_EDIT,
  PriceList: PERMISSIONS.ITEMS_WRITE,
  LoyaltyProgram: PERMISSIONS.SALES_WRITE,
  Lead: PERMISSIONS.SALES_READ,
  PricingRule: PERMISSIONS.SALES_WRITE,
  CouponCode: PERMISSIONS.SALES_WRITE,
};

export function getReadPermissionForSchema(schemaName: string): PermissionCode | null {
  return SCHEMA_READ_PERMISSION[schemaName] ?? null;
}

export function getWritePermissionForSchema(schemaName: string): PermissionCode | null {
  return SCHEMA_WRITE_PERMISSION[schemaName] ?? null;
}

/**
 * صلاحية القراءة المطلوبة لمسار قائمة معين (لأن Payment و Party يعتمدان على السياق).
 */
export function getRequiredReadPermissionForListRoute(
  schemaName: string,
  pageTitle?: string
): PermissionCode | null {
  const title = (pageTitle ?? '').toLowerCase();
  if (schemaName === 'Payment') {
    if (title.includes('purchase') || title.includes('مشتريات')) return PERMISSIONS.PURCHASE_READ;
    return PERMISSIONS.SALES_READ;
  }
  if (schemaName === 'Party') {
    if (title.includes('customer') || title.includes('عميل') || title.includes('عملاء')) return PERMISSIONS.SALES_READ;
    if (title.includes('supplier') || title.includes('مورد') || title.includes('موردون')) return PERMISSIONS.PURCHASE_READ;
    return PERMISSIONS.ITEMS_READ;
  }
  return getReadPermissionForSchema(schemaName);
}

