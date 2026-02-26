<template>
  <div>
    <div v-if="showLabel" class="text-gray-600 dark:text-gray-500 text-sm mb-1">
      {{ df.label }}
    </div>
    <div
      class="flex flex-wrap gap-2"
      :class="border ? 'p-2 rounded border border-gray-200 dark:border-gray-800 bg-gray-25 dark:bg-gray-875' : ''"
    >
      <button
        v-for="hex in presets"
        :key="hex"
        type="button"
        class="w-8 h-8 rounded flex-shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-25 dark:focus:ring-offset-gray-875"
        :class="isSelected(hex) ? 'ring-2 ring-gray-800 dark:ring-gray-200 ring-offset-2 ring-offset-gray-25 dark:ring-offset-gray-875 scale-110' : 'hover:scale-105'"
        :style="{ backgroundColor: hex }"
        :title="hex"
        @click="select(hex)"
      />
    </div>
    <div v-if="df?.sub_label" class="text-gray-500 dark:text-gray-500 text-sm mt-1">
      {{ df.sub_label }}
    </div>
  </div>
</template>

<script lang="ts">
import { BRAND_COLOR_PRESETS } from 'src/utils/theme';
import { defineComponent, PropType } from 'vue';
import { Field } from 'schemas/types';

function normalizeHex(v: unknown): string {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  return s.startsWith('#') ? s.toLowerCase() : '';
}

export default defineComponent({
  name: 'BrandColorSwatches',
  props: {
    df: { type: Object as PropType<Field>, required: true },
    value: { type: String, default: '' },
    showLabel: { type: Boolean, default: true },
    border: { type: Boolean, default: true },
  },
  emits: ['change'],
  setup() {
    return { presets: BRAND_COLOR_PRESETS };
  },
  methods: {
    isSelected(hex: string): boolean {
      const current = normalizeHex(this.value);
      if (!current) return false;
      return current === hex.toLowerCase();
    },
    select(hex: string) {
      this.$emit('change', hex);
    },
  },
});
</script>
