type ThemeName = 'blue' | 'indigo' | 'teal' | 'purple' | 'dark';

const THEME_CLASSES = [
  'theme-blue',
  'theme-indigo',
  'theme-teal',
  'theme-purple',
];

const ACCENT_THEMES = ['blue', 'indigo', 'teal', 'purple'] as const;
type AccentTheme = (typeof ACCENT_THEMES)[number];

function isAccentTheme(value: string): value is AccentTheme {
  return (ACCENT_THEMES as readonly string[]).includes(value);
}

export function setTheme(theme: string): void {
  const requested = (theme || '').toLowerCase() as ThemeName;
  const darkMode = requested === 'dark';

  // Accent theme (color) - dark mode uses blue accent by default.
  const accentCandidate = darkMode ? 'blue' : requested;
  const safeAccentTheme: AccentTheme = isAccentTheme(accentCandidate)
    ? accentCandidate
    : 'blue';

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

/** 6 preset brand colors (no manual hex input). Used in Settings > Theme > Brand Color. */
export const BRAND_COLOR_PRESETS: readonly string[] = [
  '#1F6AE1', // blue
  '#6366F1', // indigo
  '#0D9488', // teal
  '#059669', // emerald
  '#7C3AED', // purple
  '#EA580C', // orange
];

type ThemePreset = 'Light' | 'Dark' | 'Classic' | 'Modern';

export type ThemeSettingsLike = Partial<{
  themePreset: string;
  liveApplyTheme: boolean;
  autoThemeColors: boolean;
  brandColor: string;
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
  fontWeight: string;
  sidebarFontSize: number | string;
  buttonFontSize: number | string;
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

function expandHexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const v = (hex || '').trim();
  if (!v.startsWith('#')) return null;
  if (v.length === 4) {
    const r = parseInt(v[1] + v[1], 16);
    const g = parseInt(v[2] + v[2], 16);
    const b = parseInt(v[3] + v[3], 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  if (v.length === 7) {
    const r = parseInt(v.slice(1, 3), 16);
    const g = parseInt(v.slice(3, 5), 16);
    const b = parseInt(v.slice(5, 7), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  return null;
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const to2 = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`.toUpperCase();
}

function mixHex(a: string, b: string, t: number): string {
  const A = expandHexToRgb(a);
  const B = expandHexToRgb(b);
  if (!A || !B) return a;
  const k = Math.max(0, Math.min(1, t));
  return rgbToHex({
    r: A.r + (B.r - A.r) * k,
    g: A.g + (B.g - A.g) * k,
    b: A.b + (B.b - A.b) * k,
  });
}

function generateAccentScale(base: string) {
  const white = '#FFFFFF';
  const black = '#000000';
  return {
    accent50: mixHex(base, white, 0.90),
    accent100: mixHex(base, white, 0.80),
    accent200: mixHex(base, white, 0.68),
    accent400: base,
    accent500: base,
    accent600: mixHex(base, black, 0.18),
    accent700: mixHex(base, black, 0.30),
    accent900: mixHex(base, black, 0.50),
  };
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

  const auto = !!settings?.autoThemeColors;
  const brand = normalizeHex(settings?.brandColor) || defaults.primary;

  const primary =
    (auto ? brand : normalizeHex(settings?.primaryColor)) || defaults.primary;
  const secondary = normalizeHex(settings?.secondaryColor) || defaults.secondary;
  const accent =
    (auto ? brand : normalizeHex(settings?.accentColor)) || defaults.accent;
  const bg = normalizeHex(settings?.backgroundColor) || defaults.bg;
  const surface = normalizeHex(settings?.surfaceColor) || defaults.surface;
  const text = normalizeHex(settings?.textColor) || defaults.text;
  const muted = normalizeHex(settings?.mutedTextColor) || defaults.muted;
  const border = normalizeHex(settings?.borderColor) || defaults.border;
  const success = normalizeHex(settings?.successColor) || defaults.success;
  const warning = normalizeHex(settings?.warningColor) || defaults.warning;
  const danger = normalizeHex(settings?.dangerColor) || defaults.danger;
  const info = normalizeHex(settings?.infoColor) || defaults.info;
  const icon = (auto ? brand : normalizeHex(settings?.iconColor)) || defaults.icon;

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

  // Focus/outline uses accent; generate scale early so we can use it for backgrounds when auto
  const scale = generateAccentScale(accent);
  setVar('--accent-50', scale.accent50);
  setVar('--accent-100', scale.accent100);
  setVar('--accent-200', scale.accent200);
  setVar('--accent-400', scale.accent400);
  setVar('--accent-500', scale.accent500);
  setVar('--accent-600', scale.accent600);
  setVar('--accent-700', scale.accent700);
  setVar('--accent-900', scale.accent900);

  // When autoThemeColors: app and sidebar backgrounds derived from brand (very light tints)
  // App: 98% white; sidebar: 96% white; header: higher visibility (82% white)
  const white = '#FFFFFF';
  const appBg = auto ? mixHex(accent, white, 0.98) : bg;
  const sidebarBg = auto ? mixHex(accent, white, 0.96) : bg;
  const headerBg = auto ? mixHex(accent, white, 0.82) : scale.accent50;
  setVar('--app-bg', appBg);
  setVar('--surface-bg', surface);
  setVar('--sidebar-bg', sidebarBg);
  setVar('--header-bg', headerBg);
  setVar('--border-color', border);

  // Font
  const fontFamily = (settings?.fontFamily || 'Cairo').toString();
  const fontFamilyMap: Record<string, string> = {
    Cairo: "'Cairo', 'Inter', sans-serif",
    Inter: "'Inter', sans-serif",
    Arial: 'Arial, sans-serif',
    'Times New Roman': "'Times New Roman', serif",
  };
  setVar('--font-sans', fontFamilyMap[fontFamily] || `${fontFamily}, sans-serif`);
  const base = toNumber(settings?.baseFontSize) ?? 14;
  const sidebar = toNumber(settings?.sidebarFontSize) ?? 16;
  const button = toNumber(settings?.buttonFontSize) ?? 16;
  const heading = toNumber(settings?.headingFontSize) ?? 18;
  setVar('--font-base', `${base}px`);
  setVar('--font-sidebar', `${sidebar}px`);
  setVar('--font-button', `${button}px`);
  setVar('--font-heading', `${heading}px`);
  const weight = (settings?.fontWeight ?? '700').toString();
  const validWeight = ['400', '500', '600', '700'].includes(weight) ? weight : '700';
  setVar('--font-weight-base', validWeight);

  // Radius
  const radiusLevel = (settings?.radiusLevel || 'Large').toString();
  const radiusMap: Record<string, string> = {
    Small: '4px',
    Medium: '6px',
    Large: '10px',
  };
  setVar('--radius', radiusMap[radiusLevel] || radiusMap.Large);

  // Shadow
  const shadowLevel = (settings?.shadowLevel || 'Light').toString();
  const shadowMap: Record<string, string> = {
    Light: '0 1px 2px rgba(0,0,0,0.06)',
    Medium: '0 0 2px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.08)',
    Strong: '0 8px 24px rgba(0,0,0,0.20)',
  };
  setVar('--shadow', shadowMap[shadowLevel] || shadowMap.Light);

  // Icon style flag (limited support; affects custom icons via CSS)
  const iconStyle = (settings?.iconStyle || 'Line').toString();
  document.documentElement.classList.toggle('icons-filled', iconStyle === 'Filled');
}
