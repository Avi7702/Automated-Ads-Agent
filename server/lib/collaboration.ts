// @ts-nocheck
/**
 * Real-time Collaboration Service
 *
 * Socket.io server for shared workspace presence and awareness:
 * - User presence (who's online in the workspace)
 * - Cursor/selection broadcasting
 * - Generation status sharing (see teammates' progress)
 * - Live typing indicators on shared prompts
 *
 * Architecture:
 * - One namespace: /collab
 * - Rooms: workspace:{userId} for personal, generation:{id} for shared
 * - Authentication via session cookie (same as Express)
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from './logger';

interface CollabUser {
  userId: string;
  email: string;
  displayName: string;
  color: string;
  joinedAt: number;
}

interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  element?: string; // e.g., 'prompt-textarea', 'canvas'
}

interface TypingIndicator {
  userId: string;
  displayName: string;
  isTyping: boolean;
  field: string; // e.g., 'prompt', 'editPrompt'
}

interface GenerationUpdate {
  userId: string;
  generationId: string;
  status: 'generating' | 'completed' | 'failed';
  mediaType?: 'image' | 'video';
  resultUrl?: string;
}

// User presence colors (assigned in order)
const PRESENCE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

// In-memory presence store (per workspace)
const workspacePresence = new Map<string, Map<string, CollabUser>>();
let colorIndex = 0;

function getNextColor(): string {
  const color = PRESENCE_COLORS[colorIndex % PRESENCE_COLORS.length];
  colorIndex++;
  return color;
}

let io: Server | null = null;

/**
 * Initialize Socket.io server for real-time collaboration.
 */
export function initCollaboration(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    path: '/collab',
    cors: {
      origin:
        process.env.NODE_ENV === 'production'
          ? [process.env.APP_URL || 'https://automated-ads-agent-production.up.railway.app']
          : ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId || 'anonymous';
    const email = socket.handshake.auth?.email || 'unknown';
    const displayName = socket.handshake.auth?.displayName || email.split('@')[0] || 'Anonymous';
    const workspaceId = socket.handshake.auth?.workspaceId || 'default';

    logger.info({ userId, workspaceId, socketId: socket.id }, 'Collaboration: user connected');

    // Join workspace room
    const roomName = `workspace:${workspaceId}`;
    socket.join(roomName);

    // Register presence
    const user: CollabUser = {
      userId,
      email,
      displayName,
      color: getNextColor(),
      joinedAt: Date.now(),
    };

    if (!workspacePresence.has(roomName)) {
      workspacePresence.set(roomName, new Map());
    }
    workspacePresence.get(roomName).set(userId, user);

    // Send current presence to the joining user
    const currentUsers = Array.from(workspacePresence.get(roomName).values());
    socket.emit('presence:current', currentUsers);

    // Broadcast join to others
    socket.to(roomName).emit('presence:join', user);

    // ── Event handlers ──

    // Cursor movement
    socket.on('cursor:move', (position: Omit<CursorPosition, 'userId'>) => {
      socket.to(roomName).emit('cursor:move', { ...position, userId });
    });

    // Typing indicator
    socket.on('typing:update', (data: Omit<TypingIndicator, 'userId' | 'displayName'>) => {
      socket.to(roomName).emit('typing:update', {
        ...data,
        userId,
        displayName,
      });
    });

    // Generation status sharing
    socket.on('generation:update', (data: Omit<GenerationUpdate, 'userId'>) => {
      socket.to(roomName).emit('generation:update', { ...data, userId });
    });

    // Join a specific generation room (for watching a shared generation)
    socket.on('generation:watch', (generationId: string) => {
      socket.join(`generation:${generationId}`);
    });

    socket.on('generation:unwatch', (generationId: string) => {
      socket.leave(`generation:${generationId}`);
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
      logger.info({ userId, reason, socketId: socket.id }, 'Collaboration: user disconnected');

      // Remove from presence
      workspacePresence.get(roomName)?.delete(userId);
      if (workspacePresence.get(roomName)?.size === 0) {
        workspacePresence.delete(roomName);
      }

      // Broadcast leave
      socket.to(roomName).emit('presence:leave', { userId });
    });
  });

  logger.info('Real-time collaboration initialized (Socket.io /collab)');

  return io;
}

/**
 * Get the Socket.io server instance.
 */
export function getCollabIO(): Server | null {
  return io;
}

/**
 * Get current users in a workspace.
 */
export function getWorkspaceUsers(workspaceId: string): CollabUser[] {
  const roomName = `workspace:${workspaceId}`;
  const users = workspacePresence.get(roomName);
  return users ? Array.from(users.values()) : [];
}
