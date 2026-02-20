import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
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
import { useAuth } from "@/hooks/use-auth";
import navigatorLogo from "@assets/ab_Navigator2-11_1749673314519.png";

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function RecoverAccount() {
  const [token, setToken] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [emailInput, setEmailInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    const emailParam = urlParams.get('email');
    const oauthDeleted = urlParams.get('oauth_deleted');
    
    // If token and email are in URL, validate the recovery link
    if (tokenParam && emailParam) {
      setToken(tokenParam);
      setEmail(decodeURIComponent(emailParam));
      validateToken(tokenParam, decodeURIComponent(emailParam));
    } else if (emailParam) {
      // If only email is provided, show email input form pre-filled
      setEmailInput(decodeURIComponent(emailParam));
      setIsValidating(false);
    } else if (oauthDeleted) {
      // OAuth login detected deleted account - show message
      setIsValidating(false);
      setError("Your Google account is linked to a deleted Navigator account. Please enter your email to recover it.");
    } else {
      // No token/email - show email input form
      setIsValidating(false);
    }
  }, []);

  const validateToken = async (tokenValue: string, emailValue: string) => {
    setIsValidating(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/auth/recover-account/confirm?token=${tokenValue}&email=${encodeURIComponent(emailValue)}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setIsValid(true);
        } else {
          setError(data.message || "Invalid recovery link");
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Invalid or expired recovery link");
      }
    } catch (error) {
      console.error("Token validation error:", error);
      setError("Failed to validate recovery link. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsRequesting(true);
    setError("");
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/recover-account/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailInput
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setIsRequested(true);
        toast({
          title: "Recovery email sent",
          description: data.message || "Please check your inbox and click the link to restore your account.",
        });
      } else {
        setError(data.message || "Failed to send recovery email. Please try again.");
      }
    } catch (error) {
      console.error("Recovery request error:", error);
      setError("Failed to send recovery email. Please try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRecover = async () => {
    setIsRecovering(true);
    setError("");
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/recover-account/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, email }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store the token and user data
        if (data.user && data.user.token) {
          localStorage.setItem('auth_token', data.user.token);
        }
        
        toast({
          title: "Account Recovered",
          description: "Your account has been successfully restored. Welcome back!",
        });
        
        // Redirect to create-trip if pending trip data, otherwise home page
        setTimeout(() => {
          const pendingTrip = localStorage.getItem('pendingTripData');
          window.location.href = pendingTrip ? "/create-trip" : "/";
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to recover account. Please try again.");
      }
    } catch (error) {
      console.error("Recovery error:", error);
      setError("Failed to recover account. Please try again.");
    } finally {
      setIsRecovering(false);
    }
  };

  // Show email input form if no token/email in URL or if recovery was requested
  if (!token && !email) {
    if (isRequested) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-4">
              <img 
                src={navigatorLogo} 
                alt="Navigator Logo" 
                className="h-32 w-32 mx-auto mb-4"
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Check your email</CardTitle>
                <CardDescription className="text-center">
                  We've sent a recovery link to {emailInput}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Click the link in the email to restore your account. The link will expire in 7 days.
                </p>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <Button 
                  onClick={() => setIsRequested(false)} 
                  variant="outline" 
                  className="w-full"
                >
                  Try again
                </Button>
                <Button 
                  onClick={() => navigate("/login")} 
                  variant="ghost" 
                  className="w-full"
                >
                  Back to login
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-4">
            <img 
              src={navigatorLogo} 
              alt="Navigator Logo" 
              className="h-32 w-32 mx-auto mb-4"
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Recover Your Account</CardTitle>
              <CardDescription className="text-center">
                Enter your email to receive a recovery link
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleRequestRecovery}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isRequesting}
                >
                  {isRequesting ? "Sending..." : "Send Recovery Email"}
                </Button>
                <Button 
                  onClick={() => navigate("/login")} 
                  variant="outline" 
                  className="w-full"
                  disabled={isRequesting}
                >
                  Back to Login
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Validating recovery link...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isValid || error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-4">
            <img 
              src={navigatorLogo} 
              alt="Navigator Logo" 
              className="h-32 w-32 mx-auto mb-4"
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Invalid Recovery Link</CardTitle>
              <CardDescription className="text-center">
                {error || "This recovery link is invalid or has expired."}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button onClick={() => navigate("/login")}>
                Back to Login
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-4">
          <img 
            src={navigatorLogo} 
            alt="Navigator Logo" 
            className="h-32 w-32 mx-auto mb-4"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Recover Your Account</CardTitle>
            <CardDescription className="text-center">
              This will restore your account and all your trips and data. You'll be logged in automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
              <p className="text-sm">
                <strong>Account:</strong> {email}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              onClick={handleRecover}
              className="w-full"
              disabled={isRecovering}
            >
              {isRecovering ? "Recovering..." : "Recover Account"}
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/login")}
              className="w-full"
              disabled={isRecovering}
            >
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

