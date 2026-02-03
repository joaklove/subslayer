import React, { useState, useEffect } from 'react';
import { useSubscription } from '../store/SubscriptionContext';
import type { ViewMode } from '../types';
import { formatNumber, getRealityComparison } from '../lib/utils';

const DashboardHeader: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('annual');
  const [animatedCost, setAnimatedCost] = useState<number>(0);
  const [todayLost, setTodayLost] = useState<number>(0);
  const [realityComparison, setRealityComparison] = useState<string>('');
  const { totalAnnualCost, totalMonthlyCost, totalDailyCost, totalSaved } = useSubscription();

  // 获取会员称号和等级评价
  const getMemberTitle = (annualAmount: number, savedAmount: number) => {
    let title = '';
    let levelColor = '';
    let hasMedal = savedAmount > 0;

    if (annualAmount >= 10000) {
      title = '顶级大冤种';
      levelColor = 'bg-purple-900 border-purple-600';
    } else if (annualAmount >= 5000) {
      title = '巨头合伙人';
      levelColor = 'bg-indigo-800 border-indigo-500';
    } else if (annualAmount >= 2000) {
      title = '资深韭菜';
      levelColor = 'bg-green-800 border-green-500';
    } else if (annualAmount >= 500) {
      title = '初级玩家';
      levelColor = 'bg-blue-800 border-blue-500';
    } else {
      title = '守财专家';
      levelColor = 'bg-yellow-800 border-yellow-500';
    }

    return {
      title,
      levelColor,
      hasMedal
    };
  };

  // 计算大冤种指数
  const calculate冤种指数 = () => {
    const maxPossible = 10000; // 假设10000元为满分
    const index = Math.min(Math.round((totalAnnualCost / maxPossible) * 100), 100);
    return index;
  };

  const getCost = () => {
    switch (viewMode) {
      case 'monthly':
        return totalMonthlyCost;
      case 'daily':
        return totalDailyCost;
      case 'annual':
      default:
        return totalAnnualCost;
    }
  };

  const getLabel = () => {
    switch (viewMode) {
      case 'monthly':
        return '每月';
      case 'daily':
        return '每天';
      case 'annual':
      default:
        return '每年';
    }
  };

  const getSubtitle = () => {
    switch (viewMode) {
      case 'monthly':
        return '你只要躺着不动，每月就要蒸发';
      case 'daily':
        return '你只要躺着不动，每天就要蒸发';
      case 'annual':
      default:
        return '你只要躺着不动，每年就要蒸发';
    }
  };

  // 计算每秒流失金额
  const getPerSecondLoss = () => {
    return totalAnnualCost / (365 * 24 * 60 * 60);
  };

  // 计算今日已流失金额
  const calculateTodayLost = () => {
    const now = new Date();
    const secondsToday = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    return getPerSecondLoss() * secondsToday;
  };

  // 实时流失计数器
  useEffect(() => {
    // 初始化今日已流失金额
    setTodayLost(calculateTodayLost());

    // 每秒更新今日已流失金额
    const interval = setInterval(() => {
      setTodayLost(calculateTodayLost());
    }, 1000);

    return () => clearInterval(interval);
  }, [totalAnnualCost]);

  // 现实价值转换器 - 每5秒自动切换
  useEffect(() => {
    // 初始化现实价值文案
    setRealityComparison(getRealityComparison(totalAnnualCost));

    // 每5秒更新一次现实价值文案
    const interval = setInterval(() => {
      setRealityComparison(getRealityComparison(totalAnnualCost));
    }, 5000);

    return () => clearInterval(interval);
  }, [totalAnnualCost]);

  const cost = getCost();

  // 动态增长动画
  useEffect(() => {
    const targetCost = getCost();
    const duration = 1000; // 动画持续时间
    const startTime = Date.now();
    const startValue = animatedCost;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // 使用缓动函数使动画更自然
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (targetCost - startValue) * easeOutCubic;
      setAnimatedCost(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [cost, viewMode, animatedCost, totalAnnualCost, totalMonthlyCost, totalDailyCost]);

  // 获取金额对应的红色光效强度
  const getRedGlowStyle = () => {
    const intensity = Math.min(totalAnnualCost / 10000, 1); // 最大强度为1
    const blurRadius = 10 + intensity * 20; // 模糊半径随强度增加
    return {
      textShadow: `0 0 ${blurRadius}px rgba(255, 0, 0, ${0.3 + intensity * 0.7})`
    };
  };

  // 获取当前会员称号信息
  const memberTitleInfo = getMemberTitle(totalAnnualCost, totalSaved);
  // 计算大冤种指数
  const 冤种指数 = calculate冤种指数();

  return (
    <div className="bg-dark rounded-xl p-6 mb-6 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-light">订阅刺客</h1>
        <div className={`px-3 py-1 rounded-full text-sm font-semibold border animate-pulse ${memberTitleInfo.levelColor} text-white flex items-center`}>
          {memberTitleInfo.title}
          {memberTitleInfo.hasMedal && (
            <span className="ml-1 text-yellow-400">🏅</span>
          )}
        </div>
      </div>
      <p className="text-gray-400 mb-2">{getSubtitle()}</p>
      <p className="text-yellow-400 mb-6 text-sm italic animate-fade-in">{realityComparison}</p>
      
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="text-5xl font-bold text-primary mb-2 break-words" style={getRedGlowStyle()}>
          ¥{formatNumber(animatedCost)}
        </div>
        <p className="text-gray-400">{getLabel()}的订阅费用</p>
        <p className="text-xs text-red-400 mt-1 animate-pulse">
          今日已流失 ¥{todayLost.toFixed(4)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          每秒流失 ¥{(getPerSecondLoss()).toFixed(6)}
        </p>
      </div>

      <div className="flex justify-center space-x-4 mb-4">
        {(['annual', 'monthly', 'daily'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 rounded-lg transition-colors ${viewMode === mode
              ? 'bg-primary text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
          >
            {mode === 'annual' ? '年度' : mode === 'monthly' ? '月度' : '每日'}
          </button>
        ))}
      </div>

      {/* 社交分享预留 */}
      <div className="text-center text-xs text-gray-500 mt-2">
        我的大冤种指数：{冤种指数}%，点击右上角分享我的止血成就。
      </div>
    </div>
  );
};

export default DashboardHeader;
