import { Router } from 'express';
import { TagController } from '../controllers/TagController.js';
import { authMiddleware } from '../middleware/auth.js';

const router: Router = Router();

router.use(authMiddleware); // All routes require authentication

router.get('/', TagController.list);
router.post('/', TagController.create);
router.delete('/:id', TagController.delete);
router.patch('/workflows/:id', TagController.updateWorkflowTags);

export default router;
