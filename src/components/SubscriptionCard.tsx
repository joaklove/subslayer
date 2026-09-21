import React, { useEffect, useRef, useState } from 'react';
import type { Subscription } from '../types';
import { useSubscription } from '../store/useSubscription';
import { Trash2, Calendar, ExternalLink, X, Swords, Skull, RotateCcw } from 'lucide-react';
import { calculateDaysUntilNextBilling, truncateText, USD_TO_CNY_RATE } from '../lib/utils';

interface SubscriptionCardProps {
  subscription: Subscription;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ subscription }) => {
  const { deleteSubscription, markAsCancelled, updateSubscription, showBattleReport } = useSubscription();
  const [showToast, setShowToast] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // 战利品一律折算成人民币，否则 $52.99/月 会被说成 ¥635
  const annualCostCNY =
    (subscription.currency === 'USD' ? subscription.amount * USD_TO_CNY_RATE : subscription.amount) *
    (subscription.billingCycle === 'monthly' ? 12 : 1);

  const daysUntilNextBilling = calculateDaysUntilNextBilling(subscription.nextBillingDate);

  const timersRef = useRef<number[]>([]);
  const later = (action: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      action();
    }, ms);
    timersRef.current.push(id);
  };
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  const handleDelete = () => {
    showBattleReport('止血成功！', `你刚刚从巨头手里夺回了 ¥${annualCostCNY.toFixed(2)}/年。`);
    deleteSubscription(subscription.id);
  };

  const handleKill = () => {
    showBattleReport('击杀成功！', `¥${annualCostCNY.toFixed(2)}/年 从此不再从你兜里流血。`);
    markAsCancelled(subscription.id);
  };

  const handleRevive = () => {
    updateSubscription(subscription.id, { status: 'active' });
  };

  const handleGoToCancel = () => {
    if (subscription.url) {
      window.open(subscription.url, '_blank');
      // 显示Toast提示
      setShowToast(true);
      later(() => setShowToast(false), 3000);
    } else {
      // 显示取消教程Dialog
      setShowCancelDialog(true);
    }
  };

  // 获取取消教程
  const getCancelTutorial = () => {
    // 这里可以根据订阅名称返回不同的取消教程
    // 例如微信、支付宝相关的订阅
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-light">取消自动续费教程</h4>
        <div className="space-y-2 text-gray-300">
          <p><strong>微信取消路径：</strong></p>
          <p className="ml-4">微信 → 我 → 服务 → 钱包 → 支付设置 → 自动续费</p>
          <p className="mt-3"><strong>支付宝取消路径：</strong></p>
          <p className="ml-4">支付宝 → 我的 → 设置 → 支付设置 → 免密支付/自动扣款</p>
          <p className="mt-3"><strong>注意：</strong></p>
          <p className="ml-4">找到对应的订阅服务，点击关闭自动续费即可。</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-dark rounded-lg p-4 border ${subscription.status === 'cancelled' ? 'border-gray-700 opacity-70' : 'border-gray-600'} mb-3 relative`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-light mb-2 truncate">{truncateText(subscription.name, 20)}</h3>
          <div className="flex items-center text-primary font-bold text-xl mb-2">
            {subscription.currency === 'USD' ? '$' : '¥'}{subscription.amount}
            <span className="text-gray-400 text-sm font-normal ml-2">
              /{subscription.billingCycle === 'monthly' ? '月' : '年'}
            </span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="text-gray-400 hover:text-primary transition-colors"
          title="删除订阅"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {subscription.status === 'active' ? (
        <div className="flex items-center text-gray-400 text-sm mb-4">
          <Calendar size={16} className="mr-2" />
          <span>
            距离下次扣款还有 {daysUntilNextBilling} 天
          </span>
        </div>
      ) : (
        <div className="flex items-center text-green-400 text-sm mb-4">
          <Skull size={16} className="mr-2" />
          <span>已停止流血，每年省下 ¥{annualCostCNY.toFixed(2)}</span>
        </div>
      )}

      <div className="flex space-x-2">
        {subscription.status === 'active' && (
          <>
            <button
              onClick={handleKill}
              className="flex-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center font-semibold"
            >
              <Swords size={16} className="mr-1" />
              干掉它
            </button>
            <button
              onClick={handleGoToCancel}
              className="px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              title="去官网管理自动续费"
            >
              <ExternalLink size={16} />
            </button>
          </>
        )}
        {subscription.status === 'cancelled' && (
          <>
            <div className="flex-1 px-3 py-2 bg-gray-800 text-green-400 rounded-lg border border-green-700 flex items-center justify-center">
              <Skull size={16} className="mr-1" />
              已击杀
            </div>
            <button
              onClick={handleRevive}
              className="px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              title="误杀了？让它复活"
            >
              <RotateCcw size={16} />
            </button>
          </>
        )}
      </div>

      {/* Toast 提示 */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 max-w-xs">
          <p className="text-sm">提示：跳转后请先登录。通常在'个人中心'或'续费管理'中可取消订阅。</p>
        </div>
      )}

      {/* 取消教程 Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark rounded-xl border border-gray-700 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-light flex items-center">
                  <ExternalLink size={20} className="mr-2 text-primary" />
                  取消订阅教程
                </h3>
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="text-gray-400 hover:text-light transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              {getCancelTutorial()}
              <div className="mt-6">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="w-full px-4 py-2 bg-secondary text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  我知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionCard;
