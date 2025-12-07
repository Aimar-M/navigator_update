import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { loginUser, registerUser, logoutUser, getAuthToken, setAuthToken, removeAuthToken, getPendingInvitation, removePendingInvitation } from "@/lib/auth";
import { wsClient } from "@/lib/websocket";
import { useQueryClient } from "@tanstack/react-query";
import { fullstory, trackUserLogin, trackUserLogout } from "@/lib/fullstory";

const API_BASE = import.meta.env.VITE_API_URL || '';


interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { identifier: string; password: string }) => Promise<void>;
  register: (userData: RegisterData) => Promise<any>; // Can return user data for email confirmation
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserData: (userData: Partial<User>) => void;
}

interface RegisterData {
  username: string;
  password: string;
  email: string;
  name: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to handle pending invitation redirects
const handlePendingInvitationRedirect = (navigate: Function, useHardRedirect: boolean = false): boolean => {
  const pendingInvitation = localStorage.getItem('pendingInvitation');
  if (pendingInvitation) {
    // Don't remove it here - let it be removed after successful RSVP
    // This allows it to persist through email confirmation
    if (useHardRedirect) {
      // Use hard redirect to prevent page from rendering before redirect
      window.location.href = `/invite/${pendingInvitation}`;
    } else {
      navigate(`/invite/${pendingInvitation}`);
    }
    return true; // Indicates redirect happened
  }
  return false; // No redirect needed
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check if the user is logged in when the app loads
    const checkAuthStatus = async () => {
      try {
        // Check if we have a token OR if we're authenticated via session
        const token = localStorage.getItem('auth_token');
        console.log("auth check: token from localStorage:", token);
        
        // Check if this is an OAuth temporary token
        if (token && token.includes('_oauth_temp')) {
          console.log("🔍 OAuth temporary token detected, validating...");
          
          try {
            // Extract user ID from the OAuth token
            const userId = token.split('_')[0];
            console.log("🔍 Extracted userId from OAuth token:", userId);
            
            // Validate the OAuth token with the backend
            const response = await fetch(`${API_BASE}/api/auth/oauth/validate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ oauthToken: token, userId }),
            });
            
            console.log("🔍 OAuth validation response status:", response.status);
            
            if (response.ok) {
              const data = await response.json();
              console.log("✅ OAuth token validation successful:", data);
              
              // Store the new JWT token
              localStorage.setItem('auth_token', data.token);
              
              // Check for pending invitation BEFORE setting user state
              // This prevents onboarding from starting before redirect
              if (handlePendingInvitationRedirect(navigate, true)) {
                // Hard redirect will happen, don't set user state or continue
                setIsLoading(false);
                return;
              }
              
              // Set the user only if no pending invitation
              setUser(data.user);
              
              if (data.user) {
                wsClient.connect(data.user.id, []);
                
                // Track user identification with FullStory
                fullstory.identifyUser(data.user.id.toString(), {
                  email: data.user.email,
                  name: data.user.name,
                  username: data.user.username,
                });
              }
              
              setIsLoading(false);
              return;
            } else {
              const errorData = await response.text();
              console.log("❌ OAuth token validation failed:", errorData);
              localStorage.removeItem('auth_token');
            }
          } catch (oauthError) {
            console.error("❌ OAuth token validation error:", oauthError);
            localStorage.removeItem('auth_token');
          }
        }
        
        // First try JWT token authentication
        if (token) {
          const headers = {
            'Authorization': `Bearer ${token}`
          };
          
          const response = await fetch(`${API_BASE}/api/auth/me`, { 
            headers,
            credentials: 'include' // Include cookies for session fallback
          });
          console.log("Auth check: /api/auth/me response status:", response.status);
          
          if (response.ok) {
            const userData = await response.json();
            console.log("Auth check: userData from /api/auth/me:", userData);
            
            // Check for pending invitation BEFORE setting user state
            // This prevents onboarding from starting before redirect for new users
            const pendingInvitation = localStorage.getItem('pendingInvitation');
            if (pendingInvitation) {
              // For new users from invite links, use hard redirect to prevent page render
              // Check if this is likely a new user (no trips yet) by checking if they just signed up
              // If pending invitation exists and user just authenticated, redirect immediately
              console.log("🔗 Found pending invitation during JWT auth, redirecting...");
              window.location.href = `/invite/${pendingInvitation}`;
              setIsLoading(false);
              return;
            }
            
            setUser(userData);
            
            // Track user identification with FullStory for existing sessions
            if (userData) {
              fullstory.identifyUser(userData.id.toString(), {
                email: userData.email,
                name: userData.name,
                username: userData.username,
              });
              wsClient.connect(userData.id, []);
            }
            
            setIsLoading(false);
            return;
          } else {
            // If token is invalid, remove it
            console.log("Auth check: token is invalid, removing it from localStorage");
            localStorage.removeItem('auth_token');
          }
        }
        
        // If no JWT token or token is invalid, try session authentication
        console.log("Auth check: trying session authentication...");
        try {
          const sessionResponse = await fetch(`${API_BASE}/api/auth/me`, { 
            credentials: 'include' // Include cookies for session auth
          });
          console.log("Auth check: session /api/auth/me response status:", sessionResponse.status);
          
          if (sessionResponse.ok) {
            const userData = await sessionResponse.json();
            console.log("Auth check: userData from session /api/auth/me:", userData);
            
            // Check for pending invitation BEFORE setting user state
            // This prevents onboarding from starting before redirect for new users
            const pendingInvitation = localStorage.getItem('pendingInvitation');
            if (pendingInvitation) {
              // For new users from invite links, use hard redirect to prevent page render
              console.log("🔗 Found pending invitation during session auth, redirecting...");
              window.location.href = `/invite/${pendingInvitation}`;
              setIsLoading(false);
              return;
            }
            
            setUser(userData);
            
            // Track user identification with FullStory for session-based auth
            if (userData) {
              fullstory.identifyUser(userData.id.toString(), {
                email: userData.email,
                name: userData.name,
                username: userData.username,
              });
              wsClient.connect(userData.id, []);
            }
          }
        } catch (sessionError) {
          console.log("Auth check: session authentication failed:", sessionError);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem('auth_token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();

    return () => {
      wsClient.disconnect();
    };
  }, []);

  const login = async (credentials: { identifier: string; password: string }) => {
    setIsLoading(true);
    try {
      const userData = await loginUser(credentials);
      
      // Check if account requires recovery (deleted account)
      if (userData && userData.requiresRecovery) {
        console.log("Account requires recovery, returning recovery data");
        setIsLoading(false);
        return userData; // Return recovery data for page to handle redirect
      }
      
      // Store the token
      if (userData.token) {
        setAuthToken(userData.token);
      }
      
      setUser(userData);
      queryClient.clear(); // Clear all cached queries after login
      
      // Track user login with FullStory
      trackUserLogin(userData.id.toString(), userData.email);
      
      // Invalidate trips and pending invitations after login
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips`] });
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips/memberships/pending`] });
      
      // Connect WebSocket after login
      wsClient.connect(userData.id, []);
      
      // Check if there's a pending invitation and redirect if needed
      if (!handlePendingInvitationRedirect(navigate)) {
        // Otherwise redirect to home page
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid username/email or password",
        variant: "destructive",
      });
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    try {
      const newUser = await registerUser(userData);
      
      // Check if account requires recovery (deleted account with same email)
      if (newUser && newUser.requiresRecovery) {
        console.log("Account requires recovery, returning recovery data");
        setIsLoading(false);
        return newUser; // Return recovery data for page to handle redirect
      }
      
      // Check if email confirmation is required
      if (newUser.requiresEmailConfirmation) {
        // Don't log in the user - they need to confirm email first
        // Note: pendingInvitation is preserved in localStorage and will be checked
        // after email confirmation in confirm-email.tsx
        setIsLoading(false);
        return newUser; // Return the user data for the confirmation page
      }
      
      // If email is already confirmed, proceed with normal login flow
      if (newUser.token) {
        setAuthToken(newUser.token);
      }
      
      setUser(newUser);
      queryClient.clear(); // Clear all cached queries after registration
      
      // Track user registration with FullStory
      trackUserLogin(newUser.id.toString(), newUser.email);
      fullstory.trackEvent('User Registration', {
        userId: newUser.id,
        email: newUser.email,
        username: newUser.username,
        timestamp: new Date().toISOString(),
      });
      
      // Invalidate trips and pending invitations after registration
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips`] });
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips/memberships/pending`] });
      
      // Connect WebSocket after registration
      wsClient.connect(newUser.id, []);
      
      // Check if there's a pending invitation and redirect if needed
      if (!handlePendingInvitationRedirect(navigate)) {
        // Otherwise redirect to home page
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Unable to create account",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Track user logout with FullStory before clearing user data
      if (user) {
        trackUserLogout(user.id.toString());
      }
      
      // Clear user state immediately to prevent any race conditions
      setUser(null);
      
      // Disconnect WebSocket before logout
      wsClient.disconnect();
      
      // Clear all cached queries before logout
      queryClient.clear();
      
      // Clear local storage and session storage
      removeAuthToken();
      localStorage.removeItem('auth_token');
      sessionStorage.clear();
      
      // Call logout endpoint to destroy server session and clear cookie
      try {
        await logoutUser();
      } catch (logoutError) {
        // Even if logout endpoint fails, continue with client-side cleanup
        console.error("Logout endpoint error (continuing with cleanup):", logoutError);
      }
      
      // Small delay to ensure state is cleared before redirect
      // This prevents race conditions where auth check might run before state is cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use window.location for a hard redirect to avoid race conditions
      // This ensures a full page reload and fresh auth check
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      // Even on error, try to clear state and redirect
      setUser(null);
      removeAuthToken();
      localStorage.removeItem('auth_token');
      sessionStorage.clear();
      window.location.href = "/";
    }
  };

  const refreshUser = async () => {
    try {
      console.log('Auth context: Starting user refresh...');
      console.log('Auth context: Current user state before refresh:', user);
      
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      console.log('Auth context: Fetching user data from /api/auth/me...');
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers,
        credentials: 'include',
      });
      
      if (res.ok) {
        const userData = await res.json();
        console.log('Auth context: Raw response from /api/auth/me:', userData);
        console.log('Auth context: Data structure analysis:', {
          hasId: !!userData.id,
          hasUsername: !!userData.username,
          hasName: !!userData.name,
          hasEmail: !!userData.email,
          username: userData.username,
          name: userData.name
        });
        
        // Ensure the user data has the correct structure for the auth context
        const normalizedUserData = {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          name: userData.name,
          avatar: userData.avatar
        };
        
        console.log('Auth context: Normalized user data:', normalizedUserData);
        setUser(normalizedUserData);
        console.log('Auth context: User state after setUser:', normalizedUserData);
        
        // Don't clear queries here as it can interfere with the current execution
        // Instead, just invalidate key patterns to trigger refetches
        console.log('Auth context: Invalidating user-related queries...');
        
        // Invalidate all queries that might contain user data
        const patterns = [
          `${API_BASE}/api/trips`,
          `${API_BASE}/api/expenses`,
          `${API_BASE}/api/settlements`,
          `${API_BASE}/api/activities`,
          `${API_BASE}/api/flights`,
          `${API_BASE}/api/users`,
          `${API_BASE}/api/chats`,
          `${API_BASE}/api/messages`,
          `${API_BASE}/api/polls`,
          `${API_BASE}/api/rsvp`,
          `${API_BASE}/api/memberships`
        ];
        
        patterns.forEach(pattern => {
          queryClient.invalidateQueries({ queryKey: [pattern] });
        });
        
        console.log('Auth context: User refresh completed successfully');
      } else {
        console.error('Auth context: Failed to refresh user data:', res.status);
      }
    } catch (error) {
      console.error('Auth context: Error refreshing user:', error);
    }
  };

  const updateUserData = (userData: Partial<User>) => {
    setUser(prevUser => {
      if (prevUser) {
        return { ...prevUser, ...userData };
      }
      return null;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
