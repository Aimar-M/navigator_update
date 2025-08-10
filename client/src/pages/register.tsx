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
import navigatorLogo from "@/assets/navigator-logo.svg";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const { register, isLoading, user } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  // Show email confirmation message
  if (showConfirmationMessage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-2">
              <img 
                src={navigatorLogo} 
                alt="Navigator Logo" 
                className="h-10 w-10 mr-2"
              />
              <h1 className="text-2xl font-bold text-gray-900">Navigator</h1>
            </div>
            <p className="text-gray-600">Plan amazing trips with friends</p>
          </div>

          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-green-600">🎉 Account Created Successfully!</CardTitle>
              <CardDescription className="text-gray-600">
                Please confirm your email to activate your account
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  We've sent a confirmation email to <strong>{registeredEmail}</strong>
                </p>
              </div>
              
              <p className="text-sm text-gray-600">
                Check your inbox (and spam folder) for an email from Navigator. Click the confirmation link to activate your account.
              </p>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  Didn't receive the email?
                </p>
                <Button 
                  onClick={() => {
                    // This will trigger the resend functionality
                    localStorage.setItem('pendingEmailConfirmation', registeredEmail);
                    navigate('/confirm-email');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Resend Confirmation Email
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button asChild variant="outline">
                <Link href="/login">Back to Login</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear username error when user starts typing
    if (name === 'username' && errors.username) {
      setErrors(prev => ({ ...prev, username: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    // Username validation with strict rules
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else {
      const username = formData.username.trim();
      
      // Check for capital letters
      if (/[A-Z]/.test(username)) {
        newErrors.username = "Username cannot contain capital letters";
      }
      // Check for spaces
      else if (/\s/.test(username)) {
        newErrors.username = "Username cannot contain spaces";
      }
      // Check for special characters (only allow letters, numbers, underscores, and hyphens)
      else if (!/^[a-z0-9_-]+$/.test(username)) {
        newErrors.username = "Username can only contain lowercase letters, numbers, underscores, and hyphens";
      }
      // Check length (3-20 characters)
      else if (username.length < 3) {
        newErrors.username = "Username must be at least 3 characters long";
      }
      else if (username.length > 20) {
        newErrors.username = "Username must be 20 characters or less";
      }
      // Check if it starts with a letter or number (not underscore or hyphen)
      else if (!/^[a-z0-9]/.test(username)) {
        newErrors.username = "Username must start with a letter or number";
      }
      // Check if it ends with a letter or number (not underscore or hyphen)
      else if (!/[a-z0-9]$/.test(username)) {
        newErrors.username = "Username must end with a letter or number";
      }
    }
    
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";
    
    // Name is optional, no validation needed
    
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const { confirmPassword, ...registerData } = formData;
      
      // Store email in localStorage for potential resend confirmation
      localStorage.setItem('pendingEmailConfirmation', formData.email);
      
      const result = await register(registerData);
      
      // Check if registration requires email confirmation
      if (result && result.requiresEmailConfirmation) {
        setRegisteredEmail(formData.email);
        setShowConfirmationMessage(true);
        // Clear form data
        setFormData({
          username: "",
          email: "",
          name: "",
          password: "",
          confirmPassword: "",
        });
      }
      
      // Show success message about email confirmation
      // The register function should handle the redirect or show confirmation message
    } catch (error) {
      console.error("Registration error:", error);
      // Remove stored email if registration failed
      localStorage.removeItem('pendingEmailConfirmation');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <img 
              src={navigatorLogo} 
              alt="Navigator Logo" 
              className="h-10 w-10 mr-2"
            />
            <h1 className="text-2xl font-bold text-gray-900">Navigator</h1>
          </div>
          <p className="text-gray-600">Plan amazing trips with friends</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create an Account</CardTitle>
            <CardDescription>Sign up to start planning your trips</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username}</p>
                )}
                <p className="text-xs text-gray-500">
                  Username must be 3-20 characters, lowercase letters, numbers, underscores, and hyphens only. Cannot start or end with special characters.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name (Optional)</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter your full name (optional)"
                  value={formData.name}
                  onChange={handleChange}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create Account"}
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
                  console.log('🔍 Google OAuth button clicked (register)');
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
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign up with Google
              </Button>
              
              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login">
                  <span className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer">
                    Log in
                  </span>
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
