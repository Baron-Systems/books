type ThemeName = 'blue' | 'indigo' | 'teal' | 'purple' | 'dark';

const THEME_CLASSES = [
  'theme-blue',
  'theme-indigo',
  'theme-teal',
  'theme-purple',
];

export function setTheme(theme: string): void {
  const requested = (theme || '').toLowerCase() as ThemeName;
  const darkMode = requested === 'dark';

  // Accent theme (color) - dark mode uses blue accent by default.
  const accentTheme: Exclude<ThemeName, 'dark'> = (
    darkMode ? 'blue' : requested
  ) as Exclude<ThemeName, 'dark'>;
  const safeAccentTheme = (
    ['blue', 'indigo', 'teal', 'purple'].includes(accentTheme)
      ? accentTheme
      : 'blue'
  ) as Exclude<ThemeName, 'dark'>;

  document.documentElement.classList.remove(...THEME_CLASSES);
  document.documentElement.classList.add(`theme-${safeAccentTheme}`);

  if (darkMode) {
    document.documentElement.classList.add(
      'dark',
      'custom-scroll',
      'custom-scroll-thumb1'
    );
    return;
  }

  document.documentElement.classList.remove(
    'dark',
    'custom-scroll',
    'custom-scroll-thumb1'
  );
}

export function setDarkMode(darkMode: boolean): void {
  setTheme(darkMode ? 'dark' : 'blue');
}

type ThemePreset = 'Light' | 'Dark' | 'Classic' | 'Modern';

type ThemeSettingsLike = Partial<{
  themePreset: string;
  liveApplyTheme: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  infoColor: string;
  fontFamily: string;
  baseFontSize: number | string;
  headingFontSize: number | string;
  radiusLevel: string;
  shadowLevel: string;
  iconStyle: string;
  iconColor: string;
}>;

function setVar(name: string, value: string) {
  if (!value) return;
  document.documentElement.style.setProperty(name, value);
}

function normalizeHex(value: unknown): string {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  if (!v) return '';
  // allow rgb/var() too
  if (v.startsWith('rgb') || v.startsWith('var(')) return v;
  if (v.startsWith('#') && (v.length === 7 || v.length === 4)) return v;
  return '';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function presetDefaults(preset: ThemePreset) {
  if (preset === 'Dark') {
    return {
      dark: true,
      primary: '#33A1FF',
      secondary: '#CBD5E1',
      accent: '#33A1FF',
      bg: '#171717',
      surface: '#212121',
      text: '#F8F8F8',
      muted: '#999999',
      border: '#383838',
      success: '#30A66D',
      warning: '#EDBA13',
      danger: '#CC2929',
      info: '#33A1FF',
      icon: '#E2E2E2',
    };
  }
  if (preset === 'Classic') {
    return {
      dark: false,
      primary: '#005CA3',
      secondary: '#334155',
      accent: '#E86C13',
      bg: '#FBFBFB',
      surface: '#FFFFFF',
      text: '#1E293B',
      muted: '#525252',
      border: '#EDEDED',
      success: '#30A66D',
      warning: '#EDBA13',
      danger: '#CC2929',
      info: '#0070CC',
      icon: '#525252',
    };
  }
  if (preset === 'Modern') {
    return {
      dark: false,
      primary: '#1F6AE1',
      secondary: '#334155',
      accent: '#3B82F6',
      bg: '#F7F9FC',
      surface: '#FFFFFF',
      text: '#0F172A',
      muted: '#64748B',
      border: '#E2E8F0',
      success: '#16A34A',
      warning: '#F59E0B',
      danger: '#DC2626',
      info: '#0EA5E9',
      icon: '#1F6AE1',
    };
  }
  // Light
  return {
    dark: false,
    primary: '#007BE0',
    secondary: '#334155',
    accent: '#33A1FF',
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#1E293B',
    muted: '#525252',
    border: '#EDEDED',
    success: '#30A66D',
    warning: '#EDBA13',
    danger: '#CC2929',
    info: '#0070CC',
    icon: '#525252',
  };
}

export function applyThemeSettings(settings?: ThemeSettingsLike): void {
  const preset = ((settings?.themePreset || 'Modern') as ThemePreset) || 'Modern';
  const defaults = presetDefaults(preset);

  // Set dark mode class based on preset
  setTheme(defaults.dark ? 'dark' : 'blue');

  const primary = normalizeHex(settings?.primaryColor) || defaults.primary;
  const secondary = normalizeHex(settings?.secondaryColor) || defaults.secondary;
  const accent = normalizeHex(settings?.accentColor) || defaults.accent;
  const bg = normalizeHex(settings?.backgroundColor) || defaults.bg;
  const surface = normalizeHex(settings?.surfaceColor) || defaults.surface;
  const text = normalizeHex(settings?.textColor) || defaults.text;
  const muted = normalizeHex(settings?.mutedTextColor) || defaults.muted;
  const border = normalizeHex(settings?.borderColor) || defaults.border;
  const success = normalizeHex(settings?.successColor) || defaults.success;
  const warning = normalizeHex(settings?.warningColor) || defaults.warning;
  const danger = normalizeHex(settings?.dangerColor) || defaults.danger;
  const info = normalizeHex(settings?.infoColor) || defaults.info;
  const icon = normalizeHex(settings?.iconColor) || defaults.icon;

  setVar('--primary', primary);
  setVar('--secondary', secondary);
  setVar('--accent', accent);
  setVar('--text', text);
  setVar('--muted-text', muted);
  setVar('--border', border);
  setVar('--success', success);
  setVar('--warning', warning);
  setVar('--danger', danger);
  setVar('--info', info);
  setVar('--icon', icon);

  setVar('--app-bg', bg);
  setVar('--surface-bg', surface);
  setVar('--sidebar-bg', bg);
  setVar('--border-color', border);

  // Focus/outline uses accent
  setVar('--accent-400', accent);
  setVar('--accent-500', accent);
  setVar('--accent-600', accent);
  setVar('--accent-700', accent);
  setVar('--accent-900', accent);

  // Font
  const fontFamily = (settings?.fontFamily || 'Inter').toString();
  setVar('--font-sans', fontFamily);
  const base = toNumber(settings?.baseFontSize);
  const heading = toNumber(settings?.headingFontSize);
  if (base) setVar('--font-base', `${base}px`);
  if (heading) setVar('--font-heading', `${heading}px`);

  // Radius
  const radiusLevel = (settings?.radiusLevel || 'Medium').toString();
  const radiusMap: Record<string, string> = {
    Small: '4px',
    Medium: '6px',
    Large: '10px',
  };
  setVar('--radius', radiusMap[radiusLevel] || radiusMap.Medium);

  // Shadow
  const shadowLevel = (settings?.shadowLevel || 'Medium').toString();
  const shadowMap: Record<string, string> = {
    Light: '0 1px 2px rgba(0,0,0,0.06)',
    Medium: '0 0 2px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.08)',
    Strong: '0 8px 24px rgba(0,0,0,0.20)',
  };
  setVar('--shadow', shadowMap[shadowLevel] || shadowMap.Medium);

  // Icon style flag (limited support; affects custom icons via CSS)
  const iconStyle = (settings?.iconStyle || 'Line').toString();
  document.documentElement.classList.toggle('icons-filled', iconStyle === 'Filled');
}
