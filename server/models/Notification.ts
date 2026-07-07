import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  role: 'admin' | 'user';
  type: string;
  message: string;
  link: string;
  read: boolean;
}

const notificationSchema = new Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'user'], required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, read: 1 });

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
