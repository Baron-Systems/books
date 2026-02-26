<template>
  <FormContainer :use-full-width="useFullWidth">
    <template v-if="hasDoc" #header-left>
      <Barcode
        v-if="canShowBarcode && !isInvoiceWithItems"
        class="h-8"
        @item-selected="onBarcodeItemSelected"
      />
      <ExchangeRate
        v-if="canShowExchangeRate"
        :disabled="doc?.isSubmitted || doc?.isCancelled"
        :from-currency="fromCurrency"
        :to-currency="toCurrency"
        :exchange-rate="exchangeRate"
        @change="onExchangeRateChange"
      />
      <p
        v-if="schema.label && !((canShowBarcode && !isInvoiceWithItems) || canShowExchangeRate)"
        class="text-xl font-semibold items-center text-gray-600"
      >
        {{ schema.label }}
      </p>
    </template>
    <template v-if="hasDoc" #header>
      <Button
        v-if="canShowLinks"
        :icon="true"
        :title="t`View linked entries`"
        @click="showLinks = true"
      >
        <feather-icon name="link" class="w-4 h-4"></feather-icon>
      </Button>
      <Button
        v-if="canPrint"
        ref="printButton"
        :icon="true"
        :title="t`Open Print View`"
        @click="routeTo(`/print/${doc.schemaName}/${doc.name}`)"
      >
        <feather-icon name="printer" class="w-4 h-4"></feather-icon>
      </Button>
      <Button
        :icon="true"
        :title="t`Toggle between form and full width`"
        @click="toggleWidth"
      >
        <feather-icon
          :name="useFullWidth ? 'minimize' : 'maximize'"
          class="w-4 h-4"
        ></feather-icon>
      </Button>
      <DropdownWithActions
        v-for="group of groupedActions"
        :key="group.label"
        :type="group.type"
        :actions="group.actions"
      >
        <p v-if="group.group">
          {{ group.group }}
        </p>
        <feather-icon v-else name="more-horizontal" class="w-4 h-4" />
      </DropdownWithActions>
      <Button
        v-if="doc?.canSave"
        type="primary"
        :disabled="!canSavePayment"
        :title="!canSavePayment ? t`جلب الفواتير المعلقة أولاً` : undefined"
        @click="sync"
      >
        {{ t`Save` }}
      </Button>
      <Button v-else-if="doc?.canSubmit" type="primary" @click="submit">{{
        t`Submit`
      }}</Button>
    </template>
    <template #body>
      <FormHeader
        :form-title="title"
        class="
          sticky
          top-0
          bg-white
          dark:bg-gray-890
          border-b
          dark:border-gray-800
        "
      >
        <StatusPill v-if="hasDoc" :doc="doc" />
      </FormHeader>

      <!-- Journal Entry template selector (UI only; does not change posting logic) -->
      <JournalEntryTemplateSelector
        v-if="hasDoc && isJournalEntryForm && canUseTemplate"
        :doc="doc"
        @applied="updateGroupedFields"
      />

      <!-- Section Container -->
      <div
        v-if="hasDoc"
        class="overflow-auto custom-scroll custom-scroll-thumb1"
      >
        <template
          v-for="([n, fields], idx) in activeGroup.entries()"
          :key="n + idx"
        >
          <CommonFormSection
            ref="section"
            class="p-4"
            :class="
              idx !== 0 && activeGroup.size > 1
                ? 'border-t dark:border-gray-800'
                : ''
            "
            :show-title="activeGroup.size > 1 && n !== t`Default`"
            :title="n"
            :fields="fields"
            :doc="doc"
            :errors="errors"
            :show-barcode-above-items="canShowBarcode && isInvoiceWithItems"
            @editrow="showRowEditForm"
            @value-change="onValueChange"
            @row-change="updateGroupedFields"
            @outstanding-invoices-fetched="paymentOutstandingInvoicesFetched = true"
            @outstanding-invoices-reset="paymentOutstandingInvoicesFetched = false"
            @item-selected="onSectionItemSelected"
          />
          <!-- سطر المجاميع: مباشرة تحت الحسابات وفوق المراجع -->
          <div
            v-if="
              showJournalEntryTotals &&
              journalEntryAccountsTotals &&
              sectionHasAccountsTable(fields)
            "
            class="mx-4 mb-4 flex gap-6 flex-wrap py-2 px-3 rounded-md border dark:border-gray-800 bg-gray-50 dark:bg-gray-890 text-sm"
          >
            <span class="text-gray-600 dark:text-gray-400">
              {{ t`مجموع المدين` }}:
              <strong class="text-gray-900 dark:text-gray-100">{{
                doc.fyo.format(journalEntryAccountsTotals.totalDebit, 'Currency')
              }}</strong>
            </span>
            <span class="text-gray-600 dark:text-gray-400">
              {{ t`مجموع الدائن` }}:
              <strong class="text-gray-900 dark:text-gray-100">{{
                doc.fyo.format(journalEntryAccountsTotals.totalCredit, 'Currency')
              }}</strong>
            </span>
            <span
              :class="
                journalEntryAccountsTotals.difference !== 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-600 dark:text-gray-400'
              "
            >
              {{ t`الفرق` }}:
              <strong>{{
                doc.fyo.format(journalEntryAccountsTotals.difference, 'Currency')
              }}</strong>
            </span>
          </div>
        </template>
      </div>

      <!-- Tab Bar -->
      <div
        v-if="groupedFields && groupedFields.size > 1"
        class="
          mt-auto
          px-4
          pb-4
          flex
          gap-8
          border-t
          dark:border-gray-800
          flex-shrink-0
          sticky
          bottom-0
          bg-white
          dark:bg-gray-875
        "
      >
        <div
          v-for="key of groupedFields.keys()"
          :key="key"
          class="text-sm cursor-pointer"
          :class="
            key === activeTab
              ? 'text-gray-900 dark:text-gray-25 font-semibold border-t-2 border-gray-800 dark:border-gray-100'
              : 'text-gray-700 dark:text-gray-200 '
          "
          :style="{
            paddingTop: key === activeTab ? 'calc(1rem - 2px)' : '1rem',
          }"
          @click="activeTab = key"
        >
          {{ key }}
        </div>
      </div>
    </template>
    <template #quickedit>
      <Transition name="quickedit">
        <LinkedEntries
          v-if="showLinks && canShowLinks"
          :doc="doc"
          @close="showLinks = false"
        />
      </Transition>
      <Transition name="quickedit">
        <RowEditForm
          v-if="row && !showLinks"
          :doc="doc"
          :fieldname="row.fieldname"
          :index="row.index"
          @previous="setRowIndex"
          @next="setRowIndex"
          @close="() => (row = null)"
        />
      </Transition>
    </template>
  </FormContainer>
