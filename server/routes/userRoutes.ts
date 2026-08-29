import express from 'express';
import multer from 'multer';
import { authUser, registerUser, getUserProfile, updateUserProfile, uploadProfilePicture, deleteProfilePicture, updateSavedCard, deleteSavedCard, toggleWishlistItem, saveConfiguration, deleteConfiguration, getUsers, updateUserRole, deleteUser, forgotPassword, resetPassword } from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG or WEBP images are allowed'));
    }
  },
});

router.route('/').post(registerUser).get(protect, admin, getUsers);
router.post('/login', authUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
router.route('/profile-picture')
  .put(protect, uploadImage.single('image'), uploadProfilePicture)
  .delete(protect, deleteProfilePicture);
router.route('/saved-card')
  .put(protect, updateSavedCard)
  .delete(protect, deleteSavedCard);
router.post('/wishlist', protect, toggleWishlistItem);
router.post('/configurations', protect, saveConfiguration);
router.delete('/configurations/:id', protect, deleteConfiguration);
router.route('/:id').put(protect, admin, updateUserRole).delete(protect, admin, deleteUser);

export default router;
