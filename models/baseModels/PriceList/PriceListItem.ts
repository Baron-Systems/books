import { Doc } from 'fyo/model/doc';
import type { FormulaMap, HiddenMap, ReadOnlyMap } from 'fyo/model/types';
import { ModelNameEnum } from 'models/types';
import type { Money } from 'pesa';
import type { PriceList } from './PriceList';

function safeParseFloat(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export class PriceListItem extends Doc {
  item?: string;
  unit?: string;
  rateInSelectedUnit?: Money;
  rate?: Money;
  parentdoc?: PriceList;

  formulas: FormulaMap = {
    unit: {
      formula: async () => {
        if (!this.item) {
          return;
        }

        return await this.fyo.getValue(ModelNameEnum.Item, this.item, 'unit');
      },
      dependsOn: ['item'],
    },
    rate: {
      formula: async () => {
        if (this.rateInSelectedUnit == null || !this.unit || !this.item) {
          return undefined;
        }

        const baseUnit = (await this.fyo.getValue(
          ModelNameEnum.Item,
          this.item,
          'unit'
        )) as string | undefined;
        if (!baseUnit) {
          return undefined;
        }

        // الوحدة المختارة = الوحدة الأساسية: السعر كما هو من المربع الجديد
        if (this.unit === baseUnit) {
          return this.rateInSelectedUnit;
        }

        const conversionRows = await this.fyo.db.getAll(
          ModelNameEnum.UOMConversionItem,
          {
            fields: ['conversionFactor'],
            filters: { parent: this.item, uom: this.unit },
          }
        );
        const factor = safeParseFloat(conversionRows[0]?.conversionFactor ?? 0);
        if (factor <= 0) {
          return undefined;
        }

        return this.rateInSelectedUnit.div(factor);
      },
      dependsOn: ['rateInSelectedUnit', 'unit', 'item'],
    },
  };

  hidden: HiddenMap = {
    rateInSelectedUnit: () => !this.unit || !this.item,
  };

  readOnly: ReadOnlyMap = {
    rate: () => !!(this.unit && this.item),
  };
}
