import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { loginUser, registerUser, logoutUser, getAuthToken, setAuthToken, removeAuthToken, getPendingInvitation, removePendingInvitation } from "@/lib/auth";
import { wsClient } from "@/lib/websocket";
import { useQueryClient } from "@tanstack/react-query";

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
}

interface RegisterData {
  username: string;
  password: string;
  email: string;
  name: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
              
              // Set the user
              setUser(data.user);
              
              if (data.user) {
                wsClient.connect(data.user.id, []);
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
          
          const response = await fetch(`${API_BASE}/api/auth/me`, { headers });
          console.log("Auth check: /api/auth/me response status:", response.status);
          
          if (response.ok) {
            const userData = await response.json();
            console.log("Auth check: userData from /api/auth/me:", userData);
            setUser(userData);
            
            if (userData) {
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
            setUser(userData);
            
            if (userData) {
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
      
      // Store the token
      if (userData.token) {
        setAuthToken(userData.token);
      }
      
      setUser(userData);
      queryClient.clear(); // Clear all cached queries after login
      
      // Invalidate trips and pending invitations after login
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips`] });
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips/memberships/pending`] });
      
      // Connect WebSocket after login
      wsClient.connect(userData.id, []);
      
      // Always redirect to home page - let home page handle pending invitations
      navigate("/");
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
      
      // Check if email confirmation is required
      if (newUser.requiresEmailConfirmation) {
        // Don't log in the user - they need to confirm email first
        setIsLoading(false);
        return newUser; // Return the user data for the confirmation page
      }
      
      // If email is already confirmed, proceed with normal login flow
      if (newUser.token) {
        setAuthToken(newUser.token);
      }
      
      setUser(newUser);
      queryClient.clear(); // Clear all cached queries after registration
      
      // Invalidate trips and pending invitations after registration
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips`] });
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips/memberships/pending`] });
      
      // Connect WebSocket after registration
      wsClient.connect(newUser.id, []);
      
      // Always redirect to home page - let home page handle pending invitations
      navigate("/");
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
      await logoutUser();
      // Remove the token from localStorage
      removeAuthToken();
      setUser(null);
      queryClient.clear(); // Clear all cached queries after logout
      wsClient.disconnect();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refreshUser = async () => {
    try {
      console.log('Auth context: Starting user refresh...');
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
        console.log('Auth context: Received user data:', userData);
        setUser(userData);
        
        // Don't clear queries here as it can interfere with the current execution
        // Instead, just invalidate the auth query and let the profile update handle the rest
        console.log('Auth context: Invalidating auth query...');
        queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/auth/me`] });
        
        console.log('Auth context: User refresh completed successfully');
      } else {
        console.error('Auth context: Failed to fetch user data, status:', res.status);
      }
    } catch (e) {
      console.error('Error refreshing user:', e);
      throw e; // Re-throw to let the caller handle the error
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
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
