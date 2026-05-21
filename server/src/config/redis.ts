import { Redis } from 'ioredis'
import { env } from './env.js'

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 0,
  retryStrategy: () => null, // don't retry — fail fast and let the app run without Redis
  enableOfflineQueue: false,
})

redis.on('connect', () => console.log('✅ Redis connected'))
redis.on('error', (err: Error) => {
  if ((err as NodeJS.ErrnoException).code !== 'ECONNREFUSED') {
    console.warn('⚠️  Redis error:', err.message)
  }
})

export const REDIS_KEYS = {
  blacklistToken: (jti: string) => `blacklist:${jti}`,
  mfaPending: (userId: string) => `mfa_pending:${userId}`,
  rateLimitLogin: (ip: string) => `rl:login:${ip}`,
  sessionData: (sessionId: string) => `session:${sessionId}`,
}
