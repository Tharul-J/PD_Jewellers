import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  subject: string;
  body: string;
  type: 'individual' | 'announcement';
  recipients: mongoose.Types.ObjectId[];
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sender:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject:    { type: String, required: true, trim: true },
    body:       { type: String, required: true },
    type:       { type: String, enum: ['individual', 'announcement'], required: true },
    recipients: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    readBy:     [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Serves the recipient inbox query (find by recipient, newest first).
messageSchema.index({ recipients: 1, createdAt: -1 });

const Message = mongoose.model<IMessage>('Message', messageSchema);

export default Message;
