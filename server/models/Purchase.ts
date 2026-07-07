import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchase extends Document {
  user: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;
  inquiryRef: string;
  items: any[];
  totalAmount: number;
  payment: {
    cardLast4: string;
    cardHolder: string;
    paidAt: Date;
    method: string;
  };
  paymentStatus: string;
}

const purchaseSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Order',
      unique: true,
    },
    inquiryRef: {
      type: String,
      required: true,
    },
    items: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    payment: {
      cardLast4: { type: String, default: '4242' },
      cardHolder: { type: String, default: '' },
      paidAt: { type: Date, default: Date.now },
      method: { type: String, default: 'card' },
    },
    paymentStatus: {
      type: String,
      default: 'paid',
      immutable: true,
    },
  },
  { timestamps: true }
);

const Purchase = mongoose.model<IPurchase>('Purchase', purchaseSchema);

export default Purchase;
