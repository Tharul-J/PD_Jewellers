import mongoose, { Document, Schema } from 'mongoose';

export interface IConfigurableModel extends Document {
  name: string;
  glbUrl: string;
  category: string;
  basePrice: number;
  /** Grams of metal at the default size; 0 means "use the category default". */
  weight: number;
  isActive: boolean;
}

const configurableModelSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    glbUrl: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    basePrice: {
      type: Number,
      required: true,
      default: 1000,
    },
    weight: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const ConfigurableModel = mongoose.model<IConfigurableModel>('ConfigurableModel', configurableModelSchema);

export default ConfigurableModel;
