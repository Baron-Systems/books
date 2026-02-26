import { Fyo } from 'fyo';
import { DocValue } from 'fyo/core/types';
import { Doc } from 'fyo/model/doc';
import { setChildDocIdx } from 'fyo/model/helpers';
import {
  Action,
  FiltersMap,
  FormulaMap,
  HiddenMap,
  ListViewSettings,
  ReadOnlyMap,
  ValidationMap,
} from 'fyo/model/types';
import { ValidationError } from 'fyo/utils/errors';
import { Money } from 'pesa';
import { ModelNameEnum } from 'models/types';
import { AccountRootTypeEnum, AccountTypeEnum } from '../Account/types';
import type { ItemPriceListItem } from './ItemPriceListItem';

function safeParseFloat(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

interface UOMConversionItem {
  name: string;
  uom: string;
  conversionFactor: number;
}

export interface ItemBarcodeRow {
  barcode: string;
}

type PendingPriceListRow = {
  priceList?: string;
  unit?: string;
  rateInSelectedUnit?: Money;
  rate?: Money;
};

export class Item extends Doc {
  itemCode?: string;
  incomeAccount?: string;
  expenseAccount?: string;
  trackItem?: boolean;
  itemType?: 'Product' | 'Service';
  for?: 'Purchases' | 'Sales' | 'Both';
  hasBatch?: boolean;
  itemGroup?: string;
  hsnCode?: number;
  hasSerialNumber?: boolean;
  uomConversions: UOMConversionItem[] = [];
  barcodes: ItemBarcodeRow[] = [];
  itemPriceListItem?: ItemPriceListItem[];
  private _pendingPriceListRows: PendingPriceListRow[] | null = null;

  formulas: FormulaMap = {
    incomeAccount: {
      formula: async () => {
        // Preserve explicit user selection; formula is for defaults only.
        if (this.incomeAccount) {
          return this.incomeAccount;
        }

        let accountName = 'Service';
        if (this.itemType === 'Product') {
          accountName = 'Sales';
        }

        const accountExists = await this.fyo.db.exists('Account', accountName);
        if (accountExists) {
          return accountName;
        }

        // Fallback for non-English charts where "Sales/Service" names don't exist.
        const incomeAccounts = (await this.fyo.db.getAll('Account', {
          fields: ['name'],
          filters: {
            isGroup: false,
            rootType: AccountRootTypeEnum.Income,
          },
        })) as { name?: string }[];

        const discountAccount = this.fyo.singles.AccountingSettings?.discountAccount;
        const usableIncomeAccounts = incomeAccounts.filter(
          (acc) => acc.name && acc.name !== discountAccount
        );

        const salesLike = usableIncomeAccounts.find((acc) =>
          /(sales|service|sale|مبيعات|المبيعات|خدمات)/i.test(acc.name as string)
        );
        if (salesLike?.name) {
          return salesLike.name;
        }

        return usableIncomeAccounts[0]?.name ?? incomeAccounts[0]?.name ?? '';
      },
      dependsOn: ['itemType'],
    },
    expenseAccount: {
      formula: async () => {
        // Preserve explicit user selection; formula is for defaults only.
        if (this.expenseAccount) {
          return this.expenseAccount;
        }

        if (this.trackItem) {
          return this.fyo.singles.InventorySettings
            ?.stockReceivedButNotBilled as string;
        }

        const cogs = await this.fyo.db.getAllRaw('Account', {
          filters: {
            accountType: AccountTypeEnum['Cost of Goods Sold'],
          },
        });

        if (cogs.length === 0) {
          return '';
        } else {
          return cogs[0].name as string;
        }
      },
      dependsOn: ['itemType', 'trackItem'],
    },
    hsnCode: {
      formula: async () => {
        if (!this.itemGroup) {
          return '';
        }

        const itemGroupDoc = await this.fyo.doc.getDoc(
          'ItemGroup',
          this.itemGroup
        );
        return itemGroupDoc?.hsnCode as string;
      },
      dependsOn: ['itemGroup'],
    },
  };

  async load() {
    await super.load();
    if (
      !this.name ||
      !this.fyo.singles.AccountingSettings?.enablePriceList
    ) {
      return;
    }
    const priceListRows = (await this.fyo.db.getAll(
      ModelNameEnum.PriceListItem,
      {
        filters: { item: this.name },
        fields: ['parent', 'unit', 'rateInSelectedUnit', 'rate'],
      }
    )) as { parent?: string; unit?: string; rateInSelectedUnit?: Money; rate?: Money }[];
    const childDocs: Doc[] = [];
    for (const r of priceListRows) {
      if (!r.parent || !r.unit) continue;
      const childDoc = this._getChildDoc(
        {
          priceList: r.parent,
          unit: r.unit,
          rateInSelectedUnit: r.rateInSelectedUnit,
          rate: r.rate,
        },
        'itemPriceListItem',
        false
      );
      childDocs.push(childDoc);
    }
    setChildDocIdx(childDocs);
    this.itemPriceListItem = childDocs as ItemPriceListItem[];
  }

  /** نفس منطق PriceListItem: حساب السعر الأساسي من السعر بالوحدة المختارة */
  private async getRateForPriceListItem(
    itemName: string,
    unit: string,
    rateInSelectedUnit: Money
  ): Promise<Money | undefined> {
    if (!unit || !itemName || rateInSelectedUnit == null) return undefined;
    const baseUnit = (await this.fyo.getValue(
      ModelNameEnum.Item,
      itemName,
      'unit'
    )) as string | undefined;
    if (!baseUnit) return undefined;
    if (unit === baseUnit) return rateInSelectedUnit;
    const conversionRows = await this.fyo.db.getAll(
      ModelNameEnum.UOMConversionItem,
      {
        fields: ['conversionFactor'],
        filters: { parent: itemName, uom: unit },
      }
    );
    const factor = safeParseFloat(conversionRows[0]?.conversionFactor ?? 0);
    if (factor <= 0) return undefined;
    return rateInSelectedUnit.div(factor);
  }

  async afterSync(): Promise<void> {
    await super.afterSync();
    try {
      if (!this.fyo.singles.AccountingSettings?.enablePriceList) {
        return;
      }
      const rows = (this._pendingPriceListRows ?? this.itemPriceListItem ?? []) as
        | PendingPriceListRow[]
        | ItemPriceListItem[];
      const itemName = this.name;
      if (!itemName) return;

      const desiredByPriceList = new Map<string, Set<string>>();
      for (const row of rows) {
        const pl = row.priceList?.trim();
        const u = row.unit?.trim();
        if (!pl || !u) continue;
        if (!desiredByPriceList.has(pl)) desiredByPriceList.set(pl, new Set());
        desiredByPriceList.get(pl)!.add(u);
      }

      const existingInDb = (await this.fyo.db.getAll(
        ModelNameEnum.PriceListItem,
        { filters: { item: itemName }, fields: ['parent', 'unit'] }
      )) as { parent?: string; unit?: string }[];
      const priceListsWithItem = new Set<string>();
      for (const r of existingInDb) {
        if (r.parent) priceListsWithItem.add(r.parent);
      }
      for (const pl of desiredByPriceList.keys()) {
        priceListsWithItem.add(pl);
      }

      for (const priceListName of priceListsWithItem) {
        const priceListDoc = (await this.fyo.doc.getDoc(
          ModelNameEnum.PriceList,
          priceListName
        )) as Doc & { priceListItem?: Doc[] };
        const desiredUnits =
          desiredByPriceList.get(priceListName) ?? new Set<string>();
        const existingRows = priceListDoc.priceListItem ?? [];

        const toRemove: number[] = [];
        for (const r of existingRows) {
          const rr = r as { item?: string; unit?: string; idx?: number };
          if (
            (rr.item ?? '').trim() === itemName &&
            !desiredUnits.has((rr.unit ?? '').trim()) &&
            typeof rr.idx === 'number'
          ) {
            toRemove.push(rr.idx);
          }
        }
        toRemove.sort((a, b) => b - a);
        for (const idx of toRemove) {
          await priceListDoc.remove('priceListItem', idx);
        }

        for (const row of rows) {
          if ((row.priceList ?? '').trim() !== priceListName) continue;
          const unit = row.unit?.trim();
          const rateInSelectedUnit = row.rateInSelectedUnit;
          if (!unit || rateInSelectedUnit == null) continue;
          const rate = await this.getRateForPriceListItem(
            itemName,
            unit,
            rateInSelectedUnit
          );
          if (rate == null) {
            throw new ValidationError(
              this.fyo.t`Cannot save Price List row for unit "${unit}": missing or invalid unit conversion factor.`
            );
          }
          const list = priceListDoc.priceListItem ?? [];
          const idx = list.findIndex(
            (r) => {
              const rr = r as unknown as { item?: string; unit?: string };
              return (
                (rr.item ?? '').trim() === itemName &&
                (rr.unit ?? '').trim() === unit
              );
            }
          );
          if (idx >= 0) {
            await list[idx].set('rateInSelectedUnit', rateInSelectedUnit);
            await list[idx].set('rate', rate);
          } else {
            await priceListDoc.append('priceListItem', {
              item: itemName,
              unit,
              rateInSelectedUnit,
              rate,
            });
          }
        }
        await priceListDoc.sync();
      }
    } finally {
      this._pendingPriceListRows = null;
    }
  }

  async beforeSync(): Promise<void> {
    await super.beforeSync();
    // Preserve UI table rows across Doc._update() -> load() so afterSync can
    // sync exactly what the user edited in Price Lists tab.
    this._pendingPriceListRows = (this.itemPriceListItem ?? []).map((row) => ({
      priceList: row.priceList,
      unit: row.unit,
      rateInSelectedUnit: row.rateInSelectedUnit,
      rate: row.rate,
    }));
    const latestByUom = new Map<string, UOMConversionItem>();

    this.uomConversions.forEach((item) => {
      if (item.conversionFactor > 0) {
        latestByUom.set(item.uom, item);
      }
    });

    this.uomConversions = Array.from(latestByUom.values());

    // Validate each barcode in the barcodes table
    const barcodeRegex = /^[A-Za-z0-9\-]{4,50}$/;
    for (const row of this.barcodes ?? []) {
      if (row?.barcode && !row.barcode.match(barcodeRegex)) {
        throw new ValidationError(
          this.fyo.t`Barcode must be 4–50 characters (letters, numbers, or hyphen).`
        );
      }
    }

    // Validate no duplicate (priceList, unit) in itemPriceListItem
    const priceListSeen = new Set<string>();
    for (const row of this.itemPriceListItem ?? []) {
      const pl = (row.priceList ?? '').trim();
      // Default unit to item base unit for convenience/stability.
      if (!row.unit && this.unit) {
        row.unit = this.unit as unknown as string;
      }
      const u = (row.unit ?? '').trim();
      const hasAnyValue =
        !!pl ||
        !!u ||
        row.rateInSelectedUnit != null ||
        row.rate != null;

      // Don't silently drop partially filled rows in afterSync; fail fast.
      if (hasAnyValue) {
        if (!pl) {
          throw new ValidationError(
            this.fyo.t`Price List is required in Price Lists tab.`
          );
        }
        if (!u) {
          throw new ValidationError(
            this.fyo.t`Unit is required in Price Lists tab.`
          );
        }
        if (row.rateInSelectedUnit == null) {
          throw new ValidationError(
            this.fyo.t`Rate in Selected Unit is required in Price Lists tab.`
          );
        }
      }

      if (!pl || !u) continue;
      const key = `${pl}|${u}`;
      if (priceListSeen.has(key)) {
        throw new ValidationError(
          this.fyo.t`Duplicate price list and unit: the same Price List and Unit cannot appear more than once.`
        );
      }
      priceListSeen.add(key);
    }
  }

  static filters: FiltersMap = {
    incomeAccount: () => ({
      isGroup: false,
      rootType: AccountRootTypeEnum.Income,
    }),
    expenseAccount: (doc) => ({
      isGroup: false,
      rootType: doc.trackItem
        ? AccountRootTypeEnum.Liability
        : AccountRootTypeEnum.Expense,
    }),
  };

  validations: ValidationMap = {
    rate: (value: DocValue) => {
      if ((value as Money).isNegative()) {
        throw new ValidationError(this.fyo.t`Rate can't be negative.`);
      }
    },
    hsnCode: (value: DocValue) => {
      if (value && !(value as string).match(/^\d{4,8}$/)) {
        throw new ValidationError(this.fyo.t`Invalid HSN Code.`);
      }
    },
  };

  static getActions(fyo: Fyo): Action[] {
    return [
      {
        group: fyo.t`Create`,
        label: fyo.t`Sales Invoice`,
        condition: (doc) => !doc.notInserted && doc.for !== 'Purchases',
        action: async (doc, router) => {
          const invoice = fyo.doc.getNewDoc('SalesInvoice');
          await invoice.append('items', {
            item: doc.name as string,
            rate: doc.rate as Money,
            tax: doc.tax as string,
          });
          await router.push(`/edit/SalesInvoice/${invoice.name!}`);
        },
      },
      {
        group: fyo.t`Create`,
        label: fyo.t`Purchase Invoice`,
        condition: (doc) => !doc.notInserted && doc.for !== 'Sales',
        action: async (doc, router) => {
          const invoice = fyo.doc.getNewDoc('PurchaseInvoice');
          await invoice.append('items', {
            item: doc.name as string,
            rate: doc.rate as Money,
            tax: doc.tax as string,
          });
          await router.push(`/edit/PurchaseInvoice/${invoice.name!}`);
        },
      },
    ];
  }

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['name', 'unit', 'tax', 'rate'],
    };
  }

  hidden: HiddenMap = {
    trackItem: () =>
      !this.fyo.singles.AccountingSettings?.enableInventory ||
      this.itemType !== 'Product' ||
      (this.inserted && !this.trackItem),
    barcodes: () => !this.fyo.singles.InventorySettings?.enableBarcodes,
    hasBatch: () => !this.fyo.singles.InventorySettings?.enableBatches,
    hasSerialNumber: () =>
      !(
        this.fyo.singles.InventorySettings?.enableSerialNumber && this.trackItem
      ),
    uomConversions: () =>
      !this.fyo.singles.InventorySettings?.enableUomConversions,
    itemGroup: () => !this.fyo.singles.AccountingSettings?.enableitemGroup,
    itemPriceListItem: () =>
      !this.fyo.singles.AccountingSettings?.enablePriceList,
  };

  readOnly: ReadOnlyMap = {
    unit: () => this.inserted,
    itemType: () => this.inserted,
    trackItem: () => this.inserted,
    hasBatch: () => this.inserted,
    hasSerialNumber: () => this.inserted,
  };
}
