import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import navigatorLogo from "@assets/ab_Navigator2-11_1749673314519.png";

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (!tokenParam) {
      toast({
        title: "Invalid reset link",
        description: "The password reset link is invalid or missing.",
        variant: "destructive",
      });
      navigate("/forgot-password");
      return;
    }
    setToken(tokenParam);
  }, [toast, navigate]);

  const validate = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {};
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
      newErrors.password = "Password must include uppercase, lowercase, number, and special character";
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      if (response.ok) {
        setIsSuccess(true);
        toast({
          title: "Password reset successfully",
          description: "Your password has been updated. You can now log in with your new password.",
        });
      } else {
        const errorData = await response.json();
        setErrors({ password: errorData.message || "Failed to reset password" });
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setErrors({ password: "Failed to reset password. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img src={navigatorLogo} alt="Navigator Logo" className="h-12 w-auto" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Password reset successful!</CardTitle>
              <CardDescription className="text-gray-600">
                Your password has been updated successfully.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                You can now log in with your new password.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Link href="/login">
                <Button className="w-full">
                  Go to login
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img src={navigatorLogo} alt="Navigator Logo" className="h-12 w-auto" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Invalid reset link</CardTitle>
              <CardDescription className="text-gray-600">
                The password reset link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col space-y-4">
              <Link href="/forgot-password">
                <Button className="w-full">
                  Request new reset link
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={navigatorLogo} alt="Navigator Logo" className="h-12 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Reset your password</CardTitle>
            <CardDescription className="text-gray-600">
              Enter your new password below.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Resetting..." : "Reset password"}
              </Button>
              <Link href="/login">
                <span className="text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer">
                  Back to login
                </span>
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
} 