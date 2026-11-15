import React from 'react';
import {
  Clapperboard,
  Cloud,
  Music2,
  NotebookPen,
  Palette,
  Receipt,
  ShoppingBag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { resolveBrand } from '../lib/brands';
import type { BrandCategory } from '../lib/brands';
import { ensureContrast, hexToRgb } from '../lib/themes';
import { useTheme } from '../store/useTheme';

const CATEGORY_ICON: Record<BrandCategory, LucideIcon> = {
  video: Clapperboard,
  music: Music2,
  cloud: Cloud,
  productivity: NotebookPen,
  design: Palette,
  shopping: ShoppingBag,
  generic: Receipt,
};

interface BrandIconProps {
  slug?: string;
  name?: string;
  /** 外框边长（px） */
  size?: number;
  dimmed?: boolean;
  className?: string;
}

const BrandIcon: React.FC<BrandIconProps> = ({
  slug,
  name,
  size = 40,
  dimmed = false,
  className = '',
}) => {
  const { theme } = useTheme();
  const brand = resolveBrand(slug, name);
  const color = ensureContrast(brand.color, theme.colors.dark, 3.2);
  const [r, g, b] = hexToRgb(color);
  const Glyph = CATEGORY_ICON[brand.category];
  const glyphSize = Math.round(size * 0.52);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.14)`,
        borderColor: `rgba(${r}, ${g}, ${b}, 0.4)`,
        filter: dimmed ? 'grayscale(0.85) opacity(0.65)' : 'none',
      }}
      title={brand.title}
      data-brand={brand.title}
    >
      {brand.path ? (
        <svg
          viewBox="0 0 24 24"
          width={glyphSize}
          height={glyphSize}
          fill={color}
          role="img"
          aria-label={brand.title}
        >
          <path d={brand.path} />
        </svg>
      ) : (
        <Glyph size={glyphSize} color={color} aria-label={brand.title} />
      )}
    </span>
  );
};

export default BrandIcon;
