import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './db-storage';
import bcrypt from 'bcrypt';

// Debug: Log environment variables
console.log('🔍 Google OAuth Configuration:', {
  clientID: process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
  backendURL: process.env.BACKEND_URL || '❌ Missing',
  callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`
});

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔐 Google OAuth callback received:', {
      googleId: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName
    });

    // Check if user already exists with this Google ID
    console.log('🔍 Checking if user exists with Google ID:', profile.id);
    let user = await storage.getUserByGoogleId(profile.id);
    
    if (user) {
      console.log('✅ Existing Google user found:', user.username);
      console.log('🔍 User details:', { id: user.id, email: user.email, googleId: user.googleId });
      return done(null, user);
    }

    // Check if user exists with this email (for linking accounts)
    if (profile.emails?.[0]?.value) {
      console.log('🔍 Checking if user exists with email:', profile.emails[0].value);
      user = await storage.getUserByEmail(profile.emails[0].value);
      
      if (user) {
        // Link existing account with Google
        console.log('🔗 Linking existing account with Google:', user.username);
        console.log('🔍 Updating user with Google OAuth data...');
        
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
            console.log('✅ User successfully linked with Google OAuth:', updateResult.username);
            return done(null, updateResult);
          } else {
            console.error('❌ Failed to update user with Google OAuth data');
            return done(new Error('Failed to update user with Google OAuth data'));
          }
        } catch (updateError) {
          console.error('❌ Error updating user with Google OAuth data:', updateError);
          return done(updateError as Error);
        }
      }
    }

    // Create new user with Google OAuth
    console.log('🔍 Creating new user with Google OAuth...');
    const username = await generateUniqueUsername(profile.displayName || 'user');
    console.log('🔍 Generated username:', username);
    
    const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
    console.log('🔍 Generated random password for OAuth user');
    
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
    
    console.log('🔍 User data to create:', {
      username: userData.username,
      email: userData.email,
      name: userData.name,
      googleId: userData.googleId,
      isOAuthUser: userData.isOAuthUser
    });
    
    try {
      const newUser = await storage.createUser(userData);
      console.log('✅ New Google OAuth user created successfully:', {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        googleId: newUser.googleId
      });
      return done(null, newUser);
    } catch (createError) {
      console.error('❌ Error creating new Google OAuth user:', createError);
      return done(createError as Error);
    }
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