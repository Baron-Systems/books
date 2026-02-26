<template>
  <div>
    <feather-icon
      :name="isExapanded ? 'chevron-up' : 'chevron-down'"
      class="w-4 h-4 inline-flex dark:text-white"
      @click="isExapanded = !isExapanded"
    />
  </div>

  <div class="relative" @click="isExapanded = !isExapanded">
    <Link
      :df="{
        fieldname: 'item',
        fieldtype: 'Data',
        label: t`Item`,
      }"
      :class="row.isFreeItem ? 'mt-2' : ''"
      size="small"
      :border="false"
      :value="row.item"
      :read-only="true"
    />
    <p
      v-if="row.isFreeItem"
      class="absolute flex top-0 font-medium text-xs ml-2 text-green-800"
      style="font-size: 0.6rem"
    >
      {{ row.pricingRule }}
    </p>
  </div>

  <Float
    :df="{
      fieldname: 'quantity',
      fieldtype: 'Float',
      label: t`Quantity`,
    }"
    size="small"
    :border="false"
    :min="0"
    :value="row.quantity"
    :read-only="isReadOnly"
    @change="(value: number) => setQuantity(Number(value))"
  />

  <Currency
    :df="{
      fieldtype: 'Currency',
      fieldname: 'rate',
      label: t`Rate`,
    }"
    size="small"
    :border="false"
    :value="row.rate"
    :read-only="true"
  />

  <Currency
    :df="{
      fieldtype: 'Currency',
      fieldname: 'amount',
      label: t`Amount`,
    }"
    size="small"
    :border="false"
    :value="row.amount"
    :read-only="true"
  />

  <div class="flex justify-center">
    <feather-icon
      name="trash"
      class="w-4 text-xl text-red-500"
      @click="removeAddedItem(row)"
    />
  </div>

  <div></div>

  <template v-if="isExapanded">
    <div class="rounded-md grid grid-cols-4 my-3" style="width: 27vw">
      <div class="px-4 col-span-2">
        <Float
          :df="{
            fieldname: 'quantity',
            fieldtype: 'Float',
            label: t`Quantity`,
          }"
          @click="handleOpenKeyboard(row, 'quantity')"
          size="medium"
          :min="0"
          :border="true"
          :show-label="true"
          :value="row.quantity"
          :read-only="isReadOnly"
        />
      </div>

      <div class="px-4 col-span-2">
        <AutoComplete
          v-if="isUOMConversionEnabled && transferUnitOptions.length"
          :key="row.item"
          :df="{
            fieldtype: 'AutoComplete',
            fieldname: 'transferUnit',
            label: t`Transfer Unit`,
            options: transferUnitOptions,
          }"
          size="medium"
          :show-label="true"
          :border="true"
          :value="row.transferUnit ?? ''"
          :read-only="isReadOnly"
          @change="(value: string) => setTransferUnit(value)"
        />
      </div>

      <div class="px-4 pt-6 col-span-2">
        <Int
          v-if="isUOMConversionEnabled"
          :df="{
            fieldtype: 'Int',
            fieldname: 'transferQuantity',
            label: t`Transfer Quantity`,
          }"
          @click="!isReadOnly && handleOpenKeyboard(row, 'transferQuantity')"
          size="medium"
          :border="true"
          :show-label="true"
          :value="row.transferQuantity"
          :read-only="isReadOnly"
        />
      </div>
      <div class="px-4 pt-6 col-span-2">
        <Currency
          :df="{
            fieldtype: 'Currency',
            fieldname: 'rate',
            label: t`Rate`,
          }"
          @click="!isReadOnly && handleOpenKeyboard(row, 'rate')"
          size="medium"
          :show-label="true"
          :border="true"
          :value="row.rate"
          :read-only="isReadOnly"
        />
      </div>
      <div class="px-4 col-span-2 mt-5">
        <Currency
          v-if="isDiscountingEnabled"
          :df="{
            fieldtype: 'Currency',
            fieldname: 'discountAmount',
            label: 'Discount Amount',
          }"
          @click="handleOpenKeyboard(row, 'itemDiscountAmount')"
          class="col-span-2"
          size="medium"
          :show-label="true"
          :border="true"
          :value="row.itemDiscountAmount"
          :read-only="row.itemDiscountPercent as number > 0 || isReadOnly"
        />
      </div>

      <div class="px-4 col-span-2 mt-5">
        <Float
          v-if="isDiscountingEnabled"
          :df="{
            fieldtype: 'Float',
            fieldname: 'itemDiscountPercent',
            label: t`Discount Percent`,
          }"
          @click="handleOpenKeyboard(row, 'itemDiscountPercent')"
          size="medium"
          :show-label="true"
          :border="true"
          :value="row.itemDiscountPercent"
          :read-only="!row.itemDiscountAmount?.isZero() || isReadOnly"
        />
      </div>

      <div
        v-if="row.links?.item && row.links?.item.hasBatch"
        class="px-4 pt-6 col-span-2"
      >
        <Link
          :df="{
            fieldname: 'batch',
            fieldtype: 'Link',
            target: 'Batch',
            label: t`Batch`,
            filters: { item: row.item as string},
          }"
          size="medium"
          :value="row.batch"
          :border="true"
          :show-label="true"
          :read-only="false"
          @change="(value:string) => setBatch(value)"
        />
      </div>

      <div
        v-if="row.links?.item && row.links?.item.hasBatch"
        class="px-4 pt-6 col-span-2"
      >
        <Float
          :df="{
            fieldname: 'availableQtyInBatch',
            fieldtype: 'Float',
            label: t`Qty in Batch`,
          }"
          size="medium"
          :min="0"
          :value="availableQtyInBatch"
          :show-label="true"
          :border="true"
          :read-only="true"
          :text-right="true"
        />
      </div>

      <div v-if="hasSerialNumber" class="px-4 pt-6 col-span-4">
        <Text
          :df="{
            label: t`Serial Number`,
            fieldtype: 'Text',
            fieldname: 'serialNumber',
          }"
          :value="row.serialNumber"
          :show-label="true"
          :border="true"
          :required="hasSerialNumber"
          @change="(value:string)=> setSerialNumber(value)"
        />
      </div>
    </div>
  </template>
