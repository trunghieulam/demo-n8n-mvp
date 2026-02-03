import { DataSource } from 'typeorm';
import { User } from '../entities/User.js';
import { Workflow } from '../entities/Workflow.js';
import { Execution } from '../entities/Execution.js';
import { Credential } from '../entities/Credential.js';
import { Webhook } from '../entities/Webhook.js';
import { Tag } from '../entities/Tag.js';
import { WorkflowTag } from '../entities/WorkflowTag.js';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DATABASE_PATH || './data/n8n-mvp.db',
  synchronize: process.env.NODE_ENV !== 'production', // Auto-sync in dev
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Workflow, Execution, Credential, Webhook, Tag, WorkflowTag],
  migrations: ['dist/migrations/**/*.js'],
});