</template>
<script lang="ts">
import { DocValue } from 'fyo/core/types';
import { Doc } from 'fyo/model/doc';
import { DEFAULT_CURRENCY } from 'fyo/utils/consts';
import { ValidationError } from 'fyo/utils/errors';
import { getDocStatus } from 'models/helpers';
import { ModelNameEnum } from 'models/types';
import { Field, Schema } from 'schemas/types';
import { isPesa } from 'fyo/utils';
import Button from 'src/components/Button.vue';
import Barcode from 'src/components/Controls/Barcode.vue';
import ExchangeRate from 'src/components/Controls/ExchangeRate.vue';
import DropdownWithActions from 'src/components/DropdownWithActions.vue';
import FormContainer from 'src/components/FormContainer.vue';
import FormHeader from 'src/components/FormHeader.vue';
import StatusPill from 'src/components/StatusPill.vue';
import { getErrorMessage } from 'src/utils';
import { shortcutsKey } from 'src/utils/injectionKeys';
import { docsPathMap } from 'src/utils/misc';
import { docsPathRef } from 'src/utils/refs';
import { ActionGroup, DocRef, UIGroupedFields } from 'src/utils/types';
import {
  commonDocSubmit,
  commonDocSync,
  getDocFromNameIfExistsElseNew,
  getFieldsGroupedByTabAndSection,
  getFormRoute,
  getGroupedActionsForDoc,
  isPrintable,
  routeTo,
} from 'src/utils/ui';
import { useDocShortcuts } from 'src/utils/vueUtils';
import { computed, defineComponent, inject, nextTick, ref } from 'vue';
import JournalEntryTemplateSelector from './JournalEntryTemplateSelector.vue';
import CommonFormSection from './CommonFormSection.vue';
import LinkedEntries from './LinkedEntries.vue';
import RowEditForm from './RowEditForm.vue';

