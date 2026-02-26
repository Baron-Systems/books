/**
 * صلاحيات على مستوى الواجهة: كل شاشة/قائمة لها معرف (interface id).
 * يمكن تحديد الواجهات المسموحة لكل مستخدم بدقة.
 */
import { t } from 'fyo';
import type { PermissionCode } from './permissions';
import { PERMISSIONS } from './permissions';

/** معرفات الواجهات - تُستخدم في الـ router والـ sidebar والتحقق */
export const INTERFACE_IDS = {
  DASHBOARD: 'dashboard',
  GET_STARTED: 'get-started',
  SEARCH: 'search',

  SALES_QUOTES_LIST: 'sales-quotes-list',
  SALES_INVOICES_LIST: 'sales-invoices-list',
  SALES_PAYMENTS_LIST: 'sales-payments-list',
  CUSTOMERS_LIST: 'customers-list',
  SALES_ITEMS_LIST: 'sales-items-list',
  LOYALTY_PROGRAM_LIST: 'loyalty-program-list',
  LEAD_LIST: 'lead-list',
  PRICING_RULE_LIST: 'pricing-rule-list',
  COUPON_CODE_LIST: 'coupon-code-list',

  PURCHASE_INVOICES_LIST: 'purchase-invoices-list',
  PURCHASE_PAYMENTS_LIST: 'purchase-payments-list',
  SUPPLIERS_LIST: 'suppliers-list',
  PURCHASE_ITEMS_LIST: 'purchase-items-list',

  JOURNAL_ENTRY_LIST: 'journal-entry-list',
  JOURNAL_TEMPLATES_LIST: 'journal-templates-list',
  PARTY_LIST: 'party-list',
  ITEMS_LIST: 'items-list',
  ITEM_GROUP_LIST: 'item-group-list',
  PRICE_LIST_LIST: 'price-list-list',

  REPORT_GENERAL_LEDGER: 'report-general-ledger',
  REPORT_PROFIT_AND_LOSS: 'report-profit-and-loss',
  REPORT_BALANCE_SHEET: 'report-balance-sheet',
  REPORT_TRIAL_BALANCE: 'report-trial-balance',
  REPORT_STOCK_LEDGER: 'report-stock-ledger',
  REPORT_STOCK_BALANCE: 'report-stock-balance',
  REPORT_GSTR1: 'report-gstr1',
  REPORT_GSTR2: 'report-gstr2',

  STOCK_MOVEMENT_LIST: 'stock-movement-list',
  SHIPMENT_LIST: 'shipment-list',
  PURCHASE_RECEIPT_LIST: 'purchase-receipt-list',

  POS: 'pos',

  CHART_OF_ACCOUNTS: 'chart-of-accounts',
  TAX_LIST: 'tax-list',
  IMPORT_WIZARD: 'import-wizard',
  PRINT_TEMPLATES_LIST: 'print-templates-list',
  CUSTOMIZE_FORM_LIST: 'customize-form-list',
  SETTINGS: 'settings',
  USERS: 'users',

  /** فتح نموذج تعديل وثيقة - يُحدد حسب الـ schema في الـ route */
  EDIT_FORM: 'edit-form',
} as const;

export type InterfaceId = (typeof INTERFACE_IDS)[keyof typeof INTERFACE_IDS];

/** كل المعرّفات كقائمة (للـ admin) */
export const ALL_INTERFACE_IDS: InterfaceId[] = Object.values(INTERFACE_IDS);

/** مجموعات الواجهات لعرضها في إدارة المستخدمين */
export interface InterfaceGroup {
  id: string;
  label: string;
  interfaces: { id: InterfaceId; label: string }[];
}

