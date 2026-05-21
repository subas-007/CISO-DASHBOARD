import { Redis } from 'ioredis'
import { env } from './env.js'

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
})

redis.on('connect', () => console.log('✅ Redis connected'))
redis.on('error', (err: Error) => console.warn('⚠️  Redis error:', err.message))

export const REDIS_KEYS = {
  blacklistToken: (jti: string) => `blacklist:${jti}`,
  mfaPending: (userId: string) => `mfa_pending:${userId}`,
  rateLimitLogin: (ip: string) => `rl:login:${ip}`,
  sessionData: (sessionId: string) => `session:${sessionId}`,
}
