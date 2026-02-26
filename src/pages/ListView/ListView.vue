<template>
  <div class="flex flex-col">
    <PageHeader :title="title" />

    <!-- Secondary header (toolbar) -->
    <div
      class="
        px-4
        py-2
        flex
        items-center
        gap-2
        surface-bg
        border-b
        app-border
        header-elevated
        flex-shrink-0
      "
    >
      <Button
        v-if="canCreate"
        ref="makeNewDocButton"
        :icon="true"
        type="primary"
        :padding="false"
        class="px-3 rounded-xl"
        @click="handleMakeNewDoc"
      >
        <feather-icon name="plus" class="w-4 h-4" />
      </Button>

      <FilterDropdown
        ref="filterDropdown"
        :schema-name="schemaName"
        @change="applyFilter"
      />

      <div class="relative flex items-center min-w-48 max-w-64">
        <feather-icon
          name="search"
          class="absolute left-2.5 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none"
        />
        <input
          v-model="searchQuery"
          type="search"
          :placeholder="t`Search...`"
          class="
            w-full
            pl-8
            pr-3
            py-1.5
            rounded-xl
            border
            app-border
            bg-gray-50
            dark:bg-gray-890
            text-sm
            text-gray-900
            dark:text-gray-100
            placeholder-gray-500
            dark:placeholder-gray-400
            focus:outline-none
            focus:ring-1
            focus:ring-primary
          "
        />
      </div>

      <Button ref="exportButton" :icon="false" class="rounded-xl" @click="openExportModal = true">
        {{ t`Export` }}
      </Button>

      <Button
        v-if="
          schemaName === 'Item' &&
          (!isSelectionMode || (isSelectionMode && selectedItems.length === 0))
        "
        class="rounded-xl"
        @click="toggleSelectionMode"
      >
        {{ t`Select` }}
      </Button>

      <div
        v-if="isSelectionMode && schemaName === 'Item' && selectedItems.length > 0"
        class="relative"
      >
        <Button class="w-40 rounded-xl" @click="toggleDropdown"> Create </Button>
        <div
          v-if="showDropdown"
          class="
            absolute
            top-full
            mt-2
            bg-white
            dark:bg-gray-890
            border
            app-border
            rounded-xl
            shadow-md
            z-10
            w-44
            overflow-hidden
          "
        >
          <div
            v-for="option in actionOptions"
            :key="option.value"
            class="
              px-4
              py-2
              hover:bg-gray-50
              dark:hover:bg-gray-900
              cursor-pointer
              text-sm
              text-gray-800
              dark:text-gray-200
            "
            @click="createInvoice(option.value)"
          >
            {{ option.label }}
          </div>
        </div>
      </div>

      <div class="ms-auto"></div>
    </div>
    <List
      ref="list"
      :schema-name="schemaName"
      :list-config="listConfig"
      :filters="filters"
      :search-query="searchQuery"
      :can-create="canCreate"
      :is-selection-mode="isSelectionMode"
      class="flex-1 flex h-full"
      @open-doc="openDoc"
      @updated-data="updatedData"
      @make-new-doc="makeNewDoc"
      @selected-items-changed="updateSelectedItems"
    />
    <Modal :open-modal="openExportModal" @closemodal="openExportModal = false">
      <ExportWizard
        class="w-form"
        :schema-name="schemaName"
        :title="pageTitle"
        :list-filters="listFilters"
      />
    </Modal>
  </div>
</template>
<script lang="ts">
import { Field } from 'schemas/types';
import Button from 'src/components/Button.vue';
import ExportWizard from 'src/components/ExportWizard.vue';
import FilterDropdown from 'src/components/FilterDropdown.vue';
import Modal from 'src/components/Modal.vue';
import PageHeader from 'src/components/PageHeader.vue';

import { fyo } from 'src/initFyo';
import { shortcutsKey } from 'src/utils/injectionKeys';
import {
  docsPathMap,
  getCreateFiltersFromListViewFilters,
} from 'src/utils/misc';
import { docsPathRef } from 'src/utils/refs';
import { getFormRoute, routeTo } from 'src/utils/ui';
import { QueryFilter } from 'utils/db/types';
import { defineComponent, inject, ref } from 'vue';
import List from './List.vue';
import { Money } from 'pesa';
import { ModelNameEnum } from 'models/types';
import { hasPermission } from 'src/utils/authService';
import { getWritePermissionForSchema } from 'src/utils/permissions';

