/**
 * 主题层：所有颜色都从这里派生，组件里不再出现写死的色值。
 *
 * 每套主题只手写 18 个种子色，其余深浅（卡片底、描边、状态芯片底）由 mix() 推导，
 * 保证同一套主题里的层级关系一致，换主题时不会出现"半套旧配色"。
 */

export interface ThemeSeed {
  id: string;
  name: string;
  tagline: string;
  /** 页面底色 */
  base: string;
  /** 卡片底色 */
  surface: string;
  /** 次级控件底色 */
  raised: string;
  line: string;
  lineSoft: string;
  text: string;
  textSoft: string;
  textMuted: string;
  textDim: string;
  primary: string;
  secondary: string;
  success: string;
  warn: string;
  danger: string;
  info: string;
  accentA: string;
  accentB: string;
  accentC: string;
}

/** Tailwind 里被主题接管的色槽，键名与工具类一一对应 */
export const COLOR_SLOTS = [
  'primary',
  'secondary',
  'dark',
  'light',
  'gray-300',
  'gray-400',
  'gray-500',
  'gray-600',
  'gray-700',
  'gray-800',
  'gray-900',
  'red-200',
  'red-400',
  'red-500',
  'red-600',
  'red-800',
  'red-900',
  'green-400',
  'green-500',
  'green-700',
  'green-800',
  'yellow-400',
  'yellow-500',
  'yellow-800',
  'blue-500',
  'blue-600',
  'blue-800',
  'purple-600',
  'purple-900',
  'indigo-500',
  'indigo-800',
  'orange-500',
  'orange-800',
] as const;

export type ColorSlot = (typeof COLOR_SLOTS)[number];

export type ThemeColors = Record<ColorSlot, string>;

export interface Theme extends ThemeSeed {
  colors: ThemeColors;
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

export const hexToRgb = (hex: string): [number, number, number] => {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

export const rgbToHex = (rgb: [number, number, number]) =>
  '#' + rgb.map((c) => clamp(c).toString(16).padStart(2, '0')).join('');

/** 按 t 把 a 混向 b，t=0 得到 a，t=1 得到 b */
export const mix = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]);
};

