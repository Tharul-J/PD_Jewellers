import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  user: mongoose.Types.ObjectId;
  inquiry?: mongoose.Types.ObjectId;
  rating: number;
  text: string;
  approved: boolean;
}

const reviewSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    inquiry: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true, maxlength: 600 },
    approved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1 }, { unique: true }); // one review per user
reviewSchema.index({ approved: 1, createdAt: -1 });

const Review = mongoose.model<IReview>('Review', reviewSchema);

export default Review;
