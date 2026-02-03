import { Router } from 'express';
import { WebhookController } from '../controllers/WebhookController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, WebhookController.list);
router.get('/:workflowId/:nodeId', authMiddleware, WebhookController.getByWorkflowAndNode);
router.post('/:workflowId/:nodeId/test', authMiddleware, WebhookController.testCapture);

// Public webhook endpoint
router.all('/:path(*)', WebhookController.receiveWebhook);

export default router;
