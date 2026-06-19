import mongoose, { Document, Schema } from 'mongoose';

export interface IConfigurableModel extends Document {
  name: string;
  glbUrl: string;
  category: 'ring' | 'pendant';
  basePrice: number;
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
      enum: ['ring', 'pendant'],
      required: true,
    },
    basePrice: {
      type: Number,
      required: true,
      default: 1000,
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
