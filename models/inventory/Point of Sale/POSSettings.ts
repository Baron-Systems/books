import { Doc } from 'fyo/model/doc';
import { FiltersMap, HiddenMap } from 'fyo/model/types';
import {
  AccountRootTypeEnum,
  AccountTypeEnum,
} from 'models/baseModels/Account/types';

export class POSSettings extends Doc {
  isShiftOpen?: boolean;
  inventory?: string;
  cashAccount?: string;
  writeOffAccount?: string;
  weightEnabledBarcode?: boolean;
  barcodePrefix?: string;
  checkDigits?: number;
  itemCodeDigits?: number;
  itemWeightDigits?: number;
  defaultAccount?: string;
  itemVisibility?: string;
  posUI?: 'Classic' | 'Modern';
  canChangeRate?: boolean;
  canEditDiscount?: boolean;
  ignorePricingRule?: boolean;

  static filters: FiltersMap = {
    cashAccount: () => ({
      rootType: AccountRootTypeEnum.Asset,
      accountType: AccountTypeEnum.Cash,
      isGroup: false,
    }),
    defaultAccount: () => ({
      isGroup: false,
      accountType: AccountTypeEnum.Receivable,
    }),
  };

  hidden: HiddenMap = {
    weightEnabledBarcode: () =>
      !this.fyo.singles.InventorySettings?.enableBarcodes,
    barcodePrefix: () => true,
    checkDigits: () => true,
    itemCodeDigits: () => true,
    itemWeightDigits: () => true,
    itemVisibility: () =>
      !this.fyo.singles.AccountingSettings?.enablePointOfSaleWithOutInventory,
  };
}
