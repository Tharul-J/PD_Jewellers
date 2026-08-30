import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  inquiryRef: string;
  orderItems: {
    productId: string;
    name: string;
    price: number;
    image: string;
    category: string;
    isCustom: boolean;
    options?: {
      material?: string;
      gemstone?: string;
      size?: string;
      style?: string;
      modelType?: string;
      engraving?: string;
      font?: string;
    };
  }[];
  shippingAddress: {
    fullName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  totalPrice: number;
  status: 'pending' | 'availability_confirmed' | 'ordered' | 'crafting' | 'ready' | 'completed' | 'declined';
  messages: {
    sender: mongoose.Types.ObjectId;
    senderRole: 'customer' | 'administrator';
    text: string;
    type: 'message' | 'status_change';
    read: boolean;
    createdAt: Date;
  }[];
}

const orderSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    inquiryRef: {
      type: String,
      required: true,
      unique: true,
    },
    orderItems: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        // Custom/configurator pieces have no catalog photo — the frontend
        // sends '' for those and renders a label instead of an <img>.
        image: { type: String, required: false, default: '' },
        category: { type: String, required: true },
        isCustom: { type: Boolean, required: true },
        // Configurator selections carried through so a bespoke item can be
        // reopened later with its exact metal/stone/style, not a default.
        options: {
          material: String,
          gemstone: String,
          size: String,
          style: String,
          modelType: String,
          engraving: String,
          font: String,
        },
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
    status: {
      type: String,
      required: true,
      enum: ['pending', 'availability_confirmed', 'ordered', 'crafting', 'ready', 'completed', 'declined'],
      default: 'pending',
    },
    // Conversation between the customer and the shop about this inquiry.
    // `read` is tracked per role, not per user — every admin shares one read
    // state, which suits a single-shop setup.
    messages: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        senderRole: { type: String, enum: ['customer', 'administrator'], required: true },
        text: { type: String, required: true, maxLength: 1000 },
        type: { type: String, enum: ['message', 'status_change'], default: 'message' },
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Order = mongoose.model<IOrder>('Order', orderSchema);

export default Order;
