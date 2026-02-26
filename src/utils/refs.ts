import { reactive, ref } from 'vue';
import type { HistoryState } from 'vue-router';

export const showSidebar = ref(true);
export const docsPathRef = ref<string>('');
export const systemLanguageRef = ref<string>('');
export const appDataRefreshNonce = ref(0);

let appDataRefreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Coalesces bursts of document/db events into a single UI refresh tick.
 */
export function requestAppDataRefresh(delayMs = 120) {
  if (appDataRefreshTimer) {
    return;
  }

  appDataRefreshTimer = setTimeout(() => {
    appDataRefreshNonce.value += 1;
    appDataRefreshTimer = null;
  }, delayMs);
}

export const historyState = reactive({
  forward: !!(history.state as HistoryState)?.forward,
  back: !!(history.state as HistoryState)?.back,
});
