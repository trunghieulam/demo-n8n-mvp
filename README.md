# N8N MVP - Workflow Automation Platform

A minimal viable product (MVP) implementation of an n8n-like workflow automation platform.

## Architecture

- **Backend**: Node.js + Express + TypeScript + TypeORM
- **Frontend**: React + TypeScript + Zustand + React Flow
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Monorepo**: pnpm workspaces

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Install dependencies
pnpm install

# Seed the database with initial admin user
pnpm --filter backend seed

# Start backend (dev mode)
pnpm dev:backend

# Start frontend (dev mode)
pnpm dev:frontend
```

### Database Setup

After installing dependencies, run the seed script to create an initial admin user:

```bash
pnpm --filter backend seed
```

**Seed Account Credentials:**
- **Email**: `admin@example.com`
- **Password**: `p@ssw0rd`

> **Note**: The seed script will create the admin user if it doesn't exist, or update the password if the user already exists.

### Environment Variables

Create `.env` files in `packages/backend` and `packages/frontend` as needed.

## Project Structure

```
packages/
  backend/     # Express API server
  frontend/   # React application
  shared/     # Shared TypeScript types
```

## Development

- Backend runs on `http://localhost:3001`
- Frontend runs on `http://localhost:3000`

## License

MIT
