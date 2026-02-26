<template>
  <div class="text-base flex flex-col overflow-hidden">
    <!-- Title Row -->
    <div
      class="
        flex
        items-center
        px-4
        h-row-mid
        flex-shrink-0
        surface-bg
        border-b
        app-border
        sticky
        top-0
        z-10
      "
      :style="{
        paddingRight: dataSlice.length > 13 ? 'var(--w-scrollbar)' : '',
      }"
    >
      <div
        v-if="!isSelectionMode"
        class="w-10 text-end me-2 text-sm font-semibold select-none text-gray-600 dark:text-gray-400"
      >
        #
      </div>
      <div v-else class="w-8 flex justify-end me-2">
        <Check
          :df="{
            fieldtype: 'Check',
            fieldname: 'selectAll',
            label: '',
          }"
          :show-label="false"
          :value="isAllSelected"
          @change="toggleSelectAll"
        />
      </div>
      <div
        v-if="schemaName === 'Party' && !isSelectionMode"
        class="w-8 flex items-center justify-center flex-shrink-0"
      />
      <Row
        class="flex-1 text-sm font-semibold h-row-mid select-none"
        :column-count="columns.length"
        gap="1rem"
      >
        <div
          v-for="(column, i) in columns"
          :key="column.label"
          class="
            overflow-x-auto
            no-scrollbar
            whitespace-nowrap
            h-row
            items-center
            flex
          "
          :class="{
            'ms-auto': isNumeric(column.fieldtype),
            'pe-4': i === columns.length - 1,
          }"
        >
          <span class="table-header-pill">{{ column.label }}</span>
        </div>
      </Row>
    </div>

    <!-- Data Rows -->
    <div
      v-if="dataSlice.length !== 0"
      class="
        flex-1
        min-h-0
        overflow-y-auto
        dark:dark-scroll
        custom-scroll custom-scroll-thumb1
      "
    >
      <div v-for="(row, i) in dataSlice" :key="(row.name as string)">
        <!-- Row Content -->
        <div
          class="flex items-center list-row hover:bg-gray-50 dark:hover:bg-gray-850"
          :class="i % 2 ? 'list-row-alt' : ''"
        >
          <div
            v-if="!isSelectionMode"
            class="w-8 text-end me-2 text-gray-700 dark:text-gray-400"
          >
            {{ i + pageStart + 1 }}
          </div>
          <div v-else class="w-8 flex justify-end me-2">
            <Check
              :df="{
                fieldtype: 'Check',
                fieldname: 'selectItem',
                label: '',
              }"
              :show-label="false"
              :value="selectedItems.includes(row.name as string)"
              @change="toggleItemSelection(row.name as string)"
            />
          </div>

          <div
            v-if="schemaName === 'Party' && !isSelectionMode"
            class="w-8 flex items-center justify-center flex-shrink-0"
            @click.stop="togglePartyExpand(row as RenderData)"
          >
            <button
              type="button"
              class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              :aria-label="expandedPartyName === row.name ? t`Collapse` : t`Expand`"
            >
              <feather-icon
                :name="expandedPartyName === row.name ? 'chevron-up' : 'chevron-down'"
                class="w-4 h-4"
              />
            </button>
          </div>

          <Row
            gap="1rem"
            class="
              cursor-pointer
              text-gray-900
              dark:text-gray-300
              flex-1
              h-row-mid
            "
            :column-count="columns.length"
            @click="isSelectionMode ? null : $emit('openDoc', row.name)"
          >
            <ListCell
              v-for="(column, c) in columns"
              :key="column.label"
              :class="{
                'text-end': isNumeric(column.fieldtype),
                'pe-4': c === columns.length - 1,
              }"
              :row="(row as RenderData)"
              :column="column"
              @status-found="handleStatusFound"
            />
          </Row>
        </div>

        <!-- Party movements (expandable) -->
        <div
          v-if="schemaName === 'Party' && expandedPartyName === row.name"
          class="surface-bg border-b app-border px-4 py-3"
        >
          <div v-if="loadingParty === row.name" class="py-4 text-center text-gray-500 dark:text-gray-400">
            {{ t`Loading...` }}
          </div>
          <template v-else>
            <div class="flex flex-wrap items-center gap-3 mb-3">
              <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {{ t`Party Movements` }} – {{ row.name }}
              </h4>
              <div class="flex items-center gap-2 flex-wrap">
                <label class="text-xs text-gray-600 dark:text-gray-400">{{ t`From` }}</label>
                <input
                  v-model="partyFromDate"
                  type="date"
                  class="rounded border app-border px-2 py-1 text-sm bg-gray-50 dark:bg-gray-890"
                />
                <label class="text-xs text-gray-600 dark:text-gray-400 ms-2">{{ t`To` }}</label>
                <input
                  v-model="partyToDate"
                  type="date"
                  class="rounded border app-border px-2 py-1 text-sm bg-gray-50 dark:bg-gray-890"
                />
                <Button
                  v-if="partyFromDate || partyToDate"
                  class="rounded-lg text-xs"
                  @click="applyPartyDateFilter(row as RenderData)"
                >
                  {{ t`Apply` }}
                </Button>
              </div>
              <Button
                class="rounded-xl"
                @click="showPrintPartyOptions = showPrintPartyOptions === row.name ? null : row.name"
              >
                <feather-icon name="printer" class="w-4 h-4 me-1 inline" />
                {{ t`Print` }}
              </Button>
            </div>
            <div
              v-if="(partyTransactionsCache[row.name as string] || []).length === 0"
              class="py-4 text-gray-500 dark:text-gray-400 text-sm"
            >
              {{ t`No transactions found` }}
            </div>
            <div
              v-else
              class="overflow-x-auto text-sm border app-border rounded-lg"
            >
              <div class="grid grid-cols-2 md:grid-cols-5 gap-2 p-2 border-b app-border bg-gray-50 dark:bg-gray-850">
                <div class="rounded border app-border px-2 py-1">
                  <div class="text-[11px] text-gray-500 dark:text-gray-400">رصيد افتتاحي</div>
                  <div class="text-sm font-semibold text-end">{{ getPartyStatementMeta(row.name as string, (row.role as string) || 'Customer').opening }}</div>
                </div>
                <div class="rounded border app-border px-2 py-1">
                  <div class="text-[11px] text-gray-500 dark:text-gray-400">{{ t`Debit` }}</div>
                  <div class="text-sm font-semibold text-end">{{ getPartyStatementMeta(row.name as string, (row.role as string) || 'Customer').debit }}</div>
                </div>
                <div class="rounded border app-border px-2 py-1">
                  <div class="text-[11px] text-gray-500 dark:text-gray-400">{{ t`Credit` }}</div>
                  <div class="text-sm font-semibold text-end">{{ getPartyStatementMeta(row.name as string, (row.role as string) || 'Customer').credit }}</div>
                </div>
                <div class="rounded border app-border px-2 py-1">
                  <div class="text-[11px] text-gray-500 dark:text-gray-400">الرصيد الختامي</div>
                  <div class="text-sm font-semibold text-end">{{ getPartyStatementMeta(row.name as string, (row.role as string) || 'Customer').closing }}</div>
                </div>
                <div class="rounded border app-border px-2 py-1">
                  <div class="text-[11px] text-gray-500 dark:text-gray-400">{{ t`Current` }}</div>
                  <div class="text-sm font-semibold text-end">{{ getPartyStatementMeta(row.name as string, (row.role as string) || 'Customer').current }}</div>
                </div>
              </div>
              <table class="w-full min-w-[32rem]" style="border-collapse: collapse">
                <thead>
                  <tr class="bg-gray-100 dark:bg-gray-800">
                    <th class="text-start px-3 py-2 border-b app-border font-semibold w-8"></th>
                    <th class="text-start px-3 py-2 border-b app-border font-semibold">{{ t`Date` }}</th>
                    <th class="text-start px-3 py-2 border-b app-border font-semibold">{{ t`Type` }}</th>
                    <th class="text-start px-3 py-2 border-b app-border font-semibold">{{ t`Reference` }}</th>
                    <th class="text-end px-3 py-2 border-b app-border font-semibold">{{ t`Amount` }}</th>
                    <th class="text-end px-3 py-2 border-b app-border font-semibold">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="(tx, idx) in partyTransactionsCache[row.name as string]" :key="idx">
                    <tr
                      :class="[
                        'hover:bg-gray-50 dark:hover:bg-gray-850',
                        (tx.schemaName === 'SalesInvoice' || tx.schemaName === 'PurchaseInvoice') ? 'cursor-pointer' : ''
                      ]"
                      @click="(tx.schemaName === 'SalesInvoice' || tx.schemaName === 'PurchaseInvoice') && toggleInvoiceDetails(row.name as string, tx.reference, tx.schemaName)"
                    >
                      <td class="px-2 py-2 border-b app-border">
                        <feather-icon
                          v-if="tx.schemaName === 'SalesInvoice' || tx.schemaName === 'PurchaseInvoice'"
                          :name="expandedInvoiceKey === (row.name + '|' + tx.reference) ? 'chevron-up' : 'chevron-down'"
                          class="w-4 h-4 text-gray-500"
                        />
                      </td>
                      <td class="px-3 py-2 border-b app-border">{{ tx.date }}</td>
                      <td class="px-3 py-2 border-b app-border">{{ tx.typeLabel }}</td>
                      <td class="px-3 py-2 border-b app-border">{{ tx.reference }}</td>
                      <td class="px-3 py-2 border-b app-border text-end">{{ partyTxAmount(tx, (row.role as string) || 'Customer') }}</td>
                      <td class="px-3 py-2 border-b app-border text-end">{{ partyRunningBalance(tx, (row.role as string) || 'Customer') }}</td>
                    </tr>
                    <tr
                      v-if="(tx.schemaName === 'SalesInvoice' || tx.schemaName === 'PurchaseInvoice') && expandedInvoiceKey === (row.name + '|' + tx.reference)"
                      class="bg-gray-50 dark:bg-gray-850/50"
                    >
                      <td colspan="6" class="px-3 py-2 border-b app-border">
                        <div v-if="invoiceItemsLoading === tx.reference" class="py-2 text-gray-500 text-xs">
                          {{ t`Loading...` }}
                        </div>
                        <table v-else class="w-full text-xs border app-border rounded">
                          <thead>
                            <tr class="bg-gray-100 dark:bg-gray-800">
                              <th class="text-start px-2 py-1 border-b app-border">{{ t`Invoice` }}</th>
                              <th class="text-start px-2 py-1 border-b app-border">{{ t`Item` }}</th>
                              <th class="text-center px-2 py-1 border-b app-border">{{ t`Quantity` }}</th>
                              <th class="text-end px-2 py-1 border-b app-border">{{ t`Rate` }}</th>
                              <th class="text-end px-2 py-1 border-b app-border">{{ t`Amount` }}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="(line, li) in (invoiceItemsCache[tx.reference] || [])"
                              :key="li"
                              class="hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              <td class="px-2 py-1 border-b app-border">{{ tx.reference }}</td>
                              <td class="px-2 py-1 border-b app-border">{{ line.item }}</td>
                              <td class="px-2 py-1 border-b app-border text-center">{{ line.quantity }}</td>
                              <td class="px-2 py-1 border-b app-border text-end">{{ line.rate }}</td>
                              <td class="px-2 py-1 border-b app-border text-end">{{ line.amount }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </template>
                </tbody>
                <tfoot>
                  <tr class="bg-gray-100 dark:bg-gray-800 font-semibold">
                    <td class="px-3 py-2 border-b app-border" colspan="5">الرصيد الختامي</td>
                    <td class="px-3 py-2 border-b app-border text-end">{{ partyTotals(row.name as string, (row.role as string) || 'Customer').amount }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </template>
        </div>

        <hr
          v-if="!(i === dataSlice.length - 1 && i > 13) && expandedPartyName !== row.name"
          class="dark:border-gray-800"
        />
        <hr
          v-if="schemaName === 'Party' && expandedPartyName === row.name"
          class="dark:border-gray-800"
        />
      </div>
    </div>

    <!-- Pagination Footer -->
    <div v-if="data?.length" class="mt-auto">
      <hr class="dark:border-gray-800" />
      <Paginator
        :item-count="data.length"
        class="px-4"
        @index-change="setPageIndices"
      />
    </div>

    <!-- Empty State -->
    <div
      v-if="!data?.length"
      class="flex flex-col items-center justify-center my-auto"
    >
      <img src="../../assets/img/list-empty-state.svg" alt="" class="w-24" />
      <p class="my-3 text-gray-800 dark:text-gray-200">
        {{ t`No entries found` }}
      </p>
      <Button v-if="canCreate" type="primary" @click="$emit('makeNewDoc')">
        {{ t`Make Entry` }}
      </Button>
    </div>

    <!-- Print options modal (centered) -->
    <Teleport to="body">
      <div
        v-if="schemaName === 'Party' && showPrintPartyOptions"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        @click.self="showPrintPartyOptions = null"
      >
        <div
          class="absolute inset-0 bg-black/40 dark:bg-black/50"
          aria-hidden="true"
        />
        <div
          dir="rtl"
          lang="ar"
          class="relative z-10 bg-white dark:bg-gray-890 border app-border rounded-xl shadow-xl p-5 min-w-[14rem] text-right"
          @click.stop
        >
          <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-800 dark:text-gray-200 mb-4">
            <input
              v-model="printWithDetails"
              type="checkbox"
              class="rounded border app-border shrink-0 ms-2"
            />
            <span>{{ t`Print with details` }}</span>
          </label>
          <div class="flex gap-2 justify-start">
            <Button
              class="rounded-lg text-sm"
              type="primary"
              @click="printPartyStatement(getPartyRowForPrint(showPrintPartyOptions)); showPrintPartyOptions = null"
            >
              {{ t`Print` }}
            </Button>
            <Button
              class="rounded-lg text-sm"
              @click="showPrintPartyOptions = null"
            >
              {{ t`Cancel` }}
            </Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
<script lang="ts">
import { ListViewSettings, RenderData } from 'fyo/model/types';
import { isPesa } from 'fyo/utils';
import { cloneDeep } from 'lodash';
import Button from 'src/components/Button.vue';
import Check from 'src/components/Controls/Check.vue';
import Paginator from 'src/components/Paginator.vue';
import Row from 'src/components/Row.vue';
import { fyo } from 'src/initFyo';
import { isNumeric } from 'src/utils';
import { QueryFilter } from 'utils/db/types';
import { PropType, defineComponent, toRaw } from 'vue';
import ListCell from './ListCell.vue';
import {
  buildPartyStatementPrintHtml,
  printHtmlDocument,
  type PartyStatementRow,
} from 'src/utils/printTemplates';
import {
  getPartyCurrentBalance,
  getPartyStatementData,
  type PartyStatementData,
} from 'src/utils/partyStatementService';

export default defineComponent({
  name: 'List',
  components: {
    Row,
    ListCell,
    Button,
    Check,
    Paginator,
  },
  props: {
    listConfig: {
      type: Object as PropType<ListViewSettings | undefined>,
      default: () => ({ columns: [] }),
    },
    filters: {
      type: Object as PropType<QueryFilter>,
      default: () => ({}),
    },
    schemaName: { type: String, required: true },
    canCreate: Boolean,
    isSelectionMode: Boolean,
    searchQuery: { type: String, default: '' },
  },
  emits: ['openDoc', 'makeNewDoc', 'updatedData', 'selected-items-changed'],
  data() {
    return {
      data: [] as RenderData[],
      pageStart: 0,
      pageEnd: 0,
      statusMap: {} as Record<string, string>,
      selectedItems: [] as string[],
      lastIncomingFilters: {} as Record<string, unknown>,
      expandedPartyName: null as string | null,
      partyTransactionsCache: {} as Record<string, PartyStatementRow[]>,
      partyStatementMetaCache: {} as Record<
        string,
        Omit<PartyStatementData, 'rows'>
      >,
      partyLedgerBalanceCache: {} as Record<string, number>,
      partyOutstandingRecalcDone: {} as Record<string, true>,
      loadingParty: null as string | null,
      showPrintPartyOptions: null as string | null,
      printWithDetails: false,
      forceRefreshBeforePrint: true,
      expandedInvoiceKey: null as string | null,
      invoiceItemsCache: {} as Record<
        string,
        { item: string; description: string; quantity: string; rate: string; amount: string }[]
      >,
      invoiceItemsLoading: null as string | null,
      partyFromDate: '' as string,
      partyToDate: '' as string,
    };
  },
  computed: {
    dataSlice() {
      return this.data.slice(this.pageStart, this.pageEnd);
    },
    count() {
      return this.pageEnd - this.pageStart + 1;
    },
    isAllSelected(): boolean {
      return (
        this.data.length > 0 && this.selectedItems.length === this.data.length
      );
    },
    columns() {
      let columns = this.listConfig?.columns ?? [];

      if (columns.length === 0) {
        columns = fyo.schemaMap[this.schemaName]?.quickEditFields ?? [];
        columns = [...new Set(['name', ...columns])];
      }

      return columns
        .map((fieldname) => {
          if (typeof fieldname === 'object') {
            return fieldname;
          }

          return fyo.getField(this.schemaName, fieldname);
        })
        .filter(Boolean);
    },
  },
  watch: {
    async schemaName(oldValue, newValue) {
      if (oldValue === newValue) {
        return;
      }

      await this.updateData();
    },
    searchQuery() {
      this.updateData(this.lastIncomingFilters);
    },
  },
  async mounted() {
    await this.updateData();
    this.setUpdateListeners();
  },
  activated() {
    // When returning to a cached list view, refresh to avoid stale outstanding values.
    void this.updateData(this.lastIncomingFilters);
  },
  methods: {
    partyTxAmount(
      tx: PartyStatementRow,
      role: 'Customer' | 'Supplier' | 'Both' | string = 'Customer'
    ): string {
      const d = tx.debitNum ?? 0;
      const c = tx.creditNum ?? 0;
      // Unified accounting sign for all roles: debit - credit.
      const amt = d - c;
      if (amt === 0) return '';
      const formatCur = (n: number) =>
        fyo.format(fyo.pesa(Math.abs(n)), fyo.getField('SalesInvoice', 'grandTotal'));
      return amt > 0 ? formatCur(amt) : '-' + formatCur(-amt);
    },
    partyRunningBalance(
      tx: PartyStatementRow,
      role: 'Customer' | 'Supplier' | 'Both' | string = 'Customer'
    ): string {
      if (typeof tx.runningBalanceNum === 'number') {
        const adjusted = this.getRoleAdjustedBalance(tx.runningBalanceNum, role);
        return this.formatSignedCurrency(adjusted);
      }
      return tx.runningBalance || '';
    },
    partyTotals(
      partyName: string,
      role: 'Customer' | 'Supplier' | 'Both' | string = 'Customer'
    ): { amount: string } {
      const meta = this.partyStatementMetaCache[partyName];
      const rawBalance =
        typeof meta?.closingBalance === 'number'
          ? meta.closingBalance
          : (this.partyLedgerBalanceCache[partyName] ?? 0);
      const balance = this.getRoleAdjustedBalance(rawBalance, role);
      const formatCur = (n: number) =>
        n === 0 ? '' : fyo.format(fyo.pesa(n), fyo.getField('SalesInvoice', 'grandTotal'));
      return { amount: formatCur(balance) };
    },
    getRoleAdjustedBalance(
      value: number,
      role: 'Customer' | 'Supplier' | 'Both' | string = 'Customer'
    ): number {
      // Requested display convention:
      // - Customer:   Dr-Cr as is
      // - Supplier:   invert sign of Dr-Cr
      return role === 'Supplier' ? -value : value;
    },
    formatSignedCurrency(v: number): string {
      const abs = fyo.format(
        fyo.pesa(Math.abs(v)),
        fyo.getField('SalesInvoice', 'grandTotal')
      );
      return v < 0 ? '-' + abs : abs;
    },
    getPartyStatementMeta(
      partyName: string,
      role: 'Customer' | 'Supplier' | 'Both' | string = 'Customer'
    ): {
      opening: string;
      debit: string;
      credit: string;
      closing: string;
      current: string;
    } {
      const meta = this.partyStatementMetaCache[partyName];
      if (!meta) {
        const zero = this.formatSignedCurrency(0);
        return {
          opening: zero,
          debit: zero,
          credit: zero,
          closing: zero,
          current: zero,
        };
      }
      const opening = this.getRoleAdjustedBalance(meta.openingBalance, role);
      const closing = this.getRoleAdjustedBalance(meta.closingBalance, role);
      const current = this.getRoleAdjustedBalance(meta.currentBalance, role);
      return {
        opening: this.formatSignedCurrency(opening),
        debit: this.formatSignedCurrency(meta.totalDebit),
        credit: this.formatSignedCurrency(meta.totalCredit),
        closing: this.formatSignedCurrency(closing),
        current: this.formatSignedCurrency(current),
      };
    },
    updatePartyRowOutstanding(
      partyName: string,
      amount: number,
      role: 'Customer' | 'Supplier' | 'Both' | string = 'Customer'
    ) {
      const idx = this.data.findIndex((r) => (r.name as string) === partyName);
      if (idx < 0) {
        return;
      }
      const displayAmount = this.getRoleAdjustedBalance(amount, role);
      const updated = [...this.data];
      updated[idx] = {
        ...updated[idx],
        outstandingAmount: fyo.pesa(displayAmount),
      };
      this.data = updated;
    },
    async syncPartyHeaderOutstanding(rows: RenderData[]) {
      if (this.schemaName !== 'Party' || rows.length === 0) {
        return;
      }
      const updated = [...this.data];
      await Promise.allSettled(
        rows.map(async (row) => {
          const partyName = (row.name as string) || '';
          if (!partyName) return;
          const role = (row as { role?: string }).role || 'Customer';
          const raw = await getPartyCurrentBalance(partyName, role);
          this.partyLedgerBalanceCache[partyName] = raw;
          const uiOutstanding = this.getRoleAdjustedBalance(raw, role);
          const idx = updated.findIndex((r) => (r.name as string) === partyName);
          if (idx >= 0) {
            updated[idx] = {
              ...updated[idx],
              outstandingAmount: fyo.pesa(uiOutstanding),
            };
          }
        })
      );
      this.data = updated;
    },
    async fetchAndCachePartyStatement(
      partyName: string,
      role: string,
      fromDate?: string,
      toDate?: string
    ): Promise<PartyStatementRow[]> {
      const statement = await getPartyStatementData(
        partyName,
        role,
        fromDate,
        toDate
      );
      this.partyTransactionsCache[partyName] = statement.rows;
      this.partyStatementMetaCache[partyName] = {
        openingBalance: statement.openingBalance,
        closingBalance: statement.closingBalance,
        currentBalance: statement.currentBalance,
        totalDebit: statement.totalDebit,
        totalCredit: statement.totalCredit,
      };
      this.partyLedgerBalanceCache[partyName] = statement.currentBalance;
      this.updatePartyRowOutstanding(partyName, statement.currentBalance, role);
      return statement.rows;
    },
    async applyPartyDateFilter(row: RenderData & { name?: string }) {
      const name = (row.name as string) || '';
      if (!name) return;
      this.partyTransactionsCache[name] = [];
      this.loadingParty = name;
      try {
        await this.fetchAndCachePartyStatement(
          name,
          (row.role as string) || 'Customer',
          this.partyFromDate || undefined,
          this.partyToDate || undefined
        );
      } finally {
        this.loadingParty = null;
      }
    },
    handleStatusFound({ rowId, status }: { rowId: string; status: string }) {
      this.statusMap[rowId] = status;
    },
    isNumeric,
    setPageIndices({ start, end }: { start: number; end: number }) {
      this.pageStart = start;
      this.pageEnd = end;
    },
    setUpdateListeners() {
      if (!this.schemaName) {
        return;
      }

      const listener = async () => {
        await this.updateData();
      };

      if (fyo.schemaMap[this.schemaName]?.isSubmittable) {
        fyo.doc.observer.on(`submit:${this.schemaName}`, listener);
        fyo.doc.observer.on(`cancel:${this.schemaName}`, listener);
      }

      fyo.doc.observer.on(`sync:${this.schemaName}`, listener);
      fyo.db.observer.on(`delete:${this.schemaName}`, listener);
      fyo.doc.observer.on(`rename:${this.schemaName}`, listener);

      // Party outstanding depends on transactional docs/ledger, not only Party sync.
      if (this.schemaName === 'Party') {
        const dependentSchemas = [
          'SalesInvoice',
          'PurchaseInvoice',
          'Payment',
          'JournalEntry',
        ];
        for (const s of dependentSchemas) {
          fyo.doc.observer.on(`sync:${s}`, listener);
          fyo.doc.observer.on(`submit:${s}`, listener);
          fyo.doc.observer.on(`cancel:${s}`, listener);
          fyo.db.observer.on(`delete:${s}`, listener);
        }
        fyo.doc.observer.on('sync:AccountingLedgerEntry', listener);
        fyo.db.observer.on('delete:AccountingLedgerEntry', listener);
      }
    },
    async updateData(filters?: Record<string, unknown>) {
      const baseFilters = cloneDeep(toRaw(this.filters));
      const incoming = cloneDeep(filters ?? {});
      this.lastIncomingFilters = incoming;
      let merged = { ...baseFilters, ...incoming };
      if (this.searchQuery?.trim()) {
        merged = { ...merged, name: ['like', this.searchQuery.trim()] };
      }
      let statusFilter: [string, string] | undefined;

      if ('status' in merged) {
        statusFilter = merged['status'] as [string, string];
      }

      const isStatusFilter =
        Array.isArray(statusFilter) && statusFilter[0] === 'like';
      if (isStatusFilter) {
        const { status: _s, ...rest } = merged;
        merged = rest;
      }

      const orderBy = ['created'];
      if (fyo.db.fieldMap[this.schemaName]?.['date']) {
        orderBy.unshift('date');
      }

      const tableData = await fyo.db.getAll(this.schemaName, {
        fields: ['*'],
        filters: merged as QueryFilter,
        orderBy,
      });

      let filteredData = tableData;

      if (isStatusFilter && statusFilter?.[1]) {
        const lowercaseStatus = String(statusFilter[1]).toLowerCase();

        const matchedNames = Object.entries(this.statusMap)
          .filter((entry) => entry[1].toLowerCase() === lowercaseStatus)
          .map((entry) => entry[0]);

        filteredData = tableData.filter((row) =>
          matchedNames.includes(String(row.name))
        );
      }

      this.data = filteredData.map((d) => ({
        ...d,
        schema: fyo.schemaMap[this.schemaName],
      })) as RenderData[];

      await this.syncPartyHeaderOutstanding(this.data as unknown as RenderData[]);

      // Safety net: if a Party row shows 0 outstanding but has unpaid invoices,
      // recalculate and persist the Party outstanding in the background.
      // This keeps legacy/missed recalculations from showing 0 as in the screenshots.
      void this.recalcPartyOutstandingForVisibleRows(
        this.data as unknown as RenderData[]
      );

      this.$emit('updatedData', merged);
    },
    async recalcPartyOutstandingForVisibleRows(rows: RenderData[]) {
      if (this.schemaName !== 'Party' || rows.length === 0) {
        return;
      }

      const prec = fyo.singles.SystemSettings?.internalPrecision ?? 11;
      const zero = '0.' + '0'.repeat(prec);

      const candidates = rows
        .map((r) => ({
          name: (r.name as string) || '',
          role: (r as { role?: string }).role ?? '',
          outstandingAmount: (r as { outstandingAmount?: unknown }).outstandingAmount,
        }))
        .filter((r) => r.name && (r.role === 'Supplier' || r.role === 'Customer' || r.role === 'Both'))
        .filter((r) => isPesa(r.outstandingAmount) && (r.outstandingAmount as any).isZero?.() === true)
        .filter((r) => !this.partyOutstandingRecalcDone[r.name]);

      if (candidates.length === 0) {
        return;
      }

      await Promise.allSettled(
        candidates.map(async (c) => {
          this.partyOutstandingRecalcDone[c.name] = true;
          try {
            const hasSalesOutstanding =
              c.role === 'Customer' || c.role === 'Both'
                ? (
                    await fyo.db.getAllRaw('SalesInvoice', {
                      fields: ['name'],
                      filters: {
                        party: c.name,
                        submitted: true,
                        cancelled: false,
                        outstandingAmount: ['!=', zero],
                      },
                      limit: 1,
                    })
                  ).length > 0
                : false;

            const hasPurchaseOutstanding =
              c.role === 'Supplier' || c.role === 'Both'
                ? (
                    await fyo.db.getAllRaw('PurchaseInvoice', {
                      fields: ['name'],
                      filters: {
                        party: c.name,
                        submitted: true,
                        cancelled: false,
                        outstandingAmount: ['!=', zero],
                      },
                      limit: 1,
                    })
                  ).length > 0
                : false;

            if (!hasSalesOutstanding && !hasPurchaseOutstanding) {
              return;
            }

            const partyDoc = await fyo.doc.getDoc('Party', c.name);
            const updater = (partyDoc as unknown as { updateOutstandingAmount?: () => Promise<void> })
              .updateOutstandingAmount;
            if (typeof updater === 'function') {
              await updater.call(partyDoc);
            }
          } catch {
            // Best-effort only; list stays usable even if recalculation fails.
          }
        })
      );
    },
    toggleItemSelection(itemName: string) {
      const index = this.selectedItems.indexOf(itemName);
      if (index > -1) {
        this.selectedItems.splice(index, 1);
      } else {
        this.selectedItems.push(itemName);
      }
      this.$emit('selected-items-changed', this.selectedItems);
    },
    toggleSelectAll(checked: boolean) {
      this.selectedItems = checked
        ? this.data.map((row) => row.name as string)
        : [];
      this.$emit('selected-items-changed', this.selectedItems);
    },
    async togglePartyExpand(row: RenderData & { name?: string; role?: string }) {
      const name = row.name as string;
      if (this.expandedPartyName === name) {
        this.expandedPartyName = null;
        return;
      }
      this.expandedPartyName = name;
      if (!this.partyTransactionsCache[name]) {
        this.loadingParty = name;
        try {
          await this.fetchAndCachePartyStatement(
            name,
            (row.role as string) || 'Customer',
            this.partyFromDate || undefined,
            this.partyToDate || undefined
          );
        } finally {
          this.loadingParty = null;
        }
      }
    },
    async getPartyTransactions(
      partyName: string,
      role: string,
      fromDate?: string,
      toDate?: string
    ): Promise<PartyStatementRow[]> {
      return await this.fetchAndCachePartyStatement(
        partyName,
        role,
        fromDate,
        toDate
      );
    },
    async toggleInvoiceDetails(
      partyName: string,
      reference: string,
      schemaName: string
    ) {
      const key = partyName + '|' + reference;
      if (this.expandedInvoiceKey === key) {
        this.expandedInvoiceKey = null;
        return;
      }
      this.expandedInvoiceKey = key;
      if (!this.invoiceItemsCache[reference]) {
        this.invoiceItemsLoading = reference;
        try {
          this.invoiceItemsCache[reference] = await this.getInvoiceItems(
            reference,
            schemaName
          );
        } finally {
          this.invoiceItemsLoading = null;
        }
      }
    },
    async getInvoiceItems(
      parentName: string,
      schemaName: string
    ): Promise<
      { item: string; description: string; quantity: string; rate: string; amount: string }[]
    > {
      const itemSchema =
        schemaName === 'SalesInvoice' ? 'SalesInvoiceItem' : 'PurchaseInvoiceItem';
      const raw = (await fyo.db.getAllRaw(itemSchema, {
        fields: ['item', 'description', 'quantity', 'rate', 'amount'],
        filters: { parent: parentName },
      })) as {
        item: string;
        description: string;
        quantity: number | string;
        rate: number | string;
        amount: number | string;
      }[];
      const formatCur = (v: number | string) =>
        fyo.format(fyo.pesa(v), fyo.getField('SalesInvoiceItem', 'rate'));
      const formatQty = (v: number | string) =>
        fyo.format(v, fyo.getField('SalesInvoiceItem', 'quantity'));
      return raw.map((r) => ({
        item: r.item || '',
        description: String(r.description || ''),
        quantity: formatQty(r.quantity),
        rate: formatCur(r.rate),
        amount: formatCur(r.amount),
      }));
    },
    getPartyRowForPrint(
      partyName: string
    ): RenderData & { name?: string; role?: string; phone?: string } {
      const schema = fyo.schemaMap.Party!;
      const row = this.data.find((r) => (r.name as string) === partyName) as
        | (RenderData & { name?: string; role?: string; phone?: string })
        | undefined;
      return row
        ? { ...row, name: partyName, schema }
        : ({ name: partyName, schema } as RenderData & { name?: string });
    },
    async printPartyStatement(row: RenderData & { name?: string; role?: string; phone?: string; address?: string }) {
      const partyName = (row.name as string) || '';
      let role = (row.role as 'Customer' | 'Supplier') ?? 'Customer';
      if (!row.role) {
        try {
          const partyDoc = await fyo.doc.getDoc('Party', partyName);
          const r = partyDoc?.get ? partyDoc.get('role') : (partyDoc as Record<string, unknown>)?.role;
          if (r === 'Supplier' || r === 'Customer') role = r;
        } catch {
          /* keep default Customer */
        }
      }
      if (this.forceRefreshBeforePrint || !this.partyTransactionsCache[partyName]) {
        await this.fetchAndCachePartyStatement(
          partyName,
          role,
          this.partyFromDate || undefined,
          this.partyToDate || undefined
        );
      }
      let list: PartyStatementRow[] = [...(this.partyTransactionsCache[partyName] || [])];
      const meta = this.partyStatementMetaCache[partyName];
      const printSettingsDoc = await fyo.doc.getDoc('PrintSettings');
      const getPs = (k: string) => (printSettingsDoc?.get ? printSettingsDoc.get(k) : (printSettingsDoc as Record<string, unknown>)[k]);
      const companyName = String(getPs('companyName') ?? '');
      const companyPhone = String(getPs('phone') ?? '');
      let companyAddress = '';
      const addressLink = getPs('address');
      if (addressLink) {
        try {
          const addrDoc = await fyo.doc.getDoc('Address', String(addressLink));
          const disp = addrDoc?.get ? addrDoc.get('addressDisplay') : (addrDoc as Record<string, unknown>)?.addressDisplay;
          companyAddress = disp ? String(disp) : String(addressLink);
        } catch {
          companyAddress = String(addressLink);
        }
      }
      let logoImageUrl: string | undefined;
      let displayLogo = !!getPs('displayLogo');
      let logo: unknown = getPs('logo');
      const dbPs = await fyo.db.get('PrintSettings', 'PrintSettings') as Record<string, unknown> | undefined;
      if (dbPs) {
        if (logo == null || logo === '') logo = dbPs.logo;
        if (!displayLogo) displayLogo = !!dbPs.displayLogo;
      }
      if (typeof logo === 'string' && logo.startsWith('{')) {
        try {
          logo = JSON.parse(logo) as Record<string, unknown>;
        } catch {
          /* keep as string */
        }
      }
      if (displayLogo && logo != null && logo !== '') {
        if (typeof logo === 'string' && logo.startsWith('data:')) {
          logoImageUrl = logo;
        } else if (typeof logo === 'object' && logo !== null && 'type' in logo && 'data' in logo) {
          const l = logo as { type: string; data: string };
          logoImageUrl = `data:${l.type};base64,${l.data}`;
        }
      }

      if (this.printWithDetails) {
        list = await Promise.all(
          list.map(async (tx) => {
            if (
              (tx.schemaName === 'SalesInvoice' || tx.schemaName === 'PurchaseInvoice') &&
              !this.invoiceItemsCache[tx.reference]
            ) {
              const details = await this.getInvoiceItems(
                tx.reference,
                tx.schemaName
              );
              this.invoiceItemsCache[tx.reference] = details;
              return { ...tx, details };
            }
            return {
              ...tx,
              details: this.invoiceItemsCache[tx.reference],
            };
          })
        );
      }
      const displayList = list.map((tx) => {
        const running =
          typeof tx.runningBalanceNum === 'number'
            ? this.formatSignedCurrency(
                this.getRoleAdjustedBalance(tx.runningBalanceNum, role)
              )
            : tx.runningBalance;
        return {
          ...tx,
          displayAmount: this.partyTxAmount(tx, role),
          runningBalance: running,
        };
      });
      const opening = this.getRoleAdjustedBalance(meta?.openingBalance ?? 0, role);
      const closing = this.getRoleAdjustedBalance(meta?.closingBalance ?? 0, role);
      const current = this.getRoleAdjustedBalance(meta?.currentBalance ?? 0, role);

      const html = buildPartyStatementPrintHtml({
        title: fyo.t`Account Statement`,
        partyName,
        companyName,
        companyAddress,
        companyPhone,
        partyPhone: row.phone ?? '',
        role,
        logoImageUrl,
        rows: displayList,
        openingBalance: opening,
        closingBalance: closing,
        totalDebit: meta?.totalDebit ?? 0,
        totalCredit: meta?.totalCredit ?? 0,
        currentBalance: current,
        dateRange:
          this.partyFromDate || this.partyToDate
            ? { from: this.partyFromDate, to: this.partyToDate }
            : undefined,
        labels: {
          party: fyo.t`Party`,
          company: fyo.t`Company`,
          date: fyo.t`Date`,
          type: fyo.t`Type`,
          reference: fyo.t`Reference`,
          debit: fyo.t`Debit`,
          credit: fyo.t`Credit`,
          balance: 'الرصيد',
          amount: fyo.t`Amount`,
          invoice: fyo.t`Invoice`,
          item: fyo.t`Item`,
          quantity: fyo.t`Quantity`,
          rate: fyo.t`Rate`,
          amountCol: fyo.t`Amount`,
          totals: fyo.t`Totals`,
          totalSales: fyo.t`Total Sales`,
          totalPurchases: fyo.t`Total Purchases`,
          totalPayments: fyo.t`Total Payments`,
          remaining: fyo.t`Remaining`,
          openingBalance: 'رصيد افتتاحي',
          closingBalance: 'الرصيد الختامي',
          currentBalance: fyo.t`Current`,
          logo: fyo.t`Logo`,
          address: fyo.t`Address`,
          phone: fyo.t`Phone`,
          partyPhone: fyo.t`Party Phone`,
        },
      });
      await printHtmlDocument(html, { width: 21, height: 29.7, dir: 'rtl' });
    },
  },
});
</script>
