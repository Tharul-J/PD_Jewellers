import mongoose, { Document, Schema } from 'mongoose';

export interface IMetalEntry {
  key: string;
  displayName: string;
  /** LKR per gram. 0 until an admin sets a real rate. */
  pricePerGram: number;
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

export interface IPricingDoc extends IPricing, Document {}

// strict:false on each entry schema, not just the root: a subdocument schema is
// strict by default regardless of the parent's setting, so a field the entry
// schema does not declare is dropped on save with no error. That is how a
// renamed pricing field goes missing silently — the write succeeds and the API
// echoes the value back from the in-memory object, while Mongo never stores it.
const metalEntrySchema = new Schema<IMetalEntry>(
  {
    key: String,
    displayName: String,
    pricePerGram: { type: Number, default: 0, min: 0 },
    color: String,
  },
  { _id: false, strict: false }
);

const stoneEntrySchema = new Schema<IStoneEntry>(
  { key: String, displayName: String, price: { type: Number, default: 0, min: 0 }, color: String },
  { _id: false, strict: false }
);

const upgradeEntrySchema = new Schema<IUpgradeEntry>(
  { key: String, name: String, price: { type: Number, default: 0, min: 0 } },
  { _id: false, strict: false }
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
