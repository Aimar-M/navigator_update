import { useState } from "react";
import { Link } from "wouter";
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
import navigatorText from "@assets/ab_Navigator2-09_1749673915685.png";
import companyLogo from "@assets/ab_Navigator2-09_1749674413735.png";

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});
  const { toast } = useToast();

  const validate = () => {
    const newErrors: { email?: string } = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast({
          title: "Email sent",
          description: "If an account with that email exists, a password reset link has been sent.",
        });
      } else {
        const errorData = await response.json();
        setErrors({ email: errorData.message || "Failed to send reset email" });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setErrors({ email: "Failed to send reset email. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img src={navigatorLogo} alt="Navigator Logo" className="h-12 w-auto" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Check your email</CardTitle>
              <CardDescription className="text-gray-600">
                We've sent a password reset link to {email}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                onClick={() => setIsSubmitted(false)} 
                variant="outline" 
                className="w-full"
              >
                Try again
              </Button>
              <Link href="/login">
                <span className="text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer">
                  Back to login
                </span>
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
            <CardTitle className="text-2xl font-bold text-gray-900">Forgot your password?</CardTitle>
            <CardDescription className="text-gray-600">
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send reset link"}
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