<template>
  <FormContainer>
    <template #header>
      <Button v-if="canSave" type="primary" @click="sync">
        {{ t`Save` }}
      </Button>
    </template>
    <template #body>
      <FormHeader
        :form-title="tabLabels[activeTab] ?? ''"
        :form-sub-title="t`Settings`"
        class="
          sticky
          top-0
          bg-white
          dark:bg-gray-890
          border-b
          dark:border-gray-800
        "
      >
      </FormHeader>

      <!-- Section Container -->
      <div v-if="doc" class="overflow-auto custom-scroll custom-scroll-thumb1">
        <!-- Activation status (global, stored in config) -->
        <div
          v-if="activeTab === ModelNameEnum.SystemSettings"
          class="
            p-4
            border-b
            dark:border-gray-800
            bg-white
            dark:bg-gray-890
          "
        >
          <div class="flex items-center justify-between">
            <div class="text-base font-semibold text-gray-900 dark:text-gray-25">
              {{ 'حالة التفعيل' }}
            </div>
            <div
              class="text-sm font-semibold"
              :class="isActivated ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'"
            >
              {{ isActivated ? 'مفعل' : 'غير مفعل' }}
            </div>
          </div>
          <div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {{ 'الوقت المتبقي:' }}
            <span class="font-semibold">{{ remainingCountdown }}</span>
          </div>
        </div>

        <CommonFormSection
          v-for="([name, fields], idx) in activeGroup.entries()"
          :key="name + idx"
          ref="section"
          class="p-4"
          :class="
            idx !== 0 && activeGroup.size > 1
              ? 'border-t dark:border-gray-800'
              : ''
          "
          :show-title="activeGroup.size > 1 && name !== t`Default`"
          :title="name"
          :fields="fields"
          :doc="doc"
          :errors="errors"
          @value-change="onValueChange"
        />
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
          dark:bg-gray-890
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
          {{ tabLabels[key] }}
        </div>
      </div>
    </template>
  </FormContainer>
</template>
<script lang="ts">
import { DocValue } from 'fyo/core/types';
import { Doc } from 'fyo/model/doc';
import { ValidationError } from 'fyo/utils/errors';
import { ModelNameEnum } from 'models/types';
import { Field, Schema } from 'schemas/types';
import Button from 'src/components/Button.vue';
import FormContainer from 'src/components/FormContainer.vue';
import FormHeader from 'src/components/FormHeader.vue';
import { handleErrorWithDialog } from 'src/errorHandling';
import { getErrorMessage } from 'src/utils';
import { evaluateHidden } from 'src/utils/doc';
import { shortcutsKey } from 'src/utils/injectionKeys';
import { showDialog } from 'src/utils/interactive';
import { docsPathMap } from 'src/utils/misc';
import { docsPathRef } from 'src/utils/refs';
import { UIGroupedFields } from 'src/utils/types';
import { computed, defineComponent, inject } from 'vue';
import CommonFormSection from '../CommonForm/CommonFormSection.vue';
import { applyThemeSettings, type ThemeSettingsLike } from 'src/utils/theme';
import { requirePermission } from 'src/utils/authService';
import { PERMISSIONS } from 'src/utils/permissions';

const COMPONENT_NAME = 'Settings';

