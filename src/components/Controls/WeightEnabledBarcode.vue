<template>
  <div
    class="
      px-2
      w-36
      flex
      items-center
      border
      rounded
      bg-gray-50
      dark:text-gray-200
      dark:border-gray-800
      dark:bg-gray-890
      dark:focus-within:bg-gray-900
      focus-within:bg-gray-100
    "
  >
    <input
      ref="scanner"
      type="text"
      class="text-base placeholder-gray-600 w-full bg-transparent outline-none"
      :placeholder="t`Enter weight barcode`"
      @change="handleChange"
    />
    <feather-icon
      name="maximize"
      class="w-3 h-3 text-gray-600 dark:text-gray-400 cursor-text"
      @click="() => ($refs.scanner as HTMLInputElement).focus()"
    />
  </div>
</template>

<script lang="ts">
import { getItemNameByBarcode } from 'models/helpers';
import { showToast } from 'src/utils/interactive';
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'WeightEnabledBarcode',
  emits: ['item-selected'],
  data() {
    return {
      timerId: null,
      barcode: '',
      cooldown: '',
    } as {
      timerId: null | ReturnType<typeof setTimeout>;
      barcode: string;
      cooldown: string;
    };
  },
  mounted() {
    document.addEventListener('keydown', this.scanListener);
  },
  unmounted() {
    document.removeEventListener('keydown', this.scanListener);
  },
  activated() {
    document.addEventListener('keydown', this.scanListener);
  },
  deactivated() {
    document.removeEventListener('keydown', this.scanListener);
  },
  methods: {
    handleChange(e: Event) {
      const elem = e.target as HTMLInputElement;
      this.selectItem(elem.value);
      elem.value = '';
    },

    async selectItem(code: string) {
      const barcode = code.trim();
      if (this.cooldown === barcode) {
        return;
      }

      this.cooldown = barcode;
      setTimeout(() => (this.cooldown = ''), 100);

      const itemName = await getItemNameByBarcode(this.fyo, barcode);

      if (itemName) {
        this.success(this.t`${itemName} quantity 1 added.`);
        this.$emit('item-selected', itemName);

        return;
      }

      const isWeightEnabled =
        this.fyo.singles.POSSettings?.weightEnabledBarcode;
      const TYPE7_PREFIX_LEN = 2;
      const TYPE7_ITEM_CODE_DIGITS = 5;
      const TYPE7_WEIGHT_DIGITS = 5;
      const TYPE7_LEN = 13;

      if (
        isWeightEnabled &&
        code.length === TYPE7_LEN &&
        /^\d+$/.test(barcode) &&
        barcode.startsWith('21')
      ) {
        const extractedItemCode = barcode.slice(
          TYPE7_PREFIX_LEN,
          TYPE7_PREFIX_LEN + TYPE7_ITEM_CODE_DIGITS
        );
        const weightPart = barcode.slice(
          TYPE7_PREFIX_LEN + TYPE7_ITEM_CODE_DIGITS,
          TYPE7_PREFIX_LEN + TYPE7_ITEM_CODE_DIGITS + TYPE7_WEIGHT_DIGITS
        );

        const itemsByCode =
          (await this.fyo.db.getAll('Item', {
            filters: { itemCode: extractedItemCode },
            fields: ['name', 'unit'],
          })) || [];
        let item = itemsByCode[0];
        if (!item) {
          const nameFromBarcode = await getItemNameByBarcode(
            this.fyo,
            extractedItemCode
          );
          if (nameFromBarcode) {
            const itemsByName =
              (await this.fyo.db.getAll('Item', {
                filters: { name: nameFromBarcode },
                fields: ['name', 'unit'],
              })) || [];
            item = itemsByName[0];
          }
        }

        if (!item) {
          return this.error(this.t`Item with barcode ${barcode} not found.`);
        }

        const quantity = this.parseType7Weight(weightPart, (item as { unit?: string }).unit);
        this.success(this.t`${(item as { name: string }).name} quantity ${quantity} added.`);
        this.$emit('item-selected', (item as { name: string }).name, quantity);
        return;
      }

      return this.error(this.t`Barcode ${barcode} has an invalid length.`);
    },

    parseType7Weight(weightStr: string, unitType?: string): number {
      if (!/^\d{5}$/.test(weightStr)) return 1;
      const kgPart = parseInt(weightStr.slice(0, 2), 10);
      const gramPart = parseInt(weightStr.slice(2, 5), 10);
      const weightInKg = kgPart + gramPart / 1000;
      const unit = (unitType ?? '').toLowerCase();
      if (unit === 'kg') return weightInKg;
      if (unit === 'gram' || unit === 'g') return Math.round(weightInKg * 1000);
      return weightInKg;
    },
    async scanListener({ key, code }: KeyboardEvent) {
      /**
       * Based under the assumption that
       * - Barcode scanners trigger keydown events
       * - Keydown events are triggered quicker than human can
       *    i.e. at max 20ms between events
       * - Keydown events are triggered for barcode digits
       * - The sequence of digits might be punctuated by a return
       */

      const keyCode = Number(key);
      const isEnter = code === 'Enter';
      if (Number.isNaN(keyCode) && !isEnter) {
        return;
      }

      if (isEnter) {
        return await this.setItemFromBarcode();
      }

      this.clearInterval();

      this.barcode += key;
      this.timerId = setTimeout(async () => {
        await this.setItemFromBarcode();
        this.barcode = '';
      }, 20);
    },
    async setItemFromBarcode() {
      if (this.barcode.length < 4) {
        return;
      }

      await this.selectItem(this.barcode);

      this.barcode = '';
      this.clearInterval();
    },
    clearInterval() {
      if (this.timerId === null) {
        return;
      }

      clearInterval(this.timerId);
      this.timerId = null;
    },
    error(message: string) {
      showToast({ type: 'error', message });
    },
    success(message: string) {
      showToast({ type: 'success', message });
    },
  },
});
</script>
