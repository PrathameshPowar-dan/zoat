import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || '';

const redis = new Redis(redisUrl, {
    // If the URL is secure (rediss), explicitly configure the TLS object
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    
    // Prevent max retries from crashing the app during development reloads
    maxRetriesPerRequest: null,
    
    // Smart retry strategy to back off if the connection drops
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

redis.on('connect', () => console.log('Upstash Redis connected successfully'));
redis.on('error', (err) => console.error('Redis connection error:', err.message));

export default redis;