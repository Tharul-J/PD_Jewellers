import { Coins, ArrowLeftRight, Weight, RefreshCw, TriangleAlert } from 'lucide-react';
import { MarketRates } from '../../hooks/useMarketRates';
import { formatExact } from '../../lib/price';

interface MarketRateCardProps {
  rates: MarketRates;
}

// Numbers get a distinct treatment from body text (Inter): Poppins semibold,
// tabular-nums so digits align, tight tracking to offset Poppins' wider set width.
const NUMBER_FONT = 'font-[Poppins] font-semibold tabular-nums tracking-tight';

export function MarketRateCard({ rates }: MarketRateCardProps) {
  const { goldPerGramUsd, goldPerGramLkr, usdToLkr, lastUpdated, loading, error, refetch } = rates;
  const gold24kSovereignLkr = goldPerGramLkr != null ? Math.round(goldPerGramLkr * 8) : null;
  const gold22kSovereignLkr = goldPerGramLkr != null ? Math.round(goldPerGramLkr * (22 / 24) * 8) : null;

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-gray-400">
          <TriangleAlert size={14} />
          <p className="text-sm">Rates unavailable</p>
        </div>
        <button
          type="button"
          onClick={refetch}
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-colors"
        >
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 md:items-stretch gap-6">
      {/* Gold sovereign (1 pawn / 8g) — hero card, first thing the eye lands on */}
      <div className="md:col-span-2 bg-gradient-to-br from-amber-200 via-amber-100 to-yellow-200 rounded-2xl border border-amber-200 border-l-4 border-l-amber-400 shadow-lg shadow-amber-200/50 px-6 py-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-gradient-to-br from-yellow-600 via-amber-500 to-yellow-500 rounded-lg shadow shadow-yellow-400/40 shrink-0">
            <Weight size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Gold Sovereign (1 Pawn)</p>
            <p className="text-[10px] text-gray-400 mt-0.5">රන් පවුමක මිල (8g)</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-1">
            <div className="h-10 w-56 bg-gray-100 rounded animate-pulse" />
            <div className="h-7 w-40 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded shrink-0">24K</span>
              <h3 className="text-3xl font-['Poppins',sans-serif] font-bold text-slate-800">
                {gold24kSovereignLkr != null ? formatExact(gold24kSovereignLkr) : '—'}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded shrink-0">22K</span>
              <h3 className="text-xl font-['Poppins',sans-serif] font-bold text-slate-800">
                {gold22kSovereignLkr != null ? formatExact(gold22kSovereignLkr) : '—'}
              </h3>
            </div>
          </div>
        )}
        {loading ? (
          <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mt-2" />
        ) : (
          <p className="text-xs text-gray-400 mt-2">Based on current market rate</p>
        )}
      </div>

      {/* Gold per gram */}
      <div className="md:col-span-1 flex flex-col justify-center bg-gradient-to-br from-amber-100 via-amber-50 to-yellow-100 rounded-2xl border border-amber-100 shadow-sm px-6 py-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-gradient-to-br from-amber-600 via-yellow-500 to-amber-500 rounded-lg shadow shadow-amber-400/40 shrink-0">
            <Coins size={16} className="text-white" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Gold (per gram)</p>
        </div>

        {loading ? (
          <div className="h-8 w-36 bg-gray-100 rounded animate-pulse" />
        ) : (
          <h3 className="text-3xl font-['Poppins',sans-serif] font-bold text-slate-800">
            {goldPerGramLkr != null ? formatExact(Math.round(goldPerGramLkr)) : '—'}
          </h3>
        )}
        {loading ? (
          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mt-1" />
        ) : (
          <p className={`text-sm text-gray-400 mt-1 ${NUMBER_FONT}`}>
            USD ${goldPerGramUsd?.toFixed(2) ?? '—'}/g
          </p>
        )}
      </div>

      {/* USD -> LKR */}
      <div className="md:col-span-1 bg-gradient-to-br from-amber-100 via-amber-50 to-yellow-100 rounded-2xl border border-amber-100 shadow-sm px-6 py-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-gradient-to-br from-amber-800 via-yellow-700 to-amber-600 rounded-lg shadow shadow-amber-700/30 shrink-0">
            <ArrowLeftRight size={16} className="text-white" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">USD → LKR</p>
        </div>

        {loading ? (
          <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />
        ) : (
          <h3 className="text-3xl font-['Poppins',sans-serif] font-bold text-slate-800">
            {usdToLkr != null ? `LKR ${usdToLkr?.toFixed(2) ?? '—'}` : '—'}
          </h3>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <p className="text-[9px] text-gray-400">
            {lastUpdated ? `Last updated: ${lastUpdated}` : ''}
          </p>
          <button
            type="button"
            onClick={refetch}
            title="Refresh rates"
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
