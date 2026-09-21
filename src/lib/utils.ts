import { addMonths, addYears, formatISO, isBefore, endOfMonth, isSameDay } from 'date-fns';

// 汇率常量
export const USD_TO_CNY_RATE = 7.2;

/**
 * 计算下次扣款日期
 * @param startDate 开始日期
 * @param billingCycle 计费周期
 * @param dayOfMonth 每月扣款日（1-31）
 * @param monthOfYear 每年扣款月份（1-12）
 * @returns ISO 格式的下次扣款日期
 */
export const calculateNextBillingDate = (
  startDate: Date, 
  billingCycle: 'monthly' | 'yearly', 
  dayOfMonth: number = new Date().getDate(),
  monthOfYear: number = startDate.getMonth() + 1
) => {
  if (billingCycle === 'monthly') {
    // 处理每月扣款日
    let nextDate = new Date(startDate);
    nextDate.setDate(dayOfMonth);
    
    // 如果当前日期已经过了扣款日，则计算下个月的扣款日
    if (isBefore(nextDate, startDate) || isSameDay(nextDate, startDate)) {
      nextDate = addMonths(nextDate, 1);
    }
    
    // 处理特殊日期边界（比如 31 号在 2 月份的情况）
    const lastDayOfMonth = endOfMonth(nextDate).getDate();
    if (dayOfMonth > lastDayOfMonth) {
      nextDate.setDate(lastDayOfMonth);
    }
    
    return formatISO(nextDate);
  } else {
    // 处理年度订阅
    let nextDate = new Date(startDate);
    nextDate.setMonth(monthOfYear - 1); // 月份从0开始
    nextDate.setDate(dayOfMonth);
    
    // 处理特殊日期边界（比如 31 号在 2 月份的情况）
    const lastDayOfMonth = endOfMonth(nextDate).getDate();
    if (dayOfMonth > lastDayOfMonth) {
      nextDate.setDate(lastDayOfMonth);
    }
    
    // 如果当前日期已经过了扣款日，则计算下一年的扣款日
    if (isBefore(nextDate, startDate) || isSameDay(nextDate, startDate)) {
      nextDate = addYears(nextDate, 1);
    }
    
    return formatISO(nextDate);
  }
};

/**
 * 格式化金额
 * @param amount 金额
 * @param currency 货币类型
 * @returns 格式化后的金额字符串
 */
export const formatAmount = (amount: number, currency: 'CNY' | 'USD') => {
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`;
  } else {
    return `¥${amount.toFixed(2)}`;
  }
};

/**
 * 格式化大数字，添加千分位
 * 最多保留 2 位小数：动画中间帧会把 4878.336 这种值直接推到界面上
 * @param num 数字
 * @returns 格式化后的数字字符串
 */
export const formatNumber = (num: number) => {
  return num.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
};

/**
 * 截断长文本，添加省略号
 * @param text 文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

/**
 * 验证金额输入
 * @param amount 金额字符串
 * @returns 验证结果
 */
export const validateAmount = (amount: string) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

/**
 * 计算距离下次扣款的天数
 * @param nextBillingDate 下次扣款日期
 * @returns 距离下次扣款的天数
 */
export const calculateDaysUntilNextBilling = (nextBillingDate: string) => {
  const nextDate = new Date(nextBillingDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextDate.setHours(0, 0, 0, 0);
  
  const diffTime = nextDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * 现实价值转换器
 * @param amount 金额
 * @returns 对应的实物价值描述
 */
export const getRealityComparison = (amount: number) => {
  if (amount <= 0) {
    return '目前没有正在流血的订阅。';
  } else if (amount >= 8000) {
    return `这笔钱相当于一次出国游`;
  } else if (amount >= 3000) {
    return `这笔钱相当于一台最新手机`;
  } else if (amount >= 300) {
    return `这笔钱相当于一顿火锅`;
  } else if (amount >= 30) {
    return `这笔钱相当于一杯星巴克`;
  } else {
    return `这笔钱相当于${Math.max(1, Math.floor(amount / 5))}顿午餐`;
  }
};