export default defineComponent({
  components: { FormContainer, Button, FormHeader, CommonFormSection },
  provide() {
    return { doc: computed(() => this.doc) };
  },
  setup() {
    return {
      shortcuts: inject(shortcutsKey),
      ModelNameEnum,
    };
  },
  data() {
    return {
      errors: {},
      activeTab: ModelNameEnum.AccountingSettings,
      groupedFields: null,
      nowTs: Date.now(),
      _ticker: null as null | number,
    } as {
      errors: Record<string, string>;
      activeTab: string;
      groupedFields: null | UIGroupedFields;
      nowTs: number;
      _ticker: null | number;
    };
  },
  computed: {
    activationExpiresAt(): string | null {
      return (
        (this.fyo?.config?.get('license.expiresAt', null) as string | null) ??
        null
      );
    },
    isActivated(): boolean {
      const v = this.activationExpiresAt;
      if (!v) return false;
      const ts = Date.parse(v);
      if (Number.isNaN(ts)) return false;
      return this.nowTs < ts;
    },
    remainingMs(): number {
      const v = this.activationExpiresAt;
      if (!v) return 0;
      const ts = Date.parse(v);
      if (Number.isNaN(ts)) return 0;
      const ms = ts - this.nowTs;
      return ms > 0 ? ms : 0;
    },
    remainingCountdown(): string {
      if (!this.isActivated) {
        return '—';
      }
      const ms = this.remainingMs;
      const totalSeconds = Math.floor(ms / 1000);
      const days = Math.floor(totalSeconds / (24 * 3600));
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const pad2 = (n: number) => String(n).padStart(2, '0');
      const time = `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
      if (days <= 0) return time;
      return `${days} يوم ${time}`;
    },
    canSave() {
      return [
        ModelNameEnum.AccountingSettings,
        ModelNameEnum.InventorySettings,
        ModelNameEnum.Defaults,
        ModelNameEnum.POSSettings,
        ModelNameEnum.ERPNextSyncSettings,
        ModelNameEnum.PrintSettings,
        ModelNameEnum.SystemSettings,
      ].some((s) => this.fyo?.singles?.[s]?.canSave);
    },
    doc(): Doc | null {
      const doc = this.fyo?.singles?.[this.activeTab];
      if (!doc) {
        return null;
      }

      return doc;
    },
    tabLabels(): Record<string, string> {
      return {
        [ModelNameEnum.AccountingSettings]: this.t`General`,
        [ModelNameEnum.PrintSettings]: this.t`Print`,
        [ModelNameEnum.InventorySettings]: this.t`Inventory`,
        [ModelNameEnum.Defaults]: this.t`Defaults`,
        [ModelNameEnum.POSSettings]: this.t`POS Settings`,
        [ModelNameEnum.ERPNextSyncSettings]: this.t`ERPNext Sync`,
        [ModelNameEnum.SystemSettings]: this.t`System`,
      };
    },
    schemas(): Schema[] {
      const enableInventory =
        !!this.fyo?.singles?.AccountingSettings?.enableInventory;
      const enablePOS =
        !!this.fyo?.singles?.InventorySettings?.enablePointOfSale;
      const enableERPNextSync =
        !!this.fyo?.singles?.AccountingSettings?.enableERPNextSync;

      return [
        ModelNameEnum.AccountingSettings,
        ModelNameEnum.InventorySettings,
        ModelNameEnum.Defaults,
        ModelNameEnum.POSSettings,
        ModelNameEnum.ERPNextSyncSettings,
        ModelNameEnum.PrintSettings,
        ModelNameEnum.SystemSettings,
      ]
        .filter((s) => {
          if (s === ModelNameEnum.InventorySettings && !enableInventory) {
            return false;
          }

          if (s === ModelNameEnum.POSSettings && !enablePOS) {
            return false;
          }

          if (s === ModelNameEnum.ERPNextSyncSettings && !enableERPNextSync) {
            return false;
          }

          return true;
        })
        .map((s) => this.fyo?.schemaMap?.[s])
        .filter((schema): schema is Schema => Boolean(schema));
    },
    activeGroup(): Map<string, Field[]> {
      if (!this.groupedFields) {
        return new Map();
      }

      const group = this.groupedFields.get(this.activeTab);
      if (!group) {
        throw new ValidationError(
          `Tab group ${this.activeTab} has no value set`
        );
      }

      return group;
    },
  },
  mounted() {
    if (this.fyo.store.isDevelopment) {
      // @ts-ignore
      window.settings = this;
    }

    this.update();
    this.startTicker();
  },
  activated(): void {
    const tab = this.$route.query.tab;
    if (typeof tab === 'string' && this.tabLabels[tab]) {
      this.activeTab = tab;
    }

    docsPathRef.value = docsPathMap.Settings ?? '';
    this.startTicker();
    this.shortcuts?.pmod.set(COMPONENT_NAME, ['KeyS'], async () => {
      if (!this.canSave) {
        return;
      }

      await this.sync();
    });
  },
  async deactivated(): Promise<void> {
    docsPathRef.value = '';
    this.stopTicker();
    this.shortcuts?.delete(COMPONENT_NAME);
    if (!this.canSave) {
      return;
    }
    await this.reset();
  },
  methods: {
    startTicker() {
      this.stopTicker();
      this.nowTs = Date.now();
      this._ticker = window.setInterval(() => {
        this.nowTs = Date.now();
      }, 1000);
    },
    stopTicker() {
      if (typeof this._ticker === 'number') {
        window.clearInterval(this._ticker);
      }
      this._ticker = null;
    },
    async reset() {
      const resetableDocs = this.schemas
        .map(({ name }) => this.fyo?.singles?.[name])
        .filter((doc) => doc?.dirty) as Doc[];

      for (const doc of resetableDocs) {
        await doc.load();
      }

      this.update();
    },
    async sync(): Promise<void> {
      const syncableDocs = this.schemas
        .map(({ name }) => this.fyo?.singles?.[name])
        .filter((doc) => doc?.canSave) as Doc[];

      try {
        requirePermission(PERMISSIONS.SETTINGS_EDIT);
      } catch (error) {
        if (error instanceof Error) {
          await showDialog({
            title: this.t`Cannot Save Settings`,
            detail: error.message,
            type: 'error',
          });
        }
        return;
      }

      for (const doc of syncableDocs) {
        await this.syncDoc(doc);
      }

      this.update();
      await showDialog({
        title: this.t`Reload Baron Accounting?`,
        detail: this.t`Changes made to settings will be visible on reload.`,
        type: 'info',
        buttons: [
          {
            label: this.t`Yes`,
            isPrimary: true,
            action: ipc.reloadWindow.bind(ipc),
          },
          {
            label: this.t`No`,
            action: () => null,
            isEscape: true,
          },
        ],
      });
    },
    async syncDoc(doc: Doc): Promise<void> {
      try {
        await doc.sync();
        this.updateGroupedFields();
      } catch (error) {
        await handleErrorWithDialog(error, doc);
      }
    },
    async onValueChange(field: Field, value: DocValue): Promise<void> {
      const { fieldname } = field;
      delete this.errors[fieldname];

      try {
        await this.doc?.set(fieldname, value ?? '');
      } catch (err) {
        if (!(err instanceof Error)) {
          return;
        }

        this.errors[fieldname] = getErrorMessage(err, this.doc ?? undefined);
      }

      // Live Apply theme settings (System -> Theme Settings)
      if (this.activeTab === ModelNameEnum.SystemSettings) {
        const doc = this.doc as unknown as Record<string, unknown> | null;
        const liveApply = !!doc?.['liveApplyTheme'];
        if (liveApply && (field.section === 'Theme Settings' || field.section === 'Theme')) {
          applyThemeSettings(doc as unknown as ThemeSettingsLike);
        }
      }

      this.update();
    },
    update(): void {
      this.updateGroupedFields();
    },
    updateGroupedFields(): void {
      const grouped: UIGroupedFields = new Map();
      const fields: Field[] = this.schemas.map((s) => s.fields).flat();

      for (const field of fields) {
        const schemaName = field.schemaName!;
        if (!grouped.has(schemaName)) {
          grouped.set(schemaName, new Map());
        }

        const tabbed = grouped.get(schemaName)!;
        const section = field.section ?? this.t`Miscellaneous`;
        if (!tabbed.has(section)) {
          tabbed.set(section, []);
        }

        if (field.meta) {
          continue;
        }

        const doc = this.fyo?.singles?.[schemaName];
        if (evaluateHidden(field, doc)) {
          continue;
        }

        tabbed.get(section)!.push(field);
      }

      this.groupedFields = grouped;
    },
  },
});
</script>
