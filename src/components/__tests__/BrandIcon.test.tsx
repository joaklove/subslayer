import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BrandIcon from '../BrandIcon';
import { resolveBrand } from '../../lib/brands';
import {
  contrastRatio,
  DEFAULT_THEME_ID,
  ensureContrast,
  getTheme,
  THEME_STORAGE_KEY,
} from '../../lib/themes';
import { renderWithProviders } from '../../test/render';

const surface = getTheme(DEFAULT_THEME_ID).colors.dark;

describe('simple-icons 收录的品牌', () => {
  it('画出真实的 24×24 路径，而不是首字母', () => {
    renderWithProviders(<BrandIcon slug="netflix" name="Netflix" />);
    const svg = screen.getByRole('img', { name: 'Netflix' });
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.querySelector('path')?.getAttribute('d')).toBe(resolveBrand('netflix').path);
    // Netflix 官方红在石板底上略暗，会被提亮到 3.2:1，色相不变
    const fill = svg.getAttribute('fill') ?? '';
    expect(fill).toBe(ensureContrast('#e50914', surface, 3.2));
    expect(contrastRatio(fill, surface)).toBeGreaterThanOrEqual(3.2);
  });

  it('外框用品牌色的半透明底，尺寸可控', () => {
    renderWithProviders(<BrandIcon slug="spotify" name="Spotify" size={56} />);
    const tile = screen.getByTitle('Spotify');
    expect(tile.style.width).toBe('56px');
    expect(tile.style.height).toBe('56px');
    expect(tile.style.backgroundColor).toBe('rgba(30, 215, 96, 0.14)');
    expect(tile.style.borderColor).toBe('rgba(30, 215, 96, 0.4)');
  });

  it('Notion 的纯黑被提亮到在深色卡片上看得见', () => {
    renderWithProviders(<BrandIcon slug="notion" name="Notion" />);
    const fill = screen.getByRole('img', { name: 'Notion' }).getAttribute('fill') ?? '';
    expect(fill).not.toBe('#000000');
    expect(contrastRatio(fill, surface)).toBeGreaterThanOrEqual(3.2);
  });
});

describe('已下架的品牌用分类字形兜底', () => {
  it.each([
    ['iqiyi', '爱奇艺', 'clapperboard'],
    ['baidupan', '百度网盘', 'cloud'],
    ['jd', '京东PLUS', 'shopping-bag'],
    ['microsoft365', 'Office 365', 'notebook-pen'],
    ['adobecreativecloud', 'Adobe Creative Cloud', 'palette'],
  ])('%s 渲染 %s 分类图标，保留官方色', (slug, title, glyph) => {
    const { container } = renderWithProviders(<BrandIcon slug={slug} />);
    const tile = screen.getByTitle(title);
    expect(tile.dataset.brand).toBe(title);
    expect(container.querySelector(`.lucide-${glyph}`)).not.toBeNull();
    expect(tile.style.borderColor).toContain('rgba(');
  });

  it('完全陌生的服务用通用收据图标，标题就是用户输入的名字', () => {
    const { container } = renderWithProviders(<BrandIcon name="我家楼下的健身房" />);
    expect(screen.getByTitle('我家楼下的健身房').dataset.brand).toBe('我家楼下的健身房');
    expect(container.querySelector('.lucide-receipt')).not.toBeNull();
  });

  it('只给名字时也能认出品牌', () => {
    renderWithProviders(<BrandIcon name="Netflix 家庭版" />);
    expect(screen.getByRole('img', { name: 'Netflix' })).toBeInTheDocument();
  });
});

describe('状态与主题', () => {
  it('已击杀的图标置灰但仍可辨认', () => {
    renderWithProviders(<BrandIcon slug="netflix" dimmed />);
    expect(screen.getByTitle('Netflix').style.filter).toBe('grayscale(0.85) opacity(0.65)');
  });

  it('活跃图标不加滤镜', () => {
    renderWithProviders(<BrandIcon slug="netflix" />);
    expect(screen.getByTitle('Netflix').style.filter).toBe('none');
  });

  it('换主题后重新计算品牌色对比度', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    renderWithProviders(<BrandIcon slug="notion" name="Notion" />);
    const fill = screen.getByRole('img', { name: 'Notion' }).getAttribute('fill') ?? '';
    expect(contrastRatio(fill, getTheme('neon').colors.dark)).toBeGreaterThanOrEqual(3.2);
  });
});