import express from 'express';
import { addOrderItems, getOrders, getMyOrders, updateOrderStatus, deleteOrder } from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, addOrderItems).get(protect, admin, getOrders);
router.route('/myorders').get(protect, getMyOrders);
router.route('/:id').delete(protect, admin, deleteOrder);
router.route('/:id/status').put(protect, admin, updateOrderStatus);

export default router;
