import React, { useMemo } from 'react';
import { useSubscription } from '../store/SubscriptionContext';
import { calculateDaysUntilNextBilling, USD_TO_CNY_RATE } from '../lib/utils';
import { derivePet } from '../lib/pet';
import type { PetMood } from '../lib/pet';

const MOOD_LABEL: Record<PetMood, string> = {
  asleep: '沉睡中',
  content: '吃饱了',
  peckish: '有点饿',
  starving: '饿瘦了',
  fainting: '快饿晕',
  panicking: '扣费预警',
  radiant: '回血中',
};

const MOOD_CHIP: Record<PetMood, string> = {
  asleep: 'bg-gray-700 border-gray-500',
  content: 'bg-green-800 border-green-500',
  peckish: 'bg-yellow-800 border-yellow-500',
  starving: 'bg-orange-800 border-orange-500',
  fainting: 'bg-red-900 border-red-600',
  panicking: 'bg-red-800 border-red-500',
  radiant: 'bg-blue-800 border-blue-500',
};

const WalletPet: React.FC = () => {
  const { subscriptions, totalMonthlyCost, totalSaved } = useSubscription();

  const pet = useMemo(() => {
    const active = subscriptions.filter((sub) => sub.status === 'active');

    const nextBilling = active.reduce<{ name: string; days: number; amountCNY: number } | null>(
      (soonest, sub) => {
        const days = Math.max(0, calculateDaysUntilNextBilling(sub.nextBillingDate));
        if (soonest && soonest.days <= days) return soonest;
        const amountCNY =
          sub.currency === 'USD' ? sub.amount * USD_TO_CNY_RATE : sub.amount;
        return { name: sub.name, days, amountCNY };
      },
      null
    );

    return derivePet({
      activeCount: active.length,
      monthlyCost: totalMonthlyCost,
      savedAnnual: totalSaved,
      nextBilling,
    });
  }, [subscriptions, totalMonthlyCost, totalSaved]);

  const saturation = 0.35 + (pet.vitality / 100) * 0.65;

  return (
    <div className="bg-dark rounded-xl p-5 mb-6 border border-gray-700 flex items-center gap-5">
      <div className="relative shrink-0 w-16 h-16 flex items-center justify-center">
        {pet.particles.map((glyph, index) => (
          <span
            key={`${glyph}-${index}`}
            className="pet-particle absolute top-0 left-1/2 text-base"
            style={{ animationDelay: `${index * 0.7}s` }}
          >
            {glyph}
          </span>
        ))}
        <span
          className="inline-block"
          style={{
            transform: `rotate(${pet.tilt}deg)`,
            filter: `saturate(${saturation})`,
          }}
        >
          <span
            className="pet-body text-4xl inline-block"
            style={{ animationDuration: `${pet.breathSeconds}s` }}
          >
            🐷
          </span>
        </span>
        <span className="pet-shadow absolute bottom-0 left-1/2" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-light">钱包小猪</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs border ${MOOD_CHIP[pet.mood]}`}
          >
            {MOOD_LABEL[pet.mood]}
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-2 leading-relaxed">{pet.bubble}</p>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pet.vitality}%`,
              backgroundColor: pet.vitality > 60 ? '#22c55e' : pet.vitality > 30 ? '#eab308' : '#ef4444',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default WalletPet;