/** WCAG 相对亮度 */
export const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (a: string, b: string) => {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * 品牌色是固定的（Notion 是纯黑），直接画在深色卡片上会看不见。
 * 这里把颜色朝背景的反方向推，直到达到目标对比度，色相保持不变。
 */
export const ensureContrast = (
  color: string,
  background: string,
  target: number,
  toward?: string
) => {
  const direction = toward ?? (luminance(background) > 0.4 ? '#000000' : '#ffffff');
  let result = color;
  for (let step = 0; step < 16 && contrastRatio(result, background) < target; step += 1) {
    result = mix(result, direction, 0.12);
  }
  return result;
};

const buildColors = (seed: ThemeSeed): ThemeColors => ({
  primary: seed.primary,
  secondary: seed.secondary,
  dark: seed.surface,
  light: seed.text,
  'gray-300': seed.textSoft,
  'gray-400': seed.textMuted,
  'gray-500': seed.textDim,
  'gray-600': seed.lineSoft,
  'gray-700': seed.line,
  'gray-800': seed.raised,
  'gray-900': seed.base,
  'red-200': mix(seed.danger, seed.text, 0.72),
  'red-400': seed.danger,
  'red-500': mix(seed.danger, seed.text, 0.12),
  'red-600': mix(seed.primary, '#000000', 0.18),
  'red-800': mix(seed.danger, seed.surface, 0.74),
  'red-900': mix(seed.danger, seed.surface, 0.84),
  'green-400': seed.success,
  'green-500': seed.success,
  'green-700': mix(seed.success, seed.surface, 0.55),
  'green-800': mix(seed.success, seed.surface, 0.8),
  'yellow-400': seed.warn,
  'yellow-500': seed.warn,
  'yellow-800': mix(seed.warn, seed.surface, 0.8),
  'blue-500': seed.info,
  'blue-600': mix(seed.info, '#000000', 0.16),
  'blue-800': mix(seed.info, seed.surface, 0.8),
  'purple-600': seed.accentA,
  'purple-900': mix(seed.accentA, seed.surface, 0.82),
  'indigo-500': seed.accentB,
  'indigo-800': mix(seed.accentB, seed.surface, 0.8),
  'orange-500': seed.accentC,
  'orange-800': mix(seed.accentC, seed.surface, 0.8),
});

const makeTheme = (seed: ThemeSeed): Theme => ({ ...seed, colors: buildColors(seed) });

export const THEMES: Theme[] = [
  makeTheme({
    id: 'slate',
    name: '石板红',
    tagline: '现行配色：冷灰底 + 警戒红',
    base: '#111827',
    surface: '#1e293b',
    raised: '#1f2937',
    line: '#374151',
    lineSoft: '#4b5563',
    text: '#f8fafc',
    textSoft: '#d1d5db',
    textMuted: '#9ca3af',
    textDim: '#8b95a5',
    primary: '#ef4444',
    secondary: '#3b82f6',
    success: '#4ade80',
    warn: '#facc15',
    danger: '#f87171',
    info: '#3b82f6',
    accentA: '#a855f7',
    accentB: '#6366f1',
    accentC: '#f97316',
  }),
  makeTheme({
    id: 'ledger',
    name: '熔金账本',
    tagline: '暖褐纸底 + 熔金橙，像一本被翻旧的账簿',
    base: '#17120e',
    surface: '#241b14',
    raised: '#31251b',
    line: '#4d3a29',
    lineSoft: '#63492f',
    text: '#faf0e2',
    textSoft: '#e6d5bd',
    textMuted: '#c0a684',
    textDim: '#a68b6a',
    primary: '#ff7a2f',
    secondary: '#f2b544',
    success: '#a8cf6d',
    warn: '#ffd166',
    danger: '#ff6b5e',
    info: '#79b8cf',
    accentA: '#e08a3c',
    accentB: '#cf6f43',
    accentC: '#f0b45f',
  }),
  makeTheme({
    id: 'sonar',
    name: '深海声呐',
    tagline: '深海蓝底 + 电光青，像潜艇的扫描屏',
    base: '#04121a',
    surface: '#0a2029',
    raised: '#0e2c37',
    line: '#1c4453',
    lineSoft: '#276074',
    text: '#e8f8ff',
    textSoft: '#c2e8f6',
    textMuted: '#8dc0d3',
    textDim: '#74a8bd',
    primary: '#00e0ff',
    secondary: '#8b7cff',
    success: '#35e0a1',
    warn: '#ffd166',
    danger: '#ff6b81',
    info: '#4cc3f0',
    accentA: '#9b6cff',
    accentB: '#5b8cff',
    accentC: '#ffa94d',
  }),
  makeTheme({
    id: 'neon',
    name: '霓虹屠宰场',
    tagline: '暗紫底 + 品红霓虹，最贴合"刺客"气质',
    base: '#0c0714',
    surface: '#180f26',
    raised: '#221537',
    line: '#3d2560',
    lineSoft: '#523180',
    text: '#f8ecff',
    textSoft: '#e0cbf7',
    textMuted: '#b79ad6',
    textDim: '#a184c4',
    primary: '#ff2e88',
    secondary: '#b061ff',
    success: '#b8ff3c',
    warn: '#ffd23f',
    danger: '#ff5c78',
    info: '#4cc9f0',
    accentA: '#d02ce0',
    accentB: '#8b45ff',
    accentC: '#ff7ab6',
  }),
];

export const DEFAULT_THEME_ID = 'slate';

export const getTheme = (id: string): Theme =>
  THEMES.find((theme) => theme.id === id) ?? THEMES[0];

/** 海报渐变：从页面底扫到卡片底，跨两个真实色相而不是同色加深 */
export const posterGradient = (theme: Theme): [string, string] => [
  theme.colors['gray-900'],
  mix(theme.colors.dark, theme.primary, 0.1),
];

export const THEME_STORAGE_KEY = 'subslayer-theme';

export const readStoredThemeId = (): string => {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_ID;
  }
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
};

/** 把主题写进 :root 的 CSS 变量，Tailwind 工具类通过 rgb(var(--c-*) / alpha) 取值 */
export const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  COLOR_SLOTS.forEach((slot) => {
    root.style.setProperty(`--c-${slot}`, hexToRgb(theme.colors[slot]).join(' '));
  });
  root.style.setProperty('--c-scrim', hexToRgb(theme.base).join(' '));
  root.dataset.theme = theme.id;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  } catch {
    // 隐私模式下写不进去也不影响本次会话的配色
  }
};
