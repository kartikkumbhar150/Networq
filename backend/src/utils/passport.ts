import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User';

// Shared function to handle OAuth login/signup
async function handleOAuthUser(
  provider: 'google' | 'github',
  providerId: string,
  email: string,
  name: string
) {
  let user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    // If a user exists but doesn't have OAuth fields set, we can link them
    if (user.authProvider !== provider && !user.providerId) {
      user.authProvider = provider;
      user.providerId = providerId;
      // Mark verified since OAuth providers verify emails
      user.isVerified = true; 
      await user.save();
    }
  } else {
    // Create new user
    const newRefCode = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    user = await User.create({
      name,
      email: email.toLowerCase(),
      authProvider: provider,
      providerId,
      facePointId: null, // Bypass face check
      isVerified: true,  // Bypass email OTP check
      referralCode: newRefCode,
      accountType: 'user', // Default to User instead of Company
    });
  }
  return user;
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_secret',
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        if (!email) return done(new Error('No email found from Google'), undefined);
        const name = profile.displayName || email.split('@')[0];

        const user = await handleOAuthUser('google', profile.id, email, name);
        done(null, user);
      } catch (err) {
        done(err, undefined);
      }
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID || 'dummy_id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy_secret',
      callbackURL: '/api/auth/github/callback',
      scope: ['user:email'],
    },
    async (accessToken: string, refreshToken: string, profile: any, done: Function) => {
      try {
        const emailObj = profile.emails?.find((e: any) => e.primary) || profile.emails?.[0];
        const email = emailObj?.value;

        if (!email) {
          return done(new Error('No email found from GitHub. Make sure your email is public or provide user:email scope.'), undefined);
        }

        const name = profile.displayName || profile.username || email.split('@')[0];
        const user = await handleOAuthUser('github', profile.id, email, name);
        done(null, user);
      } catch (err) {
        done(err, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
