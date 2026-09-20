import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  /** Normalized name, so 'Mens', 'mens' and "Men's" cannot coexist. */
  key: string;
  /** The six built-in categories. Renamable and bannerable, but never deletable. */
  isDefault: boolean;
  /** Cloudinary secure_url. Empty when no banner has been uploaded. */
  bannerImage: string;
  /** Cloudinary public_id, kept so a replaced or deleted banner can be destroyed. */
  bannerPublicId: string;
  /** Built-ins keep their fixed order; everything else sorts after them by name. */
  order: number;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true, index: true },
    isDefault: { type: Boolean, default: false },
    bannerImage: { type: String, default: '' },
    bannerPublicId: { type: String, default: '' },
    order: { type: Number, default: 1000 },
  },
  { timestamps: true }
);

const Category = mongoose.model<ICategory>('Category', categorySchema);

export default Category;
