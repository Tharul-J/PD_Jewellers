import { Request, Response } from 'express';
import mongoose from 'mongoose';
import BlogPost from '../models/BlogPost.js';

const SEED_POSTS = [
  {
    title: 'The Modern Sri Lankan Guide to Layering Necklaces and Rings',
    category: 'Styling Tips',
    excerpt: 'From the elegant Peti Maala to minimalist everyday wear — balancing heritage with contemporary style.',
    coverImage: 'https://dropinblog.net/34252283/files/featured/Jewellery_Layering.jpg',
    images: ['https://dropinblog.net/34252283/files/featured/Jewellery_Layering.jpg'],
    author: 'PD Jewellers',
    slug: 'modern-sri-lankan-guide-layering-necklaces-rings',
    publishedAt: new Date('2026-06-01'),
    content: `Every Sri Lankan woman knows the breathtaking impact of traditional multi-layered bridal jewelry—from the elegant Peti Maala to the intricate Paththiri Mal Maala. But how do you bring that beautiful, layered aesthetic into your everyday, modern wardrobe without looking like you are headed straight to a wedding porch (Poruwa)?

The secret lies in balancing heritage patterns with contemporary minimalist trends.

## The Neckline Blueprint: Mix Your Chains

When layering necklaces for a casual lunch in Colombo or a professional day at the office, stick to the Rule of Three with distinct lengths:

• The Base (14–16 inches): A delicate, plain choke-style chain or a subtle herringbone pattern.
• The Focal Point (18 inches): A mid-length chain featuring a small, meaningful gemstone—like a brilliant blue Ceylon Sapphire or a delicate moonstone drop.
• The Anchor (20–22 inches): A longer, structural piece. You can use a modern geometric pendant here, or a tiny, stylized contemporary adaptation of a traditional Peti Maala coin.

## The Ring Stack: Combine Textures, Not Just Sizes

Don't just wear multiple rings on different fingers; stack them intentionally on one or two fingers.

• Pair smooth with textured: Place an ultra-smooth 22-karat yellow gold band directly next to a diamond-encrusted chevron ring or a hand-stamped rope band.
• Leave "Negative Space": Use an open-front ring or a curved band to create small gaps of skin between your jewelry pieces. This keeps the stack looking light, airy, and thoroughly modern.`,
  },
  {
    title: 'Why Ceylon Sapphire Bezel Settings Are Dominating Sri Lankan Engagement Trends',
    category: 'Engagement',
    excerpt: 'A massive shift is happening among modern couples — from classic claw prongs to smooth, contemporary bezel settings.',
    coverImage: 'https://www.bluelankatours.com/wp-content/uploads/2019/02/Gem-1100x732.jpg',
    images: [
      'https://www.bluelankatours.com/wp-content/uploads/2019/02/Gem-1100x732.jpg',
      'https://www.shafteldiamonds.com/wp-content/uploads/2024/09/Sapphire-Colours.webp',
    ],
    author: 'PD Jewellers',
    slug: 'ceylon-sapphire-bezel-settings-engagement-trends',
    publishedAt: new Date('2026-06-08'),
    content: `For decades, the standard for a Sri Lankan engagement ring was clear: a stunning oval-cut Ceylon Blue Sapphire raised high in a traditional diamond halo setting. While that look remains timeless, a massive shift is happening among modern couples.

Enter the Bezel Setting—a design where a smooth rim of precious metal entirely surrounds the edge of the gemstone, holding it completely flush.

## 1. Zero Snagging on Traditional Fabrics

Traditional claw prongs look beautiful, but they are notorious for snagging on delicate fabrics. If you regularly wear a fine georgette, silk, or embroidered lace saree, a pronged ring can easily pull threads. A bezel setting features completely smooth, rounded metal edges that glide effortlessly over the most fragile silk sarees.

## 2. Ultimate Protection for Your Gemstone

Although sapphires are incredibly durable (ranking 9 on the Mohs hardness scale), their edges can still chip if struck hard against a surface. The solid gold or platinum border of a bezel setting acts like a protective armor casing, absorbing the shock of everyday bumps and drops.

## 3. It Makes the Sapphire Look Larger

When a master craftsman wraps a bright band of white gold or platinum smoothly around a vivid blue sapphire, the metal rim acts like a mirror. It visually extends the borders of the stone, giving your center gem a larger, bolder presence on your finger.`,
  },
  {
    title: 'Behind the Bench: How Sri Lankan Master Artisans Blend 3D Technology with Traditional Craft',
    category: 'Craftsmanship',
    excerpt: "Sri Lanka's finest jewellery houses are pairing ancient lost-wax casting techniques with cutting-edge 3D design software.",
    coverImage: 'https://sanajewellers.com/cdn/shop/articles/sana_jewellers_8_1024x1024.jpg?v=1750878499',
    images: [
      'https://io.dropinblog.com/uploaded/blogs/34252283/files/jewellery_layering.jpg',
      'https://sanajewellers.com/cdn/shop/articles/sana_jewellers_8_1024x1024.jpg?v=1750878499',
    ],
    author: 'PD Jewellers',
    slug: 'sri-lankan-artisans-blend-3d-technology-traditional-craft',
    publishedAt: new Date('2026-06-15'),
    content: `Sri Lanka's rich jewelry heritage spans thousands of years, passed down through generations of traditional artisans in historic hubs like Galle and Kandy. Today, a quiet revolution is happening at the workbench. The country's finest jewelry houses aren't abandoning ancient techniques—they are pairing them with cutting-edge 3D design technology.

## Step 1: The Digital Blueprint (CAD Design)

The creation of a modern luxury piece begins on a computer screen. Using Computer-Aided Design (CAD) software, designers map out the exact dimensions of a ring or pendant down to a fraction of a millimeter. This allows clients to view an incredibly realistic 3D model of their custom piece before any gold is even melted.

## Step 2: High-Precision 3D Printing

Once the digital design is finalized, it is sent to a high-precision 3D printer. Instead of plastic, this printer uses a specialized jewelry-grade casting wax or resin to print a physical, three-dimensional replica of the piece.

## Step 3: The Ancient Art of Lost-Wax Casting

This is where technology meets thousands of years of human history. The 3D-printed wax model is placed inside a metal flask and covered in a plaster mixture. Once dry, the flask is heated in a furnace until the wax completely melts and drains away, leaving a perfect hollow impression inside the plaster. Molten precious metal (such as 18k yellow gold or white gold) is then poured into that exact cavity.

## Step 4: Hand-Setting and Polishing

Technology can map out the lines, but it takes a true human touch to bring a piece to life. After casting, a traditional Sri Lankan master setter takes over. Using fine handheld microscopes and specialized pushers, they meticulously set each gemstone by hand and polish the metal until it achieves its signature mirror-like luster.`,
  },
];

