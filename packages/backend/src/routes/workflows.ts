import { Router } from 'express';
import { WorkflowController } from '../controllers/WorkflowController.js';
import { ExecutionController } from '../controllers/ExecutionController.js';
import { authMiddleware } from '../middleware/auth.js';

const router: Router = Router();

router.use(authMiddleware); // All routes require authentication

router.get('/', WorkflowController.list);
router.post('/', WorkflowController.create);
router.get('/templates', WorkflowController.listTemplates);
router.post('/from-template', WorkflowController.createFromTemplate);
router.get('/:id', WorkflowController.getById);
router.patch('/:id', WorkflowController.update);
router.delete('/:id', WorkflowController.delete);
router.post('/:id/duplicate', WorkflowController.duplicate);
router.post('/:id/activate', WorkflowController.activate);
router.post('/:id/deactivate', WorkflowController.deactivate);
router.post('/:id/execute', ExecutionController.executeWorkflow);

export default router;
