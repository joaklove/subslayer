import React from 'react';
import { useSubscription } from '../store/SubscriptionContext';
import SubscriptionCard from './SubscriptionCard';
import { List, PlusCircle } from 'lucide-react';

interface SubscriptionListProps {
  onAddClick: () => void;
}

const SubscriptionList: React.FC<SubscriptionListProps> = ({ onAddClick }) => {
  const { subscriptions } = useSubscription();

  if (subscriptions.length === 0) {
    return (
      <div className="bg-dark rounded-xl p-8 border border-gray-700 flex flex-col items-center justify-center text-center">
        <List size={48} className="text-gray-600 mb-4" />
        <h3 className="text-xl font-semibold text-light mb-2">还没有添加订阅</h3>
        <p className="text-gray-400 mb-6">添加你的第一个订阅，开始管理你的财务</p>
        <button
          onClick={onAddClick}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center"
        >
          <PlusCircle size={18} className="mr-2" />
          添加订阅
        </button>
      </div>
    );
  }

  return (
    <div className="bg-dark rounded-xl p-4 border border-gray-700">
      <h2 className="text-xl font-semibold text-light mb-4">订阅列表</h2>
      <div className="space-y-3">
        {subscriptions.map((subscription) => (
          <SubscriptionCard
            key={subscription.id}
            subscription={subscription}
          />
        ))}
      </div>
    </div>
  );
};

export default SubscriptionList;
