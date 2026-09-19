import { useEffect, useState } from 'react';
import { Eye, Heart, Sparkles, ImageOff } from 'lucide-react';

interface HighlightItem {
  id: string;
  name: string;
  image?: string;
  /** Exactly one of these is set, depending on which card the row belongs to. */
  views?: number;
  count?: number;
}

interface Highlights {
  topViewed: HighlightItem[];
  topWishlisted: HighlightItem[];
  topConfiguratorStyles: HighlightItem[];
}

const EMPTY: Highlights = { topViewed: [], topWishlisted: [], topConfiguratorStyles: [] };

/** A thumbnail that degrades to a neutral tile when the image is missing or 404s. */
function Thumb({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <ImageOff size={16} className="text-gray-300" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0 bg-gray-50"
    />
  );
}

function HighlightCard({
  icon,
  title,
  items,
  unit,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  items: HighlightItem[];
  /** Noun after the number, e.g. "views" -> "42 views". */
  unit: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="text-amber-600">{icon}</span>
        <h2 className="text-base font-serif text-[var(--color-ink)]">{title}</h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0" />
              <div className="flex-1 h-3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
      ) : (
        <ul className="space-y-3">
          {items.map(item => {
            const value = item.views ?? item.count ?? 0;
            return (
              <li key={item.id} className="flex items-center gap-3">
                <Thumb src={item.image} alt={item.name} />
                {/* min-w-0 lets the truncate below actually clip instead of
                    forcing the flex row wider than the card. */}
                <span className="flex-1 min-w-0 text-sm text-gray-700 truncate" title={item.name}>
                  {item.name}
                </span>
                <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                  {value} {unit}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function DashboardHighlights({ token }: { token?: string }) {
  const [data, setData] = useState<Highlights>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/admin/dashboard-highlights', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        const json = await res.json();
        if (cancelled) return;
        setData({
          topViewed: json.topViewed ?? [],
          topWishlisted: json.topWishlisted ?? [],
          topConfiguratorStyles: json.topConfiguratorStyles ?? [],
        });
      } catch {
        // An unreachable endpoint is not worth a dashboard-wide error state —
        // each card falls back to its own "No data yet" line.
        if (!cancelled) setData(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <HighlightCard icon={<Eye size={16} />}      title="Most Viewed"      items={data.topViewed}             unit="views"   loading={loading} />
      <HighlightCard icon={<Heart size={16} />}    title="Most Wishlisted"  items={data.topWishlisted}         unit="saves"   loading={loading} />
      <HighlightCard icon={<Sparkles size={16} />} title="Popular Designs"  items={data.topConfiguratorStyles} unit="designs" loading={loading} />
    </div>
  );
}
