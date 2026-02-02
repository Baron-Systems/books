<script lang="ts">
import { uicolors } from 'src/utils/colors';

export default {
  name: 'IconBase',
  props: {
    active: Boolean,
    darkMode: { type: Boolean, default: false },
  },
  computed: {
    lightColor(): string {
      const activeColor = this.darkMode ? 'var(--accent-100)' : 'var(--accent-700)';
      const activeGray = this.darkMode ? uicolors.gray['500'] : uicolors.gray['600'];
      const passiveGray = this.darkMode
        ? uicolors.gray['700']
        : uicolors.gray['400'];
      return this.active ? activeColor : passiveGray;
    },
    darkColor(): string {
      const activeColor = this.darkMode ? 'var(--accent-100)' : 'var(--accent-900)';
      const activeGray = this.darkMode ? uicolors.gray['200'] : uicolors.gray['800'];
      const passiveGray = this.darkMode
        ? uicolors.gray['500']
        : uicolors.gray['600'];
      return this.active ? activeColor : passiveGray;
    },
    bgColor(): string {
      return this.darkMode ? uicolors.gray['900'] : uicolors.gray['100'];
    },
  },
};
</script>
