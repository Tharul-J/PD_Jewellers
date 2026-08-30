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
  sendInquiryMessageEmail,
} from '../utils/email.js';

/**
 * The inquiry lifecycle is one-directional. Anything not listed here is
 * rejected, so a completed inquiry can never be walked back to pending.
 * `ordered` is reached by the payment flow, not by an admin transition.
 */
const ORDER_STATUSES = [
  'pending', 'availability_confirmed', 'ordered', 'crafting', 'ready', 'completed', 'declined',
] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['availability_confirmed', 'declined'],
  availability_confirmed: [],
  ordered: ['crafting'],
  crafting: ['ready'],
  ready: ['completed'],
  completed: [],
  declined: [],
};

const countUnread = (messages: any[] = [], fromRole: 'customer' | 'administrator'): number =>
  messages.filter((m: any) => m?.senderRole === fromRole && !m?.read).length;

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
        `/admin?tab=orders&id=${createdOrder._id}`
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
    // ?status=pending filters server-side. Only a real status narrows the query;
    // 'all', a missing param, or anything unrecognised returns the full list.
    const requested = typeof req.query.status === 'string' ? req.query.status : '';
    const filter = ORDER_STATUSES.includes(requested as OrderStatus)
      ? { status: requested as OrderStatus }
      : {};

    const orders = await Order.find(filter)
      .populate('user', 'id name email')
      .sort({ createdAt: -1 })
      .lean();

    // Unread here means "customer said something an admin hasn't seen".
    res.json(orders.map(o => ({ ...o, unreadCount: countUnread(o.messages, 'customer') })));
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
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    // Mirrored for the customer: unread means the shop replied and they haven't looked.
    res.json(orders.map(o => ({ ...o, unreadCount: countUnread(o.messages, 'administrator') })));
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  availability_confirmed: 'Availability Confirmed',
  ordered: 'Ordered',
  crafting: 'Crafting',
  ready: 'Ready for Collection',
  completed: 'Completed / Collection',
  declined: 'Declined',
};

/**
 * Sends the lifecycle email matching an inquiry's new status, if any.
 * Delivery method is encoded in shippingAddress.country ('In-Store Pickup' | 'Home Delivery').
 */
