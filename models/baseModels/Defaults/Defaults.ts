import { DefaultCashDenominations } from 'models/inventory/Point of Sale/DefaultCashDenominations';
import { Doc } from 'fyo/model/doc';
import { FiltersMap, HiddenMap } from 'fyo/model/types';
import { ModelNameEnum } from 'models/types';
import { PartyRoleEnum } from '../Party/types';

export class Defaults extends Doc {
  // Auto Payments
  salesPaymentAccount?: string;
  purchasePaymentAccount?: string;

  // Auto Stock Transfer
  shipmentLocation?: string;
  purchaseReceiptLocation?: string;

  // Number Series
  salesQuoteNumberSeries?: string;
  salesInvoiceNumberSeries?: string;
  purchaseInvoiceNumberSeries?: string;
  journalEntryNumberSeries?: string;
  paymentNumberSeries?: string;
  partySettlementNumberSeries?: string;
  stockMovementNumberSeries?: string;
  shipmentNumberSeries?: string;
  purchaseReceiptNumberSeries?: string;

  // Terms
  salesInvoiceTerms?: string;
  purchaseInvoiceTerms?: string;
  shipmentTerms?: string;
  purchaseReceiptTerms?: string;

  // Print Templates
  salesQuotePrintTemplate?: string;
  salesInvoicePrintTemplate?: string;
  posPrintTemplate?: string;
  purchaseInvoicePrintTemplate?: string;
  journalEntryPrintTemplate?: string;
  paymentPrintTemplate?: string;
  shipmentPrintTemplate?: string;
  purchaseReceiptPrintTemplate?: string;
  stockMovementPrintTemplate?: string;

  // Point of Sale
  posCashDenominations?: DefaultCashDenominations[];
  posCustomer?: string;

  // Price Lists
  salesPriceList?: string;
  purchasePriceList?: string;
  posPriceList?: string;
  preventSellBelowCost?: boolean;

  //Buttons
  saveButtonColour?: string;
  submitButtonColour?: string;
  cancelButtonColour?: string;
  heldButtonColour?: string;
  returnButtonColour?: string;
  payButtonColour?: string;
  payAndPrintButtonColour?: string;

  static commonFilters = {
    // Auto Payments
    salesPaymentAccount: () => ({ isGroup: false, accountType: 'Cash' }),
    purchasePaymentAccount: () => ({ isGroup: false, accountType: 'Cash' }),
    // Number Series
    salesQuoteNumberSeries: () => ({
      referenceType: ModelNameEnum.SalesQuote,
    }),
    salesInvoiceNumberSeries: () => ({
      referenceType: ModelNameEnum.SalesInvoice,
    }),
    purchaseInvoiceNumberSeries: () => ({
      referenceType: ModelNameEnum.PurchaseInvoice,
    }),
    journalEntryNumberSeries: () => ({
      referenceType: ModelNameEnum.JournalEntry,
    }),
    paymentNumberSeries: () => ({
      referenceType: ModelNameEnum.Payment,
    }),
    stockMovementNumberSeries: () => ({
      referenceType: ModelNameEnum.StockMovement,
    }),
    shipmentNumberSeries: () => ({
      referenceType: ModelNameEnum.Shipment,
    }),
    purchaseReceiptNumberSeries: () => ({
      referenceType: ModelNameEnum.PurchaseReceipt,
    }),
    // Print Templates
    salesQuotePrintTemplate: () => ({ type: ModelNameEnum.SalesQuote }),
    salesInvoicePrintTemplate: () => ({ type: ModelNameEnum.SalesInvoice }),
    posPrintTemplate: () => ({ type: ModelNameEnum.SalesInvoice }),
    purchaseInvoicePrintTemplate: () => ({
      type: ModelNameEnum.PurchaseInvoice,
    }),
    journalEntryPrintTemplate: () => ({ type: ModelNameEnum.JournalEntry }),
    paymentPrintTemplate: () => ({ type: ModelNameEnum.Payment }),
    shipmentPrintTemplate: () => ({ type: ModelNameEnum.Shipment }),
    purchaseReceiptPrintTemplate: () => ({
      type: ModelNameEnum.PurchaseReceipt,
    }),
    stockMovementPrintTemplate: () => ({ type: ModelNameEnum.StockMovement }),
    posCustomer: () => ({ role: PartyRoleEnum.Customer }),

    // Price Lists
    salesPriceList: () => ({ isEnabled: true, isSales: true }),
    purchasePriceList: () => ({ isEnabled: true, isPurchase: true }),
    posPriceList: () => ({ isEnabled: true, isSales: true }),
  };

  static filters: FiltersMap = this.commonFilters;
  static createFilters: FiltersMap = this.commonFilters;

  getInventoryHidden() {
    return () => !this.fyo.singles.AccountingSettings?.enableInventory;
  }

  getPointOfSaleHidden() {
    return () => !this.fyo.singles.InventorySettings?.enablePointOfSale;
  }

  getPriceListHidden() {
    return () => !this.fyo.singles.AccountingSettings?.enablePriceList;
  }

  hidden: HiddenMap = {
    stockMovementNumberSeries: this.getInventoryHidden(),
    shipmentNumberSeries: this.getInventoryHidden(),
    purchaseReceiptNumberSeries: this.getInventoryHidden(),
    shipmentTerms: this.getInventoryHidden(),
    purchaseReceiptTerms: this.getInventoryHidden(),
    shipmentPrintTemplate: this.getInventoryHidden(),
    purchaseReceiptPrintTemplate: this.getInventoryHidden(),
    stockMovementPrintTemplate: this.getInventoryHidden(),
    posCashDenominations: this.getPointOfSaleHidden(),
    posCustomer: this.getPointOfSaleHidden(),
    salesPriceList: this.getPriceListHidden(),
    purchasePriceList: this.getPriceListHidden(),
    posPriceList: this.getPriceListHidden(),
    preventSellBelowCost: this.getPriceListHidden(),
    saveButtonColour: this.getPointOfSaleHidden(),
    cancelButtonColour: this.getPointOfSaleHidden(),
    submitButtonColour: this.getPointOfSaleHidden(),
    heldButtonColour: this.getPointOfSaleHidden(),
    returnButtonColour: this.getPointOfSaleHidden(),
    payButtonColour: this.getPointOfSaleHidden(),
    payAndPrintButtonColour: this.getPointOfSaleHidden(),
  };
}

export const numberSeriesDefaultsMap: Record<
  string,
  keyof Defaults | undefined
> = {
  [ModelNameEnum.SalesInvoice]: 'salesInvoiceNumberSeries',
  [ModelNameEnum.PurchaseInvoice]: 'purchaseInvoiceNumberSeries',
  [ModelNameEnum.JournalEntry]: 'journalEntryNumberSeries',
  [ModelNameEnum.Payment]: 'paymentNumberSeries',
  [ModelNameEnum.StockMovement]: 'stockMovementNumberSeries',
  [ModelNameEnum.Shipment]: 'shipmentNumberSeries',
  [ModelNameEnum.PurchaseReceipt]: 'purchaseReceiptNumberSeries',
  [ModelNameEnum.SalesQuote]: 'salesQuoteNumberSeries',
};
