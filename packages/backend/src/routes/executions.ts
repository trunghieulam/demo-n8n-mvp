import { Router } from 'express';
import { ExecutionController } from '../controllers/ExecutionController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware); // All routes require authentication

router.get('/', ExecutionController.list);
router.get('/:id', ExecutionController.getById);
router.post('/:id/retry', ExecutionController.retry);
router.post('/:id/stop', ExecutionController.stop);
router.delete('/:id', ExecutionController.delete);

export default router;
