import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authMiddleware } from '../middleware/auth.js';

const router: Router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', authMiddleware, AuthController.getMe);

export default router;
