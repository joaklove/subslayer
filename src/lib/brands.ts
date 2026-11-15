import {
  siApplemusic,
  siIcloud,
  siNetflix,
  siNotion,
  siSpotify,
} from 'simple-icons';
import { presetSubscriptions } from './constants';

export type BrandCategory =
  | 'video'
  | 'music'
  | 'cloud'
  | 'productivity'
  | 'design'
  | 'shopping'
  | 'generic';

export interface BrandMark {
  /** simple-icons 的 24×24 路径，缺失时为 null，由分类图标兜底 */
  path: string | null;
  /** 品牌主色，用于图标与描边 */
  color: string;
  category: BrandCategory;
  title: string;
}

/**
 * simple-icons 16.7 已经下架了爱奇艺 / 腾讯视频 / 优酷 / 百度网盘 / 微软 / Adobe / 京东，
 * 这些品牌保留官方主色 + 分类字形兜底，而不是退回一个灰色首字母。
 */
const FALLBACKS: Record<string, { color: string; category: BrandCategory; title: string }> = {
  iqiyi: { color: '#00be06', category: 'video', title: '爱奇艺' },
  tencentvideo: { color: '#ff6a00', category: 'video', title: '腾讯视频' },
  youku: { color: '#1ebeff', category: 'video', title: '优酷' },
  baidupan: { color: '#2932e1', category: 'cloud', title: '百度网盘' },
  microsoft365: { color: '#d83b01', category: 'productivity', title: 'Office 365' },
  adobecreativecloud: { color: '#da1f26', category: 'design', title: 'Adobe Creative Cloud' },
  jd: { color: '#e1251b', category: 'shopping', title: '京东PLUS' },
};

const SIMPLE: Record<string, { path: string; hex: string; title: string; category: BrandCategory }> = {
  netflix: { ...siNetflix, category: 'video' },
  spotify: { ...siSpotify, category: 'music' },
  applemusic: { ...siApplemusic, category: 'music' },
  icloud: { ...siIcloud, category: 'cloud' },
  notion: { ...siNotion, category: 'productivity' },
};

const GENERIC: BrandMark = {
  path: null,
  color: '#8b95a5',
  category: 'generic',
  title: '自定义订阅',
};

/** "京东 Plus" / "Apple iCloud" / "iCloud+" 指的是同一个品牌，比对前先抹掉空格与标点 */
const normalize = (value: string) => value.toLowerCase().replace(/[\s+\-_.·()（）]/g, '');

/** 手动输入的订阅名也尽量认出品牌：先精确匹配预设，再退化为包含匹配 */
export const slugFromName = (name: string): string | undefined => {
  const needle = normalize(name);
  if (!needle) {
    return undefined;
  }
  const exact = presetSubscriptions.find((preset) => normalize(preset.name) === needle);
  if (exact) {
    return exact.icon;
  }
  const partial = presetSubscriptions.find((preset) => {
    const target = normalize(preset.name);
    // 反向包含只在名字够长时才认，否则一个 "a" 就能撞上 Apple Music
    return needle.includes(target) || (needle.length >= 2 && target.includes(needle));
  });
  return partial?.icon;
};

export const resolveBrand = (slug?: string, name?: string): BrandMark => {
  const key = (slug ?? (name ? slugFromName(name) : undefined))?.toLowerCase();
  if (!key) {
    return name ? { ...GENERIC, title: name } : GENERIC;
  }

  const simple = SIMPLE[key];
  if (simple) {
    return {
      path: simple.path,
      // simple-icons 给的是大写 hex，统一成小写，免得同一个色值出现两种写法
      color: `#${simple.hex.toLowerCase()}`,
      category: simple.category,
      title: simple.title,
    };
  }

  const fallback = FALLBACKS[key];
  if (fallback) {
    return { path: null, ...fallback };
  }

  return name ? { ...GENERIC, title: name } : GENERIC;
};

/** 海报上直接画品牌路径用的原始数据 */
export const brandPath = (slug?: string, name?: string) => resolveBrand(slug, name).path;
