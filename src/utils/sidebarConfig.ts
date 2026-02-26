import { t } from 'fyo';
import { routeFilters } from 'src/utils/filters';
import { fyo } from '../initFyo';
import { SidebarConfig, SidebarItem, SidebarRoot } from './types';
import { hasInterface } from './authService';
import { INTERFACE_IDS } from './interfaces';

export function getSidebarConfig(): SidebarConfig {
  const sideBar = getCompleteSidebar();
  return getFilteredSidebar(sideBar);
}

function getFilteredSidebar(sideBar: SidebarConfig): SidebarConfig {
  return sideBar.filter((root) => {
    if (root.hidden?.()) return false;
    if (root.interfaceId != null && !hasInterface(root.interfaceId)) return false;

    root.items = root.items?.filter((item) => {
      if (item.hidden?.()) return false;
      if (item.interfaceId != null && !hasInterface(item.interfaceId)) return false;
      return true;
    });

    if (Array.isArray(root.items) && root.items.length === 0) return false;
    return true;
  });
}

function getRegionalSidebar(): SidebarRoot[] {
  const hasGstin = !!fyo.singles?.AccountingSettings?.gstin;
  if (!hasGstin) {
    return [];
  }

  return [
    {
      label: t`GST`,
      name: 'gst',
      icon: 'gst',
      route: '/report/GSTR1',
      items: [
        {
          label: t`GSTR1`,
          name: 'gstr1',
          route: '/report/GSTR1',
          interfaceId: INTERFACE_IDS.REPORT_GSTR1,
        },
        {
          label: t`GSTR2`,
          name: 'gstr2',
          route: '/report/GSTR2',
          interfaceId: INTERFACE_IDS.REPORT_GSTR2,
        },
      ],
    },
  ];
}

function getInventorySidebar(): SidebarRoot[] {
  const hasInventory = !!fyo.singles.AccountingSettings?.enableInventory;
  if (!hasInventory) {
    return [];
  }

  return [
    {
      label: t`Inventory`,
      name: 'inventory',
      icon: 'inventory',
      iconSize: '18',
      route: '/list/StockMovement',
      items: [
        {
          label: t`Stock Movement`,
          name: 'stock-movement',
          route: '/list/StockMovement',
          schemaName: 'StockMovement',
          interfaceId: INTERFACE_IDS.STOCK_MOVEMENT_LIST,
        },
        {
          label: t`Shipment`,
          name: 'shipment',
          route: '/list/Shipment',
          schemaName: 'Shipment',
          interfaceId: INTERFACE_IDS.SHIPMENT_LIST,
        },
        {
          label: t`Purchase Receipt`,
          name: 'purchase-receipt',
          route: '/list/PurchaseReceipt',
          schemaName: 'PurchaseReceipt',
          interfaceId: INTERFACE_IDS.PURCHASE_RECEIPT_LIST,
        },
        {
          label: t`Stock Ledger`,
          name: 'stock-ledger',
          route: '/report/StockLedger',
          interfaceId: INTERFACE_IDS.REPORT_STOCK_LEDGER,
        },
        {
          label: t`Stock Balance`,
          name: 'stock-balance',
          route: '/report/StockBalance',
          interfaceId: INTERFACE_IDS.REPORT_STOCK_BALANCE,
        },
      ],
    },
  ];
}

function getPOSSidebar() {
  return {
    label: t`POS`,
    name: 'pos',
    route: '/pos',
    icon: 'pos',
    interfaceId: INTERFACE_IDS.POS,
    hidden: () => !fyo.singles.InventorySettings?.enablePointOfSale,
  };
}

function getReportSidebar(): SidebarRoot {
  return {
    label: t`Reports`,
    name: 'reports',
    icon: 'reports',
    route: '/report/GeneralLedger',
    items: [
      {
        label: t`General Ledger`,
        name: 'general-ledger',
        route: '/report/GeneralLedger',
        interfaceId: INTERFACE_IDS.REPORT_GENERAL_LEDGER,
      },
      {
        label: t`Profit And Loss`,
        name: 'profit-and-loss',
        route: '/report/ProfitAndLoss',
        interfaceId: INTERFACE_IDS.REPORT_PROFIT_AND_LOSS,
      },
      {
        label: t`Balance Sheet`,
        name: 'balance-sheet',
        route: '/report/BalanceSheet',
        interfaceId: INTERFACE_IDS.REPORT_BALANCE_SHEET,
      },
      {
        label: t`Trial Balance`,
        name: 'trial-balance',
        route: '/report/TrialBalance',
        interfaceId: INTERFACE_IDS.REPORT_TRIAL_BALANCE,
      },
    ],
  };
}

