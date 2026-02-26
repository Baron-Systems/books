<template>
  <div class="px-4 py-2 border-b dark:border-gray-800 flex items-center gap-4">
    <label class="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
      {{ t`Template` }}
    </label>
    <div class="min-w-[12rem] max-w-xs">
      <Select
        :df="templateSelectDf"
        :value="selectedTemplateId"
        :show-label="false"
        :border="true"
        @change="onTemplateSelect"
      />
    </div>
  </div>
</template>
<script lang="ts">
import { t } from 'fyo';
import type { Doc } from 'fyo/model/doc';
import Select from 'src/components/Controls/Select.vue';
import { showDialog } from 'src/utils/interactive';
import {
  applyTemplateToJournalEntry,
  listActiveTemplates,
} from 'src/utils/journalEntryTemplateService';
import { defineComponent, PropType, ref, onMounted } from 'vue';

export default defineComponent({
  name: 'JournalEntryTemplateSelector',
  components: { Select },
  props: {
    doc: { type: Object as PropType<Doc>, required: true },
  },
  emits: ['applied'],
  setup(props, { emit }) {
    const templateOptions = ref<{ label: string; value: string }[]>([]);
    const selectedTemplateId = ref('');

    const templateSelectDf = ref({
      fieldtype: 'Select' as const,
      fieldname: 'journalEntryTemplate',
      label: '',
      options: [] as { label: string; value: string }[],
    });

    onMounted(async () => {
      const list = await listActiveTemplates();
      const opts = list.map((d) => ({
        label: (d.name as string) || '',
        value: (d.name as string) || '',
      }));
      templateOptions.value = opts;
      templateSelectDf.value.options = opts;
    });

    async function onTemplateSelect(value: string) {
      if (!value) return;
      const templateId = value;

      await showDialog({
        title: t`Apply template?`,
        detail: t`Replace current lines with template lines or append them?`,
        type: 'info',
        buttons: [
          {
            label: t`Replace lines`,
            async action() {
              await applyTemplateToJournalEntry(props.doc, templateId, 'replace');
              emit('applied');
              return true;
            },
            isPrimary: true,
          },
          {
            label: t`Append lines`,
            async action() {
              await applyTemplateToJournalEntry(props.doc, templateId, 'append');
              emit('applied');
              return true;
            },
          },
          {
            label: t`Cancel`,
            action() {
              return false;
            },
            isEscape: true,
          },
        ],
      });

      selectedTemplateId.value = '';
    }

    return {
      templateOptions,
      templateSelectDf,
      selectedTemplateId,
      onTemplateSelect,
      t,
    };
  },
});
</script>