</template>

<script lang="ts">
import Currency from 'src/components/Controls/Currency.vue';
import Data from 'src/components/Controls/Data.vue';
import Float from 'src/components/Controls/Float.vue';
import Int from 'src/components/Controls/Int.vue';
import Link from 'src/components/Controls/Link.vue';
import Text from 'src/components/Controls/Text.vue';
import AutoComplete from 'src/components/Controls/AutoComplete.vue';
import { inject } from 'vue';
import { fyo } from 'src/initFyo';
import { defineComponent } from 'vue';
import { SalesInvoiceItem } from 'models/baseModels/SalesInvoiceItem/SalesInvoiceItem';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { InvoiceItem } from 'models/baseModels/InvoiceItem/InvoiceItem';
import { Money } from 'pesa';
import { validateQty } from 'models/helpers';
import { showToast } from 'src/utils/interactive';
import { validateSerialNumberCount } from 'src/utils/pos';

export default defineComponent({
  name: 'ModernPOSSelectedItemRow',
  components: { Currency, Data, Float, Int, Link, Text, AutoComplete },
  props: {
    row: { type: SalesInvoiceItem, required: true },
    batchAdded: { type: Boolean, default: false },
  },
  emits: ['toggleModal', 'runSinvFormulas', 'selectedRow', 'applyPricingRule'],

  setup() {
    return {
      isDiscountingEnabled: inject('isDiscountingEnabled') as boolean,
      itemSerialNumbers: inject('itemSerialNumbers') as {
        [item: string]: string;
      },
    };
  },
  data() {
    return {
      isExapanded: false,
      batches: [] as string[],
      availableQtyInBatch: 0,
      itemVisibility: '',

      defaultRate: this.row.rate as Money,
      transferUnitOptions: [] as Array<{ label: string; value: string }>,
    };
  },
  watch: {
    'row.batch': {
      async handler(newBatch) {
        if (newBatch) {
          this.availableQtyInBatch = await this.getAvailableQtyInBatch();
          this.isExapanded = true;
        }
      },
      immediate: true,
    },
    'row.item': {
      async handler(newItem) {
        if (newItem) {
          await this.updateTransferUnitOptions();
        } else {
          this.transferUnitOptions = [];
        }
      },
      immediate: true,
    },
  },
  computed: {
    isUOMConversionEnabled(): boolean {
      return !!fyo.singles.InventorySettings?.enableUomConversions;
    },
    hasSerialNumber(): boolean {
      return !!(this.row.links?.item && this.row.links?.item.hasSerialNumber);
    },
    isReadOnly() {
      return this.row.isFreeItem;
    },
  },
  methods: {
    handleOpenKeyboard(row: SalesInvoiceItem, field: string) {
      if (this.isReadOnly) {
        return;
      }

      this.$emit('selectedRow', row, field);
      this.$emit('toggleModal', 'Keyboard');
    },
    async getAvailableQtyInBatch(): Promise<number> {
      if (!this.row.batch) {
        return 0;
      }

      return (
        (await fyo.db.getStockQuantity(
          this.row.item as string,
          undefined,
          undefined,
          undefined,
          this.row.batch
        )) ?? 0
      );
    },
    async setBatch(batch: string) {
      this.row.set('batch', batch);
      this.availableQtyInBatch = await this.getAvailableQtyInBatch();
    },
    async updateTransferUnitOptions() {
      if (!this.row.item) {
        this.transferUnitOptions = [];
        return;
      }

      const itemDoc = await fyo.doc.getDoc('Item', this.row.item as string);

      const conversions = (itemDoc?.uomConversions ?? []) as Array<{
        uom: string;
        conversionFactor: number;
      }>;

      const allowedUoms = new Set<string>();

      if (typeof itemDoc?.unit === 'string') {
        allowedUoms.add(itemDoc.unit);
      }

      for (const c of conversions) {
        if (typeof c.uom === 'string') {
          allowedUoms.add(c.uom);
        }
      }

      this.transferUnitOptions = [...allowedUoms].map((uom) => ({
        label: uom,
        value: uom,
      }));
    },
    async setTransferUnit(value: string) {
      if (this.isReadOnly) {
        return;
      }
      await this.row.set('transferUnit', value);
      this.$emit('applyPricingRule');
      this.$emit('runSinvFormulas');
    },
    setSerialNumber(serialNumber: string) {
      if (!serialNumber) {
        return;
      }
      this.itemSerialNumbers[this.row.item as string] = serialNumber;

      validateSerialNumberCount(
        serialNumber,
        this.row.quantity ?? 0,
        this.row.item!
      );
    },
    async removeAddedItem(row: SalesInvoiceItem) {
      this.row.parentdoc?.remove('items', row?.idx as number);

      if (!row.isFreeItem) {
        this.$emit('applyPricingRule');
      }
    },
    async setQuantity(quantity: number) {
      if (this.isReadOnly) {
        return;
      }
      const hasManualDiscount = this.row.setItemDiscountAmount;
      const isPercentageDiscount =
        !hasManualDiscount && this.row.itemDiscountPercent !== 0;
      const manualDiscountAmount = this.row.itemDiscountAmount;
      const manualDiscountPercent = this.row.itemDiscountPercent;

      if (!this.row.isReturn && quantity <= 0) {
        showToast({
          type: 'error',
          message: 'Quantity must be greater than zero.',
          duration: 'short',
        });
        quantity = this.row.quantity ?? 1;
      }

      this.row.set('quantity', quantity);

      const existingItems =
        (this.row.parentdoc as SalesInvoice)?.items?.filter(
          (invoiceItem: InvoiceItem) =>
            invoiceItem.item === this.row.item && !invoiceItem.isFreeItem
        ) ?? [];

      quantity = this.row.quantity ?? 1;

      try {
        await validateQty(
          this.row.parentdoc as SalesInvoice,
          this.row,
          existingItems
        );
      } catch (error) {
        this.row.set('quantity', quantity);
        return showToast({
          type: 'error',
          message: this.t`${error as string}`,
          duration: 'short',
        });
      }

      if (!this.row.isFreeItem) {
        this.$emit('applyPricingRule');
        this.$emit('runSinvFormulas');
        if (!hasManualDiscount && !isPercentageDiscount) {
          this.row.set('setItemDiscountAmount', false);
          this.row.set('itemDiscountPercent', 0);
        } else if (hasManualDiscount) {
          this.row.set('setItemDiscountAmount', true);
          this.row.set('itemDiscountAmount', manualDiscountAmount);
        } else if (isPercentageDiscount) {
          this.row.set('setItemDiscountAmount', false);
          this.row.set('itemDiscountPercent', manualDiscountPercent);
        }
      }
    },
  },
});
</script>