const sendStatusEmail = async (order: any, note?: string): Promise<void> => {
  if (!['availability_confirmed', 'declined', 'completed'].includes(order.status)) return;

  const user = await User.findById(order.user).select('name email');
  if (!user?.email) return;

  if (order.status === 'availability_confirmed') {
    await sendAvailabilityConfirmedEmail(
      user.email,
      user.name,
      order.inquiryRef,
      order.orderItems,
      order.totalPrice,
      note
    );
  } else if (order.status === 'declined') {
    await sendInquiryDeclinedEmail(user.email, user.name, order.inquiryRef, note);
  } else {
    const isPickup = /pickup/i.test(order.shippingAddress?.country || '');
    await sendOrderReadyEmail(user.email, user.name, order.inquiryRef, isPickup, note);
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
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ message: 'Inquiry not found' });
      return;
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      res.status(400).json({
        message: `Cannot move an inquiry from ${STATUS_LABELS[order.status] ?? order.status} to ${STATUS_LABELS[status] ?? status}.`,
      });
      return;
    }

    order.status = status;

    // The transition is recorded in the thread so the customer sees why, and
    // when, each step happened alongside the conversation.
    const trimmedNote = typeof note === 'string' ? note.trim() : '';
    order.messages.push({
      sender: req.user._id,
      senderRole: 'administrator',
      type: 'status_change',
      text: `Status changed to ${STATUS_LABELS[status] ?? status}${trimmedNote ? ': ' + trimmedNote : ''}`,
      read: false,
      createdAt: new Date(),
    } as any);

    const updatedOrder = await order.save();

    await notifyUser(
      updatedOrder.user.toString(),
      'inquiry_status',
      `Your inquiry ${updatedOrder.inquiryRef} is now: ${STATUS_LABELS[updatedOrder.status] ?? updatedOrder.status}`,
      `/profile?tab=orders&id=${updatedOrder._id}`
    );

    // Fire-and-forget: email must never block or fail the status transition.
    void sendStatusEmail(updatedOrder, trimmedNote).catch(err =>
      console.error('[email] status transition email failed:', err)
    );

    res.json({
      ...updatedOrder.toObject(),
      unreadCount: countUnread(updatedOrder.messages as any, 'customer'),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

/** Owner or administrator only. Returns the order, or null if not permitted. */
const loadOrderForParticipant = async (orderId: string, req: Request) => {
  const order = await Order.findById(orderId);
  if (!order) return { order: null, forbidden: false };
  const isOwner = order.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'administrator';
  if (!isOwner && !isAdmin) return { order: null, forbidden: true };
  return { order, forbidden: false };
};

// @desc    Post a message to an inquiry's thread
// @route   POST /api/orders/:id/messages
// @access  Private (owner or admin)
export const addOrderMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for messaging' });
      return;
    }

    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) { res.status(400).json({ message: 'Message text is required' }); return; }
    if (text.length > 1000) { res.status(400).json({ message: 'Message is too long (max 1000 characters)' }); return; }

    const { order, forbidden } = await loadOrderForParticipant(req.params.id, req);
    if (forbidden) { res.status(403).json({ message: 'Not authorised' }); return; }
    if (!order) { res.status(404).json({ message: 'Inquiry not found' }); return; }

    const senderRole = req.user.role === 'administrator' ? 'administrator' : 'customer';

    order.messages.push({
      sender: req.user._id,
      senderRole,
      text,
      type: 'message',
      read: false,
      createdAt: new Date(),
    } as any);

    const saved = await order.save();

    if (senderRole === 'administrator') {
      await notifyUser(
        saved.user.toString(),
        'inquiry_status',
        `New message on your inquiry ${saved.inquiryRef}`,
        `/profile?tab=orders&id=${saved._id}`
      );
      // The customer may not be looking at the site, so this one also emails.
      void (async () => {
        const customer = await User.findById(saved.user).select('name email');
        if (!customer?.email) return;
        await sendInquiryMessageEmail(customer.email, customer.name, saved.inquiryRef, text);
      })().catch(err => console.error('[email] inquiry message failed:', err));
    } else {
      // Admins are in the dashboard already — in-app only, no email.
      // Type must be `new_inquiry`: that is what badges the Inquiries tab.
      // `new_order` badges Sold Items, where the message would never be found.
      await notifyAdmins(
        'new_inquiry',
        `New message from ${req.user.name} on inquiry ${saved.inquiryRef}`,
        `/admin?tab=orders&id=${saved._id}`
      );
    }

    res.status(201).json({
      ...saved.toObject(),
      unreadCount: countUnread(saved.messages as any, senderRole === 'administrator' ? 'customer' : 'administrator'),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Mark the other side's messages as read
// @route   PATCH /api/orders/:id/messages/read
// @access  Private (owner or admin)
export const markOrderMessagesRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for messaging' });
      return;
    }

    const { order, forbidden } = await loadOrderForParticipant(req.params.id, req);
    if (forbidden) { res.status(403).json({ message: 'Not authorised' }); return; }
    if (!order) { res.status(404).json({ message: 'Inquiry not found' }); return; }

    // You clear the other side's messages, never your own: an admin reading the
    // thread marks the customer's messages read, and vice versa.
    const readerRole = req.user.role === 'administrator' ? 'administrator' : 'customer';
    const otherRole = readerRole === 'administrator' ? 'customer' : 'administrator';

    let changed = 0;
    order.messages.forEach((m: any) => {
      if (m.senderRole === otherRole && !m.read) {
        m.read = true;
        changed++;
      }
    });

    if (changed > 0) await order.save();

    res.json({ ...order.toObject(), unreadCount: 0 });
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
