import { DataSource } from 'typeorm';
import { User } from '../entities/User.js';
import { Workflow } from '../entities/Workflow.js';
import { Execution } from '../entities/Execution.js';
import { Credential } from '../entities/Credential.js';
import { Webhook } from '../entities/Webhook.js';
import { Tag } from '../entities/Tag.js';
import { WorkflowTag } from '../entities/WorkflowTag.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DATABASE_PATH || path.join(__dirname, '../../data/n8n-mvp.db'),
  synchronize: process.env.NODE_ENV !== 'production', // Auto-sync in dev
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Workflow, Execution, Credential, Webhook, Tag, WorkflowTag],
  migrations: ['dist/migrations/**/*.js'],
  extra: {
    // SQLite specific options
    busyTimeout: 30000, // Wait up to 30 seconds for the database to be available
  },
});
