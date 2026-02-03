import { DataSource } from 'typeorm';
// Use entity paths to avoid circular dependency issues
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

// Determine database type from environment
const databaseType = (process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
const isPostgres = databaseType === 'postgres' || databaseType === 'postgresql';

// Base configuration
const baseConfig: any = {
  synchronize: process.env.NODE_ENV !== 'production', // Auto-sync in dev
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Workflow, Execution, Credential, Webhook, Tag, WorkflowTag],
  migrations: ['dist/migrations/**/*.js'],
};

// Database-specific configuration
if (isPostgres) {
  // PostgreSQL configuration
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
  }

  // Parse DATABASE_URL if provided, or use individual components
  const urlPattern = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = databaseUrl.match(urlPattern);

  baseConfig.type = 'postgres';
  baseConfig.url = databaseUrl;
  baseConfig.extra = {
    // Connection pooling for PostgreSQL
    max: 20, // Maximum number of connections in the pool
    min: 5, // Minimum number of connections in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
  };
} else {
  // SQLite configuration (default)
  baseConfig.type = 'sqlite';
  baseConfig.database = process.env.DATABASE_PATH || path.join(__dirname, '../../data/n8n-mvp.db');
  baseConfig.extra = {
    // SQLite specific options
    busyTimeout: 30000, // Wait up to 30 seconds for the database to be available
  };
}

export const AppDataSource = new DataSource(baseConfig);
