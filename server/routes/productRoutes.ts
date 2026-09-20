import express from 'express';
import { getProducts, getProductById, getFeaturedProducts, createProduct, updateProduct, deleteProduct, reorderProducts } from '../controllers/productController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getProducts);
router.post('/', protect, admin, createProduct);
// Must precede '/:id', otherwise "featured" is looked up as a product SKU.
router.get('/featured', getFeaturedProducts);
// Same reason: must precede '/:id' so "reorder" isn't treated as a product id.
router.put('/reorder', protect, admin, reorderProducts);
router.get('/:id', getProductById);
router.put('/:id', protect, admin, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

export default router;
