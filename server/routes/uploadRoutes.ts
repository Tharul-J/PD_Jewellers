import express from 'express';
import multer from 'multer';
import { uploadGlbToCloudinary } from '../utils/cloudinaryStorage.js';

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

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  console.log(`[Upload] file=${req.file.originalname} mimetype=${req.file.mimetype} buffer=${req.file.buffer?.length ?? 'null'} bytes`);

  const url = await uploadGlbToCloudinary(req.file.buffer, req.file.originalname);

  if (!url) {
    return res.status(500).json({ message: 'Cloudinary upload failed. Please try again.' });
  }

  res.json({ message: 'File Uploaded', url });
});

export default router;
