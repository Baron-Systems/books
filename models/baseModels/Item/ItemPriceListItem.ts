import { Doc } from 'fyo/model/doc';
import type { FormulaMap, HiddenMap, ReadOnlyMap } from 'fyo/model/types';
import { ModelNameEnum } from 'models/types';
import type { Money } from 'pesa';
import type { Item } from './Item';

function safeParseFloat(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export class ItemPriceListItem extends Doc {
  priceList?: string;
  unit?: string;
  rateInSelectedUnit?: Money;
  rate?: Money;
  parentdoc?: Item;

  get item(): string | undefined {
    return this.parentdoc?.name;
  }

  formulas: FormulaMap = {
    unit: {
      formula: async () => {
        const parent = this.parentdoc;
        if (!parent) return;
        const itemName = parent.name;
        if (itemName) {
          const v = await this.fyo.getValue(
            ModelNameEnum.Item,
            itemName,
            'unit'
          );
          return typeof v === 'string' ? v : undefined;
        }
        return typeof parent.unit === 'string' ? parent.unit : undefined;
      },
      // Auto-fill unit when user selects a price list row.
      dependsOn: ['priceList'],
    },
    rate: {
      formula: async () => {
        const parent = this.parentdoc;
        if (
          this.rateInSelectedUnit == null ||
          !this.unit ||
          !parent
        ) {
          return undefined;
        }

        let baseUnit: string | undefined;
        let conversionFactor: number;

        const itemName = parent.name;
        if (itemName) {
          const v = await this.fyo.getValue(ModelNameEnum.Item, itemName, 'unit');
          baseUnit = typeof v === 'string' ? v : undefined;
          if (!baseUnit) return undefined;
          if (this.unit === baseUnit) {
            return this.rateInSelectedUnit;
          }
          const conversionRows = await this.fyo.db.getAll(
            ModelNameEnum.UOMConversionItem,
            {
              fields: ['conversionFactor'],
              filters: { parent: itemName, uom: this.unit },
            }
          );
          conversionFactor = safeParseFloat(
            conversionRows[0]?.conversionFactor ?? 0
          );
        } else {
          baseUnit = typeof parent.unit === 'string' ? parent.unit : undefined;
          if (!baseUnit) return undefined;
          if (this.unit === baseUnit) {
            return this.rateInSelectedUnit;
          }
          const conv = parent.uomConversions?.find(
            (r: { uom?: string }) => (r.uom ?? '') === this.unit
          );
          conversionFactor = safeParseFloat(
            (conv as { conversionFactor?: number } | undefined)?.conversionFactor ?? 0
          );
        }

        if (conversionFactor <= 0) return undefined;
        return this.rateInSelectedUnit.div(conversionFactor);
      },
      dependsOn: ['rateInSelectedUnit', 'unit'],
    },
  };

  hidden: HiddenMap = {
    rateInSelectedUnit: () => !this.unit,
  };

  readOnly: ReadOnlyMap = {
    rate: () => true,
  };
}
