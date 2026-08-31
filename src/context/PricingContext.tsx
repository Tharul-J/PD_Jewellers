import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { METALS, STONES } from '../constants';
import { shouldPausePolling } from '../lib/pollGuard';

export interface IMetalEntry {
  key: string;
  displayName: string;
  multiplier: number;
  color?: string;
}

export interface IStoneEntry {
  key: string;
  displayName: string;
  price: number;
  color?: string;
}

export interface IUpgradeEntry {
  key: string;
  name: string;
  price: number;
}

export interface IPricing {
  metals: IMetalEntry[];
  stones: IStoneEntry[];
  upgrades: IUpgradeEntry[];
  /** Kept in sync with the "Engraving" upgrade — read by the configurator. */
  engravingPrice: number;
}

/**
 * PBR fields handed straight to a THREE.MeshPhysicalMaterial. Kept in a nested
 * `material` object rather than flattened onto the entry: constants.ts warns that
 * spreading non-material keys (key, price, multiplier…) onto a material logs
 * "'x' is not a property of THREE.MeshPhysicalMaterial" on every rebuild.
 */
export interface MetalMaterial {
  color: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
}

export interface StoneMaterial {
  color: string;
  transmission: number;
  ior: number;
  thickness: number;
  roughness: number;
  clearcoat: number;
}

export interface ConfiguratorMetal {
  key: string;
  name: string;
  color: string;
  multiplier: number;
  material: MetalMaterial;
}

export interface ConfiguratorStone {
  key: string;
  name: string;
  color: string;
  price: number;
  material: StoneMaterial;
}

const normalizeKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Resolves a stored metal/stone key against the live catalogue.
 *
 * An exact key miss isn't necessarily a deleted entry — try three fallbacks
 * before giving up, each catching a different way a stored key can go stale:
 *
 * 1. Normalized key/name match — catches punctuation/case drift, e.g. a stored
 *    "18K-Yellow-Gold" against a catalogue key `18k_yellow_gold`.
 * 2. Legacy-key translation via `legacyMap` (constants.ts's METALS/STONES) —
 *    catches a stored key that predates a re-key on the admin side. constants.ts's
 *    `gold18k` and a live-catalogue entry `18k_yellow_gold` both mean "18K Yellow
 *    Gold", but neither normalized form is a substring or rearrangement of the
 *    other ("gold18k" vs "18kyellowgold") — step 1 alone cannot bridge them.
 *    Translating the stored legacy key to its constants.ts display name first,
 *    then matching that name against the catalogue, closes the gap.
 *
 * Shared by every page that resolves a selection against configuratorMetals/
 * configuratorStones, so a fix here can't drift out of sync between pages the
 * way ProductDetail's exact-only lookup once did.
 */
export function findCatalogEntry<T extends { key: string; name: string }>(
  list: T[],
  stored: string | undefined,
  legacyMap?: Record<string, { name: string }>
): T | undefined {
  if (!stored) return undefined;

  const exact = list.find(e => e.key === stored);
  if (exact) return exact;

  const normalizedStored = normalizeKey(stored);
  const byKeyOrName = list.find(
    e => normalizeKey(e.key) === normalizedStored || normalizeKey(e.name) === normalizedStored
  );
  if (byKeyOrName) return byKeyOrName;

  const legacyName = legacyMap?.[stored]?.name;
  if (legacyName) {
    const normalizedLegacyName = normalizeKey(legacyName);
    return list.find(e => normalizeKey(e.name) === normalizedLegacyName);
  }

  return undefined;
}

interface PricingContextType {
  pricing: IPricing | null;
  /** Admin-managed metals merged with the 3D properties from constants.ts. */
  configuratorMetals: ConfiguratorMetal[];
  /** Admin-managed stones merged with the 3D properties from constants.ts. */
  configuratorStones: ConfiguratorStone[];
  /**
   * False until the first `/api/pricing` fetch has settled (success or failure).
   * Until then, `pricing` is the hardcoded `defaultPricing` fallback — a much
   * smaller catalogue than the real one, missing anything an admin has added.
   * A consumer that "corrects" an unrecognized selection back to the first
   * catalogue entry MUST wait for this to be true first, or a valid admin-added
   * metal/stone gets permanently overwritten in the instant before the real
   * catalogue arrives (it looks "missing" only because the fallback is smaller).
   */
  pricingLoaded: boolean;
  refreshPricing: () => Promise<void>;
  updatePricing: (newPricing: Partial<IPricing>, token: string) => Promise<boolean>;
}

const defaultPricing: IPricing = {
  metals: [
    { key: 'silver',     displayName: '925 Sterling Silver',        multiplier: METALS.silver.priceMultiplier,    color: METALS.silver.color    },
    { key: 'white',      displayName: '18K White Gold',              multiplier: METALS.white.priceMultiplier,     color: METALS.white.color     },
    { key: 'gold',       displayName: '22K Yellow Gold (916 Gold)',  multiplier: METALS.gold.priceMultiplier,      color: METALS.gold.color      },
    { key: 'gold18k', displayName: '18K Yellow Gold', multiplier: METALS.gold18k.priceMultiplier, color: METALS.gold18k.color },
    { key: 'rose',       displayName: '18K Rose Gold',               multiplier: METALS.rose.priceMultiplier,      color: METALS.rose.color      },
    { key: 'platinum',   displayName: 'Platinum (Pt950)',             multiplier: METALS.platinum.priceMultiplier,  color: METALS.platinum.color  },
  ],
  stones: [
    { key: 'aquamarine',     displayName: 'Cornflower / Sky Blue Sapphire', price: STONES.aquamarine.price,     color: STONES.aquamarine.color     },
    { key: 'diamond',        displayName: 'White Ceylon Sapphire',           price: STONES.diamond.price,        color: STONES.diamond.color        },
    { key: 'ruby',           displayName: 'Crimson Ceylon Ruby',             price: STONES.ruby.price,           color: STONES.ruby.color           },
    { key: 'emerald',        displayName: 'Vibrant Emerald',                 price: STONES.emerald.price,        color: STONES.emerald.color        },
    { key: 'sapphire',       displayName: 'Royal Blue Ceylon Sapphire',      price: STONES.sapphire.price,       color: STONES.sapphire.color       },
    { key: 'padparadscha',   displayName: 'Ceylon Padparadscha Sapphire',    price: STONES.padparadscha.price,   color: STONES.padparadscha.color   },
    { key: 'moonstone',      displayName: 'Premium Blue-Sheen Moonstone',    price: STONES.moonstone.price,      color: STONES.moonstone.color      },
    { key: 'yellowsapphire', displayName: 'Yellow Ceylon Sapphire',          price: STONES.yellowsapphire.price, color: STONES.yellowsapphire.color },
    { key: 'tourmaline',  displayName: 'Ceylon Violet Tourmaline',  price: STONES.tourmaline.price,  color: STONES.tourmaline.color  },
    { key: 'amethyst',    displayName: 'Purple Amethyst',            price: STONES.amethyst.price,    color: STONES.amethyst.color    },
    { key: 'spinel',      displayName: 'Rose Spinel',                price: STONES.spinel.price,      color: STONES.spinel.color      },
    { key: 'alexandrite', displayName: 'Alexandrite',                price: STONES.alexandrite.price, color: STONES.alexandrite.color },
    { key: 'catseye',     displayName: "Chrysoberyl Cat's Eye",      price: STONES.catseye.price,     color: STONES.catseye.color     },
    { key: 'zircon',      displayName: 'Blue Zircon',                price: STONES.zircon.price,      color: STONES.zircon.color      },
  ],
  upgrades: [{ key: 'engraving', name: 'Engraving', price: 5000 }],
  engravingPrice: 5000,
};

const FALLBACK_COLOR = '#cccccc';

/** A stored fallback grey was never an admin's choice — treat it as unset. */
const savedColor = (c?: string) =>
  c && c.toLowerCase() !== FALLBACK_COLOR ? c : null;

/** Stone entries saved before colours existed get one from the STONES map by key. */
function withStoneColors(stones: IStoneEntry[]): IStoneEntry[] {
  return stones.map(s => ({
    ...s,
    color: savedColor(s.color)
      || (STONES as Record<string, { color: string }>)[s.key]?.color
      || FALLBACK_COLOR,
  }));
}

/** Same for metals, from the METALS map. */
function withMetalColors(metals: IMetalEntry[]): IMetalEntry[] {
  return metals.map(m => ({
    ...m,
    color: savedColor(m.color)
      || (METALS as Record<string, { color: string }>)[m.key]?.color
      || FALLBACK_COLOR,
  }));
}

function normalisePricing(data: any): IPricing {
  const engravingPrice = typeof data.engravingPrice === 'number'
    ? data.engravingPrice
    : defaultPricing.engravingPrice;

  return {
    metals: withMetalColors(
      Array.isArray(data.metals) && data.metals.length > 0
        ? data.metals
        : defaultPricing.metals
    ),
    stones: withStoneColors(
      Array.isArray(data.stones) && data.stones.length > 0
        ? data.stones
        : defaultPricing.stones
    ),
    // Pre-upgrades documents seed the array from the legacy flat engraving price.
    upgrades: Array.isArray(data.upgrades) && data.upgrades.length > 0
      ? data.upgrades
      : [{ key: 'engraving', name: 'Engraving', price: engravingPrice }],
    engravingPrice,
  };
}

// Used for an admin-added metal or stone that constants.ts knows nothing about.
const DEFAULT_METAL_3D = { metalness: 1.0, roughness: 0.04, clearcoat: 0.6, clearcoatRoughness: 0.1 };
const DEFAULT_STONE_3D = { transmission: 0.85, ior: 1.77, thickness: 2, roughness: 0.05, clearcoat: 0.8 };

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/**
 * Resolves a pricing entry to its constants.ts twin.
 *
 * Matched on the stored `key` first — the admin UI generates keys and the whole
 * app (localStorage, saved designs, cart lines, AR) already addresses metals and
 * stones by that key, so it must stay the identity. Display name is only a
 * fallback for an entry whose key was renamed.
 */
function findConstEntry<T extends { name: string }>(
  table: Record<string, T>,
  key: string,
  displayName: string
): Partial<T> {
  if (table[key]) return table[key];
  const name = displayName?.toLowerCase() ?? '';
  return Object.values(table).find(v => v.name?.toLowerCase() === name) ?? {};
}

function buildConfiguratorMetals(metals: IMetalEntry[]): ConfiguratorMetal[] {
  return metals.map(m => {
    const key = m.key || slugify(m.displayName);
    const c = findConstEntry(METALS as any, key, m.displayName) as any;
    const color = m.color || c.color || '#c0c0c0';
    return {
      key,
      name: m.displayName,
      color,
      multiplier: m.multiplier ?? 1,
      material: {
        color,
        metalness:          c.metalness          ?? DEFAULT_METAL_3D.metalness,
        roughness:          c.roughness          ?? DEFAULT_METAL_3D.roughness,
        clearcoat:          c.clearcoat          ?? DEFAULT_METAL_3D.clearcoat,
        clearcoatRoughness: c.clearcoatRoughness ?? DEFAULT_METAL_3D.clearcoatRoughness,
      },
    };
  });
}

function buildConfiguratorStones(stones: IStoneEntry[]): ConfiguratorStone[] {
  return stones.map(s => {
    const key = s.key || slugify(s.displayName);
    const c = findConstEntry(STONES as any, key, s.displayName) as any;
    const color = s.color || c.color || '#cccccc';
    return {
      key,
      name: s.displayName,
      color,
      price: s.price ?? 0,
      material: {
        color,
        transmission: c.transmission ?? DEFAULT_STONE_3D.transmission,
        ior:          c.ior          ?? DEFAULT_STONE_3D.ior,
        thickness:    c.thickness    ?? DEFAULT_STONE_3D.thickness,
        roughness:    c.roughness    ?? DEFAULT_STONE_3D.roughness,
        clearcoat:    c.clearcoat    ?? DEFAULT_STONE_3D.clearcoat,
      },
    };
  });
}

const PricingContext = createContext<PricingContextType>({
  pricing: defaultPricing,
  configuratorMetals: buildConfiguratorMetals(defaultPricing.metals),
  configuratorStones: buildConfiguratorStones(defaultPricing.stones),
  pricingLoaded: false,
  refreshPricing: async () => {},
  updatePricing: async () => false,
});

export const usePricing = () => useContext(PricingContext);

export const PricingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pricing, setPricing] = useState<IPricing>(defaultPricing);
  const [pricingLoaded, setPricingLoaded] = useState(false);

  const refreshPricing = async () => {
    try {
      const res = await fetch('/api/pricing');
      if (res.ok) {
        const data = await res.json();
        setPricing(normalisePricing(data));
      }
    } catch {
      console.error('Failed to fetch pricing');
    } finally {
      // Marked loaded even on failure: a down API is a real, if degraded, state —
      // the app proceeds on defaultPricing rather than blocking correction forever.
      setPricingLoaded(true);
    }
  };

  const updatePricing = async (newPricing: Partial<IPricing>, token: string) => {
    try {
      const res = await fetch('/api/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newPricing),
      });
      if (res.ok) {
        const data = await res.json();
        setPricing(normalisePricing(data));
        return true;
      }
    } catch {
      console.error('Failed to update pricing');
    }
    return false;
  };

  useEffect(() => { refreshPricing(); }, []);

  // An admin editing prices in one tab and switching to the configurator in
  // another would otherwise keep seeing the catalogue fetched at mount. One GET
  // per focus — no polling, and it defers to the shared guard so it can't fire
  // while a modal or a half-typed field is open.
  useEffect(() => {
    const onFocus = () => {
      if (shouldPausePolling()) return;
      refreshPricing();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Memoised so the material objects keep their identity between renders — the
  // ring/pendant models rebuild their THREE materials whenever these change.
  const configuratorMetals = useMemo(() => buildConfiguratorMetals(pricing.metals), [pricing.metals]);
  const configuratorStones = useMemo(() => buildConfiguratorStones(pricing.stones), [pricing.stones]);

  return (
    <PricingContext.Provider value={{ pricing, configuratorMetals, configuratorStones, pricingLoaded, refreshPricing, updatePricing }}>
      {children}
    </PricingContext.Provider>
  );
};
