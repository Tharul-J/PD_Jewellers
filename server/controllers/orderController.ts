import { Request, Response } from 'express';
import Order from '../models/Order.js';

// @desc    Create new order (with simulated payment)
// @route   POST /api/orders
// @access  Private
export const addOrderItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderItems, shippingAddress, totalPrice } = req.body;

    if (orderItems && orderItems.length === 0) {
      res.status(400).json({ message: 'No order items' });
      return;
    } else {
      const order = new Order({
        user: req.user._id,
        orderItems,
        shippingAddress,
        totalPrice,
        isPaid: true,
        paidAt: Date.now(),
        status: 'order_confirmed',
      });

      const createdOrder = await order.save();
      res.status(201).json(createdOrder);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({}).populate('user', 'id name email');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({ user: req.user._id });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = req.body.status;
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};
