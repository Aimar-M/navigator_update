import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useFullStory } from "@/hooks/use-fullstory";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import navigatorLogo from "@assets/ab_Navigator2-11_1749673314519.png";
import navigatorText from "@assets/ab_Navigator2-09_1749673915685.png";
import companyLogo from "@assets/ab_Navigator2-09_1749674413735.png";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { trackPage } = useFullStory();
  
  // Track page view
  useEffect(() => {
    trackPage('Login Page', {
      timestamp: new Date().toISOString(),
    });
  }, [trackPage]);

  // Debug: Log environment variables
  console.log('🔍 Current environment variables:', {
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  });
  const [identifier, setIdentifier] = useState(""); // Single field for email or username
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const { login, isLoading, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Handle OAuth redirect with temporary token
  useEffect(() => {
    console.log('🔍 Login page: Checking for OAuth parameters...');
    console.log('🔍 Login page: Current URL:', window.location.href);
    console.log('🔍 Login page: window.location.search:', window.location.search);
    console.log('🔍 Login page: window.location.hash:', window.location.hash);
    
    const urlParams = new URLSearchParams(window.location.search);
    const oauthToken = urlParams.get('oauth_token');
    const userId = urlParams.get('user_id');
    
    console.log('🔍 Login page: URL parameters:', { oauthToken, userId });
    console.log('🔍 Login page: All URL params:', Object.fromEntries(urlParams.entries()));
    
    if (oauthToken && userId) {
      console.log('🔐 Login page: OAuth redirect detected:', { oauthToken, userId });
      console.log('🔍 Login page: Storing OAuth token in localStorage...');
      
      // Store the temporary OAuth token
      localStorage.setItem('auth_token', oauthToken);
      console.log('🔍 Login page: Token stored, clearing URL parameters...');
      
      // Clear the URL parameters
      window.history.replaceState({}, document.title, '/');
      console.log('🔍 Login page: URL cleared, now validating OAuth token...');
      
      // Validate the OAuth token with retry logic to handle race conditions
      const validateOAuthToken = async (retryCount = 0) => {
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
          console.log(`🔍 Validating OAuth token with backend (attempt ${retryCount + 1}):`, backendUrl);
          
          const response = await fetch(`${backendUrl}/api/auth/oauth/validate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ oauthToken, userId }),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ OAuth token validation successful:', data);
            
            // Store the permanent token
            localStorage.setItem('auth_token', data.token);
            console.log('✅ Permanent token stored, checking for pending invitation...');
            
            // Check for pending invitation before redirecting
            const pendingInvitation = localStorage.getItem('pendingInvitation');
            if (pendingInvitation) {
              console.log('🔗 Found pending invitation, redirecting to invitation page...');
              navigate(`/invite/${pendingInvitation}`);
            } else {
              // Redirect to homepage with permanent token
              console.log('🔗 No pending invitation, redirecting to homepage...');
              navigate('/');
            }
          } else {
            console.error(`❌ OAuth token validation failed (attempt ${retryCount + 1}):`, response.status);
            
            // Retry logic for race conditions
            if (retryCount < 2 && response.status === 404) {
              console.log('🔄 User not found, retrying in 1 second... (session might not be ready)');
              setTimeout(() => validateOAuthToken(retryCount + 1), 1000);
              return;
            }
            
            localStorage.removeItem('auth_token');
            // Stay on login page if validation fails after retries
          }
        } catch (error) {
          console.error(`❌ OAuth token validation error (attempt ${retryCount + 1}):`, error);
          
          // Retry logic for network errors
          if (retryCount < 2) {
            console.log('🔄 Network error, retrying in 1 second...');
            setTimeout(() => validateOAuthToken(retryCount + 1), 1000);
            return;
          }
          
          localStorage.removeItem('auth_token');
          // Stay on login page if validation fails after retries
        }
      };
      
      validateOAuthToken();
    } else {
      console.log('🔍 Login page: No OAuth parameters found');
      console.log('🔍 Login page: Checking if we should test OAuth flow...');
      
      // Test if we can reach the backend OAuth test endpoint
      const testOAuth = async () => {
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
          if (backendUrl) {
            console.log('🔍 Testing OAuth backend connection to:', backendUrl);
            const response = await fetch(`${backendUrl}/api/auth/oauth/test`);
            if (response.ok) {
              const data = await response.json();
              console.log('✅ OAuth backend test successful:', data);
            } else {
              console.log('❌ OAuth backend test failed:', response.status);
            }
          }
        } catch (error) {
          console.log('❌ OAuth backend test error:', error);
        }
      };
      
      testOAuth();
    }
  }, [navigate]);

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  const validate = () => {
    const newErrors: { identifier?: string; password?: string } = {};
    
    if (!identifier.trim()) {
      newErrors.identifier = "Identifier (Username or Email) is required";
    }
    
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const loginData = { identifier, password };
      console.log("Attempting to log in with:", identifier);
      const result = await login(loginData);
      
      // Check if account requires recovery (deleted account)
      if (result && result.requiresRecovery) {
        console.log("Account requires recovery:", result);
        // Redirect to recovery page with email
        const email = result.email || (identifier.includes('@') ? identifier : '');
        if (email) {
          navigate(`/recover-account?email=${encodeURIComponent(email)}`);
        } else {
          navigate('/recover-account');
        }
        return;
      }
      
      // If no recovery needed and no error, login was successful
      // (redirect is handled by use-auth hook)
      console.log("Login successful");
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Check if error is about deleted account
      try {
        const errorData = typeof error === 'string' ? JSON.parse(error) : error;
        if (errorData?.code === 'ACCOUNT_DELETED' || errorData?.requiresRecovery) {
          const email = errorData.email || (identifier.includes('@') ? identifier : '');
          if (email) {
            navigate(`/recover-account?email=${encodeURIComponent(email)}`);
          } else {
            navigate('/recover-account');
          }
          return;
        }
      } catch (parseError) {
        // Not JSON, continue with normal error handling
      }
      
      // Display login error directly on the page for easier debugging
      setErrors({
        ...errors,
        identifier: "Login failed. Please check your credentials."
      });
    }
  };

  const handleRecoveryRequest = async () => {
    setRecoveryLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_BASE}/api/auth/recover-account/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: recoveryEmail,
          password: password
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setRecoverySent(true);
        toast({
          title: "Recovery email sent",
          description: data.message || "Please check your inbox and click the link to restore your account.",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send recovery email. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Recovery request error:", error);
      toast({
        title: "Error",
        description: "Failed to send recovery email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 relative">
      {/* Company logo in top left */}
      <Link href="/">
        <img 
          src={companyLogo} 
          alt="Navigator Company Logo" 
          className="hidden md:block absolute top-4 left-4 h-12 md:h-24 cursor-pointer hover:opacity-80 transition-opacity"
        />
      </Link>
      <div className="w-full max-w-md">
        <div className="text-center mb-2">
          <div className="flex flex-col items-center justify-center mb-2">
            <img 
              src={navigatorLogo} 
              alt="Navigator Logo" 
              className="h-32 w-32 md:h-56 md:w-56 mb-2"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Welcome to Navigator</CardTitle>
            <CardDescription className="text-center">Log in to your account to continue</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                 <Label htmlFor="identifier">Username or Email</Label>
                <Input
                   id="identifier"
                   placeholder="Enter your username or email address"
                   value={identifier}
                   onChange={(e) => setIdentifier(e.target.value)}
                 />
                 {errors.identifier && (
                   <p className="text-sm text-red-500">{errors.identifier}</p>
                 )}
                 <p className="text-xs text-gray-500">
                   Username or email address 
                 </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                <Input
                  id="password"
                    type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Log In"}
              </Button>
              
              {/* Google OAuth Button */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  console.log('🔍 Google OAuth button clicked');
                  console.log('🔍 Environment variables:', {
                    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
                    NODE_ENV: import.meta.env.NODE_ENV,
                    MODE: import.meta.env.MODE
                  });
                  
                  const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
                  console.log('🔍 Available environment variables:', {
                    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
                    VITE_API_URL: import.meta.env.VITE_API_URL,
                    NODE_ENV: import.meta.env.NODE_ENV,
                    MODE: import.meta.env.MODE
                  });
                  
                  if (!backendUrl) {
                    console.error('❌ No backend URL environment variable is set');
                    alert('Backend URL not configured. Please check environment variables.');
                    return;
                  }
                  
                  const oauthUrl = `${backendUrl}/api/auth/google`;
                  console.log('🚀 Redirecting to Google OAuth:', oauthUrl);
                  console.log('🔍 Full OAuth flow will be:', {
                    step1: 'Redirect to Google',
                    step2: 'Google authenticates user',
                    step3: 'Google redirects to backend callback',
                    step4: 'Backend redirects to frontend with token'
                  });
                  
                  // Test the OAuth endpoint before redirecting
                  console.log('🔍 Testing OAuth endpoint before redirect...');
                  
                  // Use a GET request instead of HEAD, and handle redirects
                  fetch(oauthUrl, { 
                    method: 'GET',
                    redirect: 'manual' // Don't follow redirects automatically
                  })
                    .then(response => {
                      console.log('✅ OAuth endpoint test successful:', response.status);
                      console.log('🔍 Response type:', response.type);
                      
                      // If we get a redirect (302), that's expected for OAuth
                      if (response.status === 302 || response.status === 200) {
                        console.log('🔄 OAuth endpoint working, now redirecting to Google OAuth...');
                        window.location.href = oauthUrl;
                      } else {
                        console.log('⚠️ Unexpected response status:', response.status);
                        // Still try to redirect as OAuth endpoints often redirect
                        window.location.href = oauthUrl;
                      }
                    })
                    .catch(error => {
                      console.error('❌ OAuth endpoint test failed:', error);
                      console.log('🔄 Attempting redirect anyway as OAuth endpoints often redirect...');
                      // Try to redirect anyway - OAuth endpoints often redirect
                      window.location.href = oauthUrl;
                    });
                }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </Button>
              
              <div className="text-center text-sm text-gray-600 space-y-2">
                <p>
                  Don't have an account?{" "}
                  <Link href="/register">
                    <span className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer">
                      Sign up
                    </span>
                  </Link>
                </p>
                <p>
                  <Link href="/forgot-password">
                    <span className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer">
                      Forgot your password?
                    </span>
                  </Link>
                </p>
                <p>
                  <Link href="/recover-account">
                    <span className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer">
                      Recover your account
                    </span>
                  </Link>
                </p>
              </div>
            </CardFooter>
          </form>
        </Card>

        
      </div>

      {/* Recovery Prompt Dialog */}
      <Dialog open={showRecoveryPrompt} onOpenChange={setShowRecoveryPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account Recovery</DialogTitle>
            <DialogDescription>
              {recoverySent ? (
                <>
                  Recovery email sent! Please check your inbox at <strong>{recoveryEmail}</strong> and click the link to restore your account.
                </>
              ) : (
                <>
                  This account was deleted. We'll send a recovery email to verify it's you.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {!recoverySent && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRecoveryPrompt(false)}
                disabled={recoveryLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRecoveryRequest}
                disabled={recoveryLoading}
              >
                {recoveryLoading ? "Sending..." : "Send Recovery Email"}
              </Button>
            </DialogFooter>
          )}
          {recoverySent && (
            <DialogFooter>
              <Button onClick={() => {
                setShowRecoveryPrompt(false);
                setRecoverySent(false);
                setIdentifier("");
                setPassword("");
              }}>
                Close
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
