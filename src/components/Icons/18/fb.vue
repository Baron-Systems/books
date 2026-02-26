<template>
  <svg
    width="19"
    height="13"
    viewBox="0 0 19 13"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <text
      x="0.5"
      y="10.5"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif"
      font-size="11"
      font-weight="800"
      letter-spacing="0.5"
    >
      <tspan :fill="darkColor">B</tspan>
      <tspan :fill="lightColor">A</tspan>
    </text>
  </svg>
</template>
<script>
import Base from '../base.vue';
export default {
  name: 'BA',
  extends: Base,
};
</script>
