import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { mockOrders, getDefaultOrders } from './userController.js';
import { notifyAdmins, notifyUser } from '../utils/notify.js';
import { newestFirst } from '../utils/sort.js';
import {
  sendAvailabilityConfirmedEmail,
  sendInquiryDeclinedEmail,
  sendOrderReadyEmail,
} from '../utils/email.js';

// @desc    Create new inquiry/order request
// @route   POST /api/orders
// @access  Private
export const addOrderItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderItems, shippingAddress, totalPrice } = req.body;

    if (orderItems && orderItems.length === 0) {
      res.status(400).json({ message: 'No inquiry items found' });
      return;
    } else {
      const inquiryRef = 'INQ-' + Math.floor(100000 + Math.random() * 900000);
      
      if (mongoose.connection.readyState !== 1) {
        const userId = req.user._id;
        const newOrder = {
          _id: 'ORD-2026-' + Math.floor(1000 + Math.random() * 9000),
          inquiryRef,
          user: userId,
          orderItems,
          shippingAddress: shippingAddress || {
            street: 'No. 42, Galle Road',
            city: 'Colombo 03',
            state: 'Western Province',
            zip: '00300',
            country: 'Sri Lanka'
          },
          totalPrice,
          createdAt: new Date().toISOString(),
          status: 'pending'
        };
        const list = getDefaultOrders(userId);
        list.unshift(newOrder);
        mockOrders[userId] = list;
        res.status(201).json(newOrder);
        return;
      }
      const order = new Order({
        user: req.user._id,
        inquiryRef,
        orderItems,
        shippingAddress,
        totalPrice,
        status: 'pending',
      });

      const createdOrder = await order.save();

      await notifyAdmins(
        'new_inquiry',
        `New inquiry ${createdOrder.inquiryRef} from ${req.user.name}`,
        '/admin?tab=orders'
      );

      res.status(201).json(createdOrder);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Get all inquiries
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json(newestFirst([
        {
          _id: 'ORD-2026-9041',
          inquiryRef: 'INQ-904183',
          user: { _id: 'mock-customer-id', name: 'Tharul Senanayake', email: 'tharul2002@gmail.com' },
          orderItems: [
            {
              name: '22K Classic Yellow Gold Gents Ring (RI001)',
              price: 155000,
              image: 'https://www.swarnamahal.lk/cdn/shop/files/RI0002126C.jpg?v=1692788516',
              category: 'Rings'
            }
          ],
          totalPrice: 155000,
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed'
        },
        {
          _id: 'ORD-2026-1182',
          inquiryRef: 'INQ-118239',
          user: { _id: 'mock-customer-id', name: 'Tharul Senanayake', email: 'tharul2002@gmail.com' },
          orderItems: [
            {
              name: '22K Swarovski Starlet Ear Studs (ES001)',
              price: 72000,
              image: 'https://www.swarnamahal.lk/cdn/shop/files/ES0000869B.jpg?v=1692020976',
              category: 'Earrings'
            }
          ],
          totalPrice: 72000,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'crafting'
        },
        {
          _id: 'ORD-2026-8802',
          inquiryRef: 'INQ-880210',
          user: { _id: 'mock-id-3', name: 'Dilini Perera', email: 'dilini@gmail.com' },
          orderItems: [
            {
              name: '22K Swarovski Zirconia Choker Necklace (NE007)',
              price: 540000,
              image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0000974A.jpg?v=1593000004',
              category: 'Necklaces'
            }
          ],
          totalPrice: 540000,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'availability_confirmed'
        },
        {
          _id: 'ORD-2026-3409',
          inquiryRef: 'INQ-340941',
          user: { _id: 'mock-id-4', name: 'Kusal Fernando', email: 'kusal@gmail.com' },
          orderItems: [
            {
              name: '22K Gold Classic Kara Bangle (BA002)',
              price: 365000,
              image: 'https://www.swarnamahal.lk/cdn/shop/products/BR0000032B.jpg?v=1615533910',
              category: 'Bangles'
            }
          ],
          totalPrice: 365000,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        }
      ]));
      return;
    }
    const orders = await Order.find({}).populate('user', 'id name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Get a single inquiry (owner or admin)
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const mock = getDefaultOrders(req.user._id).find((o: any) => o._id === req.params.id);
      if (!mock) { res.status(404).json({ message: 'Inquiry not found' }); return; }
      res.json(mock);
      return;
    }
    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404).json({ message: 'Inquiry not found' }); return; }
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'administrator') {
      res.status(403).json({ message: 'Not authorised' });
      return;
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Get logged in user inquiries
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json(newestFirst(getDefaultOrders(req.user._id)));
      return;
    }
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  availability_confirmed: 'Availability Confirmed',
  ordered: 'Ordered',
  crafting: 'Crafting',
  completed: 'Completed / Collection',
  declined: 'Declined',
};

/**
 * Sends the lifecycle email matching an inquiry's new status, if any.
 * Delivery method is encoded in shippingAddress.country ('In-Store Pickup' | 'Home Delivery').
 */
const sendStatusEmail = async (order: any): Promise<void> => {
  if (!['availability_confirmed', 'declined', 'completed'].includes(order.status)) return;

  const user = await User.findById(order.user).select('name email');
  if (!user?.email) return;

  if (order.status === 'availability_confirmed') {
    await sendAvailabilityConfirmedEmail(
      user.email,
      user.name,
      order.inquiryRef,
      order.orderItems,
      order.totalPrice
    );
  } else if (order.status === 'declined') {
    await sendInquiryDeclinedEmail(user.email, user.name, order.inquiryRef);
  } else {
    const isPickup = /pickup/i.test(order.shippingAddress?.country || '');
    await sendOrderReadyEmail(user.email, user.name, order.inquiryRef, isPickup);
  }
};

// @desc    Update inquiry status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json({ message: 'Mock updated inquiry status', status: req.body.status });
      return;
    }
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = req.body.status;
      const updatedOrder = await order.save();

      await notifyUser(
        updatedOrder.user.toString(),
        'inquiry_status',
        `Your inquiry ${updatedOrder.inquiryRef} is now: ${STATUS_LABELS[updatedOrder.status] ?? updatedOrder.status}`,
        '/profile?tab=orders'
      );

      // Fire-and-forget: email must never block or fail the status transition.
      void sendStatusEmail(updatedOrder).catch(err =>
        console.error('[email] status transition email failed:', err)
      );

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Inquiry not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Cancel own inquiry (only while still pending review)
// @route   DELETE /api/orders/:id/cancel
// @access  Private
export const cancelMyOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for order management' });
      return;
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: 'Inquiry not found' });
      return;
    }

    if (order.user.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorised' });
      return;
    }

    if (order.status !== 'pending') {
      res.status(400).json({ message: 'This inquiry can no longer be cancelled. Please contact us directly.' });
      return;
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Inquiry cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Delete an inquiry
// @route   DELETE /api/orders/:id
// @access  Private/Admin
export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for order management' });
      return;
    }
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) { res.status(404).json({ message: 'Inquiry not found' }); return; }
    res.json({ message: 'Inquiry removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};
