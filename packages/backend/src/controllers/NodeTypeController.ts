import { Response } from 'express';
import { NodeRegistry } from '../nodes/NodeRegistry.js';
import axios from 'axios';
import { AuthRequest } from '../middleware/auth.js';

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

  static async testConnection(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { nodeType, parameters } = req.body;

      if (nodeType === 'n8n-nodes-base.http') {
        if (!parameters?.url) {
          res.status(400).json({ success: false, message: 'URL is required' });
          return;
        }

        try {
          // Use HEAD request to check URL accessibility without downloading content
          await axios.head(parameters.url, {
            timeout: 5000,
            validateStatus: (status) => status < 500, // Accept any status < 500 as "reachable"
          });
          res.json({ success: true, message: 'Connection successful' });
        } catch (error: any) {
          if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            res.json({
              success: false,
              message: `Cannot reach ${parameters.url}. Check if the URL is correct.`,
            });
          } else if (error.code === 'ETIMEDOUT') {
            res.json({
              success: false,
              message: 'Connection timeout. The server may be slow or unreachable.',
            });
          } else {
            res.json({
              success: false,
              message: error.message || 'Connection test failed',
            });
          }
        }
      } else {
        res.status(400).json({ success: false, message: 'Test connection not supported for this node type' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
