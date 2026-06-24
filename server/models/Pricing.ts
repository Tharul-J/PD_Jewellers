import mongoose, { Document, Schema } from 'mongoose';

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

export interface IPricingDoc extends IPricing, Document {}

const pricingSchema = new Schema(
  {
    metalMultiplier_silver:   { type: Number, default: 1 },
    metalMultiplier_white:    { type: Number, default: 13 },
    metalMultiplier_gold:     { type: Number, default: 18 },
    metalMultiplier_rose:     { type: Number, default: 13 },
    metalMultiplier_platinum: { type: Number, default: 22 },
    stonePrice_aquamarine:    { type: Number, default: 65000 },
    stonePrice_diamond:       { type: Number, default: 95000 },
    stonePrice_ruby:          { type: Number, default: 145000 },
    stonePrice_emerald:       { type: Number, default: 120000 },
    stonePrice_sapphire:      { type: Number, default: 185000 },
    stonePrice_padparadscha:  { type: Number, default: 480000 },
    stonePrice_moonstone:     { type: Number, default: 45000 },
    stonePrice_yellowsapphire:{ type: Number, default: 75000 },
    engravingPrice:           { type: Number, default: 5000 },
  },
  { timestamps: true }
);

const Pricing = mongoose.model<IPricingDoc>('Pricing', pricingSchema);

export default Pricing;
