<template>
  <button
    :type="nativeType"
    class="rounded-md flex justify-center items-center text-sm"
    :disabled="disabled"
    :class="_class"
    v-bind="$attrs"
  >
    <slot></slot>
  </button>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Button',
  props: {
    type: {
      type: String,
      default: 'secondary',
    },
    icon: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    padding: {
      type: Boolean,
      default: true,
    },
    background: {
      type: Boolean,
      default: true,
    },
    nativeType: {
      type: String,
      default: 'button',
    },
  },
  computed: {
    hasCustomBackground(): boolean {
      const style = this.$attrs?.style;
      if (!style) {
        return false;
      }
      if (typeof style === 'string') {
        return /background(-color)?\s*:/.test(style);
      }
      if (typeof style === 'object') {
        // Vue can pass style as object or array of objects
        const s = style as Record<string, unknown> | Array<Record<string, unknown>>;
        const obj = Array.isArray(s) ? Object.assign({}, ...s) : s;
        return (
          typeof obj.backgroundColor === 'string' ||
          typeof obj['background-color'] === 'string'
        );
      }
      return false;
    },
    _class() {
      return {
        'opacity-50 cursor-not-allowed pointer-events-none': this.disabled,
        // If POS or other screens pass inline backgroundColor,
        // don't override it with theme button backgrounds.
        'btn-primary':
          this.type === 'primary' && this.background && !this.hasCustomBackground,
        'btn-secondary':
          this.type === 'secondary' &&
          this.background &&
          !this.hasCustomBackground,
        'btn-outline': this.type === 'outline',
        'btn-ghost': this.type === 'ghost',
        'h-8': this.background,
        'px-3': this.padding && this.icon,
        'px-6': this.padding && !this.icon,
      };
    },
  },
});
</script>
<style scoped>
button:focus {
  filter: brightness(0.95);
}
</style>
