<template>
  <div
    id="app"
    class="
      app-bg
      h-screen
      flex flex-col
      font-sans
      overflow-hidden
      antialiased
    "
    :dir="languageDirection"
    :language="language"
  >
    <WindowsTitleBar
      v-if="platform === 'Windows'"
      :db-path="dbPath"
      :company-name="companyName"
    />
    <!-- Main Contents -->
    <Desk
      v-if="activeScreen === 'Desk'"
      class="flex-1"
      :dark-mode="darkMode"
      @change-db-file="showDbSelector"
    />
    <Login
      v-if="activeScreen === 'Login'"
      class="flex-1"
      @logged-in="onLoggedIn"
    />
    <DatabaseSelector
      v-if="activeScreen === 'DatabaseSelector'"
      ref="databaseSelector"
      @new-database="newDatabase"
      @file-selected="fileSelected"
    />
    <SetupWizard
      v-if="activeScreen === 'SetupWizard'"
      @setup-complete="setupComplete"
      @setup-canceled="showDbSelector"
    />

    <Modal :open-modal="licenseGate.open" @closemodal="onLicenseGateClose">
      <div class="p-5 w-dialog text-gray-900 dark:text-gray-100">
        <h2 class="text-xl font-semibold select-none">
          {{
            licenseGate.mode === 'activate'
              ? 'تفعيل البرنامج'
              : 'تفويض تغيير قاعدة البيانات'
          }}
        </h2>

        <p v-if="licenseGate.mode === 'activate'" class="text-sm text-gray-600 dark:text-gray-400 mt-2">
          أدخل مفتاح التفعيل وحدد مدة التفعيل (أيام + ساعات). عند انتهاء الوقت سيتم قفل البرنامج حتى يتم التفعيل مجددًا.
        </p>
        <p v-else class="text-sm text-gray-600 dark:text-gray-400 mt-2">
          لا يمكن تغيير قاعدة البيانات بدون إدخال مفتاح التفعيل.
        </p>

        <div class="mt-4 space-y-3">
          <div>
            <label class="text-sm text-gray-700 dark:text-gray-300">مفتاح التفعيل</label>
            <input
              v-model="licenseGate.key"
              type="password"
              class="
                mt-1
                w-full
                bg-gray-100
                dark:bg-gray-875
                focus:bg-gray-200
                dark:focus:bg-gray-890
                rounded-md
                px-3
                py-2
                outline-none
                font-mono
              "
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              autocomplete="off"
            />
          </div>

          <div v-if="licenseGate.mode === 'activate'">
            <label class="text-sm text-gray-700 dark:text-gray-300">كلمة المرور</label>
            <input
              v-model="licenseGate.password"
              type="password"
              class="
                mt-1
                w-full
                bg-gray-100
                dark:bg-gray-875
                focus:bg-gray-200
                dark:focus:bg-gray-890
                rounded-md
                px-3
                py-2
                outline-none
              "
              placeholder="أدخل كلمة المرور"
              autocomplete="off"
            />
          </div>

          <div v-if="licenseGate.mode === 'activate'">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm text-gray-700 dark:text-gray-300">عدد أيام التفعيل</label>
                <input
                  v-model.number="licenseGate.days"
                  type="number"
                  min="0"
                  class="
                    mt-1
                    w-full
                    bg-gray-100
                    dark:bg-gray-875
                    focus:bg-gray-200
                    dark:focus:bg-gray-890
                    rounded-md
                    px-3
                    py-2
                    outline-none
                  "
                  placeholder="30"
                />
              </div>
              <div>
                <label class="text-sm text-gray-700 dark:text-gray-300">عدد الساعات</label>
                <input
                  v-model.number="licenseGate.hours"
                  type="number"
                  min="0"
                  max="23"
                  class="
                    mt-1
                    w-full
                    bg-gray-100
                    dark:bg-gray-875
                    focus:bg-gray-200
                    dark:focus:bg-gray-890
                    rounded-md
                    px-3
                    py-2
                    outline-none
                  "
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        <p v-if="licenseGate.error" class="text-sm text-red-600 mt-3">
          {{ licenseGate.error }}
        </p>

        <div class="mt-5 flex justify-between gap-2">
          <Button v-if="licenseGate.canCancel" @click="onLicenseGateCancel">إلغاء</Button>
          <div class="ms-auto flex gap-2">
            <Button type="primary" @click="submitLicenseGate">{{
              licenseGate.mode === 'activate' ? 'تفعيل' : 'متابعة'
            }}</Button>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Render target for toasts -->
    <div
      id="toast-container"
      class="absolute bottom-0 flex flex-col items-end mb-3 pe-6"
      style="width: 100%; pointer-events: none"
    ></div>
  </div>