export default defineComponent({
  components: {
    FormContainer,
    FormHeader,
    JournalEntryTemplateSelector,
    CommonFormSection,
    Button,
    DropdownWithActions,
    Barcode,
    ExchangeRate,
    LinkedEntries,
    RowEditForm,
    StatusPill,
  },
  provide() {
    return {
      doc: computed(() => this.docOrNull),
    };
  },
  props: {
    name: { type: String, default: '' },
    schemaName: { type: String, default: ModelNameEnum.SalesInvoice },
  },
  setup() {
    const shortcuts = inject(shortcutsKey);
    const docOrNull = ref(null) as DocRef;
    let context = 'CommonForm';
    if (shortcuts) {
      context = useDocShortcuts(shortcuts, docOrNull, 'CommonForm', true, {
        enableSaveShortcut: false,
      });
    }

    return {
      docOrNull,
      shortcuts,
      context,
      printButton: ref<InstanceType<typeof Button> | null>(null),
    };
  },
  data() {
    return {
      errors: {},
      activeTab: this.t`Default`,
      groupedFields: null,
      isPrintable: false,
      showLinks: false,
      useFullWidth: false,
      row: null,
      paymentOutstandingInvoicesFetched: false,
    } as {
      errors: Record<string, string>;
      activeTab: string;
      groupedFields: null | UIGroupedFields;
      isPrintable: boolean;
      showLinks: boolean;
      useFullWidth: boolean;
      row: null | { index: number; fieldname: string };
      paymentOutstandingInvoicesFetched: boolean;
    };
  },
  computed: {
    canSavePayment(): boolean {
      if (this.schemaName !== 'Payment' || !this.hasDoc) {
        return true;
      }
      if (this.doc.inserted) {
        return true;
      }
      return this.paymentOutstandingInvoicesFetched;
    },
    canShowBarcode(): boolean {
      if (!this.fyo.singles.InventorySettings?.enableBarcodes) {
        return false;
      }

      if (!this.hasDoc) {
        return false;
      }

      if (this.doc.isSubmitted || this.doc.isCancelled) {
        return false;
      }

      // @ts-ignore
      return typeof this.doc?.addItem === 'function';
    },
    canShowExchangeRate(): boolean {
      return this.hasDoc && !!this.doc.isMultiCurrency;
    },
    exchangeRate(): number {
      if (!this.hasDoc || typeof this.doc.exchangeRate !== 'number') {
        return 1;
      }

      return this.doc.exchangeRate;
    },
    fromCurrency(): string {
      const currency = this.doc?.currency;
      if (typeof currency !== 'string') {
        return this.toCurrency;
      }

      return currency;
    },
    toCurrency(): string {
      const currency = this.fyo.singles.SystemSettings?.currency;
      if (typeof currency !== 'string') {
        return DEFAULT_CURRENCY;
      }

      return currency;
    },
    canPrint(): boolean {
      if (!this.hasDoc) {
        return false;
      }

      return !this.doc.isCancelled && !this.doc.dirty && this.isPrintable;
    },
    canShowLinks(): boolean {
      if (!this.hasDoc) {
        return false;
      }

      if (this.doc.schema.isSubmittable && !this.doc.isSubmitted) {
        return false;
      }

      return this.doc.inserted;
    },
    hasDoc(): boolean {
      return this.docOrNull instanceof Doc;
    },
    isJournalEntryForm(): boolean {
      return this.schemaName === ModelNameEnum.JournalEntry;
    },
    /** عرض مجاميع المدين/الدائن فقط في صفحة القيود اليومية وعند تبويب الحسابات */
    showJournalEntryTotals(): boolean {
      if (!this.hasDoc || !this.isJournalEntryForm) {
        return false;
      }
      const fieldsInCurrentTab = [...(this.activeGroup?.values() ?? [])].flat();
      return fieldsInCurrentTab.some(
        (f) => f.fieldname === 'accounts' && f.fieldtype === 'Table'
      );
    },
    journalEntryAccountsTotals(): {
      totalDebit: number;
      totalCredit: number;
      difference: number;
    } | null {
      if (!this.hasDoc || this.schemaName !== ModelNameEnum.JournalEntry) {
        return null;
      }
      const list = this.doc.accounts;
      if (!Array.isArray(list)) {
        return { totalDebit: 0, totalCredit: 0, difference: 0 };
      }
      let totalDebit = 0;
      let totalCredit = 0;
      for (const row of list) {
        const r = row as { debit?: unknown; credit?: unknown };
        totalDebit += this.toNumeric(r?.debit);
        totalCredit += this.toNumeric(r?.credit);
      }
      return {
        totalDebit,
        totalCredit,
        difference: totalDebit - totalCredit,
      };
    },
    isInvoiceWithItems(): boolean {
      return (
        this.schemaName === ModelNameEnum.SalesInvoice ||
        this.schemaName === ModelNameEnum.PurchaseInvoice
      );
    },
    canUseTemplate(): boolean {
      return (
        !!this.hasDoc &&
        !this.doc.isSubmitted &&
        !this.doc.isCancelled
      );
    },
    status(): string {
      if (!this.hasDoc) {
        return '';
      }

      return getDocStatus(this.doc);
    },
    doc(): Doc {
      const doc = this.docOrNull;
      if (!doc) {
        throw new ValidationError(
          this.t`Doc ${this.schema.label} ${this.name} not set`
        );
      }
      return doc;
    },
    title(): string {
      if (this.schema.isSubmittable && this.docOrNull?.notInserted) {
        return this.t`New Entry`;
      }

      return this.docOrNull?.name || this.t`New Entry`;
    },
    schema(): Schema {
      const schema = this.fyo.schemaMap[this.schemaName];
      if (!schema) {
        throw new ValidationError(`no schema found with ${this.schemaName}`);
      }

      return schema;
    },
    activeGroup(): Map<string, Field[]> {
      if (!this.groupedFields) {
        return new Map();
      }

      const group = this.groupedFields.get(this.activeTab);
      if (!group) {
        const tab = [...this.groupedFields.keys()][0];
        return this.groupedFields.get(tab) ?? new Map<string, Field[]>();
      }

      return group;
    },
    groupedActions(): ActionGroup[] {
      if (!this.hasDoc) {
        return [];
      }

      return getGroupedActionsForDoc(this.doc);
    },
  },
  watch: {
    name() {
      void this.setDoc();
    },
    schemaName() {
      void this.setDoc();
    },
  },
  beforeMount() {
    this.useFullWidth = !!this.fyo.singles.Misc?.useFullWidth;
  },
  async mounted() {
    if (this.fyo.store.isDevelopment) {
      // @ts-ignore
      window.cf = this;
    }

    await this.setDoc();
    if (this.hasDoc && this.schemaName === 'Payment') {
      this.paymentOutstandingInvoicesFetched = !!this.doc.inserted;
    }
    this.replacePathAfterSync();
    this.updateGroupedFields();
    if (this.groupedFields) {
      this.activeTab = [...this.groupedFields.keys()][0];
    }
    this.isPrintable = await isPrintable(this.schemaName);
  },
  activated(): void {
    this.useFullWidth = !!this.fyo.singles.Misc?.useFullWidth;
    docsPathRef.value = docsPathMap[this.schemaName] ?? '';
    this.shortcuts?.pmod.set(this.context, ['KeyP'], () => {
      if (!this.canPrint) {
        return;
      }

      this.printButton?.$el.click();
    });
    this.shortcuts?.pmod.set(this.context, ['KeyL'], () => {
      if (!this.canShowLinks && !this.showLinks) {
        return;
      }

      this.showLinks = !this.showLinks;
    });
  },
  deactivated(): void {
    docsPathRef.value = '';
    this.showLinks = false;
    this.row = null;
  },
  methods: {
    routeTo,
    onBarcodeItemSelected(name: string) {
      // Some docs (e.g. Invoice) implement addItem; keep this optional.
      const maybe = this.doc as unknown as { addItem?: (n: string) => unknown };
      return maybe.addItem?.(name);
    },
    async onExchangeRateChange(exchangeRate: number) {
      if (!this.hasDoc) {
        return;
      }
      await this.doc.set('exchangeRate', exchangeRate);
    },
    onSectionItemSelected(name: string) {
      const maybe = this.doc as unknown as { addItem?: (n: string) => unknown };
      return maybe.addItem?.(name);
    },
    setRowIndex(i: number) {
      if (!this.row) {
        return;
      }
      this.row.index = i;
    },
    toNumeric(value: unknown): number {
      if (value == null || value === '') {
        return 0;
      }
      if (typeof value === 'number' && !Number.isNaN(value)) {
        return value;
      }
      if (isPesa(value)) {
        return (value as { float: number }).float;
      }
      return Number(value) || 0;
    },
    sectionHasAccountsTable(fields: Field[]): boolean {
      return (fields ?? []).some(
        (f) => f.fieldname === 'accounts' && f.fieldtype === 'Table'
      );
    },
    async toggleWidth() {
      const value = !this.useFullWidth;
      await this.fyo.singles.Misc?.setAndSync('useFullWidth', value);
      this.useFullWidth = value;
    },
    updateGroupedFields(): void {
      if (!this.hasDoc) {
        return;
      }

      this.groupedFields = getFieldsGroupedByTabAndSection(
        this.schema,
        this.doc
      );
    },
    async sync(useDialog?: boolean) {
      if (!this.canSavePayment) {
        return;
      }
      if (await commonDocSync(this.doc, useDialog)) {
        this.updateGroupedFields();
      }
    },
    async submit() {
      if (await commonDocSubmit(this.doc)) {
        this.updateGroupedFields();
      }
    },
    async setDoc() {
      // Skip reload when we already have the doc for this route (e.g. after save + replace)
      if (
        this.docOrNull &&
        this.docOrNull.name === this.name &&
        this.docOrNull.schemaName === this.schemaName
      ) {
        return;
      }

      this.docOrNull = await getDocFromNameIfExistsElseNew(
        this.schemaName,
        this.name
      );
    },
    replacePathAfterSync() {
      if (!this.hasDoc || this.doc.inserted) {
        return;
      }

      this.doc.once('afterSync', async () => {
        const route = getFormRoute(this.schemaName, this.doc.name!);
        await this.$router.replace(route);
      });
    },
    async showRowEditForm(doc: Doc) {
      if (this.showLinks) {
        this.showLinks = false;
        await nextTick();
      }

      const index = doc.idx;
      const fieldname = doc.parentFieldname;

      if (typeof index === 'number' && typeof fieldname === 'string') {
        this.row = { index, fieldname };
      }
    },
    async onValueChange(field: Field, value: DocValue) {
      const { fieldname } = field;
      delete this.errors[fieldname];

      try {
        await this.doc.set(fieldname, value);
      } catch (err) {
        if (!(err instanceof Error)) {
          return;
        }

        this.errors[fieldname] = getErrorMessage(err, this.doc);
      }

      this.updateGroupedFields();
    },
  },
});
</script>
