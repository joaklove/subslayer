import React from 'react';
import { Check, Palette } from 'lucide-react';
import { THEMES } from '../lib/themes';
import { useTheme } from '../store/useTheme';

/**
 * 配色候选常驻在页面上：每个按钮用自己的色板预览，点一下立刻全站生效。
 * 不藏进设置弹窗——选配色这件事必须能一眼对比。
 */
const ThemePicker: React.FC = () => {
  const { theme, setThemeId } = useTheme();

  return (
    <section
      className="rounded-xl border border-gray-700 bg-dark p-4 mb-6 rise-in"
      aria-label="配色方案"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center text-sm font-semibold text-light">
          <Palette size={16} className="mr-2 text-primary" />
          配色方案
        </h2>
        <span className="text-xs text-gray-500">点击即时预览，选择会记在本机</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {THEMES.map((candidate) => {
          const active = candidate.id === theme.id;
          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => setThemeId(candidate.id)}
              aria-pressed={active}
              title={candidate.tagline}
              className="group relative rounded-lg border px-3 py-2.5 text-left transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
              style={{
                backgroundColor: candidate.colors.dark,
                borderColor: active ? candidate.colors.primary : candidate.line,
                boxShadow: active ? `0 0 0 1px ${candidate.colors.primary}, 0 6px 18px -8px ${candidate.colors.primary}` : 'none',
              }}
            >
              <span className="flex items-center gap-1.5 mb-2">
                {[candidate.primary, candidate.secondary, candidate.success].map(
                  (color) => (
                    <span
                      key={color}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color, boxShadow: `0 0 8px -1px ${color}` }}
                    />
                  )
                )}
                {active && (
                  <Check size={14} className="ml-auto" style={{ color: candidate.primary }} />
                )}
              </span>
              <span
                className="block text-xs font-semibold"
                style={{ color: candidate.colors.light }}
              >
                {candidate.name}
              </span>
              <span
                className="block text-[10px] leading-tight mt-0.5"
                style={{ color: candidate.colors['gray-400'] }}
              >
                {candidate.id === 'slate' ? '现行' : '备选'}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-3">{theme.tagline}</p>
    </section>
  );
};

export default ThemePicker;
