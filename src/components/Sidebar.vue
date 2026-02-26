<template>
  <div
    class="
      pt-0
      pb-3
      h-full
      flex
      justify-between
      flex-col
      sidebar-bg
      relative
    "
    :class="{
      'window-drag': platform !== 'Windows',
    }"
  >
    <!-- Header extension (matches PageHeader height/styles) -->
    <div
      class="h-row-largest theme-tinted-bg header-elevated flex items-center px-4 box-border rounded-xl mt-4 mx-3"
    >
      <div
        class="flex items-center gap-3 w-full min-w-0"
      >
        <div class="min-w-0 select-none text-start" dir="auto">
          <div
            class="sidebar-text font-semibold text-gray-900 dark:text-gray-25"
            :title="companyName"
          >
            {{ companyName || '—' }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ 'البارون للمحاسبة' }}
          </div>
        </div>
      </div>
    </div>

    <div class="px-4 flex flex-col min-h-0 flex-1 pt-3">

      <!-- Sidebar Items (scroll) -->
      <div class="window-no-drag flex-1 min-h-0 overflow-y-auto custom-scroll custom-scroll-thumb1 -mx-2 px-2 pb-4">
        <div class="flex flex-col gap-1">
        <template v-for="group in groups" :key="group.label">
          <button
            class="
              window-no-drag
              w-full
              flex
              items-center
              gap-3
              px-3
              h-11
              rounded-xl
              transition-colors
              text-left
              hover:bg-gray-100
              dark:hover:bg-gray-890
            "
            :class="
              isGroupActive(group) && !group.items
                ? 'text-white'
                : 'text-gray-900 dark:text-gray-100'
            "
            :style="
              isGroupActive(group) && !group.items
                ? 'background-color: var(--primary); box-shadow: var(--shadow)'
                : ''
            "
            @click="onGroupClick(group)"
          >
            <div
              class="w-9 h-9 rounded-xl flex-center flex-shrink-0"
              :class="
                isGroupActive(group) && !group.items
                  ? `bg-white bg-opacity-15 ${getIconToneClass(group.icon)}`
                  : `bg-gray-50 dark:bg-gray-900 ${getIconToneClass(group.icon)}`
              "
            >
              <Icon
                class="flex-shrink-0"
                :name="group.icon"
                :size="group.iconSize || '18'"
                :height="group.iconHeight ?? 0"
                :active="true"
                :darkMode="darkMode"
              />
            </div>
            <div class="sidebar-text font-semibold">
              {{ group.label }}
            </div>
            <feather-icon
              v-if="group.items"
              name="chevron-down"
              class="ms-auto w-4 h-4 opacity-70"
              :class="isGroupActive(group) ? 'rotate-180' : ''"
            />
          </button>

          <!-- Expanded Group -->
          <div v-if="group.items && isGroupActive(group)" class="mt-1 mb-2 ms-2">
            <div class="flex flex-col gap-1">
              <button
                v-for="item in group.items"
                :key="item.label"
                class="
                  window-no-drag
                  w-full
                  flex
                  items-center
                  gap-2
                  ps-4
                  pe-3
                  h-10
                  rounded-xl
                  transition-colors
                  hover:bg-gray-100
                  dark:hover:bg-gray-890
                "
                :class="
                  isItemActive(item)
                    ? 'text-white'
                    : 'text-gray-900 dark:text-gray-100'
                "
                :style="
                  isItemActive(item)
                    ? 'background-color: var(--accent); box-shadow: var(--shadow)'
                    : ''
                "
                @click="routeToSidebarItem(item)"
              >
                <div
                  class="flex-shrink-0 sidebar-sub-indicator"
                  :class="isItemActive(item) ? 'sidebar-sub-indicator-active' : ''"
                />
                <div class="sidebar-text">
                  {{ item.label }}
                </div>
              </button>
            </div>
          </div>
        </template>
        </div>
      </div>
    </div>

    <!-- Report Issue and DB Switcher -->
    <div class="window-no-drag flex flex-col gap-2 py-3 px-4">
      <hr class="app-border mb-1" />
      <button
        class="
          sidebar-text
          flex
          text-sm text-gray-700
          dark:text-gray-500
          hover:text-gray-800
          dark:hover:text-gray-400
          gap-1
          items-center
        "
        @click="viewShortcuts = true"
      >
        <feather-icon name="command" class="h-4 w-4 flex-shrink-0 opacity-80" />
        <p>{{ t`Shortcuts` }}</p>
      </button>

      <button
        data-testid="change-db"
        class="
          sidebar-text
          flex
          text-sm text-gray-600
          dark:text-gray-500
          hover:text-gray-800
          dark:hover:text-gray-400
          gap-1
          items-center
        "
        @click="$emit('change-db-file')"
      >
        <feather-icon name="database" class="h-4 w-4 flex-shrink-0 opacity-80" />
        <p>{{ t`Change DB` }}</p>
      </button>

      <button
        class="
          sidebar-text
          flex
          text-sm text-gray-600
          dark:text-gray-500
          hover:text-red-700
          dark:hover:text-red-400
          gap-1
          items-center
        "
        @click="handleLogout"
      >
        <feather-icon name="log-out" class="h-4 w-4 flex-shrink-0 opacity-80" />
        <p>{{ 'تسجيل الخروج' }}</p>
      </button>

      <p
        v-if="showDevMode"
        class="sidebar-text text-xs text-gray-500 select-none cursor-pointer"
        @click="showDevMode = false"
        title="Open dev tools with Ctrl+Shift+I"
      >
        dev mode
      </p>
    </div>

    <!-- Hide Sidebar Button -->
    <button
      class="
        absolute
        bottom-0
        end-0
        accent-text
        bg-white
        dark:bg-gray-900
        border
        border-gray-200
        dark:border-gray-800
        shadow-sm
        accent-hover-bg
        dark:hover:bg-gray-875
        rounded
        p-1
        m-4
        rtl-rotate-180
        transition-colors
      "
      @click="() => toggleSidebar()"
    >
      <feather-icon name="chevrons-left" class="w-4 h-4" />
    </button>

    <Modal :open-modal="viewShortcuts" @closemodal="viewShortcuts = false">
      <ShortcutsHelper class="w-form" />
    </Modal>
  </div>