export const getBlogPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json(SEED_POSTS.map((p, i) => ({ ...p, _id: `seed-${i}`, createdAt: p.publishedAt })));
      return;
    }
    const posts = await BlogPost.find({}).sort({ publishedAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const createBlogPost = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for blog management' });
      return;
    }
    const { title, category, excerpt, coverImage, images, content, author } = req.body;
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now();
    const post = new BlogPost({
      title,
      category: category || 'General',
      excerpt: excerpt || '',
      coverImage: coverImage || '',
      images: Array.isArray(images) ? images : [],
      content: content || '',
      author: author || 'PD Jewellers',
      slug,
      publishedAt: new Date(),
    });
    const created = await post.save();
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const updateBlogPost = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for blog management' });
      return;
    }
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    const { title, category, excerpt, coverImage, images, content, author } = req.body;
    if (title !== undefined) {
      post.title = title;
      post.slug =
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
        '-' +
        Date.now();
    }
    if (category !== undefined) post.category = category;
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (coverImage !== undefined) post.coverImage = coverImage;
    if (images !== undefined) post.images = Array.isArray(images) ? images : [];
    if (content !== undefined) post.content = content;
    if (author !== undefined) post.author = author;
    const updated = await post.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const deleteBlogPost = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for blog management' });
      return;
    }
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const seedBlogPosts = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const count = await BlogPost.countDocuments();
    if (count === 0) {
      await BlogPost.insertMany(SEED_POSTS);
      console.log('Blog posts seeded successfully.');
    }
  } catch (error) {
    console.error('Blog seed error:', error);
  }
};
