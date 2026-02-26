<template>
  <div class="flex items-center gap-2">
    <!-- Back / Forward -->
    <div class="flex items-center gap-2">
      <button
        ref="backlink"
        class="
          window-no-drag
          btn-primary
          flex-center
          h-8
          rounded-md
          px-4
          w-auto
        "
        :disabled="!historyState.back"
        @click="$router.back()"
      >
        <feather-icon :name="backIcon" class="w-4 h-4" />
      </button>
      <button
        class="
          window-no-drag
          btn-primary
          flex-center
          h-8
          rounded-md
          px-4
          w-auto
        "
        :disabled="!historyState.forward"
        @click="$router.forward()"
      >
        <feather-icon :name="forwardIcon" class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
<script lang="ts">
import { languageDirectionKey, shortcutsKey } from 'src/utils/injectionKeys';
import { ref, inject } from 'vue';
import { defineComponent } from 'vue';
import { historyState } from 'src/utils/refs';

const COMPONENT_NAME = 'PageHeaderNavGroup';

export default defineComponent({
  components: {},
  setup() {
    return {
      historyState,
      backlink: ref<HTMLButtonElement | null>(null),
      shortcuts: inject(shortcutsKey),
      languageDirection: inject(languageDirectionKey),
    };
  },
  computed: {
    hasBack() {
      return !!history.back;
    },
    hasForward() {
      return !!history.forward;
    },
    backIcon(): string {
      return this.languageDirection === 'rtl' ? 'chevron-right' : 'chevron-left';
    },
    forwardIcon(): string {
      return this.languageDirection === 'rtl' ? 'chevron-left' : 'chevron-right';
    },
  },
  activated() {
    this.shortcuts?.shift.set(COMPONENT_NAME, ['Backspace'], () => {
      this.backlink?.click();
    });
    // @ts-ignore
    window.ng = this;
  },
  deactivated() {
    this.shortcuts?.delete(COMPONENT_NAME);
  },
});
</script>
