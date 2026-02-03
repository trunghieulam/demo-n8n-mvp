import { Response } from 'express';
import { NodeRegistry } from '../nodes/NodeRegistry.js';

export class NodeTypeController {
  static async list(req: any, res: Response): Promise<void> {
    try {
      const nodeTypes = NodeRegistry.getAllNodeTypes();

      // Remove execute functions from response (not serializable)
      const nodeTypesData = nodeTypes.map(({ execute, ...rest }) => rest);

      res.json({ data: nodeTypesData });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
