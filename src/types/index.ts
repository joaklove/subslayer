export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: 'CNY' | 'USD';
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'cancelled';
  nextBillingDate: string;
  url?: string;
  icon?: string;
  createdAt: string;
}

export interface SubscriptionStore {
  subscriptions: Subscription[];
  addSubscription: (subscription: Omit<Subscription, 'id' | 'createdAt' | 'nextBillingDate'>) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  markAsCancelled: (id: string) => void;
  totalAnnualCost: number;
  totalMonthlyCost: number;
  totalDailyCost: number;
  totalSaved: number;
}

export type ViewMode = 'annual' | 'monthly' | 'daily';
