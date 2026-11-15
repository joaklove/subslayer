import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ThemePicker from '../ThemePicker';
import { COLOR_SLOTS, getTheme, hexToRgb, THEMES, THEME_STORAGE_KEY } from '../../lib/themes';
import { renderWithProviders } from '../../test/render';

const buttonFor = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

describe('配色候选常驻在页面上', () => {
  it('四套方案同时可见，各自标出现行 / 备选', () => {
    renderWithProviders(<ThemePicker />);
    expect(screen.getByRole('region', { name: '配色方案' })).toBeInTheDocument();
    THEMES.forEach((theme) => {
      expect(buttonFor(theme.name)).toBeInTheDocument();
    });
    expect(buttonFor('石板红')).toHaveTextContent('现行');
    expect(buttonFor('熔金账本')).toHaveTextContent('备选');
    expect(buttonFor('深海声呐')).toHaveTextContent('备选');
    expect(buttonFor('霓虹屠宰场')).toHaveTextContent('备选');
  });

  it('每个按钮用自己的色板预览，而不是当前主题', () => {
    renderWithProviders(<ThemePicker />);
    THEMES.forEach((theme) => {
      const button = buttonFor(theme.name);
      // jsdom 会把内联颜色规范化成 rgb()
      expect(button.style.backgroundColor).toBe(`rgb(${hexToRgb(theme.colors.dark).join(', ')})`);
      const dots = button.querySelectorAll('span.w-3');
      expect(dots).toHaveLength(3);
      expect(Array.from(dots).map((dot) => (dot as HTMLElement).style.backgroundColor)).toEqual(
        [theme.primary, theme.secondary, theme.success].map(
          (color) => `rgb(${hexToRgb(color).join(', ')})`
        )
      );
    });
  });

  it('默认选中石板红，并展示它的说明', () => {
    renderWithProviders(<ThemePicker />);
    expect(buttonFor('石板红')).toHaveAttribute('aria-pressed', 'true');
    expect(buttonFor('霓虹屠宰场')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(getTheme('slate').tagline)).toBeInTheDocument();
  });
});

describe('点击即时全站生效', () => {
  it('切到霓虹后 CSS 变量、data-theme、说明文字同步更新', () => {
    renderWithProviders(<ThemePicker />);
    fireEvent.click(buttonFor('霓虹屠宰场'));

    const neon = getTheme('neon');
    expect(document.documentElement.dataset.theme).toBe('neon');
    COLOR_SLOTS.forEach((slot) => {
      expect(document.documentElement.style.getPropertyValue(`--c-${slot}`)).toBe(
        hexToRgb(neon.colors[slot]).join(' ')
      );
    });
    expect(buttonFor('霓虹屠宰场')).toHaveAttribute('aria-pressed', 'true');
    expect(buttonFor('石板红')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(neon.tagline)).toBeInTheDocument();
  });

  it('选择写进本机，重新挂载后仍是它', () => {
    const first = renderWithProviders(<ThemePicker />);
    fireEvent.click(buttonFor('深海声呐'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('sonar');
    first.unmount();

    renderWithProviders(<ThemePicker />);
    expect(buttonFor('深海声呐')).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('sonar');
  });

  it('连续来回切换不会留下上一套主题的色值', () => {
    renderWithProviders(<ThemePicker />);
    ['熔金账本', '深海声呐', '石板红', '霓虹屠宰场'].forEach((name) => {
      fireEvent.click(buttonFor(name));
    });

    const neon = getTheme('neon');
    COLOR_SLOTS.forEach((slot) => {
      expect(document.documentElement.style.getPropertyValue(`--c-${slot}`)).toBe(
        hexToRgb(neon.colors[slot]).join(' ')
      );
    });
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1);
  });
});