import React, { createContext, useContext, useState, useEffect } from 'react';
import { METALS, STONES } from '../constants';

export interface IMetalEntry {
  key: string;
  displayName: string;
  multiplier: number;
}

export interface IStoneEntry {
  key: string;
  displayName: string;
  price: number;
}

export interface IPricing {
  metals: IMetalEntry[];
  stones: IStoneEntry[];
  engravingPrice: number;
}

interface PricingContextType {
  pricing: IPricing | null;
  refreshPricing: () => Promise<void>;
  updatePricing: (newPricing: Partial<IPricing>, token: string) => Promise<boolean>;
}

const defaultPricing: IPricing = {
  metals: [
    { key: 'silver',     displayName: '925 Sterling Silver',        multiplier: METALS.silver.priceMultiplier    },
    { key: 'white',      displayName: '18K White Gold',              multiplier: METALS.white.priceMultiplier     },
    { key: 'gold',       displayName: '22K Yellow Gold (916 Gold)',  multiplier: METALS.gold.priceMultiplier      },
    { key: 'rose',       displayName: '18K Rose Gold',               multiplier: METALS.rose.priceMultiplier      },
    { key: 'platinum',   displayName: 'Platinum (Pt950)',             multiplier: METALS.platinum.priceMultiplier  },
  ],
  stones: [
    { key: 'aquamarine',     displayName: 'Cornflower / Sky Blue Sapphire', price: STONES.aquamarine.price     },
    { key: 'diamond',        displayName: 'White Ceylon Sapphire',           price: STONES.diamond.price        },
    { key: 'ruby',           displayName: 'Crimson Ceylon Ruby',             price: STONES.ruby.price           },
    { key: 'emerald',        displayName: 'Vibrant Emerald',                 price: STONES.emerald.price        },
    { key: 'sapphire',       displayName: 'Royal Blue Ceylon Sapphire',      price: STONES.sapphire.price       },
    { key: 'padparadscha',   displayName: 'Ceylon Padparadscha Sapphire',    price: STONES.padparadscha.price   },
    { key: 'moonstone',      displayName: 'Premium Blue-Sheen Moonstone',    price: STONES.moonstone.price      },
    { key: 'yellowsapphire', displayName: 'Yellow Ceylon Sapphire',          price: STONES.yellowsapphire.price },
  ],
  engravingPrice: 5000,
};

function normalisePricing(data: any): IPricing {
  return {
    metals: Array.isArray(data.metals) && data.metals.length > 0
      ? data.metals
      : defaultPricing.metals,
    stones: Array.isArray(data.stones) && data.stones.length > 0
      ? data.stones
      : defaultPricing.stones,
    engravingPrice: typeof data.engravingPrice === 'number'
      ? data.engravingPrice
      : defaultPricing.engravingPrice,
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
