export interface PresetSubscription {
  name: string;
  amount: number;
  currency: 'CNY' | 'USD';
  billingCycle: 'monthly' | 'yearly';
  url?: string;
  icon: string;
}

export const presetSubscriptions: PresetSubscription[] = [
  {
    name: 'Netflix',
    amount: 89,
    currency: 'CNY',
    billingCycle: 'monthly',
    url: 'https://www.netflix.com/account/billing',
    icon: 'netflix',
  },
  {
    name: '爱奇艺',
    amount: 25,
    currency: 'CNY',
    billingCycle: 'monthly',
    url: 'https://vip.iqiyi.com/',
    icon: 'iqiyi',
  },
  {
    name: '腾讯视频',
    amount: 30,
    currency: 'CNY',
    billingCycle: 'monthly',
    url: 'https://v.qq.com/vip/myvip.html',
    icon: 'tencentvideo',
  },
  {
    name: '优酷',
    amount: 20,
    currency: 'CNY',
    billingCycle: 'monthly',
    url: 'https://vip.youku.com/',
    icon: 'youku',
  },
  {
    name: 'Spotify',
    amount: 15,
    currency: 'CNY',
    billingCycle: 'monthly',
    url: 'https://www.spotify.com/account/overview/',
    icon: 'spotify',
  },
  {
    name: 'Apple Music',
    amount: 10,
    currency: 'USD',
    billingCycle: 'monthly',
    url: 'https://account.apple.com/',
    icon: 'applemusic',
  },
  {
    name: 'iCloud+',
    amount: 6,
    currency: 'CNY',
    billingCycle: 'monthly',
    url: 'https://account.apple.com/',
    icon: 'icloud',
  },
  {
    name: '百度网盘',
    amount: 30,
    currency: 'CNY',
    billingCycle: 'monthly',
    url: 'https://pan.baidu.com/disk/main',
    icon: 'baidupan',
  },
  {
    name: 'Notion',
    amount: 8,
    currency: 'USD',
    billingCycle: 'monthly',
    url: 'https://www.notion.so/',
    icon: 'notion',
  },
  {
    name: 'Office 365',
    amount: 498,
    currency: 'CNY',
    billingCycle: 'yearly',
    url: 'https://account.microsoft.com/services/',
    icon: 'microsoft365',
  },
  {
    name: 'Adobe Creative Cloud',
    amount: 52.99,
    currency: 'USD',
    billingCycle: 'monthly',
    url: 'https://account.adobe.com/plans',
    icon: 'adobecreativecloud',
  },
  {
    name: '京东PLUS',
    amount: 148,
    currency: 'CNY',
    billingCycle: 'yearly',
    url: 'https://plus.jd.com/',
    icon: 'jd',
  },
];



