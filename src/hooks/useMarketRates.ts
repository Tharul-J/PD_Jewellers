import { useCallback, useEffect, useState } from 'react';

const TROY_OZ_TO_GRAM = 31.1035;

export interface GoldHistoryPoint {
  date: string;
  usd: number;
  lkr: number;
}

export interface MarketRates {
  goldPerGramUsd: number | null;
  goldPerGramLkr: number | null;
  usdToLkr: number | null;
  goldHistory: GoldHistoryPoint[] | null;
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const CACHE_KEY = 'pd_market_rates_cache';
const CACHE_TTL_MS = 15 * 60 * 1000;

interface CachedRates {
  goldPerGramUsd: number;
  usdToLkr: number;
  goldHistory: GoldHistoryPoint[] | null;
  timestamp: number;
}

function formatLastUpdated(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${hh}:${mm}, ${day} ${month}`;
}

function readCache(): CachedRates | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRates;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    if (typeof parsed.goldPerGramUsd !== 'number' || typeof parsed.usdToLkr !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: CachedRates) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage unavailable — cache is a best-effort optimization, not a requirement
  }
}

interface FetchedRates {
  goldPerGramUsd: number;
  usdToLkr: number;
}

async function fetchRates(): Promise<FetchedRates> {
  const [goldRes, fxRes] = await Promise.all([
    fetch('https://xaus.com/api/v1/spot'),
    fetch('https://open.er-api.com/v6/latest/USD'),
  ]);

  if (!goldRes.ok || !fxRes.ok) {
    throw new Error('Failed to fetch market rates');
  }

  const [goldData, fxData] = await Promise.all([goldRes.json(), fxRes.json()]);
  const goldPerGramUsd = goldData?.per_gram_usd;
  const usdToLkr = fxData?.rates?.LKR;

  if (typeof goldPerGramUsd !== 'number' || typeof usdToLkr !== 'number') {
    throw new Error('Unexpected market rates response');
  }

  return { goldPerGramUsd, usdToLkr };
}

// A broken/slow history endpoint should not take down the rate card — this
// never throws; a failure just leaves the 7-day chart in its unavailable state.
async function fetchGoldHistoryUsd(): Promise<{ date: string; usdPerGram: number }[] | null> {
  try {
    const res = await fetch('https://xaus.com/api/v1/history');
    if (!res.ok) return null;
    const data = await res.json();
    const points = data?.points;
    if (!Array.isArray(points)) return null;

    const recent = points.slice(-7);
    const parsed = recent
      .map((p: any) => {
        const date = p?.d;
        const usdPerGram = typeof p?.c === 'number' ? p.c / TROY_OZ_TO_GRAM : null;
        return typeof date === 'string' && usdPerGram !== null ? { date, usdPerGram } : null;
      })
      .filter((p: { date: string; usdPerGram: number } | null): p is { date: string; usdPerGram: number } => p !== null);

    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function useMarketRates(): MarketRates {
  const [goldPerGramUsd, setGoldPerGramUsd] = useState<number | null>(null);
  const [usdToLkr, setUsdToLkr] = useState<number | null>(null);
  const [goldHistory, setGoldHistory] = useState<GoldHistoryPoint[] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force: boolean) => {
    if (!force) {
      const cached = readCache();
      if (cached) {
        setGoldPerGramUsd(cached.goldPerGramUsd);
        setUsdToLkr(cached.usdToLkr);
        setGoldHistory(cached.goldHistory);
        setLastUpdated(formatLastUpdated(cached.timestamp));
        setLoading(false);
        setError(null);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const [core, historyRaw] = await Promise.all([fetchRates(), fetchGoldHistoryUsd()]);
      const { goldPerGramUsd: gold, usdToLkr: fx } = core;
      const timestamp = Date.now();
      const history = historyRaw
        ? historyRaw.map(h => ({ date: h.date, usd: h.usdPerGram, lkr: h.usdPerGram * fx }))
        : null;

      setGoldPerGramUsd(gold);
      setUsdToLkr(fx);
      setGoldHistory(history);
      setLastUpdated(formatLastUpdated(timestamp));
      writeCache({ goldPerGramUsd: gold, usdToLkr: fx, goldHistory: history, timestamp });
    } catch {
      setError('Rates unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const refetch = useCallback(() => {
    load(true);
  }, [load]);

  return {
    goldPerGramUsd,
    goldPerGramLkr: goldPerGramUsd !== null && usdToLkr !== null ? goldPerGramUsd * usdToLkr : null,
    usdToLkr,
    goldHistory,
    lastUpdated,
    loading,
    error,
    refetch,
  };
}
