import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Stat card with GSAP count-up animation
 */
function Sparkline({ data, trend }) {
  if (!data || data.length < 2) return null;
  const width = 64;
  const height = 18;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min === 0 ? 1 : max - min;
  
  const coordinates = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const color = trend > 0 ? 'var(--success)' : trend < 0 ? 'var(--danger)' : 'var(--text-muted)';

  return (
    <svg width={width} height={height} className="overflow-visible ml-auto self-center">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coordinates}
      />
    </svg>
  );
}

/**
 * Stat card with GSAP count-up animation and mini sparkline
 */
export function StatCard({ title, value, unit = '', trend, trendLabel, icon, color = 'accent', loading = false, sparklineData }) {
  const valueRef = useRef(null);
  const numericValue = parseFloat(String(value).replace(/,/g, '')) || 0;

  useEffect(() => {
    if (loading || !valueRef.current) return;

    // Check for reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      valueRef.current.textContent = formatValue(numericValue, unit);
      return;
    }

    const obj = { val: 0 };
    gsap.to(obj, {
      val: numericValue,
      duration: 1.4,
      ease: 'power2.out',
      onUpdate: () => {
        if (valueRef.current) {
          valueRef.current.textContent = formatValue(Math.round(obj.val), unit);
        }
      },
    });
  }, [numericValue, unit, loading]);

  const colorMap = {
    accent:  { bg: 'var(--accent-light)',   icon: 'var(--accent)' },
    success: { bg: 'var(--success-bg)',      icon: 'var(--success)' },
    danger:  { bg: 'var(--danger-bg)',       icon: 'var(--danger)' },
    warning: { bg: 'var(--warning-bg)',      icon: 'var(--warning)' },
  };
  const colors = colorMap[color] || colorMap.accent;

  if (loading) {
    return (
      <div className="card-no-hover" aria-hidden="true">
        <div className="skeleton h-3 w-24 mb-4 rounded" />
        <div className="skeleton h-7 w-16 mb-2 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    );
  }

  return (
    <div className="card-no-hover group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          {title}
        </p>
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ background: colors.bg }}
          >
            <span style={{ color: colors.icon }}>{icon}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-1">
        <div className="flex items-baseline gap-1">
          <p
            ref={valueRef}
            className="text-2xl stat-value"
            style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
          >
            {formatValue(numericValue, unit)}
          </p>
        </div>
        {sparklineData && (
          <Sparkline data={sparklineData} trend={trend} />
        )}
      </div>

      {(trend !== undefined || trendLabel) && (
        <div className="flex items-center gap-1 mt-2">
          {trend !== undefined && (
            <span
              className="flex items-center gap-0.5 text-xs font-medium"
              style={{ color: trend > 0 ? 'var(--success)' : trend < 0 ? 'var(--danger)' : 'var(--text-muted)' }}
            >
              {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
              {Math.abs(trend)}%
            </span>
          )}
          {trendLabel && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function formatValue(val, unit) {
  const formatted = val.toLocaleString('en-IN');
  if (unit === '%') return `${val.toFixed(1)}%`;
  if (unit) return `${formatted}${unit}`;
  return formatted;
}
