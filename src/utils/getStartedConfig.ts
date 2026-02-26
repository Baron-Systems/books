import { t } from 'fyo';
import { ModelNameEnum } from 'models/types';
import { openSettings, routeTo } from './ui';
import { GetStartedConfigItem } from './types';

export function getGetStartedConfig(): GetStartedConfigItem[] {
  /* eslint-disable @typescript-eslint/no-misused-promises */
  return [
    {
      label: t`Get Started`,
      items: [
        {
          key: 'Add Items',
          label: t`Add Items`,
          icon: 'item',
          description: t`Add products or services`,
          action: () =>
            routeTo({
              path: `/list/Item/${t`Items`}`,
              query: {
                filters: JSON.stringify({ for: 'Both' }),
              },
            }),
          fieldname: 'salesItemCreated',
        },
        {
          key: 'Add Customers',
          label: t`Add Customers`,
          icon: 'customer',
          description: t`Add a few customers to create your first sales invoice`,
          action: () =>
            routeTo({
              path: `/list/Party/${t`Customers`}`,
              query: {
                filters: JSON.stringify({ role: 'Customer' }),
              },
            }),
          fieldname: 'customerCreated',
        },
        {
          key: 'Create Sales Invoice',
          label: t`Sales Invoice`,
          icon: 'sales-invoice',
          description: t`Create your first sales invoice`,
          action: () => routeTo('/list/SalesInvoice'),
          fieldname: 'invoiceCreated',
        },
        {
          key: 'Add Suppliers',
          label: t`Add Suppliers`,
          icon: 'supplier',
          description: t`Add a few suppliers`,
          action: () =>
            routeTo({
              path: `/list/Party/${t`Suppliers`}`,
              query: { filters: JSON.stringify({ role: 'Supplier' }) },
            }),
          fieldname: 'supplierCreated',
        },
        {
          key: 'Create Purchase Invoice',
          label: t`Purchase Invoice`,
          icon: 'purchase-invoice',
          description: t`Create your first purchase invoice`,
          action: () => routeTo('/list/PurchaseInvoice'),
          fieldname: 'billCreated',
        },
        {
          key: 'General',
          label: t`General`,
          icon: 'general',
          description: t`Set up your company information`,
          fieldname: 'companySetup',
          action: () => openSettings(ModelNameEnum.AccountingSettings),
        },
      ],
    },
  ];
}
