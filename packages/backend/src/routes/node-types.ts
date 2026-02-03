import { Router } from 'express';
import { NodeTypeController } from '../controllers/NodeTypeController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware); // All routes require authentication

router.get('/', NodeTypeController.list);

export default router;
