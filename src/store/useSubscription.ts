import { createContext, useContext } from 'react';
import type { Subscription } from '../types';

export interface BattleReport {
  title: string;
  message: string;
}

export interface SubscriptionContextType {
  subscriptions: Subscription[];
  addSubscription: (subscription: Omit<Subscription, 'id' | 'createdAt' | 'nextBillingDate'> & {
    dayOfMonth?: number;
    monthOfYear?: number;
  }) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  markAsCancelled: (id: string) => void;
  totalAnnualCost: number;
  totalMonthlyCost: number;
  totalDailyCost: number;
  totalSaved: number;
  battleReport: BattleReport | null;
  showBattleReport: (title: string, message: string) => void;
  dismissBattleReport: () => void;
}

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
