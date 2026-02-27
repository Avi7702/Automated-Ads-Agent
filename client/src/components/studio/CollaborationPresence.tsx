/**
 * CollaborationPresence — Shows who's online in the Studio workspace
 *
 * Renders avatar circles with user initials and colors.
 * Shows typing indicators and generation status.
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CollabUser, TypingIndicator, GenerationStatus } from '@/hooks/useCollaboration';

interface CollaborationPresenceProps {
  isConnected: boolean;
  onlineUsers: CollabUser[];
  typingUsers: TypingIndicator[];
  remoteGenerations: GenerationStatus[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const CollaborationPresence = memo(function CollaborationPresence({
  isConnected,
  onlineUsers,
  typingUsers,
  remoteGenerations,
}: CollaborationPresenceProps) {
  if (!isConnected || onlineUsers.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Online indicator */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>{onlineUsers.length} online</span>
      </div>

      {/* Avatar stack */}
      <div className="flex -space-x-2">
        <AnimatePresence>
          {onlineUsers.slice(0, 5).map((user) => {
            const isTyping = typingUsers.some((t) => t.userId === user.userId);
            const genStatus = remoteGenerations.find((g) => g.userId === user.userId);

            return (
              <motion.div
                key={user.userId}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="relative"
                title={`${user.displayName}${isTyping ? ' (typing...)' : ''}${genStatus ? ` (${genStatus.status})` : ''}`}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-background',
                    isTyping && 'ring-2 ring-yellow-400',
                    genStatus?.status === 'generating' && 'ring-2 ring-blue-400 animate-pulse',
                  )}
                  style={{ backgroundColor: user.color }}
                >
                  {getInitials(user.displayName)}
                </div>

                {/* Typing dot */}
                {isTyping && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-yellow-400 border border-background flex items-center justify-center">
                    <span className="text-[6px]">...</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {onlineUsers.length > 5 && (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-muted-foreground bg-muted border-2 border-background">
            +{onlineUsers.length - 5}
          </div>
        )}
      </div>
    </div>
  );
});
