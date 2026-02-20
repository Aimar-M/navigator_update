import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useFullStory } from "@/hooks/use-fullstory";
import { fullstory } from "@/lib/fullstory";
import { useEffect } from "react";
import FullStoryDebug from "@/components/FullStoryDebug";
import { SEO } from "@/components/SEO";

import "@/styles/landing.css";

import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import PhotoWallSection from "@/components/landing/PhotoWallSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import LandingFooter from "@/components/landing/LandingFooter";

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
    <div className="min-h-screen bg-white text-nav-black font-inter overflow-x-hidden">
      <SEO page="home" />
      <FullStoryDebug />
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PhotoWallSection />
      <TestimonialsSection />
      <FinalCTASection />
      <LandingFooter />
    </div>
  );
}
