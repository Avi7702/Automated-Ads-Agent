import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface RateLimitCountdownProps {
  retryAfter: number; // seconds
  onComplete?: () => void;
}

export function RateLimitCountdown({ retryAfter, onComplete }: RateLimitCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(retryAfter);

  useEffect(() => {
    setTimeLeft(retryAfter);
  }, [retryAfter]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  if (timeLeft <= 0) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <Alert variant="destructive" className="bg-red-500/10 border-red-500/50">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Rate Limited</AlertTitle>
      <AlertDescription className="flex items-center gap-4">
        <span>API rate limit exceeded. You can retry in:</span>
        <span className="font-mono text-2xl font-bold">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </AlertDescription>
    </Alert>
  );
}