export const interfaceGroups: InterfaceGroup[] = [
  {
    id: 'general',
    label: t`عام`,
    interfaces: [
      { id: INTERFACE_IDS.DASHBOARD, label: t`لوحة التحكم` },
      { id: INTERFACE_IDS.GET_STARTED, label: t`البدء السريع` },
      { id: INTERFACE_IDS.SEARCH, label: t`البحث العام` },
    ],
  },
  {
    id: 'sales',
    label: t`المبيعات`,
    interfaces: [
      { id: INTERFACE_IDS.SALES_QUOTES_LIST, label: t`عروض الأسعار` },
      { id: INTERFACE_IDS.SALES_INVOICES_LIST, label: t`فواتير المبيعات` },
      { id: INTERFACE_IDS.SALES_PAYMENTS_LIST, label: t`مدفوعات المبيعات` },
      { id: INTERFACE_IDS.CUSTOMERS_LIST, label: t`العملاء` },
      { id: INTERFACE_IDS.SALES_ITEMS_LIST, label: t`أصناف المبيعات` },
      { id: INTERFACE_IDS.LOYALTY_PROGRAM_LIST, label: t`برنامج الولاء` },
      { id: INTERFACE_IDS.LEAD_LIST, label: t`الفرص (Leads)` },
      { id: INTERFACE_IDS.PRICING_RULE_LIST, label: t`قواعد التسعير` },
      { id: INTERFACE_IDS.COUPON_CODE_LIST, label: t`أكواد القسائم` },
    ],
  },
  {
    id: 'purchases',
    label: t`المشتريات`,
    interfaces: [
      { id: INTERFACE_IDS.PURCHASE_INVOICES_LIST, label: t`فواتير المشتريات` },
      { id: INTERFACE_IDS.PURCHASE_PAYMENTS_LIST, label: t`مدفوعات المشتريات` },
      { id: INTERFACE_IDS.SUPPLIERS_LIST, label: t`الموردون` },
      { id: INTERFACE_IDS.PURCHASE_ITEMS_LIST, label: t`أصناف المشتريات` },
    ],
  },
  {
    id: 'common',
    label: t`المشترك`,
    interfaces: [
      { id: INTERFACE_IDS.JOURNAL_ENTRY_LIST, label: t`القيود اليومية` },
      { id: INTERFACE_IDS.JOURNAL_TEMPLATES_LIST, label: t`قوالب القيود` },
      { id: INTERFACE_IDS.PARTY_LIST, label: t`الأطراف` },
      { id: INTERFACE_IDS.ITEMS_LIST, label: t`الأصناف` },
      { id: INTERFACE_IDS.ITEM_GROUP_LIST, label: t`مجموعات الأصناف` },
      { id: INTERFACE_IDS.PRICE_LIST_LIST, label: t`قوائم الأسعار` },
    ],
  },
  {
    id: 'reports',
    label: t`التقارير`,
    interfaces: [
      { id: INTERFACE_IDS.REPORT_GENERAL_LEDGER, label: t`دفتر الأستاذ` },
      { id: INTERFACE_IDS.REPORT_PROFIT_AND_LOSS, label: t`الأرباح والخسائر` },
      { id: INTERFACE_IDS.REPORT_BALANCE_SHEET, label: t`الميزانية` },
      { id: INTERFACE_IDS.REPORT_TRIAL_BALANCE, label: t`ميزان المراجعة` },
      { id: INTERFACE_IDS.REPORT_STOCK_LEDGER, label: t`دفتر المخزون` },
      { id: INTERFACE_IDS.REPORT_STOCK_BALANCE, label: t`رصيد المخزون` },
      { id: INTERFACE_IDS.REPORT_GSTR1, label: t`GSTR1` },
      { id: INTERFACE_IDS.REPORT_GSTR2, label: t`GSTR2` },
    ],
  },
  {
    id: 'inventory',
    label: t`المخزون`,
    interfaces: [
      { id: INTERFACE_IDS.STOCK_MOVEMENT_LIST, label: t`حركات المخزون` },
      { id: INTERFACE_IDS.SHIPMENT_LIST, label: t`الشحنات` },
      { id: INTERFACE_IDS.PURCHASE_RECEIPT_LIST, label: t`إيصالات الاستلام` },
    ],
  },
  {
    id: 'pos',
    label: t`نقطة البيع`,
    interfaces: [{ id: INTERFACE_IDS.POS, label: t`نقطة البيع (POS)` }],
  },
  {
    id: 'setup',
    label: t`الإعدادات`,
    interfaces: [
      { id: INTERFACE_IDS.CHART_OF_ACCOUNTS, label: t`دليل الحسابات` },
      { id: INTERFACE_IDS.TAX_LIST, label: t`قوالب الضرائب` },
      { id: INTERFACE_IDS.IMPORT_WIZARD, label: t`معالج الاستيراد` },
      { id: INTERFACE_IDS.PRINT_TEMPLATES_LIST, label: t`قوالب الطباعة` },
      { id: INTERFACE_IDS.CUSTOMIZE_FORM_LIST, label: t`تخصيص النماذج` },
      { id: INTERFACE_IDS.SETTINGS, label: t`الإعدادات` },
      { id: INTERFACE_IDS.USERS, label: t`المستخدمون` },
    ],
  },
];

