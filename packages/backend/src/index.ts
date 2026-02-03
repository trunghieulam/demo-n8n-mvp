import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { AppDataSource } from './config/database.js';
import apiRoutes from './routes/index.js';
import { setupSocketIO } from './config/socket.js';
import { logger } from './utils/logger.js';

const app = express();
const httpServer = createServer(app);
const io = setupSocketIO(httpServer);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1', apiRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Request error', err, { component: 'BACKEND' });
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database
AppDataSource.initialize()
  .then(() => {
    logger.backend('Database initialized');
    
    httpServer.listen(PORT, () => {
      logger.backend(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Database initialization error', error, { component: 'BACKEND' });
    process.exit(1);
  });
