<template>
  <div class="flex">
    <SearchBar />
    <!-- Back Button -->
    <a
      ref="backlink"
      class="
        nav-link
        border-l border-r border-white
        dark:border-gray-850 dark:bg-gray-900
      "
      :class="
        historyState.back
          ? 'text-gray-700 dark:text-gray-300 cursor-pointer'
          : 'text-gray-400 dark:text-gray-700'
      "
      @click="$router.back()"
    >
      <feather-icon :name="backIcon" class="w-4 h-4" />
    </a>
    <!-- Forward Button -->
    <a
      class="nav-link rounded-md rounded-l-none dark:bg-gray-900"
      :class="
        historyState.forward
          ? 'text-gray-700 dark:text-gray-400 cursor-pointer'
          : 'text-gray-400 dark:text-gray-700'
      "
      @click="$router.forward()"
    >
      <feather-icon :name="forwardIcon" class="w-4 h-4" />
    </a>
  </div>
</template>
<script lang="ts">
import { languageDirectionKey, shortcutsKey } from 'src/utils/injectionKeys';
import { ref, inject } from 'vue';
import { defineComponent } from 'vue';
import SearchBar from './SearchBar.vue';
import { historyState } from 'src/utils/refs';

const COMPONENT_NAME = 'PageHeaderNavGroup';

export default defineComponent({
  components: { SearchBar },
  setup() {
    return {
      historyState,
      backlink: ref<HTMLAnchorElement | null>(null),
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

<style scoped>
.nav-link {
  @apply flex items-center bg-gray-200 px-3;
}
</style>
