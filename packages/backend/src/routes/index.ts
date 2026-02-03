import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import credentialRoutes from './credentials.js';
import workflowRoutes from './workflows.js';
import tagRoutes from './tags.js';
import nodeTypeRoutes from './node-types.js';
import executionRoutes from './executions.js';
import webhookRoutes from './webhooks.js';

const router: Router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/credentials', credentialRoutes);
router.use('/workflows', workflowRoutes);
router.use('/tags', tagRoutes);
router.use('/node-types', nodeTypeRoutes);
router.use('/executions', executionRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
