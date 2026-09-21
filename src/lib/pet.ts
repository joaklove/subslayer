export type PetMood =
  | 'asleep'
  | 'content'
  | 'peckish'
  | 'starving'
  | 'fainting'
  | 'panicking'
  | 'radiant';

export interface PetState {
  mood: PetMood;
  bubble: string;
  /** 0-100，驱动透明度/饱和度，越低越蔫 */
  vitality: number;
  /** 飘出的粒子 emoji，空数组表示无 */
  particles: string[];
  /** 呼吸动画周期（秒），越饿越快越喘 */
  breathSeconds: number;
  /** 身体倾斜角度，表现耷拉感 */
  tilt: number;
}

export interface PetInput {
  activeCount: number;
  totalCount: number;
  monthlyCost: number;
  savedAnnual: number;
  nextBilling: { name: string; days: number; amountCNY: number } | null;
}

/** 月均支出（CNY）分档：宠物饥饿程度完全由真实花费推导 */
export const MONTHLY_TIERS: { below: number; mood: PetMood }[] = [
  { below: 50, mood: 'content' },
  { below: 150, mood: 'peckish' },
  { below: 400, mood: 'starving' },
  { below: Infinity, mood: 'fainting' },
];

/** 扣费预警窗口（天） */
export const BILLING_ALERT_DAYS = 3;

const TIER_ORDER: PetMood[] = ['content', 'peckish', 'starving', 'fainting'];

const money = (n: number) => n.toFixed(n >= 100 ? 0 : 1);

const tierFor = (monthlyCost: number): PetMood => {
  const tier = MONTHLY_TIERS.find((t) => monthlyCost < t.below);
  return tier ? tier.mood : 'fainting';
};

export const derivePet = ({
  activeCount,
  totalCount,
  monthlyCost,
  savedAnnual,
  nextBilling,
}: PetInput): PetState => {
  const annualCost = monthlyCost * 12;

  let mood: PetMood;
  if (activeCount === 0) {
    mood = 'asleep';
  } else if (nextBilling && nextBilling.days <= BILLING_ALERT_DAYS) {
    mood = 'panicking';
  } else if (savedAnnual >= annualCost && savedAnnual > 0) {
    mood = 'radiant';
  } else {
    const base = tierFor(monthlyCost);
    // 砍掉过订阅就回血一档，让"止血"这个动作有正反馈
    mood = savedAnnual > 0 ? TIER_ORDER[Math.max(0, TIER_ORDER.indexOf(base) - 1)] : base;
  }

  let vitality = Math.max(6, Math.min(100, 100 - monthlyCost / 6));
  if (savedAnnual > 0) vitality = Math.min(100, vitality + 12);
  if (mood === 'asleep') vitality = 100;

  const bubbleByMood: Record<PetMood, string> = {
    asleep:
      totalCount === 0
        ? '还没有订阅，我先睡了。加一条来叫醒我。'
        : `${totalCount} 个全被干掉了，我睡个安稳觉。`,
    content: `月均 ¥${money(monthlyCost)}，我还吃得饱。`,
    peckish: `月均 ¥${money(monthlyCost)}，我开始掉毛了。`,
    starving: `月均 ¥${money(monthlyCost)}，把我饿成存钱罐了。`,
    fainting: `月均 ¥${money(monthlyCost)}，我快被吸干了…去看看谁在吸血。`,
    panicking: nextBilling
      ? `${nextBilling.name} 还有 ${nextBilling.days} 天扣 ¥${money(nextBilling.amountCNY)}，我慌了。`
      : '快到扣费日了，我慌了。',
    radiant: `你已经砍掉 ¥${money(savedAnnual)}/年，够我回血了！`,
  };

  const particlesByMood: Record<PetMood, string[]> = {
    asleep: ['💤'],
    content: [],
    peckish: ['💸'],
    starving: ['💸', '💸'],
    fainting: ['💸', '💸', '💫'],
    panicking: ['❗'],
    radiant: ['✨', '✨'],
  };

  const droop = 100 - vitality;

  return {
    mood,
    bubble: bubbleByMood[mood],
    vitality,
    particles: particlesByMood[mood],
    breathSeconds: mood === 'asleep' ? 4.6 : 3.4 - (droop / 100) * 2.2,
    tilt: mood === 'asleep' ? 0 : droop / 12,
  };
};
