import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Purchase from '../models/Purchase.js';
import User from '../models/User.js';
import { getDefaultOrders } from './userController.js';
import { notifyAdmins } from '../utils/notify.js';
import { sendPaymentReceiptEmail } from '../utils/email.js';

const mockPurchases: Record<string, any[]> = {};

const isConfirmed = (status: string) => status === 'availability_confirmed';

// @desc    Pay for a confirmed inquiry, creating a purchase and locking the inquiry
// @route   POST /api/purchases
// @access  Private
export const createPurchase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inquiryId, cardHolder } = req.body;
    if (!inquiryId) {
      res.status(400).json({ message: 'inquiryId is required' });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      const list = getDefaultOrders(req.user._id);
      const mockOrder = list.find((o: any) => o._id === inquiryId);
      if (!mockOrder) { res.status(404).json({ message: 'Inquiry not found' }); return; }
      if (!isConfirmed(mockOrder.status)) {
        res.status(400).json({ message: 'Inquiry is not confirmed for ordering' });
        return;
      }
      const existing = (mockPurchases[req.user._id] || []).find((p: any) => p.order === inquiryId);
      if (existing) { res.status(400).json({ message: 'Order already placed' }); return; }

      const purchase = {
        _id: 'PUR-' + Math.floor(100000 + Math.random() * 900000),
        user: req.user._id,
        order: inquiryId,
        inquiryRef: mockOrder.inquiryRef,
        items: mockOrder.orderItems,
        totalAmount: mockOrder.totalPrice,
        payment: { cardHolder, cardLast4: '4242', paidAt: new Date().toISOString(), method: 'card' },
        paymentStatus: 'paid',
        createdAt: new Date().toISOString(),
      };
      if (!mockPurchases[req.user._id]) mockPurchases[req.user._id] = [];
      mockPurchases[req.user._id].unshift(purchase);
      mockOrder.status = 'ordered';
      res.status(201).json(purchase);
      return;
    }

    const order = await Order.findById(inquiryId);
    if (!order) { res.status(404).json({ message: 'Inquiry not found' }); return; }
    if (order.user.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorised' });
      return;
    }
    if (!isConfirmed(order.status)) {
      res.status(400).json({ message: 'Inquiry is not confirmed for ordering' });
      return;
    }

    const existing = await Purchase.findOne({ order: order._id });
    if (existing) { res.status(400).json({ message: 'Order already placed' }); return; }

    const purchase = await Purchase.create({
      user: req.user._id,
      order: order._id,
      inquiryRef: order.inquiryRef,
      items: order.orderItems,
      totalAmount: order.totalPrice,
      payment: { cardHolder, cardLast4: '4242', paidAt: new Date(), method: 'card' },
    });

    order.status = 'ordered';
    await order.save();

    await notifyAdmins(
      'new_order',
      `Order placed for inquiry ${order.inquiryRef} — LKR ${Number(purchase.totalAmount).toLocaleString()}`,
      '/admin?tab=sold'
    );

    // Fire-and-forget: a failed receipt must never fail a completed payment.
    void (async () => {
      const user = await User.findById(purchase.user).select('name email');
      if (!user?.email) return;
      await sendPaymentReceiptEmail(
        user.email,
        user.name,
        purchase.inquiryRef,
        purchase.items,
        purchase.totalAmount,
        purchase.payment?.paidAt ?? new Date()
      );
    })().catch(err => console.error('[email] payment receipt failed:', err));

    res.status(201).json(purchase);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Get logged in user's purchases
// @route   GET /api/purchases/my
// @access  Private
export const getMyPurchases = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json(mockPurchases[req.user._id] || []);
      return;
    }
    const purchases = await Purchase.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Get all purchases (sold items)
// @route   GET /api/purchases
// @access  Private/Admin
export const getAllPurchases = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const all = Object.values(mockPurchases).flat().map((p: any) => ({
        ...p,
        user: { _id: p.user, name: 'Demo User', email: '' },
      }));
      res.json(all);
      return;
    }
    const purchases = await Purchase.find({}).populate('user', 'name email').sort({ createdAt: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};
