import express from 'express';
import multer from 'multer';
import { uploadGlbToCloudinary, uploadProductImageToCloudinary } from '../utils/cloudinaryStorage.js';
import { compressGlb } from '../utils/compressGlb.js';

const router = express.Router();

function checkFileType(file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const extname = /\.(glb|gltf)$/i.test(file.originalname);
  const mimetype =
    file.mimetype === 'model/gltf-binary' ||
    file.mimetype === 'model/gltf+json' ||
    file.mimetype === 'application/octet-stream';

  if (extname || mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('GLB and GLTF files only!'));
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => checkFileType(file, cb),
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Images only (jpg, png, webp)!'));
    }
  },
});

// Product images. Multer rejections come back as 400 JSON rather than a raw 500.
router.post('/image', (req, res) => {
  imageUpload.single('file')(req, res, async (err: unknown) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be 10MB or smaller'
          : (err as Error).message || 'Upload rejected';
      return res.status(400).json({ message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const url = await uploadProductImageToCloudinary(req.file.buffer);
    if (!url) {
      return res.status(500).json({ message: 'Cloudinary upload failed. Please try again.' });
    }
    res.json({ message: 'File Uploaded', url });
  });
});

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }


  const compressedBuffer = await compressGlb(req.file.buffer);
  const url = await uploadGlbToCloudinary(compressedBuffer, req.file.originalname);

  if (!url) {
    return res.status(500).json({ message: 'Cloudinary upload failed. Please try again.' });
  }

  res.json({ message: 'File Uploaded', url });
});

export default router;
