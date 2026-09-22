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

export type ViewMode = 'annual' | 'monthly' | 'daily';
