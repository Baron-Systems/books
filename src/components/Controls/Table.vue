<template>
  <div v-if="tableFields?.length">
    <div v-if="showLabel" class="text-gray-600 dark:text-gray-400 text-sm mb-1">
      {{ df.label }}
    </div>

    <!-- Search for tables with many rows (e.g. Price List items) -->
    <div
      v-if="isSearchable && value?.length > 3"
      class="flex items-center gap-2 mb-2"
    >
      <feather-icon
        name="search"
        class="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0"
      />
      <input
        v-model="tableSearchQuery"
        type="search"
        :placeholder="t`Search items...`"
        class="
          flex-1
          min-w-0
          px-3
          py-1.5
          rounded-lg
          border
          app-border
          bg-gray-50
          dark:bg-gray-890
          text-sm
          text-gray-900
          dark:text-gray-100
          placeholder-gray-500
          focus:outline-none
          focus:ring-1
          focus:ring-primary
        "
      />
    </div>

    <div
      :class="border ? 'border dark:border-gray-800 rounded-md' : ''"
      :style="tableWrapperStyle"
    >
      <!-- Title Row -->
      <Row
        :ratio="ratio"
        class="
          border-b
          dark:border-gray-800
          px-2
          py-1
          text-gray-600
          dark:text-gray-400
          w-full
          flex
          items-center
        "
      >
        <div class="flex items-center ps-2">#</div>
        <div
          v-for="df in tableFields"
          :key="df.fieldname"
          class="items-center px-2 min-h-[2.25rem]"
          :class="{
            'ms-auto': isNumeric(df),
          }"
          :style="{
            height: ``,
          }"
        >
          {{ df.label }}
          <p class="text-xs">{{ df.sub_label }}</p>
        </div>
      </Row>

      <!-- Data Rows -->
      <div
        v-if="displayValue"
        class="overflow-auto custom-scroll custom-scroll-thumb1"
        :style="{ 'max-height': maxHeight }"
      >
        <TableRow
          v-for="(row, idx) of displayValue"
          ref="table-row"
          :key="row.name"
          :class="idx < displayValue.length - 1 ? 'border-b dark:border-gray-800' : ''"
          v-bind="{ row, tableFields, size, ratio, isNumeric }"
          :read-only="isReadOnly"
          :can-edit-row="canEditRow"
          @remove="removeRow(row)"
          @change="(field, value) => $emit('row-change', field, value, df)"
        />
      </div>

      <!-- Add Row and Row Count -->
      <Row
        v-if="!isReadOnly"
        :ratio="ratio"
        class="
          text-gray-500
          cursor-pointer
          px-2
          py-1.5
          w-full
          min-h-[2.5rem]
          flex
          items-center
          focus:outline-none focus:ring-1 focus:ring-blue-500
        "
        :class="displayValue.length > 0 ? 'border-t dark:border-gray-800' : ''"
        tabindex="0"
        @click="addRow"
        @keydown.enter="addRow"
      >
        <div class="flex items-center ps-1">
          <feather-icon name="plus" class="w-5 h-5 text-gray-500 flex-shrink-0" />
        </div>
        <div
          class="flex justify-between px-2"
          :style="`grid-column: 2 / ${ratio.length + 1}`"
        >
          <p>
            {{ t`Add Row` }}
          </p>
          <p
            v-if="
              displayValue &&
              maxRowsBeforeOverflow &&
              displayValue.length > maxRowsBeforeOverflow
            "
            class="text-end px-2"
          >
            {{ t`${displayValue.length} rows` }}
          </p>
        </div>
      </Row>
    </div>
  </div>
</template>

<script>
import Row from 'src/components/Row.vue';
import { fyo } from 'src/initFyo';
import { nextTick } from 'vue';
import Base from './Base.vue';
import TableRow from './TableRow.vue';

export default {
  name: 'Table',
  components: {
    Row,
    TableRow,
  },
  extends: Base,
  props: {
    value: { type: Array, default: () => [] },
    showHeader: {
      type: Boolean,
      default: true,
    },
    maxRowsBeforeOverflow: {
      type: Number,
      default: 0,
    },
    border: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['editrow', 'row-change'],
  data() {
    return { maxHeight: '', tableSearchQuery: '' };
  },
  computed: {
    isSearchable() {
      return this.df?.target === 'PriceListItem';
    },
    effectiveMaxRowsBeforeOverflow() {
      return this.maxRowsBeforeOverflow;
    },
    displayValue() {
      const rows = this.value ?? [];
      if (!this.isSearchable || !this.tableSearchQuery?.trim()) {
        return rows;
      }
      const q = this.tableSearchQuery.trim().toLowerCase();
      const fields = this.tableFields?.map((f) => f.fieldname) ?? [];
      return rows.filter((row) => {
        for (const fieldname of fields) {
          const val = row[fieldname];
          if (val != null && String(val).toLowerCase().includes(q)) {
            return true;
          }
        }
        return false;
      });
    },
    height() {
      if (this.size === 'small') {
      }
      return 2;
    },
    canEditRow() {
      return this.df.edit;
    },
    ratio() {
      const ratio = [0.3].concat(this.tableFields.map(() => 1));

      if (this.canEditRow) {
        return ratio.concat(0.3);
      }

      return ratio;
    },
    tableFields() {
      const schema = fyo.schemaMap[this.df.target];
      if (!schema) {
        return [];
      }
      const fields = schema.tableFields ?? [];
      return fields.map((fieldname) => fyo.getField(this.df.target, fieldname));
    },
    tableWrapperStyle() {
      const colCount = this.tableFields?.length ?? 0;
      if (colCount >= 6) {
        return { minWidth: '880px' };
      }
      return {};
    },
  },
  watch: {
    value() {
      this.setMaxHeight();
    },
    tableSearchQuery() {
      this.setMaxHeight();
    },
  },
  mounted() {
    if (fyo.store.isDevelopment) {
      window.tab = this;
    }
  },

  methods: {
    focus() {},
    async addRow() {
      await this.doc.append(this.df.fieldname);
      await nextTick();
      this.scrollToRow((this.displayValue ?? []).length - 1);
      this.triggerChange(this.value);
      this.$nextTick(() => {
        const rows = this.$refs['table-row'];
        if (rows && rows.length > 0) {
          const lastRow = rows[rows.length - 1];
          if (lastRow.focusFirstInput) {
            lastRow.focusFirstInput();
          }
        }
      });
    },
    removeRow(row) {
      this.doc.remove(this.df.fieldname, row.idx).then((s) => {
        if (!s) {
          return;
        }
        this.triggerChange(this.value);
      });
    },

    scrollToRow(index) {
      const row = this.$refs['table-row'][index];
      row && row.$el.scrollIntoView({ block: 'nearest' });
    },

    setMaxHeight() {
      if (this.effectiveMaxRowsBeforeOverflow === 0) {
        return (this.maxHeight = '');
      }

      const size = this?.displayValue?.length ?? 0;
      if (size === 0) {
        return (this.maxHeight = '');
      }

      const rowHeight = this.$refs?.['table-row']?.[0]?.$el.offsetHeight;
      if (rowHeight === undefined) {
        return (this.maxHeight = '');
      }

      const maxHeight =
        rowHeight * Math.min(this.effectiveMaxRowsBeforeOverflow, size);
      return (this.maxHeight = `${maxHeight}px`);
    },
  },
};
</script>
