<template>
  <div ref="reference">
    <div class="h-full">
      <slot
        name="target"
        :toggle-popover="togglePopover"
        :handle-blur="handleBlur"
      ></slot>
    </div>
    <Transition>
      <div
        v-show="isOpen"
        ref="popover"
        :class="popoverClass"
        class="
          bg-white
          dark:bg-gray-850
          rounded-md
          border
          dark:border-gray-875
          shadow-lg
          popover-container
          relative
          z-10
        "
        :style="{ 'transition-delay': `${isOpen ? entryDelay : exitDelay}ms` }"
      >
        <slot name="content" :toggle-popover="togglePopover"></slot>
      </div>
    </Transition>
  </div>
</template>

<script>
import { createPopper } from '@popperjs/core';
import { nextTick } from 'vue';

export default {
  name: 'Popover',
  props: {
    showPopup: {
      type: [Boolean, null],
      default: null,
    },
    right: Boolean,
    entryDelay: { type: Number, default: 0 },
    exitDelay: { type: Number, default: 0 },
    placement: {
      type: String,
      default: 'bottom-start',
    },
    popoverClass: [String, Object, Array],
  },
  emits: ['open', 'close'],
  data() {
    return {
      isOpen: false,
    };
  },
  watch: {
    showPopup(value) {
      if (value === true) {
        this.open();
      }
      if (value === false) {
        this.close();
      }
    },
  },
  mounted() {
    this._popoverId = Math.random().toString(36).slice(2);
    this._isActive = true;
    this._globalCloseListener = (e) => {
      if (!this._isActive || !this.$el?.isConnected) {
        return;
      }
      if (e?.detail?.except !== this._popoverId) {
        this.close();
      }
    };
    document.addEventListener('close-all-popovers', this._globalCloseListener);

    this.listener = (e) => {
      if (!this._isActive || !this.$el?.isConnected) {
        return;
      }
      let $els = [this.$refs.reference, this.$refs.popover];
      let insideClick = $els.some(
        ($el) => $el && (e.target === $el || $el.contains(e.target))
      );
      if (insideClick) {
        return;
      }
      this.close();
    };

    if (this.showPopup == null) {
      document.addEventListener('click', this.listener);
    }
  },
  activated() {
    this._isActive = true;
  },
  deactivated() {
    this._isActive = false;
    this.close();
  },
  beforeUnmount() {
    this.popper && this.popper.destroy();
    if (this._globalCloseListener) {
      document.removeEventListener(
        'close-all-popovers',
        this._globalCloseListener
      );
      delete this._globalCloseListener;
    }
    if (this.listener) {
      document.removeEventListener('click', this.listener);
      delete this.listener;
    }
  },
  methods: {
    setupPopper() {
      if (!this.popper) {
        this.popper = createPopper(this.$refs.reference, this.$refs.popover, {
          strategy: 'fixed',
          placement: this.placement,
          modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
        });
      } else {
        this.popper.update();
      }
    },
    togglePopover(flag) {
      if (flag == null) {
        flag = !this.isOpen;
      }
      flag = Boolean(flag);
      if (flag) {
        this.open();
      } else {
        this.close();
      }
    },
    open() {
      if (this.isOpen) {
        return;
      }

      document.dispatchEvent(
        new CustomEvent('close-all-popovers', {
          detail: { except: this._popoverId },
        })
      );

      this.isOpen = true;
      nextTick(() => {
        this.setupPopper();
      });
      this.$emit('open');
    },
    close() {
      if (!this.isOpen) {
        return;
      }
      this.isOpen = false;
      this.$emit('close');
    },
    handleBlur({ relatedTarget }) {
      relatedTarget && this.close();
    },
  },
};
</script>
<style scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 150ms ease-out;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
