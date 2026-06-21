import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
  karatage: string;
  hasStones: boolean;
  dateAdded: string;
  views: number;
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
    hasStones: { type: Boolean, default: false },
    dateAdded: { type: String, default: '' },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Product = mongoose.model<IProduct>('Product', productSchema);

export default Product;