/** أي صلاحية تفتح أي واجهات (للتراجع عند عدم استخدام allowedInterfaces) */
const PERMISSION_TO_INTERFACES: Partial<Record<PermissionCode, InterfaceId[]>> = {
  [PERMISSIONS.SALES_READ]: [
    INTERFACE_IDS.SALES_QUOTES_LIST,
    INTERFACE_IDS.SALES_INVOICES_LIST,
    INTERFACE_IDS.SALES_PAYMENTS_LIST,
    INTERFACE_IDS.CUSTOMERS_LIST,
    INTERFACE_IDS.SALES_ITEMS_LIST,
    INTERFACE_IDS.LOYALTY_PROGRAM_LIST,
    INTERFACE_IDS.LEAD_LIST,
    INTERFACE_IDS.PRICING_RULE_LIST,
    INTERFACE_IDS.COUPON_CODE_LIST,
    INTERFACE_IDS.POS,
  ],
  [PERMISSIONS.PURCHASE_READ]: [
    INTERFACE_IDS.PURCHASE_INVOICES_LIST,
    INTERFACE_IDS.PURCHASE_PAYMENTS_LIST,
    INTERFACE_IDS.SUPPLIERS_LIST,
    INTERFACE_IDS.PURCHASE_ITEMS_LIST,
  ],
  [PERMISSIONS.ITEMS_READ]: [
    INTERFACE_IDS.PARTY_LIST,
    INTERFACE_IDS.ITEMS_LIST,
    INTERFACE_IDS.ITEM_GROUP_LIST,
    INTERFACE_IDS.PRICE_LIST_LIST,
    INTERFACE_IDS.STOCK_MOVEMENT_LIST,
    INTERFACE_IDS.SHIPMENT_LIST,
    INTERFACE_IDS.PURCHASE_RECEIPT_LIST,
  ],
  [PERMISSIONS.JOURNAL_ENTRY_READ]: [
    INTERFACE_IDS.JOURNAL_ENTRY_LIST,
    INTERFACE_IDS.JOURNAL_TEMPLATES_LIST,
  ],
  [PERMISSIONS.REPORTS_VIEW]: [
    INTERFACE_IDS.REPORT_GENERAL_LEDGER,
    INTERFACE_IDS.REPORT_PROFIT_AND_LOSS,
    INTERFACE_IDS.REPORT_BALANCE_SHEET,
    INTERFACE_IDS.REPORT_TRIAL_BALANCE,
    INTERFACE_IDS.REPORT_STOCK_LEDGER,
    INTERFACE_IDS.REPORT_STOCK_BALANCE,
    INTERFACE_IDS.REPORT_GSTR1,
    INTERFACE_IDS.REPORT_GSTR2,
  ],
  [PERMISSIONS.SETTINGS_VIEW]: [
    INTERFACE_IDS.CHART_OF_ACCOUNTS,
    INTERFACE_IDS.TAX_LIST,
    INTERFACE_IDS.IMPORT_WIZARD,
    INTERFACE_IDS.PRINT_TEMPLATES_LIST,
    INTERFACE_IDS.CUSTOMIZE_FORM_LIST,
    INTERFACE_IDS.SETTINGS,
  ],
  [PERMISSIONS.USERS_MANAGE]: [INTERFACE_IDS.USERS],
};

/** واجهات لا تحتاج صلاحية محددة (يُسمح بها مع الدخول) */
const DEFAULT_INTERFACES: InterfaceId[] = [
  INTERFACE_IDS.DASHBOARD,
  INTERFACE_IDS.GET_STARTED,
  INTERFACE_IDS.SEARCH,
];

/**
 * إرجاع معرف الواجهة لمسار معين (path + params).
 */
export function getInterfaceIdForRoute(
  path: string,
  params: { schemaName?: string; pageTitle?: string; reportClassName?: string }
): InterfaceId | null {
  if (path === '/' || path === '') return INTERFACE_IDS.DASHBOARD;
  if (path === '/get-started') return INTERFACE_IDS.GET_STARTED;
  if (path === '/pos') return INTERFACE_IDS.POS;
  if (path === '/chart-of-accounts') return INTERFACE_IDS.CHART_OF_ACCOUNTS;
  if (path === '/settings') return INTERFACE_IDS.SETTINGS;
  if (path === '/import-wizard') return INTERFACE_IDS.IMPORT_WIZARD;
  if (path === '/users') return INTERFACE_IDS.USERS;

  if (path.startsWith('/list/')) {
    const schemaName = params.schemaName ?? '';
    const pageTitle = (params.pageTitle ?? '').toLowerCase();
    return getInterfaceIdForListRoute(schemaName, pageTitle);
  }

  if (path.startsWith('/report/')) {
    const report = params.reportClassName ?? path.replace('/report/', '');
    const m: Record<string, InterfaceId> = {
      GeneralLedger: INTERFACE_IDS.REPORT_GENERAL_LEDGER,
      ProfitAndLoss: INTERFACE_IDS.REPORT_PROFIT_AND_LOSS,
      BalanceSheet: INTERFACE_IDS.REPORT_BALANCE_SHEET,
      TrialBalance: INTERFACE_IDS.REPORT_TRIAL_BALANCE,
      StockLedger: INTERFACE_IDS.REPORT_STOCK_LEDGER,
      StockBalance: INTERFACE_IDS.REPORT_STOCK_BALANCE,
      GSTR1: INTERFACE_IDS.REPORT_GSTR1,
      GSTR2: INTERFACE_IDS.REPORT_GSTR2,
    };
    return m[report] ?? null;
  }

  if (path.startsWith('/edit/')) {
    const schemaName = params.schemaName ?? '';
    return getInterfaceIdForEditRoute(schemaName);
  }

  if (path.startsWith('/print/') || path.startsWith('/report-print/')) {
    return INTERFACE_IDS.DASHBOARD;
  }

  return null;
}

