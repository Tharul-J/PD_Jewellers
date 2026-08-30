import React, { createContext, useContext, useState, useEffect } from 'react';
import { METALS, STONES } from '../constants';

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

interface PricingContextType {
  pricing: IPricing | null;
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

const PricingContext = createContext<PricingContextType>({
  pricing: defaultPricing,
  refreshPricing: async () => {},
  updatePricing: async () => false,
});

export const usePricing = () => useContext(PricingContext);

export const PricingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pricing, setPricing] = useState<IPricing>(defaultPricing);

  const refreshPricing = async () => {
    try {
      const res = await fetch('/api/pricing');
      if (res.ok) {
        const data = await res.json();
        setPricing(normalisePricing(data));
      }
    } catch {
      console.error('Failed to fetch pricing');
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

  return (
    <PricingContext.Provider value={{ pricing, refreshPricing, updatePricing }}>
      {children}
    </PricingContext.Provider>
  );
};
