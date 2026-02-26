<template>
  <div
    class="
      px-4
      flex
      justify-between
      items-center
      h-row-largest
      box-border
      flex-shrink-0
      theme-tinted-bg
      header-elevated
      rounded-xl
      mt-4
      mx-4
    "
    :class="[
      border
        ? showSidebar
          ? 'border border-white border-s-0'
          : 'border border-white'
        : '',
      platform !== 'Windows' ? 'window-drag' : '',
    ]"
  >
    <Transition name="spacer">
      <div
        v-if="!showSidebar && platform === 'Mac' && languageDirection !== 'rtl'"
        class="h-full"
        :class="spacerClass"
      />
    </Transition>

    <!-- Left: title + left slot -->
    <div class="flex items-center window-no-drag gap-3 min-w-0">
      <h1
        v-if="title"
        class="
          text-xl
          font-extrabold
          tracking-tight
          select-none
          whitespace-nowrap
          text-gray-900
          dark:text-gray-25
          truncate
        "
      >
        {{ title }}
      </h1>

      <div class="flex items-stretch window-no-drag gap-2">
        <slot name="left" />
      </div>
    </div>

    <!-- Center: search -->
    <div class="flex-1 flex justify-center window-no-drag px-3">
      <SearchBar />
    </div>

    <!-- Right: nav + right slot -->
    <div class="flex items-center window-no-drag gap-3">
      <PageHeaderNavGroup />
      <slot />
    </div>
  </div>
</template>
<script lang="ts">
import { languageDirectionKey } from 'src/utils/injectionKeys';
import { showSidebar } from 'src/utils/refs';
import { defineComponent, inject, Transition } from 'vue';
import PageHeaderNavGroup from './PageHeaderNavGroup.vue';
import SearchBar from './SearchBar.vue';

export default defineComponent({
  components: { Transition, PageHeaderNavGroup, SearchBar },
  props: {
    title: { type: String, default: '' },
    border: { type: Boolean, default: true },
    searchborder: { type: Boolean, default: true },
  },
  setup() {
    return { showSidebar, languageDirection: inject(languageDirectionKey) };
  },
  computed: {
    showBorder() {
      return !!this.$slots.default && this.searchborder;
    },
    spacerClass() {
      if (this.showSidebar) {
        return '';
      }

      if (this.border) {
        return 'w-tl me-4 border-e';
      }

      return 'w-tl me-4';
    },
  },
});
</script>
<style scoped>
.w-tl {
  width: var(--w-trafficlights);
}

.spacer-enter-from,
.spacer-leave-to {
  opacity: 0;
  width: 0px;
  margin-right: 0px;
  border-right-width: 0px;
}

.spacer-enter-to,
.spacer-leave-from {
  opacity: 1;
  width: var(--w-trafficlights);
  margin-right: 1rem;
  border-right-width: 1px;
}

.spacer-enter-active,
.spacer-leave-active {
  transition: all 150ms ease-out;
}
</style>
