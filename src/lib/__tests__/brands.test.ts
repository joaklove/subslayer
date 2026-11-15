import { describe, expect, it } from 'vitest';
import { brandPath, resolveBrand, slugFromName } from '../brands';
import { presetSubscriptions } from '../constants';

describe('从名字认品牌', () => {
  it('精确匹配预设，忽略大小写与首尾空格', () => {
    expect(slugFromName('Netflix')).toBe('netflix');
    expect(slugFromName('  NETFLIX  ')).toBe('netflix');
    expect(slugFromName('爱奇艺')).toBe('iqiyi');
  });

  it('包含关系也能认出来，用户常写「Netflix 家庭版」', () => {
    expect(slugFromName('Netflix 家庭版')).toBe('netflix');
    expect(slugFromName('京东PLUS 年卡')).toBe('jd');
  });

  it('空格和标点不算差异，旧数据里的「京东 Plus」「Apple iCloud」照样认得', () => {
    expect(slugFromName('京东 Plus')).toBe('jd');
    expect(slugFromName('Apple iCloud')).toBe('icloud');
    expect(slugFromName('iCloud')).toBe('icloud');
    expect(slugFromName('Office-365')).toBe('microsoft365');
    expect(slugFromName('腾讯 视频')).toBe('tencentvideo');
  });

  it('单个字符不反向撞库，免得一个「a」就认成 Apple Music', () => {
    expect(slugFromName('a')).toBeUndefined();
    expect(slugFromName('云')).toBeUndefined();
  });

  it('空名字和陌生服务返回 undefined，交给分类兜底', () => {
    expect(slugFromName('')).toBeUndefined();
    expect(slugFromName('   ')).toBeUndefined();
    expect(slugFromName('我家楼下的健身房')).toBeUndefined();
  });
});

describe('simple-icons 收录的品牌', () => {
  it('Netflix 拿到真实路径与官方红', () => {
    const brand = resolveBrand('netflix');
    expect(brand.title).toBe('Netflix');
    expect(brand.color).toBe('#e50914');
    expect(brand.category).toBe('video');
    expect(brand.path).toMatch(/^m/i);
  });

  it('slug 大小写不敏感', () => {
    expect(resolveBrand('NETFLIX').path).toBe(resolveBrand('netflix').path);
  });

  it('音乐 / 云盘 / 效率工具分类正确', () => {
    expect(resolveBrand('spotify').category).toBe('music');
    expect(resolveBrand('applemusic').category).toBe('music');
    expect(resolveBrand('icloud').category).toBe('cloud');
    expect(resolveBrand('notion').category).toBe('productivity');
  });

  it('Notion 的官方色是纯黑，原样保留由渲染层提亮', () => {
    expect(resolveBrand('notion').color).toBe('#000000');
  });
});

describe('simple-icons 16.7 已下架的品牌走兜底', () => {
  it.each([
    ['iqiyi', '爱奇艺', '#00be06', 'video'],
    ['tencentvideo', '腾讯视频', '#ff6a00', 'video'],
    ['youku', '优酷', '#1ebeff', 'video'],
    ['baidupan', '百度网盘', '#2932e1', 'cloud'],
    ['microsoft365', 'Office 365', '#d83b01', 'productivity'],
    ['adobecreativecloud', 'Adobe Creative Cloud', '#da1f26', 'design'],
    ['jd', '京东PLUS', '#e1251b', 'shopping'],
  ])('%s 保留官方色和分类，没有路径', (slug, title, color, category) => {
    const brand = resolveBrand(slug);
    expect(brand.path).toBeNull();
    expect(brand.title).toBe(title);
    expect(brand.color).toBe(color);
    expect(brand.category).toBe(category);
  });
});

describe('未知品牌的兜底', () => {
  it('有名字时用名字当标题，分类是 generic', () => {
    const brand = resolveBrand(undefined, '我家楼下的健身房');
    expect(brand.title).toBe('我家楼下的健身房');
    expect(brand.category).toBe('generic');
    expect(brand.path).toBeNull();
  });

  it('什么线索都没有时给通用标题', () => {
    expect(resolveBrand().title).toBe('自定义订阅');
  });

  it('不认识的 slug 也不会抛错', () => {
    expect(resolveBrand('this-brand-does-not-exist').category).toBe('generic');
  });

  it('没有 slug 时回退到名字匹配', () => {
    expect(resolveBrand(undefined, '爱奇艺').color).toBe('#00be06');
  });
});

describe('12 条预设全部有可渲染的品牌标', () => {
  it.each(presetSubscriptions)('$name 不是灰色首字母兜底', (preset) => {
    const brand = resolveBrand(preset.icon, preset.name);
    expect(brand.category).not.toBe('generic');
    expect(brand.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(brand.title.length).toBeGreaterThan(0);
  });

  it('每条预设的 icon slug 都能被名字反查出来', () => {
    presetSubscriptions.forEach((preset) => {
      expect(slugFromName(preset.name)).toBe(preset.icon);
    });
  });
});

describe('海报用的原始路径', () => {
  it('收录品牌给路径，下架品牌给 null', () => {
    expect(brandPath('netflix')).toBeTruthy();
    expect(brandPath('iqiyi')).toBeNull();
    expect(brandPath(undefined, 'Spotify')).toBeTruthy();
  });
});