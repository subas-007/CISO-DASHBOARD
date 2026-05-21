import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  DB_PATH: z.string().default('./data/ciso.db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  OAUTH2_CLIENT_ID: z.string().optional(),
  OAUTH2_CLIENT_SECRET: z.string().optional(),
  OAUTH2_AUTHORIZATION_URL: z.string().optional(),
  OAUTH2_TOKEN_URL: z.string().optional(),
  OAUTH2_CALLBACK_URL: z.string().default('http://localhost:4000/api/auth/oauth/callback'),

  SAML_ENTRY_POINT: z.string().optional(),
  SAML_ISSUER: z.string().default('ciso-dashboard'),
  SAML_CERT: z.string().optional(),

  TOTP_APP_NAME: z.string().default('CISO Dashboard'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:\n', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
