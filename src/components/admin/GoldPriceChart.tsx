import { useMemo, useState } from 'react';
import { LineChart, RefreshCw, TriangleAlert } from 'lucide-react';
import { MarketRates } from '../../hooks/useMarketRates';
import { formatExact } from '../../lib/price';

interface GoldPriceChartProps {
  rates: MarketRates;
}

// Numbers get a distinct treatment from body text (Inter): Poppins semibold,
// tabular-nums so digits align, tight tracking to offset Poppins' wider set width.
const NUMBER_FONT = 'font-[Poppins] font-semibold tabular-nums tracking-tight';

function dayLabel(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

export function GoldPriceChart({ rates }: GoldPriceChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const history = rates.goldHistory;

  const { pathD, areaD, points, minVal, maxVal } = useMemo(() => {
    const width = 600;
    const height = 180;
    const padX = 24;
    const padY = 20;

    if (!history || history.length < 2) {
      return { pathD: '', areaD: '', points: [] as { x: number; y: number }[], minVal: 0, maxVal: 0 };
    }

    const values = history.map(h => h.lkr);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const pts = history.map((h, i) => {
      const x = padX + (i / (history.length - 1)) * (width - padX * 2);
      const y = padY + (1 - (h.lkr - min) / range) * (height - padY * 2);
      return { x, y };
    });

    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${d} L ${pts[pts.length - 1].x} ${height - padY} L ${pts[0].x} ${height - padY} Z`;

    return { pathD: d, areaD: area, points: pts, minVal: min, maxVal: max };
  }, [history]);

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 mb-6">
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
        <div className="p-1.5 bg-amber-50 rounded-lg">
          <LineChart size={16} className="text-amber-600" />
        </div>
        <h2 className="text-base font-serif text-[var(--color-ink)]">Gold Price Trend (7 Days)</h2>
      </div>

      {!history || history.length < 2 ? (
        <div className="py-10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-gray-400">
            <TriangleAlert size={14} />
            <p className="text-sm">Rates unavailable</p>
          </div>
          <button
            type="button"
            onClick={rates.refetch}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-colors"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox="0 0 600 180" className="w-full h-44" preserveAspectRatio="none">
            <defs>
              <linearGradient id="goldChartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map(f => (
              <line key={f} x1="24" x2="576" y1={20 + f * 140} y2={20 + f * 140} stroke="#f3f4f6" strokeWidth="1" />
            ))}
            <path d={areaD} fill="url(#goldChartFill)" />
            <path d={pathD} fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={hoverIdx === i ? 5 : 3.5}
                fill="#d97706"
                stroke="white"
                strokeWidth="1.5"
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            ))}
          </svg>

          {hoverIdx !== null && (
            <div
              className="absolute -translate-x-1/2 -translate-y-full bg-[var(--color-ink)] text-white text-[11px] rounded-md px-2.5 py-1.5 pointer-events-none shadow-lg whitespace-nowrap"
              style={{
                left: `${(points[hoverIdx].x / 600) * 100}%`,
                top: `${(points[hoverIdx].y / 180) * 100}%`,
                marginTop: '-8px',
              }}
            >
              <span className={NUMBER_FONT}>{formatExact(history[hoverIdx].lkr)}</span>
              <div className="text-white/60 font-medium">{dayLabel(history[hoverIdx].date)}</div>
            </div>
          )}

          <div className="flex justify-between mt-2 px-1">
            {history.map((h, i) => (
              <span key={h.date} className={`text-[10px] font-medium ${hoverIdx === i ? 'text-amber-700' : 'text-gray-400'}`}>
                {dayLabel(h.date)}
              </span>
            ))}
          </div>

          <div className="flex justify-between mt-3 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
            <span>Low: <span className={NUMBER_FONT}>{formatExact(minVal)}</span></span>
            <span>High: <span className={NUMBER_FONT}>{formatExact(maxVal)}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
