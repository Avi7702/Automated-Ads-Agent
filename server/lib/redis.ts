import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (process.env.USE_REDIS !== "true") {
    return null;
  }

  if (!redisClient && process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);
    
    redisClient.on("error", (err) => {
      console.error("[Redis] Connection error:", err);
    });
    
    redisClient.on("connect", () => {
      console.log("[Redis] Connected successfully");
    });
  }

  return redisClient;
}

export function closeRedisConnection(): void {
  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
  }
}
