import React, { useState } from 'react';
import { useSubscription } from '../store/SubscriptionContext';
import { PlusCircle, X } from 'lucide-react';
import { presetSubscriptions } from '../lib/constants';
import { validateAmount } from '../lib/utils';

interface AddSubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddSubscriptionDialog: React.FC<AddSubscriptionDialogProps> = ({ isOpen, onClose }) => {
  const { addSubscription } = useSubscription();
  
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'CNY' | 'USD'>('CNY');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(new Date().getDate());
  const [monthOfYear, setMonthOfYear] = useState<number>(new Date().getMonth() + 1);
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
    url?: string;
  }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 重置错误信息
    setErrors({});
    
    // 验证表单
    const newErrors: {
      name?: string;
      amount?: string;
      url?: string;
    } = {};
    
    if (!name.trim()) {
      newErrors.name = '请输入服务名称';
    }
    
    if (!amount) {
      newErrors.amount = '请输入金额';
    } else if (!validateAmount(amount)) {
      newErrors.amount = '请输入有效的金额';
    }
    
    if (url && !url.startsWith('http')) {
      newErrors.url = '请输入以 http 开头的有效链接';
    }
    
    // 如果有错误，显示错误信息
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    addSubscription({
      name,
      amount: parseFloat(amount),
      currency,
      billingCycle,
      status: 'active',
      url: url || undefined,
      dayOfMonth,
      monthOfYear: billingCycle === 'yearly' ? monthOfYear : undefined,
    });

    // 重置表单
    setName('');
    setAmount('');
    setCurrency('CNY');
    setBillingCycle('monthly');
    setDayOfMonth(new Date().getDate());
    setMonthOfYear(new Date().getMonth() + 1);
    setUrl('');
    setErrors({});

    onClose();
  };

  const handlePresetSelect = (preset: typeof presetSubscriptions[0]) => {
    setName(preset.name);
    setAmount(preset.amount.toString());
    setCurrency(preset.currency);
    setBillingCycle(preset.billingCycle);
    setUrl(preset.url || '');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark rounded-xl border border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-light flex items-center">
              <PlusCircle size={20} className="mr-2 text-primary" />
              添加订阅
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-light transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mb-6 space-y-4">
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">服务名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) {
                    setErrors({ ...errors, name: undefined });
                  }
                }}
                className={`w-full bg-gray-800 rounded-lg px-4 py-2 text-light focus:outline-none focus:ring-2 focus:ring-primary ${errors.name ? 'border border-red-500' : 'border border-gray-700'}`}
                placeholder="例如：Netflix"
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-300 mb-2">金额</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    {currency === 'USD' ? '$' : '¥'}
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      let value = e.target.value;
                      // 处理小数点输入
                      if (value === '.') {
                        value = '0.';
                      }
                      setAmount(value);
                      if (errors.amount) {
                        setErrors({ ...errors, amount: undefined });
                      }
                    }}
                    className={`w-full bg-gray-800 rounded-lg px-4 py-2 text-light focus:outline-none focus:ring-2 focus:ring-primary pl-8 ${errors.amount ? 'border border-red-500' : 'border border-gray-700'}`}
                    placeholder="0"
                    step="0.01"
                    min="0"
                  />
                </div>
                {errors.amount && (
                  <p className="text-red-400 text-xs mt-1">{errors.amount}</p>
                )}
              </div>
              <div>
                <label className="block text-gray-300 mb-2">货币</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'CNY' | 'USD')}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-light focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="CNY">人民币 (¥)</option>
                  <option value="USD">美元 ($)</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">计费周期</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'yearly')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-light focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="monthly">每月</option>
                <option value="yearly">每年</option>
              </select>
            </div>

            {/* 扣款日期选择 */}
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">扣款日期</label>
              {billingCycle === 'monthly' ? (
                <div>
                  <label className="block text-gray-400 mb-1 text-sm">每月扣款日 (1-31)</label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-light focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day} 号
                      </option>
                    ))}
                  </select>
                  <p className="text-gray-500 text-xs mt-1">
                    若选择 31 号，2 月会自动处理为最后一天
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 mb-1 text-sm">月份</label>
                    <select
                      value={monthOfYear}
                      onChange={(e) => setMonthOfYear(parseInt(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-light focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <option key={month} value={month}>
                          {month} 月
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1 text-sm">日期</label>
                    <select
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-light focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          {day} 号
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 mb-2">管理链接 (可选)</label>
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (errors.url) {
                    setErrors({ ...errors, url: undefined });
                  }
                }}
                className={`w-full bg-gray-800 rounded-lg px-4 py-2 text-light focus:outline-none focus:ring-2 focus:ring-primary ${errors.url ? 'border border-red-500' : 'border border-gray-700'}`}
                placeholder="例如：https://www.netflix.com/account"
              />
              {errors.url && (
                <p className="text-red-400 text-xs mt-1">{errors.url}</p>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                添加
              </button>
            </div>
          </form>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-light mb-4">常用订阅</h3>
            <div className="grid grid-cols-4 md:grid-cols-4 sm:grid-cols-3 gap-3">
              {presetSubscriptions.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset)}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-3 hover:bg-gray-700 transition-colors flex flex-col items-center text-center"
                >
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mb-2">
                    <span className="text-light font-bold">{preset.name.charAt(0)}</span>
                  </div>
                  <span className="text-sm text-gray-300 truncate w-full">{preset.name}</span>
                  <span className="text-xs text-primary">
                    {preset.currency === 'USD' ? '$' : '¥'}{preset.amount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSubscriptionDialog;
