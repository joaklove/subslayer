import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Skull, X } from 'lucide-react';
import { format } from 'date-fns';
import { useSubscription } from '../store/useSubscription';
import { useTheme } from '../store/useTheme';
import { buildWrapped, buildWrappedText } from '../lib/wrapped';
import { buildReview } from '../lib/review';
import type { InsightTone } from '../lib/review';
import { drawPoster, POSTER_H, POSTER_PAGES, POSTER_W } from '../lib/poster';
import type { PosterPage } from '../lib/poster';

interface WrappedDialogProps {
  onClose: () => void;
}

const TONE_CLASS: Record<InsightTone, string> = {
  danger: 'text-red-400 border-red-500',
  warn: 'text-yellow-400 border-yellow-500',
  info: 'text-blue-500 border-blue-500',
  success: 'text-green-400 border-green-500',
};

const TONE_LABEL: Record<InsightTone, string> = {
  danger: '集中',
  warn: '注意',
  info: '结构',
  success: '好消息',
};

/**
 * 剪贴板 API 在非前台页面会被直接拒绝，退回选中再复制的老路径。
 * 两条路径都可能不存在（无 clipboard、无 execCommand），任何一条失败都要给出明确结果而不是抛错。
 */
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 继续尝试老路径
  }

  const holder = document.createElement('textarea');
  holder.value = text;
  holder.style.position = 'fixed';
  holder.style.opacity = '0';
  document.body.appendChild(holder);
  holder.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    holder.remove();
  }
};

const WrappedDialog: React.FC<WrappedDialogProps> = ({ onClose }) => {
  const { subscriptions } = useSubscription();
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState<PosterPage>('overview');
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'fail'>('idle');

  const summary = useMemo(() => buildWrapped(subscriptions), [subscriptions]);
  const generatedAt = useMemo(() => new Date(), []);
  const review = useMemo(() => buildReview(subscriptions, generatedAt), [subscriptions, generatedAt]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      drawPoster(ctx, page, summary, review, theme, generatedAt);
    }
  }, [page, summary, review, theme, generatedAt]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subslayer-${format(generatedAt, 'yyyy')}-${page}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [generatedAt, page]);

  const handleCopy = useCallback(async () => {
    setCopyState((await copyToClipboard(buildWrappedText(summary, review))) ? 'done' : 'fail');
  }, [summary, review]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 cursor-pointer"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="我的年度止血报告"
        className="bg-dark rounded-xl border border-gray-700 w-full max-w-lg max-h-[92vh] overflow-y-auto cursor-default rise-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-light flex items-center">
              <Skull size={20} className="mr-2 text-primary" />
              我的年度止血报告
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-light transition-colors"
              aria-label="关闭"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex gap-2 mb-4" role="tablist" aria-label="报告页">
            {POSTER_PAGES.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={page === item.id}
                onClick={() => setPage(item.id)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  page === item.id
                    ? 'bg-primary text-white font-semibold'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <canvas
            key={page}
            ref={canvasRef}
            width={POSTER_W}
            height={POSTER_H}
            className="w-full rounded-lg border border-gray-700 mb-4 poster-swap"
          />

          <div className="flex space-x-3">
            <button
              onClick={handleDownload}
              className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center whitespace-nowrap"
            >
              <Download size={18} className="mr-2 shrink-0" />
              下载 PNG
            </button>
            <button
              onClick={handleCopy}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center whitespace-nowrap ${
                copyState === 'fail'
                  ? 'bg-red-900 text-red-200'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {copyState === 'done' ? (
                <Check size={18} className="mr-2 shrink-0" />
              ) : (
                <Copy size={18} className="mr-2 shrink-0" />
              )}
              {copyState === 'done' ? '已复制' : copyState === 'fail' ? '复制失败' : '复制文案'}
            </button>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-light mb-2">这份回顾还看到</h3>
            <ul className="space-y-2">
              {review.insights.map((insight) => (
                <li key={insight.text} className="flex items-start gap-2">
                  <span
                    className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded border text-[10px] leading-none ${TONE_CLASS[insight.tone]}`}
                  >
                    {TONE_LABEL[insight.tone]}
                  </span>
                  <span className="text-xs text-gray-300 leading-relaxed">{insight.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            三页海报都跟着当前配色走，数字全部来自你的订阅列表，生成和保存都在本机完成。
          </p>
        </div>
      </div>
    </div>
  );
};

export default WrappedDialog;
