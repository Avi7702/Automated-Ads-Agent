// @ts-nocheck
import { motion } from 'framer-motion';
import { Loader2, X, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GeneratingViewProps {
  onCancel?: () => void;
  mediaType?: 'image' | 'video';
}

export function GeneratingView({ onCancel, mediaType = 'image' }: GeneratingViewProps) {
  const isVideo = mediaType === 'video';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center justify-center min-h-[400px] space-y-8"
      role="status"
      aria-live="polite"
      aria-label={isVideo ? 'Generating video' : 'Generating image'}
    >
      {/* Orbital loader */}
      <div className="relative w-28 h-28">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent"
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-4 rounded-full border-2 border-t-transparent border-r-primary border-b-transparent border-l-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          {isVideo ? (
            <Video className="w-8 h-8 text-primary animate-pulse" />
          ) : (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          )}
        </div>
      </div>

      {/* Progress text */}
      <div className="text-center space-y-2">
        <motion.p
          className="text-lg font-medium text-foreground"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {isVideo ? 'Generating your video...' : 'Generating your image...'}
        </motion.p>
        <p className="text-sm text-muted-foreground">
          {isVideo
            ? 'Video generation typically takes 2-10 minutes. You can wait here or check back later.'
            : 'This usually takes 15-30 seconds'}
        </p>
      </div>

      {/* Pulse dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      {/* Cancel button */}
      {onCancel && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isVideo ? 5 : 2 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Cancel generation"
          >
            <X className="w-4 h-4 mr-1.5" />
            Stop Generating
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
