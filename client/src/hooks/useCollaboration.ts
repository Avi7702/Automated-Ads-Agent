/**
 * useCollaboration — Real-time collaboration hook
 *
 * Connects to the Socket.io /collab namespace for:
 * - User presence (who's online)
 * - Cursor/selection awareness
 * - Typing indicators
 * - Generation status sharing
 *
 * Designed to be lightweight — only connects when user opts into collaboration.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface CollabUser {
  userId: string;
  email: string;
  displayName: string;
  color: string;
  joinedAt: number;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  element?: string;
}

export interface TypingIndicator {
  userId: string;
  displayName: string;
  isTyping: boolean;
  field: string;
}

export interface GenerationStatus {
  userId: string;
  generationId: string;
  status: 'generating' | 'completed' | 'failed';
  mediaType?: 'image' | 'video';
  resultUrl?: string;
}

interface UseCollaborationOptions {
  /** User info for presence */
  userId?: string;
  email?: string;
  displayName?: string;
  /** Workspace ID (default: 'default') */
  workspaceId?: string;
  /** Whether collaboration is enabled */
  enabled?: boolean;
}

export interface UseCollaborationReturn {
  /** Whether connected to collaboration server */
  isConnected: boolean;
  /** Currently online users */
  onlineUsers: CollabUser[];
  /** Remote cursor positions */
  remoteCursors: Map<string, CursorPosition>;
  /** Remote typing indicators */
  typingUsers: TypingIndicator[];
  /** Remote generation statuses */
  remoteGenerations: GenerationStatus[];
  /** Broadcast own cursor position */
  sendCursorPosition: (x: number, y: number, element?: string) => void;
  /** Broadcast typing state */
  sendTypingState: (isTyping: boolean, field: string) => void;
  /** Broadcast generation status */
  sendGenerationUpdate: (generationId: string, status: string, mediaType?: string, resultUrl?: string) => void;
  /** Number of online users (including self) */
  onlineCount: number;
}

export function useCollaboration(options: UseCollaborationOptions = {}): UseCollaborationReturn {
  const { userId, email, displayName, workspaceId = 'default', enabled = false } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<CollabUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [remoteGenerations, setRemoteGenerations] = useState<GenerationStatus[]>([]);

  const socketRef = useRef<Socket | null>(null);

  // Connect/disconnect based on enabled flag
  useEffect(() => {
    if (!enabled || !userId) return;

    const socket = io({
      path: '/collab',
      auth: {
        userId,
        email,
        displayName: displayName || email?.split('@')[0] || 'Anonymous',
        workspaceId,
      },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Presence events
    socket.on('presence:current', (users: CollabUser[]) => {
      setOnlineUsers(users);
    });

    socket.on('presence:join', (user: CollabUser) => {
      setOnlineUsers((prev) => [...prev.filter((u) => u.userId !== user.userId), user]);
    });

    socket.on('presence:leave', ({ userId: leftUserId }: { userId: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== leftUserId));
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(leftUserId);
        return next;
      });
      setTypingUsers((prev) => prev.filter((t) => t.userId !== leftUserId));
    });

    // Cursor events
    socket.on('cursor:move', (position: CursorPosition) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(position.userId, position);
        return next;
      });
    });

    // Typing events
    socket.on('typing:update', (indicator: TypingIndicator) => {
      setTypingUsers((prev) => {
        const filtered = prev.filter((t) => t.userId !== indicator.userId);
        if (indicator.isTyping) {
          return [...filtered, indicator];
        }
        return filtered;
      });
    });

    // Generation events
    socket.on('generation:update', (update: GenerationStatus) => {
      setRemoteGenerations((prev) => {
        const filtered = prev.filter((g) => g.userId !== update.userId);
        return [...filtered, update];
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setOnlineUsers([]);
      setRemoteCursors(new Map());
      setTypingUsers([]);
      setRemoteGenerations([]);
    };
  }, [enabled, userId, email, displayName, workspaceId]);

  const sendCursorPosition = useCallback((x: number, y: number, element?: string) => {
    socketRef.current?.emit('cursor:move', { x, y, element });
  }, []);

  const sendTypingState = useCallback((isTyping: boolean, field: string) => {
    socketRef.current?.emit('typing:update', { isTyping, field });
  }, []);

  const sendGenerationUpdate = useCallback(
    (generationId: string, status: string, mediaType?: string, resultUrl?: string) => {
      socketRef.current?.emit('generation:update', { generationId, status, mediaType, resultUrl });
    },
    [],
  );

  return {
    isConnected,
    onlineUsers,
    remoteCursors,
    typingUsers,
    remoteGenerations,
    sendCursorPosition,
    sendTypingState,
    sendGenerationUpdate,
    onlineCount: onlineUsers.length,
  };
}