</template>
<script lang="ts">
import { fyo } from 'src/initFyo';
import { languageDirectionKey, shortcutsKey } from 'src/utils/injectionKeys';
import { getSidebarConfig } from 'src/utils/sidebarConfig';
import { SidebarConfig, SidebarItem, SidebarRoot } from 'src/utils/types';
import { routeTo, toggleSidebar } from 'src/utils/ui';
import { defineComponent, inject } from 'vue';
import router from '../router';
import Icon from './Icon.vue';
import Modal from './Modal.vue';
import ShortcutsHelper from './ShortcutsHelper.vue';
import { logout } from 'src/utils/authService';
import { showDialog } from 'src/utils/interactive';

const COMPONENT_NAME = 'Sidebar';

export default defineComponent({
  components: {
    Icon,
    Modal,
    ShortcutsHelper,
  },
  props: {
    darkMode: { type: Boolean, default: false },
  },
  emits: ['change-db-file', 'toggle-darkmode'],
  setup() {
    return {
      languageDirection: inject(languageDirectionKey),
      shortcuts: inject(shortcutsKey),
    };
  },
  data() {
    return {
      companyName: '',
      groups: [],
      viewShortcuts: false,
      activeGroup: null,
      showDevMode: false,
    } as {
      companyName: string;
      groups: SidebarConfig;
      viewShortcuts: boolean;
      activeGroup: null | SidebarRoot;
      showDevMode: boolean;
    };
  },
  computed: {
    appVersion() {
      return fyo.store.appVersion;
    },
  },
  async mounted() {
    try {
      const fromSingles = (fyo.singles as any)?.AccountingSettings?.companyName;
      if (typeof fromSingles === 'string' && fromSingles.length) {
        this.companyName = fromSingles;
      } else {
        const doc = await fyo.doc.getDoc('AccountingSettings');
        this.companyName = (doc as any)?.companyName?.toString?.() ?? '';
      }
    } catch {
      // ignore
    }

    this.groups = await getSidebarConfig();

    this.setActiveGroup();
    router.afterEach(() => {
      this.setActiveGroup();
    });

    this.shortcuts?.shift.set(COMPONENT_NAME, ['KeyH'], () => {
      if (document.body === document.activeElement) {
        this.toggleSidebar();
      }
    });

    this.showDevMode = this.fyo.store.isDevelopment;
  },
  unmounted() {
    this.shortcuts?.delete(COMPONENT_NAME);
  },
  methods: {
    routeTo,
    toggleSidebar,
    async handleLogout() {
      const confirmed = (await showDialog({
        title: this.t`تسجيل الخروج`,
        detail: this.t`سيتم تسجيل خروج المستخدم الحالي والعودة إلى شاشة الدخول.`,
        type: 'warning',
        buttons: [
          {
            label: this.t`Yes`,
            isPrimary: true,
            action: () => true,
          },
          {
            label: this.t`No`,
            isEscape: true,
            action: () => false,
          },
        ],
      })) as boolean;

      if (!confirmed) {
        return;
      }

      logout();
      ipc.reloadWindow();
    },
    setActiveGroup() {
      const { fullPath } = this.$router.currentRoute.value;
      const fallBackGroup = this.activeGroup;
      this.activeGroup =
        this.groups.find((g) => {
          if (fullPath.startsWith(g.route) && g.route !== '/') {
            return true;
          }

          if (g.route === fullPath) {
            return true;
          }

          if (g.items) {
            let activeItem = g.items.filter(
              ({ route }) => route === fullPath || fullPath.startsWith(route)
            );

            if (activeItem.length) {
              return true;
            }
          }
        }) ??
        fallBackGroup ??
        this.groups[0];
    },
    isItemActive(item: SidebarItem) {
      const { path: currentRoute, params } = this.$route;
      const routeMatch = currentRoute === item.route;

      const schemaNameMatch =
        item.schemaName && params.schemaName === item.schemaName;

      const isMatch = routeMatch || schemaNameMatch;
      if (params.name && item.schemaName && !isMatch) {
        return currentRoute.includes(`${item.schemaName}/${params.name}`);
      }

      return isMatch;
    },
    isGroupActive(group: SidebarRoot) {
      return this.activeGroup && group.label === this.activeGroup.label;
    },
    getIconToneClass(iconName: string) {
      const name = (iconName || '').toString();
      const map: Record<string, string> = {
        dashboard: 'sidebar-icon-tone-dashboard',
        sales: 'sidebar-icon-tone-sales',
        purchase: 'sidebar-icon-tone-purchase',
        'common-entries': 'sidebar-icon-tone-common-entries',
        reports: 'sidebar-icon-tone-reports',
        inventory: 'sidebar-icon-tone-inventory',
        pos: 'sidebar-icon-tone-pos',
        gst: 'sidebar-icon-tone-gst',
        settings: 'sidebar-icon-tone-settings',
        general: 'sidebar-icon-tone-general',
      };
      return map[name] || 'sidebar-icon-tone-general';
    },
    onGroupClick(group: SidebarRoot) {
      // If group has children, toggle expand/collapse on click.
      if (group.items && group.items.length) {
        if (this.isGroupActive(group)) {
          this.activeGroup = null;
        } else {
          this.activeGroup = group;
        }
        return;
      }
      this.routeToSidebarItem(group);
    },
    routeToSidebarItem(item: SidebarItem | SidebarRoot) {
      routeTo(this.getPath(item));
    },
    getPath(item: SidebarItem | SidebarRoot) {
      const { route: path, filters } = item;
      if (!filters) {
        return path;
      }

      return { path, query: { filters: JSON.stringify(filters) } };
    },
  },
});
</script>
