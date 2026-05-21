import passport from 'passport'
import { Strategy as OAuth2Strategy } from 'passport-oauth2'
import { env } from './env.js'
import { getUserByOAuth, createUser } from '../services/user.service.js'

// Only wire OAuth2 strategy if credentials are configured
if (env.OAUTH2_CLIENT_ID && env.OAUTH2_CLIENT_SECRET && env.OAUTH2_AUTHORIZATION_URL && env.OAUTH2_TOKEN_URL) {
  passport.use(
    'oauth2',
    new OAuth2Strategy(
      {
        authorizationURL: env.OAUTH2_AUTHORIZATION_URL!,
        tokenURL: env.OAUTH2_TOKEN_URL!,
        clientID: env.OAUTH2_CLIENT_ID!,
        clientSecret: env.OAUTH2_CLIENT_SECRET!,
        callbackURL: env.OAUTH2_CALLBACK_URL,
      },
      async (_accessToken: string, _refreshToken: string, profile: Record<string, unknown>, done: (err: unknown, user?: unknown) => void) => {
        try {
          const id = String(profile['id'] ?? profile['sub'])
          const email = String(profile['email'] ?? '')
          const name = String(profile['name'] ?? profile['display_name'] ?? email)

          let user = getUserByOAuth('oauth2', id)
          if (!user) {
            user = await createUser({ email, name, oauthProvider: 'oauth2', oauthId: id })
          }
          done(null, user)
        } catch (err) {
          done(err)
        }
      }
    )
  )
  console.log('✅ OAuth2 strategy registered')
}

// SAML strategy — install `passport-saml` separately if enterprise SSO is needed:
//   npm install passport-saml
// Then set SAML_ENTRY_POINT and SAML_CERT in .env to activate.

export default passport
