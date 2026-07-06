import mongoose, { Document, Schema } from 'mongoose';

export interface ISiteConfig extends Document {
  configuratorEnabled: boolean;
}

const siteConfigSchema = new Schema(
  {
    configuratorEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const SiteConfig = mongoose.model<ISiteConfig>('SiteConfig', siteConfigSchema);

export default SiteConfig;
