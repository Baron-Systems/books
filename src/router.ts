import ChartOfAccounts from 'src/pages/ChartOfAccounts.vue';
import CommonForm from 'src/pages/CommonForm/CommonForm.vue';
import Dashboard from 'src/pages/Dashboard/Dashboard.vue';
import GetStarted from 'src/pages/GetStarted.vue';
import ImportWizard from 'src/pages/ImportWizard.vue';
import ListView from 'src/pages/ListView/ListView.vue';
import PrintView from 'src/pages/PrintView/PrintView.vue';
import ReportPrintView from 'src/pages/PrintView/ReportPrintView.vue';
import QuickEditForm from 'src/pages/QuickEditForm.vue';
import Report from 'src/pages/Report.vue';
import Settings from 'src/pages/Settings/Settings.vue';
import TemplateBuilder from 'src/pages/TemplateBuilder/TemplateBuilder.vue';
import CustomizeForm from 'src/pages/CustomizeForm/CustomizeForm.vue';
import POS from 'src/pages/POS/POS.vue';
import UsersManagement from 'src/pages/UsersManagement.vue';
import type { HistoryState } from 'vue-router';
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { historyState } from './utils/refs';
import { hasInterface, hasPermission } from './utils/authService';
import { getInterfaceIdForRoute, INTERFACE_IDS } from './utils/interfaces';
import { PERMISSIONS, getRequiredReadPermissionForListRoute, getWritePermissionForSchema } from './utils/permissions';
import { currentUser } from './utils/authState';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: Dashboard,
  },
  {
    path: '/get-started',
    component: GetStarted,
  },
  {
    path: `/edit/:schemaName/:name`,
    name: `CommonForm`,
    components: {
      default: CommonForm,
      edit: QuickEditForm,
    },
    props: {
      default: (route) => ({
        schemaName: route.params.schemaName,
        name: route.params.name,
      }),
      edit: (route) => route.query,
    },
  },
  {
    path: '/list/:schemaName/:pageTitle?',
    name: 'ListView',
    components: {
      default: ListView,
      edit: QuickEditForm,
    },
    props: {
      default: (route) => {
        const { schemaName } = route.params;
        const pageTitle = route.params.pageTitle ?? '';

        const filters = {};
        const filterString = route.query.filters;
        if (typeof filterString === 'string') {
          Object.assign(filters, JSON.parse(filterString));
        }

        return {
          schemaName,
          filters,
          pageTitle,
        };
      },
      edit: (route) => route.query,
    },
  },
  {
    path: '/print/:schemaName/:name',
    name: 'PrintView',
    component: PrintView,
    props: true,
  },
  {
    path: '/report-print/:reportName',
    name: 'ReportPrintView',
    component: ReportPrintView,
    props: true,
  },
  {
    path: '/report/:reportClassName',
    name: 'Report',
    component: Report,
    props: true,
  },
  {
    path: '/chart-of-accounts',
    name: 'Chart Of Accounts',
    components: {
      default: ChartOfAccounts,
      edit: QuickEditForm,
    },
    props: {
      default: true,
      edit: (route) => route.query,
    },
  },
  {
    path: '/import-wizard',
    name: 'Import Wizard',
    component: ImportWizard,
  },
  {
    path: '/template-builder/:name',
    name: 'Template Builder',
    component: TemplateBuilder,
    props: true,
  },
  {
    path: '/customize-form',
    name: 'Customize Form',
    component: CustomizeForm,
  },
  {
    path: '/settings',
    name: 'Settings',
    components: {
      default: Settings,
      edit: QuickEditForm,
    },
    props: {
      default: true,
      edit: (route) => route.query,
    },
  },
  {
    path: '/pos',
    name: 'Point of Sale',
    components: {
      default: POS,
      edit: QuickEditForm,
    },
    props: {
      default: true,
      edit: (route) => route.query,
    },
  },
  {
    path: '/users',
    name: 'UsersManagement',
    component: UsersManagement,
  },
];

const router = createRouter({ routes, history: createWebHistory() });

router.beforeEach((to, _from, next) => {
  if (!currentUser.value) {
    next();
    return;
  }

  const path = to.path;
  const params = to.params as {
    schemaName?: string;
    pageTitle?: string;
    reportClassName?: string;
  };

  const interfaceId = getInterfaceIdForRoute(path, params);
  if (interfaceId !== null && !hasInterface(interfaceId)) {
    // جرّب إعادة التوجيه للوحة التحكم إذا كانت مسموحة
    if (path !== '/' && hasInterface(INTERFACE_IDS.DASHBOARD)) {
      next('/');
      return;
    }

    // لا يوجد مسار بديل مسموح أو نحن بالفعل في / → إلغاء التنقل لتجنّب حلقة لا نهائية
    next(false);
    return;
  }

  // fallback أمني إضافي: لو لم نحدد واجهة لهذا المسار، نرجع لحراسة الصلاحيات
  if (interfaceId === null) {
    // قوائم: صلاحية قراءة حسب الـ schema (والمسار لـ Payment/Party)
    if (path.startsWith('/list/')) {
      const schemaName = params.schemaName;
      const pageTitle = params.pageTitle;
      const requiredRead = schemaName
        ? getRequiredReadPermissionForListRoute(schemaName, pageTitle)
        : null;
      if (requiredRead && !hasPermission(requiredRead)) {
        if (path !== '/' && hasInterface(INTERFACE_IDS.DASHBOARD)) {
          next('/');
          return;
        }
        next(false);
        return;
      }
    }

    // تقارير: صلاحية عرض التقارير
    if (path.startsWith('/report/')) {
      if (!hasPermission(PERMISSIONS.REPORTS_VIEW)) {
        if (path !== '/' && hasInterface(INTERFACE_IDS.DASHBOARD)) {
          next('/');
          return;
        }
        next(false);
        return;
      }
    }

    // صفحة تعديل وثيقة: صلاحية كتابة حسب الـ schema
    if (path.startsWith('/edit/')) {
      const schemaName = params.schemaName;
      const requiredWrite = schemaName ? getWritePermissionForSchema(schemaName) : null;
      if (requiredWrite && !hasPermission(requiredWrite)) {
        if (path !== '/' && hasInterface(INTERFACE_IDS.DASHBOARD)) {
          next('/');
          return;
        }
        next(false);
        return;
      }
    }

    // إعدادات وصفحات خاصة
    if (
      path === '/chart-of-accounts' ||
      path === '/settings' ||
      path === '/import-wizard'
    ) {
      if (!hasPermission(PERMISSIONS.SETTINGS_VIEW)) {
        if (hasInterface(INTERFACE_IDS.DASHBOARD)) {
          next('/');
          return;
        }
        next(false);
        return;
      }
    }

    if (path === '/users') {
      if (!hasPermission(PERMISSIONS.USERS_MANAGE)) {
        if (hasInterface(INTERFACE_IDS.DASHBOARD)) {
          next('/');
          return;
        }
        next(false);
        return;
      }
    }
  }

  next();
});

router.afterEach(({ fullPath }) => {
  const state = history.state as HistoryState;
  historyState.forward = !!state.forward;
  historyState.back = !!state.back;

  if (fullPath.includes('index.html')) {
    return;
  }

  localStorage.setItem('lastRoute', fullPath);
});

export default router;
