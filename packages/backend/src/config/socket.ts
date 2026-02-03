import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/AuthService.js';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const authService = new AuthService();

export function setupSocketIO(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = await authService.getUserById(decoded.userId);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.data.userId}`, { component: 'SOCKET' });

    socket.on('subscribe:execution', (executionId: string) => {
      socket.join(`execution:${executionId}`);
      logger.debug(`Socket ${socket.data.userId} subscribed to execution ${executionId}`, { component: 'SOCKET' });
    });

    socket.on('unsubscribe:execution', (executionId: string) => {
      socket.leave(`execution:${executionId}`);
      logger.debug(`Socket ${socket.data.userId} unsubscribed from execution ${executionId}`, { component: 'SOCKET' });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.data.userId}`, { component: 'SOCKET' });
    });
  });

  return io;
}

export function emitExecutionEvent(
  io: SocketServer,
  executionId: string,
  event: string,
  data: unknown
): void {
  io.to(`execution:${executionId}`).emit(event, data);
}
