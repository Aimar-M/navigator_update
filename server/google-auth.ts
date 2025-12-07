import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './db-storage';
import bcrypt from 'bcrypt';
import { safeErrorLog } from './error-logger';

// OAuth configuration check - only log if not configured

// Configure Google OAuth Strategy (only if environment variables are set)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.BACKEND_URL) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await storage.getUserByGoogleId(profile.id);
    
    if (user) {
      // Check if account is deleted - block OAuth login and require recovery
      if (user.deletedAt) {
        return done(new Error('ACCOUNT_DELETED'), null);
      }
      
      return done(null, user);
    }

    // Check if user exists with this email (for linking accounts)
    if (profile.emails?.[0]?.value) {
      user = await storage.getUserByEmail(profile.emails[0].value);
      
      if (user) {
        // Check if account is deleted - block OAuth login and require recovery
        if (user.deletedAt) {
          return done(new Error('ACCOUNT_DELETED'), null);
        }
        
        // Link existing account with Google
        try {
          const updateResult = await storage.updateUser(user.id, {
            googleId: profile.id,
            googleEmail: profile.emails[0].value,
            googleName: profile.displayName,
            googlePicture: profile.photos?.[0]?.value,
            isOAuthUser: true,
            emailConfirmed: true // Google emails are pre-verified
          });
          
          if (updateResult) {
            return done(null, updateResult);
          } else {
            return done(new Error('Failed to update user with Google OAuth data'), null);
          }
        } catch (updateError) {
          safeErrorLog('❌ Error updating user with Google OAuth data', updateError);
          return done(updateError as Error, null);
        }
      }
    }

    // Create new user with Google OAuth
    const username = await generateUniqueUsername(profile.displayName || 'user');
    const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
    
    const userData = {
      username,
      password: randomPassword, // Random password for OAuth users
      email: profile.emails?.[0]?.value || `${profile.id}@google.oauth`,
      name: profile.displayName || 'Google User',
      avatar: profile.photos?.[0]?.value,
      emailConfirmed: true, // Google emails are pre-verified
      emailConfirmationToken: null,
      googleId: profile.id,
      googleEmail: profile.emails?.[0]?.value,
      googleName: profile.displayName,
      googlePicture: profile.photos?.[0]?.value,
      isOAuthUser: true
    };
    
    try {
      const newUser = await storage.createUser(userData);
      return done(null, newUser);
    } catch (createError) {
      safeErrorLog('❌ Error creating new Google OAuth user', createError);
      return done(createError as Error, null);
    }
  } catch (error) {
    safeErrorLog('❌ Google OAuth error', error);
    return done(error as Error, null);
  }
}));
} else {
  // Google OAuth not configured - OAuth functionality disabled
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUserById(id);
    
    // If user doesn't exist (deleted, invalid session, etc.), deserialize as null
    // This allows the request to continue but user will be unauthenticated
    if (!user) {
      safeErrorLog(`Failed to deserialize user: user not found for id ${id}`, null);
      return done(null, false); // Passport convention: null = no error, false = no user
    }
    
    // Check if account is deleted - don't allow session auth for deleted accounts
    if (user.deletedAt) {
      safeErrorLog(`Failed to deserialize user: account deleted for id ${id}`, null);
      return done(null, false);
    }
    
    done(null, user);
  } catch (error) {
    // Log error safely without dumping connection objects
    safeErrorLog(`Failed to deserialize user for id ${id}`, error);
    // Return null user instead of error to prevent session corruption
    // This allows the request to continue, user will just be unauthenticated
    done(null, false);
  }
});

// Helper function to generate unique username
async function generateUniqueUsername(baseName: string): Promise<string> {
  let username = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
  let counter = 1;
  let finalUsername = username;
  
  while (await storage.getUserByUsername(finalUsername)) {
    finalUsername = `${username}${counter}`;
    counter++;
  }
  
  return finalUsername;
}

export default passport; 