<template>
  <footer
    class="
      flex-shrink-0
      w-full
      h-14
      px-6
      border-t dark:border-gray-800
      bg-gray-50/90 dark:bg-gray-900/90
      flex items-center
    "
  >
    <div
      class="
        max-w-2xl mx-auto
        flex flex-col sm:flex-row
        items-center justify-center gap-4 sm:gap-8
        text-sm text-gray-600 dark:text-gray-400
      "
    >
      <img
        :src="logoUrl"
        alt="Albaron"
        class="h-14 w-auto object-contain opacity-90"
      />
      <span class="font-semibold text-gray-800 dark:text-gray-200">
        الباورون للمحاسبة
      </span>
      <a
        href="tel:+970592924519"
        class="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        +970592924519
      </a>
      <a
        href="mailto:Info@albaronsystems.com"
        class="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        Info@albaronsystems.com
      </a>
      <a
        href="https://www.albaronsystems.com"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        www.albaronsystems.com
      </a>
    </div>
  </footer>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import logoUrl from 'src/assets/img/logo.png';

export default defineComponent({
  name: 'AppFooter',
  data() {
    return { logoUrl };
  },
});
</script>
