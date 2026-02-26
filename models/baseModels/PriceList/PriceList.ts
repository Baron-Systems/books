import { Doc } from 'fyo/model/doc';
import { ListViewSettings } from 'fyo/model/types';
import { ValidationError } from 'fyo/utils/errors';
import { PriceListItem } from './PriceListItem';
import {
  getIsDocEnabledColumn,
  getPriceListStatusColumn,
} from 'models/helpers';

export class PriceList extends Doc {
  isEnabled?: boolean;
  isSales?: boolean;
  isPurchase?: boolean;
  priceListItem?: PriceListItem[];

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['name', getIsDocEnabledColumn(), getPriceListStatusColumn()],
    };
  }

  async validate() {
    await super.validate();
    const rows = this.priceListItem ?? [];
    const seen = new Set<string>();
    for (const row of rows) {
      const item = row?.item?.trim();
      if (!item) continue;
      const unit = (row?.unit ?? '').trim();
      const key = `${item}|${unit}`;
      if (seen.has(key)) {
        throw new ValidationError(
          this.fyo.t`Duplicate item and unit: the same Item and Unit cannot appear more than once in the price list.`
        );
      }
      seen.add(key);
    }
  }
}