</template>
<script lang="ts">
import { RTL_LANGUAGES } from 'fyo/utils/consts';
import { ModelNameEnum } from 'models/types';
import { systemLanguageRef } from 'src/utils/refs';
import { defineComponent, provide, ref, Ref } from 'vue';
import WindowsTitleBar from './components/WindowsTitleBar.vue';
import Button from './components/Button.vue';
import Modal from './components/Modal.vue';
import { handleErrorWithDialog } from './errorHandling';
import { fyo } from './initFyo';
import DatabaseSelector from './pages/DatabaseSelector.vue';
import Desk from './pages/Desk.vue';
import SetupWizard from './pages/SetupWizard/SetupWizard.vue';
import setupInstance from './setup/setupInstance';
import { SetupWizardOptions } from './setup/types';
import './styles/index.css';
import { connectToDatabase, dbErrorActionSymbols } from './utils/db';
import { initializeInstance } from './utils/initialization';
import * as injectionKeys from './utils/injectionKeys';
import { showDialog, showToast } from './utils/interactive';
import { setLanguageMap } from './utils/language';
import { updateConfigFiles } from './utils/misc';
import { updatePrintTemplates } from './utils/printTemplates';
import { Search } from './utils/search';
import { Shortcuts } from './utils/shortcuts';
import { routeTo } from './utils/ui';
import { useKeys } from './utils/vueUtils';
import { applyThemeSettings, setTheme, type ThemeSettingsLike } from 'src/utils/theme';
import { ensureDefaultAdminExists } from './utils/authService';
import Login from './pages/Login.vue';
import {
  registerInstanceToERPNext,
  updateERPNSyncSettings,
} from './utils/erpnextSync';
import { ERPNextSyncSettings } from 'models/baseModels/ERPNextSyncSettings/ERPNextSyncSettings';
import { isLoggedIn } from './utils/authState';

enum Screen {
  Desk = 'Desk',
  DatabaseSelector = 'DatabaseSelector',
  SetupWizard = 'SetupWizard',
  Login = 'Login',
}

type LicenseGateMode = 'activate' | 'authorize-db';

const LICENSE_KEY = 'YTMG3-N6DKC-DKB77-7M9GH-8HVX7';
const ACTIVATION_PASSWORD = '65102984';

const LICENSE_CFG = {
  expiresAt: 'license.expiresAt',
  lastSeenAt: 'license.lastSeenAt',
} as const;

