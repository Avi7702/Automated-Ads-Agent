import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from '../storage';
import { logger } from '../lib/logger';

/**
 * Initialize Passport.js with Google OAuth 2.0 strategy.
 * Only registers the strategy if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.
 */
export function initializePassport(): void {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    logger.info({ module: 'Passport' }, 'Google OAuth not configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not set)');
    return;
  }

  const callbackURL = process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback';

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email returned from Google'), undefined);
          }

          // Find existing user by email
          let user = await storage.getUserByEmail(email);

          if (!user) {
            // Create new user with a random password (they'll use OAuth only)
            const { randomBytes } = await import('crypto');
            const randomPassword = randomBytes(32).toString('hex');
            user = await storage.createUser({
              email,
              password: randomPassword,
            });
            logger.info({ module: 'Passport', email, userId: user.id }, 'New user created via Google OAuth');
          }

          return done(null, user);
        } catch (error) {
          logger.error({ module: 'Passport', err: error }, 'Google OAuth error');
          return done(error as Error, undefined);
        }
      },
    ),
  );

  // Serialize user ID into session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user ?? null);
    } catch (error) {
      done(error, null);
    }
  });

  logger.info({ module: 'Passport' }, 'Google OAuth strategy registered');
}
