import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import mongoose from 'mongoose';

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
      if (email === 'john@example.com' && password === 'password123') {
        res.json({
          _id: 'mock-customer-id',
          name: 'John Doe',
          email: 'john@example.com',
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
      res.json({
        _id: req.user._id,
        name: req.user.role === 'administrator' ? 'Admin User' : 'John Doe',
        email: req.user.role === 'administrator' ? 'admin@pdjewellers.com' : 'john@example.com',
        role: req.user.role,
        wishlist: [],
        savedConfigurations: [],
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
        wishlist: user.wishlist || [],
        savedConfigurations: user.savedConfigurations || [],
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
      res.json([{ productId, name, price, image, category, isCustom }]);
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
      const newConfig = { type, ringSize, metal, stone, engravingText, fontStyle, pendantShape, price };
      res.json([newConfig]);
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
      res.json([]);
      return;
    }
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};
