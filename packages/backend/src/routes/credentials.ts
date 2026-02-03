import { Router } from 'express';
import { CredentialController } from '../controllers/CredentialController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware); // All routes require authentication

router.get('/', CredentialController.list);
router.post('/', CredentialController.create);
router.get('/:id', CredentialController.getById);
router.patch('/:id', CredentialController.update);
router.delete('/:id', CredentialController.delete);
router.post('/:id/test', CredentialController.test);

export default router;
