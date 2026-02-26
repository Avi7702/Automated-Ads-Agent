/**
 * GlobalChatButton -- Floating action button (FAB) that opens the ChatSlideOver.
 *
 * Fixed bottom-right, 56px on desktop / 48px on mobile.
 * Shows a pulsing dot when there are unread agent messages.
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, X } from 'lucide-react';
import { ChatSlideOver } from './ChatSlideOver';

export function GlobalChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <>
      {/* FAB */}
      <button
        onClick={toggle}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        className={cn(
          'fixed bottom-5 right-5 z-50',
          'flex items-center justify-center rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90 active:scale-95 transition-all duration-150',
          'w-12 h-12 md:w-14 md:h-14',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
      >
        {isOpen ? <X className="w-5 h-5 md:w-6 md:h-6" /> : <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />}
      </button>

      {/* Slide-over Sheet */}
      <ChatSlideOver isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
