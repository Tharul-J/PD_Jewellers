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

export interface IPricingDoc extends IPricing, Document {}

const metalEntrySchema = new Schema<IMetalEntry>(
  { key: String, displayName: String, multiplier: { type: Number, default: 1 } },
  { _id: false }
);

const stoneEntrySchema = new Schema<IStoneEntry>(
  { key: String, displayName: String, price: { type: Number, default: 0 }, color: String },
  { _id: false }
);

const upgradeEntrySchema = new Schema<IUpgradeEntry>(
  { key: String, name: String, price: { type: Number, default: 0 } },
  { _id: false }
);

const pricingSchema = new Schema<IPricingDoc>(
  {
    metals:        { type: [metalEntrySchema], default: [] },
    stones:        { type: [stoneEntrySchema], default: [] },
    upgrades:      { type: [upgradeEntrySchema], default: [] },
    engravingPrice:{ type: Number, default: 5000 },
  },
  { timestamps: true, strict: false }  // strict:false lets us read old flat fields during migration
);

const Pricing = mongoose.model<IPricingDoc>('Pricing', pricingSchema);
export default Pricing;
