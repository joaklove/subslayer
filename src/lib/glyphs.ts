import type { BrandCategory } from './brands';

/**
 * 分类兜底字形的原始形状，取自 lucide 0.378 的 iconNode。
 * DOM 侧仍用 lucide-react 组件渲染，海报侧用同一份数据描边，
 * 保证卡片上是调色板、海报上也是调色板，而不是退回一个首字母。
 * `__tests__/glyphs.test.tsx` 会把这份数据和 lucide 真实渲染结果逐条比对。
 */
export type GlyphShape =
  | { tag: 'path'; d: string }
  | { tag: 'circle'; cx: number; cy: number; r: number; filled?: boolean };

export const CATEGORY_GLYPHS: Record<BrandCategory, GlyphShape[]> = {
  video: [
    { tag: 'path', d: 'M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z' },
    { tag: 'path', d: 'm6.2 5.3 3.1 3.9' },
    { tag: 'path', d: 'm12.4 3.4 3.1 4' },
    { tag: 'path', d: 'M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' },
  ],
  music: [
    { tag: 'circle', cx: 8, cy: 18, r: 4 },
    { tag: 'path', d: 'M12 18V2l7 4' },
  ],
  cloud: [{ tag: 'path', d: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z' }],
  productivity: [
    { tag: 'path', d: 'M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4' },
    { tag: 'path', d: 'M2 6h4' },
    { tag: 'path', d: 'M2 10h4' },
    { tag: 'path', d: 'M2 14h4' },
    { tag: 'path', d: 'M2 18h4' },
    { tag: 'path', d: 'M18.4 2.6a2.17 2.17 0 0 1 3 3L16 11l-4 1 1-4Z' },
  ],
  design: [
    { tag: 'circle', cx: 13.5, cy: 6.5, r: 0.5, filled: true },
    { tag: 'circle', cx: 17.5, cy: 10.5, r: 0.5, filled: true },
    { tag: 'circle', cx: 8.5, cy: 7.5, r: 0.5, filled: true },
    { tag: 'circle', cx: 6.5, cy: 12.5, r: 0.5, filled: true },
    {
      tag: 'path',
      d: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z',
    },
  ],
  shopping: [
    { tag: 'path', d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z' },
    { tag: 'path', d: 'M3 6h18' },
    { tag: 'path', d: 'M16 10a4 4 0 0 1-8 0' },
  ],
  generic: [
    { tag: 'path', d: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z' },
    { tag: 'path', d: 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8' },
    { tag: 'path', d: 'M12 17.5v-11' },
  ],
};

/** lucide 的默认描边参数，海报要按同一套来才像同一个图标 */
export const GLYPH_VIEWBOX = 24;
export const GLYPH_STROKE_WIDTH = 2;