import React, { createContext, useContext, useState, useEffect } from 'react';
import { METALS, STONES } from '../constants';

export interface IPricing {
  metalMultiplier_silver: number;
  metalMultiplier_gold: number;
  metalMultiplier_rose: number;
  stonePrice_aquamarine: number;
  stonePrice_diamond: number;
  stonePrice_ruby: number;
  stonePrice_emerald: number;
  stonePrice_sapphire: number;
  engravingPrice: number;
}

interface PricingContextType {
  pricing: IPricing | null;
  refreshPricing: () => Promise<void>;
  updatePricing: (newPricing: Partial<IPricing>, token: string) => Promise<boolean>;
}

const defaultPricing: IPricing = {
  metalMultiplier_silver: 1,
  metalMultiplier_gold: 18,
  metalMultiplier_rose: 14,
  stonePrice_aquamarine: 45000,
  stonePrice_diamond: 380000,
  stonePrice_ruby: 95000,
  stonePrice_emerald: 110000,
  stonePrice_sapphire: 150000,
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
        setPricing({
          ...defaultPricing,
          ...data
        });
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
