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
