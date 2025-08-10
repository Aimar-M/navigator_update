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
import { useToast } from "@/hooks/use-toast";
import navigatorLogo from "@assets/ab_Navigator2-11_1749673314519.png";

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ConfirmEmail() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string>("");
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    const confirmEmail = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      
      if (!token) {
        setError("Invalid confirmation link. Missing token.");
        setIsLoading(false);
        setShowResend(true);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/confirm-email?token=${token}`, {
          method: 'GET',
        });

        if (response.ok) {
          const data = await response.json();
          setIsSuccess(true);
          toast({
            title: "Email confirmed successfully! 🎉",
            description: `Welcome ${data.username}! Your email has been confirmed. You can now log in to your account.`,
          });
        } else {
          const errorData = await response.json();
          setError(errorData.message || "Failed to confirm email");
          setShowResend(true);
        }
      } catch (error) {
        console.error("Email confirmation error:", error);
        setError("Failed to confirm email. Please try again.");
        setShowResend(true);
      } finally {
        setIsLoading(false);
      }
    };

    confirmEmail();
  }, [toast]);

  const handleResendConfirmation = async () => {
    setIsResending(true);
    try {
      // Get email from localStorage or prompt user
      const userEmail = localStorage.getItem('pendingEmailConfirmation') || prompt('Please enter your email address:');
      
      if (!userEmail) {
        toast({
          title: "Email required",
          description: "Please provide your email address to resend the confirmation.",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`${API_BASE}/api/auth/resend-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.confirmationUrl) {
          // Email is disabled, show the URL
          toast({
            title: "Confirmation link generated",
            description: "Email functionality is disabled. Here's your confirmation link:",
          });
          setError(`Email functionality is disabled. Please use this link: ${data.confirmationUrl}`);
        } else {
          toast({
            title: "Confirmation email sent! 📧",
            description: "A new confirmation email has been sent to your inbox.",
          });
        }
        setShowResend(false);
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to resend",
          description: errorData.message || "Failed to resend confirmation email",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Resend confirmation error:", error);
      toast({
        title: "Error",
        description: "Failed to resend confirmation email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img src={navigatorLogo} alt="Navigator Logo" className="h-12 w-auto" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Confirming your email...</CardTitle>
              <CardDescription className="text-gray-600">
                Please wait while we confirm your email address.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img src={navigatorLogo} alt="Navigator Logo" className="h-12 w-auto" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-600">Email confirmed! 🎉</CardTitle>
              <CardDescription className="text-gray-600">
                Your email has been successfully confirmed.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                You can now log in to your account and start using Navigator.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button asChild className="w-full">
                <Link href="/login">Go to Login</Link>
              </Button>
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
            <CardTitle className="text-2xl font-bold text-red-600">Email Confirmation Failed</CardTitle>
            <CardDescription className="text-gray-600">
              We couldn't confirm your email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            
            {showResend && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Didn't receive the email? Check your spam folder or request a new confirmation link.
                </p>
                <Button 
                  onClick={handleResendConfirmation}
                  disabled={isResending}
                  className="w-full"
                  variant="outline"
                >
                  {isResending ? "Sending..." : "Resend Confirmation Email"}
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button asChild className="w-full">
              <Link href="/login">Back to Login</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/register">Create New Account</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 