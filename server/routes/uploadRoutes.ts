import path from 'path';
import express from 'express';
import multer from 'multer';
import fs from 'fs';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

function checkFileType(file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const filetypes = /glb|gltf|jpg|jpeg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype) || file.mimetype === 'model/gltf-binary' || file.mimetype === 'model/gltf+json' || file.mimetype === 'application/octet-stream';

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('GLB, GLTF, and Images only!'));
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.send({
    message: 'File Uploaded',
    url: `/uploads/${req.file.filename}`,
  });
});

export default router;
