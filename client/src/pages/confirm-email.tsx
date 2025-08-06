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
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    const confirmEmail = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      
      if (!token) {
        setError("Invalid confirmation link. Missing token.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/confirm-email?token=${token}`, {
          method: 'GET',
        });

        if (response.ok) {
          setIsSuccess(true);
          toast({
            title: "Email confirmed successfully",
            description: "Your email has been confirmed. You can now log in to your account.",
          });
        } else {
          const errorData = await response.json();
          setError(errorData.message || "Failed to confirm email");
        }
      } catch (error) {
        console.error("Email confirmation error:", error);
        setError("Failed to confirm email. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    confirmEmail();
  }, [toast]);

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
              <CardTitle className="text-2xl font-bold text-gray-900">Email confirmed!</CardTitle>
              <CardDescription className="text-gray-600">
                Your email has been successfully confirmed.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                You can now log in to your account and start using Navigator.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={navigatorLogo} alt="Navigator Logo" className="h-12 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Email confirmation failed</CardTitle>
            <CardDescription className="text-gray-600">
              {error || "There was an error confirming your email address."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              The confirmation link may be invalid or expired. Please check your email for a new confirmation link or contact support.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Go to login
              </Button>
            </Link>
            <Link href="/register">
              <span className="text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer">
                Create new account
              </span>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 