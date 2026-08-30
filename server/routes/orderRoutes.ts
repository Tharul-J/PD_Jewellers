import express from 'express';
import { addOrderItems, getOrders, getMyOrders, getOrderById, updateOrderStatus, deleteOrder, cancelMyOrder, addOrderMessage, markOrderMessagesRead } from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, addOrderItems).get(protect, admin, getOrders);
router.route('/myorders').get(protect, getMyOrders);
router.route('/:id/cancel').delete(protect, cancelMyOrder);
router.route('/:id').get(protect, getOrderById).delete(protect, admin, deleteOrder);
router.route('/:id/status').put(protect, admin, updateOrderStatus);
router.route('/:id/messages').post(protect, addOrderMessage);
router.route('/:id/messages/read').patch(protect, markOrderMessagesRead);

export default router;
