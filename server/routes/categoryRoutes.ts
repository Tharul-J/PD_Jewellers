import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const uploadBanner = multer({
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

/**
 * A rejected file is the admin's mistake, not a server fault: without this the
 * fileFilter/limit error reaches the default handler as a 500 with an HTML body,
 * which the admin UI cannot show a reason from.
 */
const handleUploadError = (err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Banner must be 5MB or smaller' : err.message;
    res.status(400).json({ message });
    return;
  }
  if (err instanceof Error) {
    res.status(400).json({ message: err.message });
    return;
  }
  next(err);
};

router.route('/')
  .get(getCategories)
  .post(protect, admin, uploadBanner.single('banner'), handleUploadError, createCategory);

router.route('/:id')
  .put(protect, admin, uploadBanner.single('banner'), handleUploadError, updateCategory)
  .delete(protect, admin, deleteCategory);

export default router;
