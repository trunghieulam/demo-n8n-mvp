# N8N MVP - Workflow Automation Platform

A minimal viable product (MVP) implementation of an n8n-like workflow automation platform.

## Architecture

- **Backend**: Node.js + Express + TypeScript + TypeORM
- **Frontend**: React + TypeScript + Zustand + React Flow (served by Nginx)
- **Database**: SQLite (dev) / PostgreSQL (prod via Docker)
- **Monorepo**: pnpm workspaces
- **Containerization**: Docker Compose with multi-container setup

## Getting Started

### Option 1: Docker Compose (Recommended for Production)

The easiest way to run the entire system is using Docker Compose.

#### Prerequisites

- Docker >= 20.10.0
- Docker Compose >= 2.0.0

#### Quick Start

```bash
# Start all services (database, backend, frontend)
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

#### Initial Setup

After starting the services, you need to create the database tables and seed the admin user:

**On Linux/macOS:**
```bash
# Create database tables
./init_db.sh

# Seed the database with admin user
docker compose exec backend node dist/scripts/seed.js
```

**On Windows:**
```cmd
REM Create database tables
init_db.bat

REM Seed the database with admin user
docker compose exec backend node dist/scripts/seed.js
```

Alternatively, you can run the commands directly:
```bash
# Create database tables
docker compose exec backend node -e "const {AppDataSource} = require('./dist/config/database.js'); AppDataSource.initialize().then(() => AppDataSource.synchronize()).then(() => { console.log('Tables created'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });"

# Seed the database with admin user
docker compose exec backend node dist/scripts/seed.js
```

#### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432 (PostgreSQL)

**Default Seed Account Credentials:**
- **Email**: `admin@example.com`
- **Password**: `p@ssw0rd`

#### Environment Variables

You can customize the configuration by creating a `.env` file in the root directory:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=n8n_mvp

# Backend
NODE_ENV=production
JWT_SECRET=your-secret-key-here

# Ports (optional)
FRONTEND_PORT=3000
BACKEND_PORT=3001
POSTGRES_PORT=5432
```

### Option 2: Local Development

#### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

#### Installation

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

#### Database Setup

After installing dependencies, run the seed script to create an initial admin user:

```bash
pnpm --filter backend seed
```

**Seed Account Credentials:**
- **Email**: `admin@example.com`
- **Password**: `p@ssw0rd`

> **Note**: The seed script will create the admin user if it doesn't exist, or update the password if the user already exists.

#### Environment Variables

Create `.env` files in `packages/backend` and `packages/frontend` as needed.

## Project Structure

```
packages/
  backend/     # Express API server
  frontend/   # React application
  shared/     # Shared TypeScript types
```

## Development

### Local Development
- Backend runs on `http://localhost:3001`
- Frontend runs on `http://localhost:3000`

### Docker Compose
- Frontend: `http://localhost:3000` (Nginx)
- Backend API: `http://localhost:3001` (Express)
- Database: `localhost:5432` (PostgreSQL)

## Docker Services

The Docker Compose setup includes:

- **frontend**: React app built and served by Nginx
- **backend**: Node.js/Express API server
- **db**: PostgreSQL 15 database

All services are connected via a Docker network and include health checks for reliable startup.

## License

MIT
