<template>
  <div class="relative">
    <input
      :type="inputType"
      :class="[
        inputClasses,
        size === 'large' ? 'text-lg pt-5' : 'text-sm pt-4',
      ]"
      :value="value"
      :max="isNumeric(df) ? df.maxvalue : undefined"
      :min="isNumeric(df) ? df.minvalue : undefined"
      :readonly="isReadOnly"
      :tabindex="isReadOnly ? '-1' : '0'"
      @blur="onBlur"
      class="
        block
        px-2.5
        pb-2.5
        w-full
        font-medium
        text-gray-900
        dark:text-gray-100
        bg-gray-25
        dark:bg-gray-850
        rounded-lg
        border border-gray-200
        dark:border-gray-800
        appearance-none
        focus:outline-none focus:ring-0
        peer
      "
    />
    <label
      for="floating_outlined"
      :class="size === 'large' ? 'text-sm' : 'text-xs'"
      class="
        absolute
        font-medium
        text-gray-500
        dark:text-gray-400
        duration-300
        transform
        -translate-y-5
        scale-100
        top-0
        z-10
        origin-[0]
        bg-gray-25
        dark:bg-gray-850
        px-2
        peer-focus:px-2 peer-focus:text-blue-600 peer-focus:dark:text-blue-500
        peer-placeholder-shown:scale-100
        peer-placeholder-shown:-translate-y-1/2
        peer-placeholder-shown:top-1/2
        peer-focus:top-0 peer-focus:scale-100 peer-focus:-translate-y-5
        start-1
      "
      >{{ df.label }}</label
    >
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import Base from '../Controls/Base.vue';

export default defineComponent({
  name: 'FloatingLabelInputBase',
  extends: Base,
});
</script>
