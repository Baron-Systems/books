<script setup lang="ts">
import { showSidebar } from 'src/utils/refs';
import { toggleSidebar } from 'src/utils/ui';
</script>
<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Transition name="sidebar">
        <!-- eslint-disable vue/require-explicit-emits -->
        <Sidebar
          v-show="showSidebar"
          class="
            flex-shrink-0
            whitespace-nowrap
            w-sidebar
          "
          :dark-mode="darkMode"
          @change-db-file="$emit('change-db-file')"
        />
      </Transition>

      <div
        class="
          relative
          flex flex-1 min-h-0 flex flex-col
          overflow-y-hidden
          custom-scroll custom-scroll-thumb1
          surface-bg
        "
      >
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component
              :is="Component"
              :key="mainViewKey"
              :dark-mode="darkMode"
              class="flex-1 min-h-0"
            />
          </keep-alive>
        </router-view>

        <router-view v-slot="{ Component, route }" name="edit">
          <Transition name="quickedit">
            <div v-if="route?.query?.edit">
              <component
                :is="Component"
                :key="route.query.schemaName + route.query.name"
                :dark-mode="darkMode"
              />
            </div>
          </Transition>
        </router-view>
      </div>

      <!-- Show Sidebar Button (فوق الفوتر) -->
      <button
        v-show="!showSidebar"
        class="
          absolute
          bottom-0
          start-0
        text-blue-700
        dark:text-blue-200
        bg-white
        dark:bg-gray-900
        border
        border-gray-200
        dark:border-gray-800
        shadow-sm
        hover:bg-blue-50
        dark:hover:bg-gray-875
        rounded
        rtl-rotate-180
        p-1
        m-4
        opacity-80
        hover:opacity-100
        transition
        z-10
        "
        @click="() => toggleSidebar()"
      >
        <feather-icon name="chevrons-right" class="w-4 h-4" />
      </button>
    </div>

    <!-- الفوتر ثابت في كل واجهات البرنامج -->
    <AppFooter />
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import { fyo } from 'src/initFyo';
import { appDataRefreshNonce, requestAppDataRefresh } from 'src/utils/refs';
import AppFooter from '../components/AppFooter.vue';
import Sidebar from '../components/Sidebar.vue';
export default defineComponent({
  name: 'Desk',
  components: {
    AppFooter,
    Sidebar,
  },
  props: {
    darkMode: { type: Boolean, default: false },
  },
  emits: ['change-db-file'],
  data() {
    return {
      refreshObserverListeners: [] as Array<{
        source: 'doc' | 'db';
        event: string;
        listener: () => void;
      }>,
    };
  },
  mounted() {
    this.setGlobalRefreshListeners();
  },
  beforeUnmount() {
    this.clearGlobalRefreshListeners();
  },
  computed: {
    mainViewKey(): string {
      const r = this.$route;
      if (r.path.startsWith('/edit/') && r.params.schemaName) {
        return 'edit-' + String(r.params.schemaName);
      }
      return `${r.fullPath}:${appDataRefreshNonce.value}`;
    },
  },
  methods: {
    setGlobalRefreshListeners() {
      this.clearGlobalRefreshListeners();

      const schemaNames = Object.keys(fyo.schemaMap ?? {});
      if (!schemaNames.length) {
        return;
      }

      const docEvents = ['sync', 'submit', 'cancel', 'delete', 'rename'];
      const dbEvents = ['delete', 'rename'];

      const register = (source: 'doc' | 'db', event: string) => {
        const listener = () => requestAppDataRefresh();
        if (source === 'doc') {
          fyo.doc.observer.on(event, listener);
        } else {
          fyo.db.observer.on(event, listener);
        }
        this.refreshObserverListeners.push({ source, event, listener });
      };

      for (const schemaName of schemaNames) {
        for (const eventType of docEvents) {
          register('doc', `${eventType}:${schemaName}`);
        }
        for (const eventType of dbEvents) {
          register('db', `${eventType}:${schemaName}`);
        }
      }
    },
    clearGlobalRefreshListeners() {
      for (const { source, event, listener } of this.refreshObserverListeners) {
        if (source === 'doc') {
          fyo.doc.observer.off(event, listener);
        } else {
          fyo.db.observer.off(event, listener);
        }
      }
      this.refreshObserverListeners = [];
    },
  },
});
</script>
<style scoped>
.sidebar-enter-from,
.sidebar-leave-to {
  opacity: 0;
  transform: translateX(calc(-1 * var(--w-sidebar)));
  width: 0px;
}
[dir='rtl'] .sidebar-leave-to {
  opacity: 0;
  transform: translateX(calc(1 * var(--w-sidebar)));
  width: 0px;
}

.sidebar-enter-to,
.sidebar-leave-from {
  opacity: 1;
  transform: translateX(0px);
  width: var(--w-sidebar);
}

.sidebar-enter-active,
.sidebar-leave-active {
  transition: all 150ms ease-out;
}
</style>

