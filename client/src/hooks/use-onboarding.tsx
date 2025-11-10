import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

const API_BASE = import.meta.env.VITE_API_URL || '';

interface OnboardingContextType {
  currentStep: number;
  isVisible: boolean;
  isCompleted: boolean;
  isNewUser: boolean;
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipStep: () => void;
  completeOnboarding: () => Promise<void>;
  dismissOnboarding: () => Promise<void>;
  isStepActive: (stepIndex: number) => boolean;
  checkIfNewUser: () => Promise<boolean>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const checkIfNewUser = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Fetch user's trips from backend (source of truth)
      const trips = await apiRequest<any[]>('GET', `${API_BASE}/api/trips`);
      const hasNoTrips = trips.length === 0;
      setIsNewUser(hasNoTrips);
      return hasNoTrips;
    } catch (error) {
      console.error('Error checking if user is new:', error);
      return false;
    }
  };

  const checkUserOnboardingStatus = async () => {
    if (!user || isChecking) return;
    
    setIsChecking(true);
    
    try {
      // Check if user has already seen onboarding
      // Use /api/auth/me to get current user profile
      const userProfile = await apiRequest<any>('GET', `${API_BASE}/api/auth/me`);
      const hasSeenOnboarding = userProfile?.hasSeenOnboarding === true;
      
      if (hasSeenOnboarding) {
        setIsCompleted(true);
        setIsVisible(false);
        setIsChecking(false);
        return;
      }

      // Check if user is new (has no trips)
      const isNew = await checkIfNewUser();
      
      if (isNew) {
        setIsVisible(true);
        setCurrentStep(0);
      } else {
        setIsCompleted(true);
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // On error, don't show onboarding to avoid annoying users
      setIsCompleted(true);
      setIsVisible(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Check onboarding status on mount and when user changes
  useEffect(() => {
    if (user) {
      checkUserOnboardingStatus();
    } else {
      setIsVisible(false);
      setIsCompleted(false);
    }
  }, [user]);

  const startOnboarding = () => {
    setIsVisible(true);
    setCurrentStep(0);
    setIsCompleted(false);
  };

  const nextStep = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const previousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const skipStep = () => {
    nextStep();
  };

  const completeOnboarding = async () => {
    try {
      // Mark onboarding as seen in backend
      await apiRequest('PUT', `${API_BASE}/api/users/profile`, {
        hasSeenOnboarding: true
      });
      
      setIsCompleted(true);
      setIsVisible(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still mark as completed locally even if API call fails
      setIsCompleted(true);
      setIsVisible(false);
    }
  };

  const dismissOnboarding = async () => {
    try {
      // Mark onboarding as seen in backend
      await apiRequest('PUT', `${API_BASE}/api/users/profile`, {
        hasSeenOnboarding: true
      });
      
      setIsCompleted(true);
      setIsVisible(false);
    } catch (error) {
      console.error('Error dismissing onboarding:', error);
      // Still mark as dismissed locally even if API call fails
      setIsCompleted(true);
      setIsVisible(false);
    }
  };

  const isStepActive = (stepIndex: number): boolean => {
    return isVisible && currentStep === stepIndex;
  };

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        isVisible,
        isCompleted,
        isNewUser,
        startOnboarding,
        nextStep,
        previousStep,
        skipStep,
        completeOnboarding,
        dismissOnboarding,
        isStepActive,
        checkIfNewUser,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