function getInterfaceIdForListRoute(
  schemaName: string,
  pageTitle: string
): InterfaceId | null {
  const t = pageTitle;
  const s = schemaName;
  if (s === 'SalesQuote') return INTERFACE_IDS.SALES_QUOTES_LIST;
  if (s === 'SalesInvoice') return INTERFACE_IDS.SALES_INVOICES_LIST;
  if (s === 'PurchaseInvoice') return INTERFACE_IDS.PURCHASE_INVOICES_LIST;
  if (s === 'PurchaseReceipt') return INTERFACE_IDS.PURCHASE_RECEIPT_LIST;
  if (s === 'Payment') {
    if (t.includes('purchase') || t.includes('مشتريات')) return INTERFACE_IDS.PURCHASE_PAYMENTS_LIST;
    return INTERFACE_IDS.SALES_PAYMENTS_LIST;
  }
  if (s === 'Party') {
    if (t.includes('customer') || t.includes('عميل') || t.includes('عملاء')) return INTERFACE_IDS.CUSTOMERS_LIST;
    if (t.includes('supplier') || t.includes('مورد')) return INTERFACE_IDS.SUPPLIERS_LIST;
    return INTERFACE_IDS.PARTY_LIST;
  }
  if (s === 'Item') {
    if (t.includes('purchase') || t.includes('مشتريات')) return INTERFACE_IDS.PURCHASE_ITEMS_LIST;
    if (t.includes('sales') || t.includes('مبيعات')) return INTERFACE_IDS.SALES_ITEMS_LIST;
    return INTERFACE_IDS.ITEMS_LIST;
  }
  if (s === 'ItemGroup') return INTERFACE_IDS.ITEM_GROUP_LIST;
  if (s === 'JournalEntry') return INTERFACE_IDS.JOURNAL_ENTRY_LIST;
  if (s === 'JournalEntryTemplate') return INTERFACE_IDS.JOURNAL_TEMPLATES_LIST;
  if (s === 'StockMovement') return INTERFACE_IDS.STOCK_MOVEMENT_LIST;
  if (s === 'Shipment') return INTERFACE_IDS.SHIPMENT_LIST;
  if (s === 'Tax') return INTERFACE_IDS.TAX_LIST;
  if (s === 'PrintTemplate') return INTERFACE_IDS.PRINT_TEMPLATES_LIST;
  if (s === 'CustomForm') return INTERFACE_IDS.CUSTOMIZE_FORM_LIST;
  if (s === 'PriceList') return INTERFACE_IDS.PRICE_LIST_LIST;
  if (s === 'LoyaltyProgram') return INTERFACE_IDS.LOYALTY_PROGRAM_LIST;
  if (s === 'Lead') return INTERFACE_IDS.LEAD_LIST;
  if (s === 'PricingRule') return INTERFACE_IDS.PRICING_RULE_LIST;
  if (s === 'CouponCode') return INTERFACE_IDS.COUPON_CODE_LIST;
  return null;
}

function getInterfaceIdForEditRoute(schemaName: string): InterfaceId | null {
  const listId = getInterfaceIdForListRoute(schemaName, '');
  if (listId) return listId;
  if (schemaName === 'Account') return INTERFACE_IDS.CHART_OF_ACCOUNTS;
  return null;
}

/**
 * إرجاع قائمة الواجهات المفتوحة بصلاحية معينة (للتراجع عند عدم وجود allowedInterfaces).
 */
export function getInterfacesForPermission(perm: PermissionCode): InterfaceId[] {
  const list = PERMISSION_TO_INTERFACES[perm];
  return list ? [...list] : [];
}

/**
 * إرجاع كل الواجهات التي يفتحها المستخدم حسب صلاحياته (للتراجع).
 */
export function getInterfacesFromPermissions(
  permissions: PermissionCode[]
): InterfaceId[] {
  const set = new Set<InterfaceId>(DEFAULT_INTERFACES);
  for (const p of permissions) {
    for (const id of getInterfacesForPermission(p)) {
      set.add(id);
    }
  }
  return Array.from(set);
}
