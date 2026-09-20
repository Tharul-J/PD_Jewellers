import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
  karatage: string;
  metalWeight: string;
  /** Grams. 0 means "unknown, use category default". */
  weight: number;
  hasStones: boolean;
  dateAdded: string;
  views: number;
  /** Manual catalog position set by dragging rows in Admin > Catalog. 0 = never reordered. */
  sortOrder: number;
}

const productSchema = new Schema<IProduct>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String, default: '' },
    karatage: { type: String, default: '' },
    metalWeight: { type: String, default: '' },
    weight: { type: Number, default: 0, min: 0 },
    hasStones: { type: Boolean, default: false },
    dateAdded: { type: String, default: '' },
    views: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Matches the default list sort so the catalog page never hits a collection scan.
productSchema.index({ sortOrder: 1, createdAt: -1 });

const Product = mongoose.model<IProduct>('Product', productSchema);

export default Product;
