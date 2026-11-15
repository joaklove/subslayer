import { describe, expect, it } from 'vitest';
// @ts-expect-error -- Tailwind 配置是纯 JS，没有类型声明，这里只读它的色槽表
import tailwindConfig from '../../../tailwind.config.js';
import {
  applyTheme,
  COLOR_SLOTS,
  contrastRatio,
  DEFAULT_THEME_ID,
  ensureContrast,
  getTheme,
  hexToRgb,
  mix,
  posterGradient,
  readStoredThemeId,
  THEMES,
  THEME_STORAGE_KEY,
} from '../themes';

const configColors = (
  tailwindConfig as { theme: { extend: { colors: Record<string, unknown> } } }
).theme.extend.colors;

describe('主题与 Tailwind 色槽不漂移', () => {
  it('每个色槽都在 Tailwind 里注册过', () => {
    COLOR_SLOTS.forEach((slot) => {
      const [family, shade] = slot.split('-');
      const entry = configColors[family];
      if (shade) {
        expect(entry, `缺少 ${slot}`).toBeTypeOf('object');
        expect((entry as Record<string, string>)[shade]).toBe(`rgb(var(--c-${slot}) / <alpha-value>)`);
      } else {
        expect(entry).toBe(`rgb(var(--c-${slot}) / <alpha-value>)`);
      }
    });
  });

  it('Tailwind 里没有多出来的野色槽', () => {
    const declared = Object.entries(configColors).flatMap(([family, value]) =>
      typeof value === 'string' ? [family] : Object.keys(value as object).map((shade) => `${family}-${shade}`)
    );
    expect(declared.sort()).toEqual([...COLOR_SLOTS].sort());
  });
});

describe('四套配色都完整且可读', () => {
  it('提供现行 + 3 套备选', () => {
    expect(THEMES).toHaveLength(4);
    expect(THEMES.map((theme) => theme.id)).toEqual(['slate', 'ledger', 'sonar', 'neon']);
    expect(new Set(THEMES.map((theme) => theme.primary)).size).toBe(4);
  });

  it.each(THEMES)('$name 的每个色槽都是合法 hex', (theme) => {
    COLOR_SLOTS.forEach((slot) => {
      expect(theme.colors[slot]).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  it.each(THEMES)('$name 的正文层级对比度达标', (theme) => {
    const surface = theme.colors.dark;
    expect(contrastRatio(theme.colors.light, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.colors['gray-300'], surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.colors['gray-400'], surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.colors['gray-500'], surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(THEMES)('$name 的主色在卡片上足够醒目', (theme) => {
    expect(contrastRatio(theme.colors.primary, theme.colors.dark)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(theme.colors['green-400'], theme.colors.dark)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(theme.colors['yellow-400'], theme.colors.dark)).toBeGreaterThanOrEqual(3);
  });

  it.each(THEMES)('$name 的页面底与卡片底分得开', (theme) => {
    expect(theme.colors['gray-900']).not.toBe(theme.colors.dark);
    expect(contrastRatio(theme.colors['gray-700'], theme.colors.dark)).toBeGreaterThan(1.15);
  });
});

describe('颜色工具', () => {
  it('mix 的两端就是原色', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('支持三位 hex', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  });

  it('黑白对比度是 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 6);
  });

  it('纯黑品牌色在深色卡片上会被提亮到可读', () => {
    const fixed = ensureContrast('#000000', '#180f26', 3.2);
    expect(contrastRatio(fixed, '#180f26')).toBeGreaterThanOrEqual(3.2);
    expect(fixed).not.toBe('#000000');
  });

  it('已经够亮的颜色原样返回', () => {
    expect(ensureContrast('#ff2e88', '#180f26', 3.2)).toBe('#ff2e88');
  });
});

describe('主题应用与持久化', () => {
  it('未知 id 回落到默认主题', () => {
    expect(getTheme('does-not-exist').id).toBe(DEFAULT_THEME_ID);
    expect(readStoredThemeId()).toBe(DEFAULT_THEME_ID);
  });

  it('applyTheme 把每个色槽写成 rgb 三元组并记住选择', () => {
    const neon = getTheme('neon');
    applyTheme(neon);

    COLOR_SLOTS.forEach((slot) => {
      expect(document.documentElement.style.getPropertyValue(`--c-${slot}`)).toBe(
        hexToRgb(neon.colors[slot]).join(' ')
      );
    });
    expect(document.documentElement.dataset.theme).toBe('neon');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('neon');
    expect(readStoredThemeId()).toBe('neon');
  });

  it('海报渐变跨两个不同的色值', () => {
    const [from, to] = posterGradient(getTheme('sonar'));
    expect(from).not.toBe(to);
    expect(from).toMatch(/^#[0-9a-f]{6}$/);
  });
});
