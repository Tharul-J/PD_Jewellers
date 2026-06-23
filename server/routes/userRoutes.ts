import express from 'express';
import { authUser, registerUser, getUserProfile, updateUserProfile, toggleWishlistItem, saveConfiguration, getUsers, updateUserRole, deleteUser } from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(registerUser).get(protect, admin, getUsers);
router.post('/login', authUser);
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
router.post('/wishlist', protect, toggleWishlistItem);
router.post('/configurations', protect, saveConfiguration);
router.route('/:id').put(protect, admin, updateUserRole).delete(protect, admin, deleteUser);

export default router;
