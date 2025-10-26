import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useFullStory } from "@/hooks/use-fullstory";
import { fullstory } from "@/lib/fullstory";
import { useEffect } from "react";
import backgroundVideo from "@/assets/IMG_4795_1758657014573.mov";
import navigatorLogo from "@/assets/ab_Navigator2-02.png";
import FullStoryDebug from "@/components/FullStoryDebug";

export default function Landing() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { trackPage } = useFullStory();

  // Track page view
  useEffect(() => {
    trackPage('Landing Page', {
      isAuthenticated: !!user,
      timestamp: new Date().toISOString(),
    });
    
    // Test FullStory connection
    setTimeout(() => {
      fullstory.testConnection();
    }, 2000);
  }, [trackPage, user]);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render landing page if user is authenticated (will redirect)
  if (user) {
    return null;
  }
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <FullStoryDebug />
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          data-testid="background-video"
        >
          <source src={backgroundVideo} type="video/mp4" />
          <source src={backgroundVideo} type="video/quicktime" />
          {/* Fallback gradient for unsupported browsers */}
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        </video>
        {/* Dark overlay to ensure text readability */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Header */}
      <header className="relative z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <nav className="flex items-center space-x-8">
              <Link href="/" className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-medium" data-testid="nav-home">
                Home
              </Link>
              <Link href="/about" className="text-white/80 hover:text-white transition-colors" data-testid="nav-about">
                About
              </Link>
              <Link href="/contact" className="text-white/80 hover:text-white transition-colors" data-testid="nav-contact">
                Contact
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center px-4 sm:px-6 lg:px-8">
          {/* Navigator Logo */}
          <div className="mb-10">
            <img 
              src={navigatorLogo} 
              alt="Navigator Logo" 
              className="h-72 mx-auto filter brightness-0 invert opacity-90"
              data-testid="navigator-logo"
            />
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-7xl font-bold text-white mb-12 leading-tight">
            Group Travel Made{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Simple
            </span>
          </h1>

          {/* Action Button */}
          <div className="flex justify-center">
            <Link href="/login">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold hover:from-blue-600 hover:to-purple-700 hover:-translate-y-1 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-purple-500/30 px-10 py-4 text-xl"
                data-testid="button-sign-up-sign-in"
              >
                Sign Up / Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}