export default defineComponent({
  name: 'App',
  components: {
    Desk,
    Login,
    SetupWizard,
    DatabaseSelector,
    WindowsTitleBar,
    Modal,
    Button,
  },
  setup() {
    const keys = useKeys();
    const searcher: Ref<null | Search> = ref(null);
    const shortcuts = new Shortcuts(keys);
    const languageDirection = ref(
      getLanguageDirection(systemLanguageRef.value)
    );

    provide(injectionKeys.keysKey, keys);
    provide(injectionKeys.searcherKey, searcher);
    provide(injectionKeys.shortcutsKey, shortcuts);
    provide(injectionKeys.languageDirectionKey, languageDirection);

    const databaseSelector = ref<InstanceType<typeof DatabaseSelector> | null>(
      null
    );

    return {
      keys,
      searcher,
      shortcuts,
      languageDirection,
      databaseSelector,
    };
  },
  data() {
    return {
      activeScreen: null,
      dbPath: '',
      companyName: '',
      darkMode: false,
      licenseGate: {
        open: false,
        mode: 'activate' as LicenseGateMode,
        key: '',
        password: '',
        days: 30,
        hours: 0,
        error: '',
        canCancel: false,
        pendingAction: null as null | 'change-db',
      },
    } as {
      activeScreen: null | Screen;
      dbPath: string;
      companyName: string;
      darkMode: boolean | undefined;
      licenseGate: {
        open: boolean;
        mode: LicenseGateMode;
        key: string;
        password: string;
        days: number;
        hours: number;
        error: string;
        canCancel: boolean;
        pendingAction: null | 'change-db';
      };
    };
  },
  computed: {
    language(): string {
      return systemLanguageRef.value;
    },
  },
  watch: {
    language(value: string) {
      this.languageDirection = getLanguageDirection(value);
    },
  },
  async mounted() {
    this.enforceLicenseGate();
    await this.setInitialScreen();
    // Apply Theme Settings (when SystemSettings is available)
    const sys: unknown = fyo.singles.SystemSettings;
    if (sys && typeof sys === 'object') {
      const sysObj = sys as Record<string, unknown>;
      applyThemeSettings(sys as ThemeSettingsLike);
      const preset = sysObj['themePreset'];
      this.darkMode =
        (typeof preset === 'string' ? preset : String(preset ?? '')) === 'Dark';
    } else {
      // fallback
      setTheme('blue');
      this.darkMode = false;
    }

    // Enforce license continuously (expiry + basic anti-tamper)
    this.startLicenseWatcher();
  },
  methods: {
    getLicenseConfig() {
      const expiresAt = fyo.config.get(LICENSE_CFG.expiresAt, null) as string | null;
      const lastSeenAt = fyo.config.get(LICENSE_CFG.lastSeenAt, null) as string | null;
      return { expiresAt, lastSeenAt };
    },
    isExpired(expiresAt: string | null, nowTs: number = Date.now()): boolean {
      if (!expiresAt) {
        return true;
      }
      const ts = Date.parse(expiresAt);
      if (Number.isNaN(ts)) {
        return true;
      }
      return nowTs > ts;
    },
    getNowOrDetectRollback(lastSeenAt: string | null): { nowTs: number; rolledBack: boolean } {
      const nowTs = Date.now();
      if (!lastSeenAt) {
        return { nowTs, rolledBack: false };
      }
      const lastTs = Date.parse(lastSeenAt);
      if (Number.isNaN(lastTs)) {
        return { nowTs, rolledBack: false };
      }
      // If system time moves backwards significantly, treat as tampering.
      const toleranceMs = 5 * 60 * 1000;
      return { nowTs, rolledBack: nowTs + toleranceMs < lastTs };
    },
    openLicenseGate(
      mode: LicenseGateMode,
      opts?: { canCancel?: boolean; pendingAction?: 'change-db' }
    ) {
      this.licenseGate.open = true;
      this.licenseGate.mode = mode;
      this.licenseGate.key = '';
      this.licenseGate.password = '';
      this.licenseGate.error = '';
      this.licenseGate.canCancel = !!opts?.canCancel;
      this.licenseGate.pendingAction = opts?.pendingAction ?? null;
      if (mode === 'authorize-db') {
        this.licenseGate.days = 0;
        this.licenseGate.hours = 0;
      } else if (!this.licenseGate.days || this.licenseGate.days < 1) {
        this.licenseGate.days = 30;
        this.licenseGate.hours = this.licenseGate.hours ?? 0;
      }
    },
    enforceLicenseGate(): void {
      const { expiresAt, lastSeenAt } = this.getLicenseConfig();
      const { nowTs, rolledBack } = this.getNowOrDetectRollback(lastSeenAt);

      if (rolledBack) {
        // Don't keep resetting the form while the user is typing.
        if (!this.licenseGate.open || this.licenseGate.mode !== 'activate') {
          this.openLicenseGate('activate', { canCancel: false });
        } else {
          this.licenseGate.canCancel = false;
        }
        this.licenseGate.error = 'تم اكتشاف تغيير في وقت النظام. الرجاء إعادة التفعيل.';
        return;
      }

      if (this.isExpired(expiresAt, nowTs)) {
        // Don't keep resetting the form while the user is typing.
        if (!this.licenseGate.open || this.licenseGate.mode !== 'activate') {
          this.openLicenseGate('activate', { canCancel: false });
        } else {
          this.licenseGate.canCancel = false;
        }
        return;
      }

      // Periodically persist last seen time (best-effort)
      const lastWrite = (this as any)._licenseLastWriteTs as number | undefined;
      if (!lastWrite || nowTs - lastWrite > 60_000) {
        (this as any)._licenseLastWriteTs = nowTs;
        fyo.config.set(LICENSE_CFG.lastSeenAt, new Date(nowTs).toISOString());
      }
    },
    startLicenseWatcher() {
      this.stopLicenseWatcher();
      const tick = () => this.enforceLicenseGate();
      // check quickly for expiry without spamming disk writes
      (this as any)._licenseWatcher = window.setInterval(tick, 1_000);
      window.addEventListener('focus', tick);
      document.addEventListener('visibilitychange', tick);
    },
    stopLicenseWatcher() {
      const id = (this as any)._licenseWatcher as number | undefined;
      if (typeof id === 'number') {
        window.clearInterval(id);
      }
      (this as any)._licenseWatcher = undefined;
    },
    onLicenseGateClose() {
      // Do not allow closing when required
      if (!this.licenseGate.canCancel) {
        return;
      }
      this.onLicenseGateCancel();
    },
    onLicenseGateCancel() {
      this.licenseGate.open = false;
      this.licenseGate.key = '';
      this.licenseGate.password = '';
      this.licenseGate.error = '';
      this.licenseGate.pendingAction = null;
    },
    normalizeKey(key: string): string {
      return key.replace(/\s+/g, '').toUpperCase();
    },
    async submitLicenseGate(): Promise<void> {
      this.licenseGate.error = '';
      const key = this.normalizeKey(this.licenseGate.key || '');
      const expected = this.normalizeKey(LICENSE_KEY);
      if (!key.length) {
        this.licenseGate.error = 'مفتاح التفعيل مطلوب';
        return;
      }
      if (key !== expected) {
        this.licenseGate.error = 'مفتاح التفعيل غير صحيح';
        return;
      }

      if (this.licenseGate.mode === 'activate') {
        const password = (this.licenseGate.password ?? '').trim();
        if (password !== ACTIVATION_PASSWORD) {
          this.licenseGate.error = 'كلمة المرور غير صحيحة';
          return;
        }
        const days = Number(this.licenseGate.days ?? 0);
        const hours = Number(this.licenseGate.hours ?? 0);
        if (!Number.isFinite(days) || days < 0) {
          this.licenseGate.error = 'عدد الأيام يجب أن يكون 0 أو أكثر';
          return;
        }
        if (!Number.isFinite(hours) || hours < 0 || hours > 23) {
          this.licenseGate.error = 'عدد الساعات يجب أن يكون بين 0 و 23';
          return;
        }
        const durationMs = days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000;
        if (durationMs <= 0) {
          this.licenseGate.error = 'يجب إدخال مدة تفعيل (أيام أو ساعات)';
          return;
        }
        const nowTs = Date.now();
        const expiresAt = new Date(nowTs + durationMs).toISOString();
        fyo.config.set(LICENSE_CFG.expiresAt, expiresAt);
        fyo.config.set(LICENSE_CFG.lastSeenAt, new Date(nowTs).toISOString());
        this.licenseGate.open = false;
        return;
      }

      // authorize-db
      this.licenseGate.open = false;
      if (this.licenseGate.pendingAction === 'change-db') {
        this.licenseGate.pendingAction = null;
        await this.showDbSelectorInternal();
      }
    },
    async setInitialScreen(): Promise<void> {
      const lastSelectedFilePath = fyo.config.get('lastSelectedFilePath', null);

      if (
        typeof lastSelectedFilePath !== 'string' ||
        !lastSelectedFilePath.length
      ) {
        this.activeScreen = Screen.DatabaseSelector;
        return;
      }

      await this.fileSelected(lastSelectedFilePath);
    },
    async setSearcher(): Promise<void> {
      this.searcher = new Search(fyo);
      await this.searcher.initializeKeywords();
    },
    async setDesk(filePath: string): Promise<void> {
      await setLanguageMap();
      await ensureDefaultAdminExists();
      this.dbPath = filePath;
      this.companyName = (await fyo.getValue(
        ModelNameEnum.AccountingSettings,
        'companyName'
      )) as string;
      await this.setSearcher();
      updateConfigFiles(fyo);
      await this.setDeskRoute();
      await fyo.telemetry.start(true);
      await ipc.checkForUpdates();
      // إذا كان هناك جلسة مستخدم محفوظة، انتقل مباشرة إلى Desk، وإلا أظهر شاشة تسجيل الدخول
      this.activeScreen = isLoggedIn.value ? Screen.Desk : Screen.Login;
    },
    onLoggedIn(): void {
      this.activeScreen = Screen.Desk;
    },
    newDatabase() {
      this.activeScreen = Screen.SetupWizard;
    },
    async fileSelected(filePath: string): Promise<void> {
      fyo.config.set('lastSelectedFilePath', filePath);
      if (filePath !== ':memory:' && !(await ipc.checkDbAccess(filePath))) {
        await showDialog({
          title: this.t`Cannot open file`,
          type: 'error',
          detail: this
            .t`Baron Accounting does not have access to the selected file: ${filePath}`,
        });

        fyo.config.set('lastSelectedFilePath', null);
        return;
      }

      try {
        await this.showSetupWizardOrDesk(filePath);
      } catch (error) {
        await handleErrorWithDialog(error, undefined, true, true);
        this.showDbSelector();
      }
    },
    async setupComplete(setupWizardOptions: SetupWizardOptions): Promise<void> {
      const companyName = setupWizardOptions.companyName;
      const filePath = await ipc.getDbDefaultPath(companyName);
      await setupInstance(filePath, setupWizardOptions, fyo);
      fyo.config.set('lastSelectedFilePath', filePath);
      await this.setDesk(filePath);
    },
    async showSetupWizardOrDesk(filePath: string): Promise<void> {
      const { countryCode, error, actionSymbol } = await connectToDatabase(
        this.fyo,
        filePath
      );

      if (!countryCode && error && actionSymbol) {
        return await this.handleConnectionFailed(error, actionSymbol);
      }

      const setupComplete = await fyo.getValue(
        ModelNameEnum.AccountingSettings,
        'setupComplete'
      );

      if (!setupComplete) {
        this.activeScreen = Screen.SetupWizard;
        return;
      }

      await initializeInstance(filePath, false, countryCode, fyo);
      await updatePrintTemplates(fyo);

      const syncSettingsDoc = (await fyo.doc.getDoc(
        ModelNameEnum.ERPNextSyncSettings
      )) as ERPNextSyncSettings;

      const baseURL = syncSettingsDoc.baseURL;
      const token = syncSettingsDoc.authToken;
      const enableERPNextSync =
        fyo.singles.AccountingSettings?.enableERPNextSync;

      if (enableERPNextSync && baseURL && token) {
        try {
          await registerInstanceToERPNext(fyo);
          await updateERPNSyncSettings(fyo);
          await ipc.initScheduler(
            `${fyo.singles.ERPNextSyncSettings?.dataSyncInterval as string}m`
          );
        } catch (error) {
          showToast({ message: 'Connection Failed', type: 'error' });
        }
      }

      await this.setDesk(filePath);
    },
    async handleConnectionFailed(error: Error, actionSymbol: symbol) {
      this.showDbSelector();

      if (actionSymbol === dbErrorActionSymbols.CancelSelection) {
        return;
      }

      if (actionSymbol === dbErrorActionSymbols.SelectFile) {
        await this.databaseSelector?.existingDatabase();
        return;
      }

      throw error;
    },
    async setDeskRoute(): Promise<void> {
      const { hideGetStarted } = await fyo.doc.getDoc('SystemSettings');

      let route = '/get-started';
      if (hideGetStarted) {
        route = localStorage.getItem('lastRoute') || '/';
      }

      await routeTo(route);
    },
    showDbSelector(): void {
      const { expiresAt } = this.getLicenseConfig();
      // If expired -> force activation first.
      if (this.isExpired(expiresAt)) {
        this.openLicenseGate('activate', { canCancel: false });
        return;
      }
      // Always require key for DB switching
      this.openLicenseGate('authorize-db', {
        canCancel: true,
        pendingAction: 'change-db',
      });
    },
    async showDbSelectorInternal(): Promise<void> {
      localStorage.clear();
      fyo.config.set('lastSelectedFilePath', null);
      fyo.telemetry.stop();
      await fyo.purgeCache();
      this.activeScreen = Screen.DatabaseSelector;
      this.dbPath = '';
      this.searcher = null;
      this.companyName = '';
    },
  },
});

function getLanguageDirection(language: string): 'rtl' | 'ltr' {
  return RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
}
</script>
