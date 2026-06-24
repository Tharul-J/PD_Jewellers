import React, { createContext, useContext, useState, useEffect } from 'react';
import { METALS, STONES } from '../constants';

export interface IPricing {
  // Metals
  metalMultiplier_silver: number;
  metalMultiplier_white: number;
  metalMultiplier_gold: number;
  metalMultiplier_rose: number;
  metalMultiplier_platinum: number;
  // Stones
  stonePrice_aquamarine: number;
  stonePrice_diamond: number;
  stonePrice_ruby: number;
  stonePrice_emerald: number;
  stonePrice_sapphire: number;
  stonePrice_padparadscha: number;
  stonePrice_moonstone: number;
  stonePrice_yellowsapphire: number;
  engravingPrice: number;
}

interface PricingContextType {
  pricing: IPricing | null;
  refreshPricing: () => Promise<void>;
  updatePricing: (newPricing: Partial<IPricing>, token: string) => Promise<boolean>;
}

const defaultPricing: IPricing = {
  metalMultiplier_silver:    METALS.silver.priceMultiplier,
  metalMultiplier_white:     METALS.white.priceMultiplier,
  metalMultiplier_gold:      METALS.gold.priceMultiplier,
  metalMultiplier_rose:      METALS.rose.priceMultiplier,
  metalMultiplier_platinum:  METALS.platinum.priceMultiplier,
  stonePrice_aquamarine:     STONES.aquamarine.price,
  stonePrice_diamond:        STONES.diamond.price,
  stonePrice_ruby:           STONES.ruby.price,
  stonePrice_emerald:        STONES.emerald.price,
  stonePrice_sapphire:       STONES.sapphire.price,
  stonePrice_padparadscha:   STONES.padparadscha.price,
  stonePrice_moonstone:      STONES.moonstone.price,
  stonePrice_yellowsapphire: STONES.yellowsapphire.price,
  engravingPrice: 5000,
};

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
        setPricing({ ...defaultPricing, ...data });
      }
    } catch (e) {
      console.error('Failed to fetch pricing');
    }
  };

  const updatePricing = async (newPricing: Partial<IPricing>, token: string) => {
    try {
      const res = await fetch('/api/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newPricing)
      });
      if (res.ok) {
        const data = await res.json();
        setPricing({ ...defaultPricing, ...data });
        return true;
      }
    } catch (e) {
      console.error('Failed to update pricing');
    }
    return false;
  };

  useEffect(() => {
    refreshPricing();
  }, []);

  return (
    <PricingContext.Provider value={{ pricing, refreshPricing, updatePricing }}>
      {children}
    </PricingContext.Provider>
  );
};