function getCompleteSidebar(): SidebarConfig {
  return [
    {
      label: t`Get Started`,
      name: 'get-started',
      route: '/get-started',
      icon: 'general',
      iconSize: '24',
      iconHeight: 5,
      interfaceId: INTERFACE_IDS.GET_STARTED,
      hidden: () => !!fyo.singles.SystemSettings?.hideGetStarted,
    },
    {
      label: t`Dashboard`,
      name: 'dashboard',
      route: '/',
      icon: 'dashboard',
      interfaceId: INTERFACE_IDS.DASHBOARD,
    },
    {
      label: t`Sales`,
      name: 'sales',
      icon: 'sales',
      route: '/list/SalesInvoice',
      items: [
        {
          label: t`Sales Quotes`,
          name: 'sales-quotes',
          route: '/list/SalesQuote',
          schemaName: 'SalesQuote',
          interfaceId: INTERFACE_IDS.SALES_QUOTES_LIST,
        },
        {
          label: t`Sales Invoices`,
          name: 'sales-invoices',
          route: '/list/SalesInvoice',
          schemaName: 'SalesInvoice',
          interfaceId: INTERFACE_IDS.SALES_INVOICES_LIST,
        },
        {
          label: t`Sales Payments`,
          name: 'payments',
          route: `/list/Payment/${t`Sales Payments`}`,
          schemaName: 'Payment',
          filters: routeFilters.SalesPayments,
          interfaceId: INTERFACE_IDS.SALES_PAYMENTS_LIST,
        },
        {
          label: t`Customers`,
          name: 'customers',
          route: `/list/Party/${t`Customers`}`,
          schemaName: 'Party',
          filters: routeFilters.Customers,
          interfaceId: INTERFACE_IDS.CUSTOMERS_LIST,
        },
        {
          label: t`Sales Items`,
          name: 'sales-items',
          route: `/list/Item/${t`Sales Items`}`,
          schemaName: 'Item',
          filters: routeFilters.SalesItems,
          interfaceId: INTERFACE_IDS.SALES_ITEMS_LIST,
        },
        {
          label: t`Loyalty Program`,
          name: 'loyalty-program',
          route: '/list/LoyaltyProgram',
          schemaName: 'LoyaltyProgram',
          interfaceId: INTERFACE_IDS.LOYALTY_PROGRAM_LIST,
          hidden: () => !fyo.singles.AccountingSettings?.enableLoyaltyProgram,
        },
        {
          label: t`Lead`,
          name: 'lead',
          route: '/list/Lead',
          schemaName: 'Lead',
          interfaceId: INTERFACE_IDS.LEAD_LIST,
          hidden: () => !fyo.singles.AccountingSettings?.enableLead,
        },
        {
          label: t`Pricing Rule`,
          name: 'pricing-rule',
          route: '/list/PricingRule',
          schemaName: 'PricingRule',
          interfaceId: INTERFACE_IDS.PRICING_RULE_LIST,
          hidden: () => !fyo.singles.AccountingSettings?.enablePricingRule,
        },
        {
          label: t`Coupon Code`,
          name: 'coupon-code',
          route: `/list/CouponCode`,
          schemaName: 'CouponCode',
          interfaceId: INTERFACE_IDS.COUPON_CODE_LIST,
          hidden: () => !fyo.singles.AccountingSettings?.enableCouponCode,
        },
      ] as SidebarItem[],
    },
    {
      label: t`Purchases`,
      name: 'purchases',
      icon: 'purchase',
      route: '/list/PurchaseInvoice',
      items: [
        {
          label: t`Purchase Invoices`,
          name: 'purchase-invoices',
          route: '/list/PurchaseInvoice',
          schemaName: 'PurchaseInvoice',
          interfaceId: INTERFACE_IDS.PURCHASE_INVOICES_LIST,
        },
        {
          label: t`Purchase Payments`,
          name: 'payments',
          route: `/list/Payment/${t`Purchase Payments`}`,
          schemaName: 'Payment',
          filters: routeFilters.PurchasePayments,
          interfaceId: INTERFACE_IDS.PURCHASE_PAYMENTS_LIST,
        },
        {
          label: t`Suppliers`,
          name: 'suppliers',
          route: `/list/Party/${t`Suppliers`}`,
          schemaName: 'Party',
          filters: routeFilters.Suppliers,
          interfaceId: INTERFACE_IDS.SUPPLIERS_LIST,
        },
        {
          label: t`Purchase Items`,
          name: 'purchase-items',
          route: `/list/Item/${t`Purchase Items`}`,
          schemaName: 'Item',
          filters: routeFilters.PurchaseItems,
          interfaceId: INTERFACE_IDS.PURCHASE_ITEMS_LIST,
        },
      ] as SidebarItem[],
    },
    {
      label: t`Common`,
      name: 'common-entries',
      icon: 'common-entries',
      route: '/list/JournalEntry',
      items: [
        {
          label: t`Journal Entry`,
          name: 'journal-entry',
          route: '/list/JournalEntry',
          schemaName: 'JournalEntry',
          interfaceId: INTERFACE_IDS.JOURNAL_ENTRY_LIST,
        },
        {
          label: t`Journal Templates`,
          name: 'journal-templates',
          route: '/list/JournalEntryTemplate',
          schemaName: 'JournalEntryTemplate',
          interfaceId: INTERFACE_IDS.JOURNAL_TEMPLATES_LIST,
        },
        {
          label: t`Party`,
          name: 'party',
          route: '/list/Party',
          schemaName: 'Party',
          filters: { role: ['in', ['Customer', 'Supplier', 'Both']] },
          interfaceId: INTERFACE_IDS.PARTY_LIST,
        },
        {
          label: t`Items`,
          name: 'common-items',
          route: `/list/Item/${t`Items`}`,
          schemaName: 'Item',
          filters: { for: 'Both' },
          interfaceId: INTERFACE_IDS.ITEMS_LIST,
        },
        {
          label: t`Item Group`,
          name: 'item-group',
          route: '/list/ItemGroup',
          schemaName: 'ItemGroup',
          interfaceId: INTERFACE_IDS.ITEM_GROUP_LIST,
        },
        {
          label: t`Price List`,
          name: 'price-list',
          route: '/list/PriceList',
          schemaName: 'PriceList',
          interfaceId: INTERFACE_IDS.PRICE_LIST_LIST,
          hidden: () => !fyo.singles.AccountingSettings?.enablePriceList,
        },
      ] as SidebarItem[],
    },
    getReportSidebar(),
    getInventorySidebar(),
    getPOSSidebar(),
    getRegionalSidebar(),
    {
      label: t`Setup`,
      name: 'setup',
      icon: 'settings',
      route: '/chart-of-accounts',
      items: [
        {
          label: t`Chart of Accounts`,
          name: 'chart-of-accounts',
          route: '/chart-of-accounts',
          interfaceId: INTERFACE_IDS.CHART_OF_ACCOUNTS,
        },
        {
          label: t`Tax Templates`,
          name: 'taxes',
          route: '/list/Tax',
          schemaName: 'Tax',
          interfaceId: INTERFACE_IDS.TAX_LIST,
        },
        {
          label: t`Import Wizard`,
          name: 'import-wizard',
          route: '/import-wizard',
          interfaceId: INTERFACE_IDS.IMPORT_WIZARD,
        },
        {
          label: t`Print Templates`,
          name: 'print-template',
          route: `/list/PrintTemplate/${t`Print Templates`}`,
          interfaceId: INTERFACE_IDS.PRINT_TEMPLATES_LIST,
        },
        {
          label: t`Customize Form`,
          name: 'customize-form',
          route: `/list/CustomForm/${t`Customize Form`}`,
          interfaceId: INTERFACE_IDS.CUSTOMIZE_FORM_LIST,
          hidden: () =>
            !fyo.singles.AccountingSettings?.enableFormCustomization,
        },
        {
          label: t`Settings`,
          name: 'settings',
          route: '/settings',
          interfaceId: INTERFACE_IDS.SETTINGS,
        },
        {
          label: t`Users`,
          name: 'users',
          route: '/users',
          interfaceId: INTERFACE_IDS.USERS,
        },
      ] as SidebarItem[],
    },
  ].flat();
}
