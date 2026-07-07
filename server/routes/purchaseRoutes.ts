import express from 'express';
import { createPurchase, getMyPurchases, getAllPurchases } from '../controllers/purchaseController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, createPurchase).get(protect, admin, getAllPurchases);
router.route('/my').get(protect, getMyPurchases);

export default router;
