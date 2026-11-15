import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import {
  Clapperboard,
  Cloud,
  Music2,
  NotebookPen,
  Palette,
  Receipt,
  ShoppingBag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CATEGORY_GLYPHS, GLYPH_STROKE_WIDTH, GLYPH_VIEWBOX } from '../glyphs';
import type { BrandCategory } from '../brands';

const LUCIDE: Record<BrandCategory, LucideIcon> = {
  video: Clapperboard,
  music: Music2,
  cloud: Cloud,
  productivity: NotebookPen,
  design: Palette,
  shopping: ShoppingBag,
  generic: Receipt,
};

/** 把 lucide 真实渲染出来的形状读回成同一套结构，用来跟海报用的数据对账 */
const renderedShapes = (category: BrandCategory) => {
  const Glyph = LUCIDE[category];
  const { container, unmount } = render(<Glyph />);
  const shapes = [...container.querySelectorAll('svg > *')].map((node) => {
    if (node.tagName.toLowerCase() === 'circle') {
      return {
        tag: 'circle' as const,
        cx: Number(node.getAttribute('cx')),
        cy: Number(node.getAttribute('cy')),
        r: Number(node.getAttribute('r')),
        filled: node.getAttribute('fill') === 'currentColor',
      };
    }
    return { tag: 'path' as const, d: node.getAttribute('d') ?? '' };
  });
  unmount();
  return shapes;
};

describe('分类字形与 lucide 保持一致', () => {
  it.each(Object.keys(CATEGORY_GLYPHS) as BrandCategory[])(
    '%s 的形状逐条对得上 lucide 渲染结果',
    (category) => {
      const actual = renderedShapes(category);
      const expected = CATEGORY_GLYPHS[category].map((shape) =>
        shape.tag === 'circle' ? { ...shape, filled: shape.filled ?? false } : shape
      );
      expect(actual).toEqual(expected);
    }
  );

  it('沿用 lucide 的 24 视窗与 2 描边，海报缩放后才是同一个图标', () => {
    const Glyph = LUCIDE.video;
    const { container } = render(<Glyph />);
    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${GLYPH_VIEWBOX} ${GLYPH_VIEWBOX}`);
    expect(Number(svg.getAttribute('stroke-width'))).toBe(GLYPH_STROKE_WIDTH);
    expect(svg.getAttribute('stroke-linecap')).toBe('round');
    expect(svg.getAttribute('stroke-linejoin')).toBe('round');
  });

  it('七个分类一个都不缺，兜底不会画空白', () => {
    expect(Object.keys(CATEGORY_GLYPHS)).toHaveLength(7);
    Object.values(CATEGORY_GLYPHS).forEach((shapes) => {
      expect(shapes.length).toBeGreaterThan(0);
    });
  });
});