import mongoose, { Document, Schema } from 'mongoose';

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

export interface IPricingDoc extends IPricing, Document {}

const pricingSchema = new Schema(
  {
    metalMultiplier_silver: { type: Number, default: 1 },
    metalMultiplier_gold: { type: Number, default: 18 },
    metalMultiplier_rose: { type: Number, default: 14 },
    stonePrice_aquamarine: { type: Number, default: 45000 },
    stonePrice_diamond: { type: Number, default: 380000 },
    stonePrice_ruby: { type: Number, default: 95000 },
    stonePrice_emerald: { type: Number, default: 110000 },
    stonePrice_sapphire: { type: Number, default: 150000 },
    engravingPrice: { type: Number, default: 5000 },
  },
  { timestamps: true }
);

const Pricing = mongoose.model<IPricingDoc>('Pricing', pricingSchema);

export default Pricing;
