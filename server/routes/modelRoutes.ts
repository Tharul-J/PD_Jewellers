import express from 'express';
import { getModels, createModel, updateModel, updateModelStatus, deleteModel } from '../controllers/modelController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(getModels).post(protect, admin, createModel);
router.route('/:id').put(protect, admin, updateModel).delete(protect, admin, deleteModel);
router.route('/:id/status').put(protect, admin, updateModelStatus);

export default router;