export default defineComponent({
  name: 'ListView',
  components: {
    PageHeader,
    List,
    Button,
    FilterDropdown,
    Modal,
    ExportWizard,
  },
  props: {
    schemaName: { type: String, required: true },
    filters: { type: Object, default: undefined },
    pageTitle: { type: String, default: '' },
  },
  setup() {
    return {
      shortcuts: inject(shortcutsKey),
      list: ref<InstanceType<typeof List> | null>(null),
      makeNewDocButton: ref<InstanceType<typeof Button> | null>(null),
      exportButton: ref<InstanceType<typeof Button> | null>(null),
      filterDropdown: ref<InstanceType<typeof FilterDropdown> | null>(null),
    };
  },
  data() {
    return {
      listConfig: undefined,
      openExportModal: false,
      listFilters: {},
      isSelectionMode: false,
      showDropdown: false,
      selectedItems: [] as string[],
      searchQuery: '',
    } as {
      listConfig: undefined | ReturnType<typeof getListConfig>;
      openExportModal: boolean;
      listFilters: QueryFilter;
      isSelectionMode: boolean;
      showDropdown: boolean;
      selectedItems: string[];
      searchQuery: string;
    };
  },
  computed: {
    context(): string {
      return 'ListView-' + this.schemaName;
    },
    title(): string {
      if (this.pageTitle) {
        return this.pageTitle;
      }

      return fyo.schemaMap[this.schemaName]?.label ?? this.schemaName;
    },
    fields(): Field[] {
      return fyo.schemaMap[this.schemaName]?.fields ?? [];
    },
    canCreate(): boolean {
      if (fyo.schemaMap[this.schemaName]?.create === false) return false;
      const writePerm = getWritePermissionForSchema(this.schemaName);
      if (writePerm && !hasPermission(writePerm)) return false;
      return true;
    },
    actionOptions(): { value: string; label: string }[] {
      return [
        { value: 'SalesQuote', label: 'Sales Quote' },
        { value: 'SalesInvoice', label: 'Sales Invoice' },
        { value: 'PurchaseInvoice', label: 'Purchase Invoice' },
      ];
    },
  },
  activated() {
    this.listConfig = getListConfig(this.schemaName);
    docsPathRef.value =
      docsPathMap[this.schemaName] ?? docsPathMap.Entries ?? '';

    if (this.fyo.store.isDevelopment) {
      // @ts-ignore
      window.lv = this;
    }

    this.setShortcuts();
  },
  deactivated() {
    docsPathRef.value = '';
    this.shortcuts?.delete(this.context);
  },
  methods: {
    setShortcuts() {
      if (!this.shortcuts) {
        return;
      }

      this.shortcuts.pmod.set(this.context, ['KeyN'], () =>
        this.makeNewDocButton?.$el.click()
      );
      this.shortcuts.pmod.set(this.context, ['KeyE'], () =>
        this.exportButton?.$el.click()
      );
    },
    updatedData(listFilters: QueryFilter) {
      this.listFilters = listFilters;
    },
    async openDoc(name: string) {
      const route = getFormRoute(this.schemaName, name);
      await routeTo(route);
    },
    async makeNewDoc() {
      if (!this.canCreate) {
        return;
      }

      const filters = getCreateFiltersFromListViewFilters(this.filters ?? {});
      const doc = fyo.doc.getNewDoc(this.schemaName, filters);
      const route = getFormRoute(this.schemaName, doc.name!);
      await routeTo(route);
    },
    async handleMakeNewDoc() {
      await this.makeNewDoc();
    },
    applyFilter(filters: QueryFilter) {
      this.list?.updateData(filters);
    },
    toggleSelectionMode() {
      this.isSelectionMode = !this.isSelectionMode;
      if (!this.isSelectionMode) {
        this.showDropdown = false;
        this.selectedItems = [];
      }
    },
    toggleDropdown() {
      this.showDropdown = !this.showDropdown;
    },
    async createInvoice(value: string) {
      if (
        value === ModelNameEnum.SalesQuote ||
        value === ModelNameEnum.SalesInvoice ||
        value === ModelNameEnum.PurchaseInvoice
      ) {
        const doc = fyo.doc.getNewDoc(value);

        for (const itemName of this.selectedItems) {
          const itemDoc = await fyo.doc.getDoc('Item', itemName);

          const itemRow = {
            item: itemName,
            rate: (itemDoc.rate as Money) || fyo.pesa(0),
            quantity: 1,
          };

          await doc.append('items', itemRow);
        }

        const route = getFormRoute(value, doc.name!);
        await routeTo(route);
        this.selectedItems = [];
        this.isSelectionMode = false;
        this.showDropdown = false;
      }
    },

    updateSelectedItems(selected: string[]) {
      this.selectedItems = selected;
    },
  },
});

function getListConfig(schemaName: string) {
  const listConfig = fyo.models[schemaName]?.getListViewSettings?.(fyo);
  if (listConfig?.columns === undefined) {
    return {
      columns: ['name'],
    };
  }
  return listConfig;
}
</script>
