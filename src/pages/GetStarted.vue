<template>
  <div class="flex flex-col overflow-y-hidden h-full">
    <PageHeader :title="t`Set Up Your Workspace`" />
    <div
      class="
        flex-1
        min-h-0
        overflow-y-auto overflow-x-hidden
        custom-scroll custom-scroll-thumb1
        flex flex-col
        relative
        rounded-2xl overflow-hidden
        mx-2 my-1
      "
      :style="backgroundStyle"
    >
      <div
        class="
          absolute inset-0
          bg-white/85 dark:bg-gray-950/85
          pointer-events-none
          rounded-2xl
        "
        aria-hidden="true"
      />
      <!-- الأزرار العلوية – لا يُغيّر مكانها ولا ستايلها -->
      <div
        class="
          relative
          w-full max-w-7xl mx-auto
          px-6 pt-6 pb-4
          flex-shrink-0
        "
      >
        <div
          class="get-started-actions flex flex-wrap justify-center gap-3"
        >
          <Button
            v-for="item in allItems"
            :key="item.key"
            class="
              justify-center gap-2 min-h-12 px-5 py-3
              font-medium text-base
              border dark:border-gray-700
              hover:border-gray-400 dark:hover:border-gray-500
              shadow-sm
              whitespace-nowrap
            "
            :type="item.action ? 'primary' : 'secondary'"
            @pointerdown.left.stop="handleAction(item)"
          >
            <Icon :name="item.icon" size="18" class="shrink-0" />
            <span>{{ item.label }}</span>
          </Button>
        </div>
      </div>

      <!-- منطقة المحتوى: النوت بوك بكامل الطول بين الأزرار ونهاية المنطقة القابلة للتمرير -->
      <div
        class="
          relative
          flex-1
          min-h-0
          flex flex-col
          w-full max-w-7xl mx-auto
          px-6
        "
      >
        <Notebook class="flex-1 min-h-0" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { DocValue } from 'fyo/core/types';
import Button from 'src/components/Button.vue';
import Icon from 'src/components/Icon.vue';
import PageHeader from 'src/components/PageHeader.vue';
import Notebook from 'src/pages/GetStarted/Notebook.vue';
import { fyo } from 'src/initFyo';
import { getGetStartedConfig } from 'src/utils/getStartedConfig';
import { GetStartedConfigItem } from 'src/utils/types';
import { defineComponent } from 'vue';

type ListItem = GetStartedConfigItem['items'][number];

export default defineComponent({
  name: 'GetStarted',
  components: {
    PageHeader,
    Button,
    Icon,
    Notebook,
  },
  props: {
    darkMode: { type: Boolean, default: false },
  },
  data() {
    return {
      sections: getGetStartedConfig(),
    };
  },
  computed: {
    backgroundStyle() {
      return { backgroundImage: 'none' };
    },
    allItems(): ListItem[] {
      return this.sections.flatMap((s) => s.items);
    },
  },
  async activated() {
    await fyo.doc.getDoc('GetStarted');
    await this.checkForCompletedTasks();
  },
  methods: {
    async handleAction({ key, action }: ListItem) {
      if (action) {
        await action();
      }

      switch (key) {
        case 'Print':
          await this.updateChecks({ printSetup: true });
          break;
        case 'General':
          await this.updateChecks({ companySetup: true });
          break;
        case 'System':
          await this.updateChecks({ systemSetup: true });
          break;
        case 'Review Accounts':
          await this.updateChecks({ chartOfAccountsReviewed: true });
          break;
        case 'Add Taxes':
          await this.updateChecks({ taxesAdded: true });
          break;
      }
    },
    async checkIsOnboardingComplete() {
      if (fyo.singles.GetStarted?.onboardingComplete) {
        return true;
      }

      const doc = await fyo.doc.getDoc('GetStarted');
      const onboardingComplete = fyo.schemaMap.GetStarted?.fields
        .filter(({ fieldname }) => fieldname !== 'onboardingComplete')
        .map(({ fieldname }) => doc.get(fieldname))
        .every(Boolean);

      if (onboardingComplete) {
        await this.updateChecks({ onboardingComplete });
      }

      return onboardingComplete;
    },
    async checkForCompletedTasks() {
      let toUpdate: Record<string, DocValue> = {};
      await this.checkIsOnboardingComplete();

      if (!fyo.singles.GetStarted?.salesItemCreated) {
        const count = await fyo.db.count('Item', { filters: { for: 'Sales' } });
        toUpdate.salesItemCreated = count > 0;
      }

      if (!fyo.singles.GetStarted?.purchaseItemCreated) {
        const count = await fyo.db.count('Item', {
          filters: { for: 'Purchases' },
        });
        toUpdate.purchaseItemCreated = count > 0;
      }

      if (!fyo.singles.GetStarted?.invoiceCreated) {
        const count = await fyo.db.count('SalesInvoice');
        toUpdate.invoiceCreated = count > 0;
      }

      if (!fyo.singles.GetStarted?.customerCreated) {
        const count = await fyo.db.count('Party', {
          filters: { role: 'Customer' },
        });
        toUpdate.customerCreated = count > 0;
      }

      if (!fyo.singles.GetStarted?.billCreated) {
        const count = await fyo.db.count('SalesInvoice');
        toUpdate.billCreated = count > 0;
      }

      if (!fyo.singles.GetStarted?.supplierCreated) {
        const count = await fyo.db.count('Party', {
          filters: { role: 'Supplier' },
        });
        toUpdate.supplierCreated = count > 0;
      }
      await this.updateChecks(toUpdate);
    },
    async updateChecks(toUpdate: Record<string, DocValue>) {
      await fyo.singles.GetStarted?.setAndSync(toUpdate);
      await fyo.doc.getDoc('GetStarted');
    },
  },
});
</script>

<style scoped>
.get-started-actions :deep(button) {
  background-color: var(--sidebar-bg) !important;
  color: var(--text) !important;
}
.get-started-actions :deep(button *) {
  color: var(--text) !important;
}
</style>
