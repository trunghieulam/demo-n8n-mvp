import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { CredentialService } from '../services/CredentialService.js';

const credentialService = new CredentialService();

const createCredentialSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['httpBasicAuth', 'httpBearerToken', 'slackOAuth2Api', 'genericApiKey']),
  data: z.record(z.unknown()),
});

const updateCredentialSchema = z.object({
  name: z.string().min(1).optional(),
  data: z.record(z.unknown()).optional(),
});

export class CredentialController {
  static async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const typeFilter = req.query.type as string | undefined;
      const credentials = await credentialService.list(req.userId, typeFilter);

      res.json({ data: credentials });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = createCredentialSchema.parse(req.body);
      const credential = await credentialService.create(
        req.userId,
        data.name,
        data.type,
        data.data
      );

      res.status(201).json(credential);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const credential = await credentialService.getById(req.params.id, req.userId);

      if (!credential) {
        res.status(404).json({ error: 'Credential not found' });
        return;
      }

      res.json(credential);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = updateCredentialSchema.parse(req.body);
      const credential = await credentialService.update(req.params.id, req.userId, data);

      res.json(credential);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await credentialService.delete(req.params.id, req.userId);

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async test(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await credentialService.test(req.params.id, req.userId);

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
