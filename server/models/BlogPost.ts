import mongoose, { Document, Schema } from 'mongoose';

export interface IBlogPost extends Document {
  title: string;
  category: string;
  excerpt: string;
  coverImage: string;
  images: string[];
  content: string;
  author: string;
  slug: string;
  publishedAt: Date;
}

const blogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true },
    category: { type: String, default: 'General' },
    excerpt: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    images: [{ type: String }],
    content: { type: String, default: '' },
    author: { type: String, default: 'PD Jewellers' },
    slug: { type: String, unique: true },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const BlogPost = mongoose.model<IBlogPost>('BlogPost', blogPostSchema);
export default BlogPost;
