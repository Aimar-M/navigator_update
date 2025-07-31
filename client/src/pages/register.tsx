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
  const { register, isLoading, user } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
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
      await register(registerData);
    } catch (error) {
      console.error("Registration error:", error);
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
