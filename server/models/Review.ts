import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  user: mongoose.Types.ObjectId;
  inquiry?: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId | null;
  reviewType: 'site' | 'product';
  rating: number;
  title: string;
  text: string;
  approved: boolean;
}

const reviewSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    inquiry: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
      required: function (this: any) { return this.reviewType === 'product'; },
    },
    reviewType: { type: String, enum: ['site', 'product'], default: 'site' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: '', trim: true, maxlength: 120 },
    text: { type: String, required: true, trim: true, maxlength: 600 },
    approved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Uniqueness is scoped to (user, product, reviewType) — never to user alone, or
// a site review would block every product review and vice versa.
//
// Two partial indexes rather than one, because the two review types need
// different keys. A single index spanning both would read every site review as
// the same null product key and reject all but the first collection-wide.

// One product review per product per user.
reviewSchema.index(
  { user: 1, product: 1, reviewType: 1 },
  { unique: true, partialFilterExpression: { product: { $type: 'objectId' } } }
);

// One site review per user. Scoped to reviewType so it never sees a product
// review; reviews predating the field aren't covered here, so the create route
// counts those against the site slot as well.
reviewSchema.index(
  { user: 1, reviewType: 1 },
  { unique: true, partialFilterExpression: { reviewType: 'site' } }
);
reviewSchema.index({ approved: 1, createdAt: -1 });

const Review = mongoose.model<IReview>('Review', reviewSchema);

export default Review;
