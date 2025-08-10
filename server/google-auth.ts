import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './db-storage';
import bcrypt from 'bcrypt';

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/google/callback`,
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔐 Google OAuth callback received:', {
      googleId: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName
    });

    // Check if user already exists with this Google ID
    let user = await storage.getUserByGoogleId(profile.id);
    
    if (user) {
      console.log('✅ Existing Google user found:', user.username);
      return done(null, user);
    }

    // Check if user exists with this email (for linking accounts)
    if (profile.emails?.[0]?.value) {
      user = await storage.getUserByEmail(profile.emails[0].value);
      
      if (user) {
        // Link existing account with Google
        console.log('🔗 Linking existing account with Google:', user.username);
        await storage.updateUser(user.id, {
          googleId: profile.id,
          googleEmail: profile.emails[0].value,
          googleName: profile.displayName,
          googlePicture: profile.photos?.[0]?.value,
          isOAuthUser: true,
          emailConfirmed: true // Google emails are pre-verified
        });
        
        const updatedUser = await storage.getUserById(user.id);
        return done(null, updatedUser);
      }
    }

    // Create new user with Google OAuth
    const username = await generateUniqueUsername(profile.displayName || 'user');
    const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
    
    const newUser = await storage.createUser({
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
    });

    console.log('✅ New Google OAuth user created:', newUser.username);
    return done(null, newUser);
  } catch (error) {
    console.error('❌ Google OAuth error:', error);
    return done(error as Error);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error);
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