import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
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

export default function Login() {
  // Debug: Log environment variables
  console.log('🔍 Current environment variables:', {
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const { login, isLoading, user } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  const validate = () => {
    const newErrors: { username?: string; password?: string } = {};
    if (!username.trim()) newErrors.username = "Username is required";
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      console.log("Attempting to log in with:", username);
      await login(username, password);
      console.log("Login successful");
    } catch (error) {
      console.error("Login error:", error);
      // Display login error directly on the page for easier debugging
      setErrors({
        ...errors,
        username: "Login failed. Please check your credentials."
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 relative">
      {/* Company logo in top left */}
      <img 
        src={companyLogo} 
        alt="Navigator Company Logo" 
        className="absolute top-4 left-4 h-12 md:h-24"
      />
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
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
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
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
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
                  
                  const backendUrl = import.meta.env.VITE_BACKEND_URL;
                  if (!backendUrl) {
                    console.error('❌ VITE_BACKEND_URL environment variable is not set');
                    alert('Backend URL not configured. Please check environment variables.');
                    return;
                  }
                  
                  console.log('🚀 Redirecting to:', `${backendUrl}/api/auth/google`);
                  window.location.href = `${backendUrl}/api/auth/google`;
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
              
              {/* Manual OAuth Token Input */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or use OAuth token</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="oauthToken">OAuth Token (from success page)</Label>
                <Input
                  id="oauthToken"
                  placeholder="e.g., 19_oauth_temp"
                  onChange={(e) => {
                    const token = e.target.value.trim();
                    if (token) {
                      console.log('🔐 Manual OAuth token entered:', token);
                      localStorage.setItem('auth_token', token);
                      // Reload page to trigger auth check
                      window.location.reload();
                    }
                  }}
                />
                <p className="text-xs text-gray-500">
                  If Google OAuth redirects you to a success page, copy the token and paste it here
                </p>
              </div>
              
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
              </div>
            </CardFooter>
          </form>
        </Card>

        
      </div>
    </div>
  );
}
