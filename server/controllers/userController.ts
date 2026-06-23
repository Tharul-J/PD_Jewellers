import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import mongoose from 'mongoose';

const mockProfileUpdates: Record<string, any> = {};
export const mockWishlists: Record<string, any[]> = {};
export const mockSavedConfigurations: Record<string, any[]> = {};
export const mockOrders: Record<string, any[]> = {};

export const getDefaultWishlist = (userId: string) => {
  if (!mockWishlists[userId]) {
    mockWishlists[userId] = [
      {
        productId: 'RI001',
        name: '22K Classic Yellow Gold Gents Ring (RI001)',
        price: '155000',
        image: 'https://www.swarnamahal.lk/cdn/shop/files/RI0002126C.jpg?v=1692788516',
        category: 'Rings',
        isCustom: false
      },
      {
        productId: 'NE007',
        name: '22K Swarovski Zirconia Choker Necklace (NE007)',
        price: '540000',
        image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0000974A.jpg?v=1593000004',
        category: 'Necklaces',
        isCustom: false
      }
    ];
  }
  return mockWishlists[userId];
};

export const getDefaultConfigurations = (userId: string) => {
  if (!mockSavedConfigurations[userId]) {
    mockSavedConfigurations[userId] = [
      {
        _id: 'mock-config-1',
        type: 'ring',
        ringSize: '7',
        metal: 'gold',
        stone: 'ruby',
        engravingText: 'PD J. 2026',
        fontStyle: 'helvetiker',
        pendantShape: '',
        price: 185000,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: 'mock-config-2',
        type: 'pendant',
        ringSize: '',
        metal: 'rose',
        stone: 'diamond',
        engravingText: 'Tharul',
        fontStyle: 'optimer_italic',
        pendantShape: 'heart',
        price: 135000,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }
  return mockSavedConfigurations[userId];
};

export const getDefaultOrders = (userId: string) => {
  if (!mockOrders[userId]) {
    mockOrders[userId] = [
      {
        _id: 'ORD-2026-9041',
        inquiryRef: 'INQ-904183',
        user: userId,
        orderItems: [
          {
            name: '22K Classic Yellow Gold Gents Ring (RI001)',
            price: 155000,
            image: 'https://www.swarnamahal.lk/cdn/shop/files/RI0002126C.jpg?v=1692788516',
            category: 'Rings'
          }
        ],
        shippingAddress: {
          fullName: 'Tharul Senanayake',
          address: 'No. 42, Galle Road',
          city: 'Colombo 03',
          postalCode: '00300',
          country: 'Sri Lanka'
        },
        totalPrice: 155000,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed'
      },
      {
        _id: 'ORD-2026-1182',
        inquiryRef: 'INQ-118239',
        user: userId,
        orderItems: [
          {
            name: '22K Swarovski Starlet Ear Studs (ES001)',
            price: 72000,
            image: 'https://www.swarnamahal.lk/cdn/shop/files/ES0000869B.jpg?v=1692020976',
            category: 'Earrings'
          }
        ],
        shippingAddress: {
          fullName: 'Tharul Senanayake',
          address: 'No. 42, Galle Road',
          city: 'Colombo 03',
          postalCode: '00300',
          country: 'Sri Lanka'
        },
        totalPrice: 72000,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'crafting'
      }
    ];
  }
  return mockOrders[userId];
};

const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (mongoose.connection.readyState !== 1) {
      // Mock registration
      res.status(201).json({
        _id: 'mock-new-user-id',
        name,
        email,
        role: 'customer',
        token: generateToken('mock-new-user-id', 'customer'),
      });
      return;
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id.toString(), user.role),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
export const authUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    // Mock user logic if database is not connected
    if (mongoose.connection.readyState !== 1) {
      if (email === 'admin@pdjewellers.com' && password === 'password123') {
        res.json({
          _id: 'mock-admin-id',
          name: 'Admin User',
          email: 'admin@pdjewellers.com',
          role: 'administrator',
          token: generateToken('mock-admin-id', 'administrator'),
        });
        return;
      }
      if ((email === 'john@example.com' || email === 'pathum2@gmail.com' || email === 'pathum2gmail.com' || email === 'tharul2002@gmail.com') && password === 'password123') {
        const isTharul = email === 'tharul2002@gmail.com';
        res.json({
          _id: 'mock-customer-id',
          name: isTharul ? 'Tharul Senanayake' : 'Pathum Bandara',
          email: isTharul ? 'tharul2002@gmail.com' : 'pathum2@gmail.com',
          role: 'customer',
          token: generateToken('mock-customer-id', 'customer'),
        });
        return;
      }
      res.status(401).json({ message: 'Invalid email or password (Mock DB fallback)' });
      return;
    }

    // Type definition for method exists on the Schema instance
    const user: any = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id.toString(), user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Get user profile
// @access  Private
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const mockId = req.user._id;
      const cached = mockProfileUpdates[mockId] || {};
      
      const defaultName = req.user.role === 'administrator' ? 'Admin User' : (req.user.email === 'tharul2002@gmail.com' ? 'Tharul Senanayake' : 'Pathum Bandara');
      const defaultEmail = req.user.role === 'administrator' ? 'admin@pdjewellers.com' : (req.user.email === 'tharul2002@gmail.com' ? 'tharul2002@gmail.com' : 'pathum2@gmail.com');
      const defaultPhone = req.user.role === 'administrator' ? '+94 11 234 5678' : '+94 77 289 1045';
      const defaultAvatar = req.user.role === 'administrator' 
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' 
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'; // Golden Aura style
      const defaultAddress = {
        street: 'No. 42, Galle Road',
        city: 'Colombo 03',
        state: 'Western Province',
        zip: '00300',
        country: 'Sri Lanka'
      };

      res.json({
        _id: req.user._id,
        name: cached.name || defaultName,
        email: cached.email || defaultEmail,
        role: req.user.role,
        phone: cached.phone !== undefined ? cached.phone : defaultPhone,
        avatar: cached.avatar !== undefined ? cached.avatar : defaultAvatar,
        address: cached.address || defaultAddress,
        wishlist: getDefaultWishlist(req.user._id),
        savedConfigurations: getDefaultConfigurations(req.user._id),
        createdAt: '2023-09-18T00:00:00.000Z',
      });
      return;
    }
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: (user as any).phone || '',
        avatar: (user as any).avatar || '',
        address: (user as any).address || { street: '', city: '', state: '', zip: '', country: '' },
        wishlist: user.wishlist || [],
        savedConfigurations: user.savedConfigurations || [],
        createdAt: (user as any).createdAt,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, avatar, address, password } = req.body;

    if (mongoose.connection.readyState !== 1) {
      const mockId = req.user._id;
      const isTharul = req.user.email === 'tharul2002@gmail.com';
      mockProfileUpdates[mockId] = {
        name: name || (mockProfileUpdates[mockId]?.name || (req.user.role === 'administrator' ? 'Admin User' : (isTharul ? 'Tharul Senanayake' : 'Pathum Bandara'))),
        email: email || (mockProfileUpdates[mockId]?.email || (req.user.role === 'administrator' ? 'admin@pdjewellers.com' : (isTharul ? 'tharul2002@gmail.com' : 'pathum2@gmail.com'))),
        phone: phone !== undefined ? phone : (mockProfileUpdates[mockId]?.phone || (req.user.role === 'administrator' ? '+94 11 234 5678' : '+94 77 289 1045')),
        avatar: avatar !== undefined ? avatar : (mockProfileUpdates[mockId]?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'),
        address: address || (mockProfileUpdates[mockId]?.address || { street: 'No. 42, Galle Road', city: 'Colombo 03', state: 'Western Province', zip: '00300', country: 'Sri Lanka' }),
      };
      res.json({
        _id: req.user._id,
        ...mockProfileUpdates[mockId],
        role: req.user.role,
        wishlist: getDefaultWishlist(req.user._id),
        savedConfigurations: getDefaultConfigurations(req.user._id),
        createdAt: '2023-09-18T00:00:00.000Z',
      });
      return;
    }

    const user: any = await User.findById(req.user._id);

    if (user) {
      user.name = name || user.name;
      user.email = email || user.email;
      
      if (phone !== undefined) user.phone = phone;
      if (avatar !== undefined) user.avatar = avatar;
      if (address !== undefined) {
        user.address = {
          street: address.street !== undefined ? address.street : (user.address?.street || ''),
          city: address.city !== undefined ? address.city : (user.address?.city || ''),
          state: address.state !== undefined ? address.state : (user.address?.state || ''),
          zip: address.zip !== undefined ? address.zip : (user.address?.zip || ''),
          country: address.country !== undefined ? address.country : (user.address?.country || ''),
        };
      }

      if (password) {
        user.password = password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone || '',
        avatar: updatedUser.avatar || '',
        address: updatedUser.address || { street: '', city: '', state: '', zip: '', country: '' },
        wishlist: updatedUser.wishlist || [],
        savedConfigurations: updatedUser.savedConfigurations || [],
        createdAt: updatedUser.createdAt,
        token: generateToken(updatedUser._id.toString(), updatedUser.role),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Toggle wishlist item
// @route   POST /api/users/wishlist
// @access  Private
export const toggleWishlistItem = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const { productId, name, price, image, category, isCustom } = req.body;
      const userId = req.user._id;
      let list = getDefaultWishlist(userId);
      const exists = list.some(item => item.productId === productId);
      if (exists) {
        list = list.filter(item => item.productId !== productId);
      } else {
        list.push({ productId, name, price, image, category, isCustom });
      }
      mockWishlists[userId] = list;
      res.json(list);
      return;
    }
    const user = await User.findById(req.user._id);
    const { productId, name, price, image, category, isCustom } = req.body;

    if (user) {
      const itemExists = user.wishlist?.find((item) => item.productId === productId);

      if (itemExists) {
        user.wishlist = user.wishlist?.filter((item) => item.productId !== productId) as any;
      } else {
        const newItem = { productId, name, price, image, category, isCustom };
        user.wishlist = user.wishlist ? [...user.wishlist, newItem] : [newItem] as any;
      }

      await user.save();
      res.json(user.wishlist);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Save configuration
// @route   POST /api/users/configurations
// @access  Private
export const saveConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, ringSize, metal, stone, engravingText, fontStyle, pendantShape, price } = req.body;

    if (mongoose.connection.readyState !== 1) {
      const userId = req.user._id;
      const newConfig = {
        _id: 'mock-config-' + Date.now(),
        type,
        ringSize,
        metal,
        stone,
        engravingText,
        fontStyle,
        pendantShape,
        price,
        createdAt: new Date().toISOString()
      };
      const list = getDefaultConfigurations(userId);
      list.push(newConfig);
      mockSavedConfigurations[userId] = list;
      res.json(list);
      return;
    }

    const user = await User.findById(req.user._id);

    if (user) {
      const newConfig = { type, ringSize, metal, stone, engravingText, fontStyle, pendantShape, price };
      user.savedConfigurations = user.savedConfigurations ? [...user.savedConfigurations, newConfig] : [newConfig] as any;
      await user.save();
      res.json(user.savedConfigurations);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json([
        { _id: 'mock-customer-id', name: 'Tharul Senanayake', email: 'tharul2002@gmail.com', role: 'customer', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
        { _id: 'mock-id-2', name: 'Pathum Bandara', email: 'john@example.com', role: 'customer', createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
        { _id: 'mock-id-3', name: 'Dilini Perera', email: 'dilini@gmail.com', role: 'customer', createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
        { _id: 'mock-id-4', name: 'Kusal Fernando', email: 'kusal@gmail.com', role: 'customer', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { _id: 'mock-id-5', name: 'Amara Wickramasinghe', email: 'amara@gmail.com', role: 'customer', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { _id: 'mock-admin-id', name: 'Admin User', email: 'admin@pdjewellers.com', role: 'administrator', createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() }
      ]);
      return;
    }
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Update user role
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for user management' });
      return;
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    if (String(user._id) === String(req.user._id)) {
      res.status(400).json({ message: 'Cannot change your own role' });
      return;
    }
    user.role = req.body.role;
    const updated = await user.save();
    res.json({ _id: updated._id, name: updated.name, email: updated.email, role: updated.role, createdAt: updated.createdAt });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for user management' });
      return;
    }
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    if (String(user._id) === String(req.user._id)) {
      res.status(400).json({ message: 'Cannot delete your own account' });
      return;
    }
    await user.deleteOne();
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};
