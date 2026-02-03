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

# Start backend (dev mode)
pnpm dev:backend

# Start frontend (dev mode)
pnpm dev:frontend
```

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
