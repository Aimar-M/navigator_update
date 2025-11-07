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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import navigatorLogo from "@assets/ab_Navigator2-11_1749673314519.png";

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function RecoverAccount() {
  const [token, setToken] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    const emailParam = urlParams.get('email');
    
    if (!tokenParam || !emailParam) {
      setError("Invalid recovery link. The link is missing required parameters.");
      setIsValidating(false);
      return;
    }
    
    setToken(tokenParam);
    setEmail(decodeURIComponent(emailParam));
    
    // Validate the recovery token
    validateToken(tokenParam, decodeURIComponent(emailParam));
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
        
        // Redirect to home page
        setTimeout(() => {
          window.location.href = "/";
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

