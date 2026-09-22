import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Skull, X } from 'lucide-react';
import { format } from 'date-fns';
import { useSubscription } from '../store/useSubscription';
import { buildWrapped, buildWrappedText } from '../lib/wrapped';
import type { WrappedSummary } from '../lib/wrapped';
import { formatNumber } from '../lib/utils';

interface WrappedDialogProps {
  onClose: () => void;
}

/** 3:4 竖版，正好是社交平台能完整展示的比例 */
const POSTER_W = 1080;
const POSTER_H = 1350;
const PAD = 88;

const FONT_STACK = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif';

const money = (n: number) => formatNumber(n);

/** 中文没有空格可分，只能逐字量宽度换行 */
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    if (current && ctx.measureText(current + char).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
};

/** 从指定字号往下试，直到文案塞得进给定宽度 */
const fontThatFits = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  weight: string
) => {
  let px = startPx;
  while (px > 40 && ctx.measureText(text).width > maxWidth) {
    px -= 6;
    ctx.font = `${weight} ${px}px ${FONT_STACK}`;
  }
  return px;
};

const drawPoster = (ctx: CanvasRenderingContext2D, summary: WrappedSummary) => {
  const background = ctx.createLinearGradient(0, 0, POSTER_W, POSTER_H);
  background.addColorStop(0, '#0f172a');
  background.addColorStop(1, '#1e293b');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  const isEmpty = summary.activeCount + summary.killedCount === 0;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.font = `600 26px ${FONT_STACK}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText('SUBSLAYER · 年度订阅报告', PAD, 112);

  ctx.font = `400 34px ${FONT_STACK}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(
    isEmpty ? '你还没有记录任何订阅' : '这一年，订阅要从你兜里拿走',
    PAD,
    190
  );

  const bigLine = `¥${money(summary.bleedingAnnual)}`;
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = 'rgba(239, 68, 68, 0.55)';
  ctx.shadowBlur = 48;
  fontThatFits(ctx, bigLine, POSTER_W - PAD * 2, 168, '700');
  ctx.fillText(bigLine, PAD, 350);
  ctx.shadowBlur = 0;

  ctx.font = `400 30px ${FONT_STACK}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(
    isEmpty
      ? '添加第一条订阅后，这里会变成你的年度账单。'
      : summary.activeCount > 0
        ? `每年 · 还在自动续费的 ${summary.activeCount} 条`
        : '每年 · 已经没有订阅在自动续费了',
    PAD,
    410
  );

  const stats: { label: string; value: string }[] = [
    { label: '在流血', value: `${summary.activeCount} 条` },
    { label: '已干掉', value: `${summary.killedCount} 条` },
    { label: '已省下 / 年', value: `¥${money(summary.savedAnnual)}` },
  ];
  const cardGap = 24;
  const cardW = (POSTER_W - PAD * 2 - cardGap * 2) / 3;
  stats.forEach((stat, index) => {
    const x = PAD + index * (cardW + cardGap);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, 470, cardW, 168, 20);
    ctx.fill();
    ctx.stroke();

    ctx.font = `400 26px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(stat.label, x + 28, 522);

    ctx.font = `700 46px ${FONT_STACK}`;
    ctx.fillStyle = '#f8fafc';
    fontThatFits(ctx, stat.value, cardW - 56, 46, '700');
    ctx.fillText(stat.value, x + 28, 592);
  });

  let cursor = 700;
  if (summary.priciest) {
    ctx.font = `400 26px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('最贵的刺客', PAD, cursor + 22);
    ctx.font = `600 44px ${FONT_STACK}`;
    ctx.fillStyle = '#f8fafc';
    const priciestLine = `${summary.priciest.name} · ¥${money(summary.priciest.annualCNY)}/年`;
    fontThatFits(ctx, priciestLine, POSTER_W - PAD * 2, 44, '600');
    ctx.fillText(priciestLine, PAD, cursor + 78);
    cursor += 134;
  }

  ctx.font = `italic 400 34px ${FONT_STACK}`;
  ctx.fillStyle = '#facc15';
  ctx.fillText(summary.reality, PAD, cursor + 22);

  ctx.font = `700 46px ${FONT_STACK}`;
  const headlineLines = wrapText(ctx, summary.headline, POSTER_W - PAD * 2 - 44);
  // 判词锚在分隔线上方，一句话时不会在中间留出一大块空白
  const firstBaseline = 1100 - (headlineLines.length - 1) * 62;
  ctx.fillStyle = '#f8fafc';
  headlineLines.forEach((line, index) => {
    ctx.fillText(line, PAD + 34, firstBaseline + index * 62);
  });

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(PAD, firstBaseline - 38);
  ctx.lineTo(PAD, firstBaseline + (headlineLines.length - 1) * 62 + 14);
  ctx.stroke();

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, 1160);
  ctx.lineTo(POSTER_W - PAD, 1160);
  ctx.stroke();

  ctx.font = `400 26px ${FONT_STACK}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText(`生成于 ${format(new Date(), 'yyyy-MM-dd')}`, PAD, 1226);
  ctx.fillText('数据只存在你自己的浏览器里，没有上传。', PAD, 1272);

  ctx.textAlign = 'right';
  ctx.font = `700 34px ${FONT_STACK}`;
  ctx.fillStyle = '#ef4444';
  ctx.fillText('订阅刺客 SubSlayer', POSTER_W - PAD, 1258);
  ctx.textAlign = 'left';
};

/**
 * 剪贴板 API 在非前台页面会被直接拒绝，退回选中再复制的老路径。
 */
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const holder = document.createElement('textarea');
    holder.value = text;
    holder.style.position = 'fixed';
    holder.style.opacity = '0';
    document.body.appendChild(holder);
    holder.select();
    const copied = document.execCommand('copy');
    holder.remove();
    return copied;
  }
};

const WrappedDialog: React.FC<WrappedDialogProps> = ({ onClose }) => {
  const { subscriptions } = useSubscription();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'fail'>('idle');

  const summary = useMemo(() => buildWrapped(subscriptions), [subscriptions]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      drawPoster(ctx, summary);
    }
  }, [summary]);

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
      link.download = `subslayer-${format(new Date(), 'yyyy')}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, []);

  const handleCopy = useCallback(async () => {
    setCopyState((await copyToClipboard(buildWrappedText(summary))) ? 'done' : 'fail');
  }, [summary]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 cursor-pointer" onClick={onClose}>
      <div
        className="bg-dark rounded-xl border border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto cursor-default"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-light flex items-center">
              <Skull size={20} className="mr-2 text-primary" />
              我的年度止血海报
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-light transition-colors"
              aria-label="关闭"
            >
              <X size={20} />
            </button>
          </div>

          <canvas
            ref={canvasRef}
            width={POSTER_W}
            height={POSTER_H}
            className="w-full rounded-lg border border-gray-700 mb-4"
          />

          <div className="flex space-x-4">
            <button
              onClick={handleDownload}
              className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
            >
              <Download size={18} className="mr-2" />
              下载 PNG
            </button>
            <button
              onClick={handleCopy}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center ${copyState === 'fail' ? 'bg-red-900 text-red-200' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {copyState === 'done' ? <Check size={18} className="mr-2" /> : <Copy size={18} className="mr-2" />}
              {copyState === 'done' ? '文案已复制' : copyState === 'fail' ? '复制失败，存海报吧' : '复制文案'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            海报上的每个数字都来自你的订阅列表，生成和保存都在本机完成。
          </p>
        </div>
      </div>
    </div>
  );
};

export default WrappedDialog;
