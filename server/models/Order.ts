import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  orderItems: {
    productId: string;
    name: string;
    price: number;
    image: string;
    category: string;
    isCustom: boolean;
  }[];
  shippingAddress: {
    fullName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  totalPrice: number;
  isPaid: boolean;
  paidAt?: Date;
  status: 'order_confirmed' | 'crafting' | 'finished' | 'ready_for_collection';
}

const orderSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    orderItems: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        image: { type: String, required: true },
        category: { type: String, required: true },
        isCustom: { type: Boolean, required: true },
      },
    ],
    shippingAddress: {
      fullName: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: ['order_confirmed', 'crafting', 'finished', 'ready_for_collection'],
      default: 'order_confirmed',
    },
  },
  { timestamps: true }
);

const Order = mongoose.model<IOrder>('Order', orderSchema);

export default Order;
