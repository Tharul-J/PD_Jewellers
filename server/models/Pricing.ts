import mongoose, { Document, Schema } from 'mongoose';

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

export interface IPricingDoc extends IPricing, Document {}

const metalEntrySchema = new Schema<IMetalEntry>(
  { key: String, displayName: String, multiplier: { type: Number, default: 1 } },
  { _id: false }
);

const stoneEntrySchema = new Schema<IStoneEntry>(
  { key: String, displayName: String, price: { type: Number, default: 0 } },
  { _id: false }
);

const pricingSchema = new Schema<IPricingDoc>(
  {
    metals:        { type: [metalEntrySchema], default: [] },
    stones:        { type: [stoneEntrySchema], default: [] },
    engravingPrice:{ type: Number, default: 5000 },
  },
  { timestamps: true, strict: false }  // strict:false lets us read old flat fields during migration
);

const Pricing = mongoose.model<IPricingDoc>('Pricing', pricingSchema);
export default Pricing;
