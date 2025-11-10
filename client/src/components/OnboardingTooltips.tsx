import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboarding } from "@/hooks/use-onboarding";
import { cn } from "@/lib/utils";

interface OnboardingSubStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  route?: string;
  action?: () => void;
  showAllComponents?: boolean;
  subSteps?: OnboardingSubStep[];
  triggerFormAction?: 'next-step' | 'create-trip';
}

const onboardingSteps: OnboardingStep[] = [
  // 🏠 Dashboard Section (Steps 1-5)
  {
    id: 'dashboard-overview',
    title: 'Welcome to your Dashboard',
    description: 'This is your travel hub — where you\'ll see all your trips, updates, and group activity in one place.',
    targetSelector: '[data-tooltip="dashboard-overview"]',
    position: 'bottom',
    route: '/dashboard'
  },
  {
    id: 'search-icon',
    title: 'Search through your trips',
    description: 'Quickly find any trip you\'ve joined or created — past or upcoming.',
    targetSelector: '[data-tooltip="search-icon"]',
    position: 'right',
    route: '/dashboard'
  },
  {
    id: 'settlements-icon',
    title: 'Stay squared up',
    description: 'View or manage shared expenses and get notified when your group settles up.',
    targetSelector: '[data-tooltip="settlements-icon"]',
    position: 'left',
    route: '/dashboard'
  },
  {
    id: 'notification-bell',
    title: 'Stay in the loop',
    description: 'Trip updates, invitations, payments — everything important lands here.',
    targetSelector: '[data-tooltip="notification-bell"]',
    position: 'bottom',
    route: '/dashboard'
  },
  {
    id: 'create-trip-prompt',
    title: 'Create your first trip',
    description: 'Tap here to start planning your next adventure with friends.',
    targetSelector: '[data-tooltip="create-trip-prompt"]',
    position: 'right',
    route: '/dashboard',
    action: () => {
      // Navigation handled by nextStep
    }
  },
  
  // 🧭 Create Trip Flow (Steps 6-10)
  {
    id: 'trip-name',
    title: 'Name your trip',
    description: 'Give it a title',
    targetSelector: '[data-tooltip="trip-name"]',
    position: 'top',
    route: '/create-trip'
  },
  {
    id: 'destination',
    title: 'Choose a destination',
    description: 'Where are you going?',
    targetSelector: '[data-tooltip="destination"]',
    position: 'top',
    route: '/create-trip'
  },
  {
    id: 'dates',
    title: 'Set your trip dates',
    description: 'Add when you\'ll travel',
    targetSelector: '[data-tooltip="dates"]',
    position: 'top',
    route: '/create-trip',
    triggerFormAction: 'next-step'
  },
  {
    id: 'details',
    title: 'Add trip details',
    description: 'Describe what this trip is about — a getaway, a team retreat, a dream escape.',
    targetSelector: '[data-tooltip="details"]',
    position: 'top',
    route: '/create-trip'
  },
  {
    id: 'downpayment',
    title: 'Require a downpayment',
    description: 'If your trip has shared costs, you can set an upfront payment here.',
    targetSelector: '[data-tooltip="downpayment"]',
    position: 'top',
    route: '/create-trip',
    triggerFormAction: 'create-trip'
  },
  
  // 🏖 Trip Overview Page (Steps 11-15)
  {
    id: 'upload-photo',
    title: 'Add a cover photo',
    description: 'Give your trip a face — upload something that captures the vibe.',
    targetSelector: '[data-tooltip="upload-photo"]',
    position: 'top',
    route: '/trips/:id'
  },
  {
    id: 'trip-details',
    title: 'Edit your trip info',
    description: 'Update the name, description, or destination anytime.',
    targetSelector: '[data-tooltip="trip-details"]',
    position: 'top',
    route: '/trips/:id'
  },
  {
    id: 'invite-friends',
    title: 'Invite your crew',
    description: 'Add friends by username or send a quick invite link.',
    targetSelector: '[data-tooltip="invite-friends"]',
    position: 'top',
    route: '/trips/:id'
  },
  {
    id: 'page-components',
    title: 'Explore your trip features',
    description: 'Multiple tooltips will appear simultaneously',
    targetSelector: '[data-tooltip="page-components"]',
    position: 'center',
    route: '/trips/:id',
    showAllComponents: true,
    subSteps: [
      {
        id: 'itinerary-tab',
        title: 'Itinerary',
        description: 'Plan your trip schedule and activities.',
        targetSelector: '[data-tooltip="itinerary-tab"]',
        position: 'top'
      },
      {
        id: 'chat-tab',
        title: 'Chat',
        description: 'Talk with your group, share updates, and vote seamlessly.',
        targetSelector: '[data-tooltip="chat-tab"]',
        position: 'top'
      },
      {
        id: 'expenses-tab',
        title: 'Expenses',
        description: 'Track and split costs effortlessly.',
        targetSelector: '[data-tooltip="expenses-tab"]',
        position: 'top'
      },
      {
        id: 'polls-tab',
        title: 'Polls',
        description: 'Create dedicated polls and let everyone decide together.',
        targetSelector: '[data-tooltip="polls-tab"]',
        position: 'top'
      },
      {
        id: 'navigator-logo',
        title: 'Navigator Logo',
        description: 'Go back home',
        targetSelector: '[data-tooltip="navigator-logo"]',
        position: 'bottom'
      }
    ]
  },
  {
    id: 'completion',
    title: '🎉 You\'re all set!',
    description: 'Your first trip is ready — invite your friends, start planning, and explore together.\n\nNavigator makes group travel simple. 🌍',
    targetSelector: '[data-tooltip="completion"]',
    position: 'center',
    route: '/trips/:id'
  }
];

const TOTAL_STEPS = onboardingSteps.length;

export default function OnboardingTooltips() {
  const { currentStep, isVisible, nextStep, previousStep, dismissOnboarding, completeOnboarding, isStepActive } = useOnboarding();
  const [, navigate] = useLocation();
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [dismissedSubSteps, setDismissedSubSteps] = useState<Set<string>>(new Set());
  const tooltipRef = useRef<HTMLDivElement>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentStepData = onboardingSteps[currentStep];
  const isStep15 = currentStepData?.id === 'page-components';
  const isCompletionStep = currentStepData?.id === 'completion';

  // Handle route navigation
  useEffect(() => {
    if (!isVisible || !currentStepData) return;

    const route = currentStepData.route;
    if (!route) return;

    // Handle dynamic routes
    if (route.includes(':id')) {
      const tripId = localStorage.getItem('onboardingTripId');
      if (tripId) {
        const actualRoute = route.replace(':id', tripId);
        if (window.location.pathname !== actualRoute) {
          navigate(actualRoute);
        }
      }
    } else {
      // Handle static routes
      if (window.location.pathname !== route) {
        navigate(route);
      }
    }
  }, [currentStep, isVisible, navigate, currentStepData]);

  // Handle step 5 navigation to create-trip
  useEffect(() => {
    if (isVisible && currentStep === 4 && currentStepData?.id === 'create-trip-prompt') {
      // Small delay to ensure route change happens
      const timer = setTimeout(() => {
        navigate('/create-trip');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isVisible, navigate, currentStepData]);

  // Find and highlight target element
  useEffect(() => {
    if (!isVisible || !currentStepData || isStep15) return;

    const findTarget = () => {
      const tryFind = (attempts = 0) => {
        const element = document.querySelector(currentStepData.targetSelector) as HTMLElement;
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTargetElement(element);
          element.classList.add('tooltip-highlight');
          
          // Auto-remove highlight after 15 seconds
          if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
          }
          highlightTimeoutRef.current = setTimeout(() => {
            element.classList.remove('tooltip-highlight');
          }, 15000);

          // Small delay to ensure element is scrolled into view
          setTimeout(() => updatePosition(element), 100);
        } else if (attempts < 20) {
          setTimeout(() => tryFind(attempts + 1), 200);
        }
      };
      tryFind();
    };

    const updatePosition = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const tooltipRect = tooltip.getBoundingClientRect();
      if (tooltipRect.width === 0 || tooltipRect.height === 0) {
        setTimeout(() => updatePosition(element), 50);
        return;
      }

      let top = 0;
      let left = 0;

      switch (currentStepData.position) {
        case 'top':
          top = rect.top - tooltipRect.height - 16;
          left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + 16;
          left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          left = rect.left - tooltipRect.width - 16;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          left = rect.right + 16;
          break;
        case 'center':
          top = window.innerHeight / 2 - tooltipRect.height / 2;
          left = window.innerWidth / 2 - tooltipRect.width / 2;
          break;
      }

      // Keep tooltip within viewport
      const padding = 20;
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

      setTooltipPosition({ top, left });
    };

    const timeoutId = setTimeout(() => {
      findTarget();
    }, 1000);

    const handleResize = () => {
      if (targetElement) {
        updatePosition(targetElement);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearTimeout(timeoutId);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      if (targetElement) {
        targetElement.classList.remove('tooltip-highlight');
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [currentStep, isVisible, currentStepData, isStep15, targetElement]);

  // Handle step 15 sub-steps dismissal
  useEffect(() => {
    if (isStep15 && currentStepData?.subSteps) {
      const allSubSteps = currentStepData.subSteps.map(s => s.id);
      const allDismissed = allSubSteps.every(id => dismissedSubSteps.has(id));
      
      if (allDismissed && dismissedSubSteps.size === allSubSteps.length) {
        // All sub-steps dismissed, move to completion
        setTimeout(() => {
          nextStep();
        }, 300);
      }
    }
  }, [dismissedSubSteps, isStep15, currentStepData, nextStep]);

  // Handle form actions (steps 8 and 10)
  const handleNext = () => {
    if (currentStepData?.triggerFormAction === 'next-step') {
      // Trigger TripForm's nextStep
      const tripFormNextButton = document.querySelector('[data-trip-form-next]') as HTMLButtonElement;
      if (tripFormNextButton) {
        tripFormNextButton.click();
      }
    } else if (currentStepData?.triggerFormAction === 'create-trip') {
      // Trigger TripForm's submit
      const tripFormSubmitButton = document.querySelector('[data-trip-form-submit]') as HTMLButtonElement;
      if (tripFormSubmitButton) {
        tripFormSubmitButton.click();
        // Store trip ID when trip is created (handled by trip-form)
      }
    } else if (currentStep === TOTAL_STEPS - 1) {
      // Last step - complete onboarding
      completeOnboarding();
    } else {
      nextStep();
    }
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleDismiss = () => {
    dismissOnboarding();
  };

  const handleSubStepDismiss = (subStepId: string) => {
    setDismissedSubSteps(prev => new Set([...prev, subStepId]));
  };

  if (!isVisible || !currentStepData) return null;

  // Render step 15 with multiple tooltips
  if (isStep15 && currentStepData.subSteps) {
    return (
      <>
        {/* Overlay */}
        <div 
          className="fixed inset-0 z-[100] bg-black/20 transition-opacity duration-300 animate-in fade-in"
          onClick={handleDismiss}
        />
        
        {/* Multiple tooltips */}
        {currentStepData.subSteps.map((subStep) => {
          if (dismissedSubSteps.has(subStep.id)) return null;
          
          return (
            <SubStepTooltip
              key={subStep.id}
              subStep={subStep}
              onDismiss={() => handleSubStepDismiss(subStep.id)}
            />
          );
        })}
      </>
    );
  }

  // Render completion step
  if (isCompletionStep) {
    return (
      <>
        <div 
          className="fixed inset-0 z-[100] bg-black/20 transition-opacity duration-300 animate-in fade-in"
          onClick={handleDismiss}
        />
        <div
          ref={tooltipRef}
          className="fixed z-[101] w-80 transition-all duration-300 animate-in fade-in zoom-in-95"
          style={{
            top: `${window.innerHeight / 2 - 150}px`,
            left: `${window.innerWidth / 2 - 160}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-semibold text-gray-900">
                  {currentStepData.title}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleDismiss}>
                  <X className="text-gray-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {currentStepData.description}
              </p>
              <div className="flex items-center justify-end pt-2 border-t border-gray-200">
                <Button size="sm" onClick={completeOnboarding}>
                  Got it!
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Render regular step
  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-[100] bg-black/20 transition-opacity duration-300 animate-in fade-in"
        onClick={handleDismiss}
      />
      
      {/* Tooltip Card */}
      <div
        ref={tooltipRef}
        className={cn(
          "fixed z-[101] w-80 transition-all duration-300 animate-in fade-in zoom-in-95",
          tooltipPosition.top > 0 || tooltipPosition.left > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base font-semibold text-gray-900">
                {currentStepData.title}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                <X className="text-gray-500" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <p className="text-sm text-gray-600 leading-relaxed">
              {currentStepData.description}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-xs text-gray-500">
                {currentStep + 1} of {TOTAL_STEPS}
              </span>
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" size="sm" onClick={handlePrevious}>
                    <ArrowLeft />
                    Previous
                  </Button>
                )}
                <Button size="sm" onClick={handleNext}>
                  Next
                  <ArrowRight />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Sub-step tooltip component for step 15
function SubStepTooltip({ subStep, onDismiss }: { subStep: OnboardingSubStep; onDismiss: () => void }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const findTarget = () => {
      const tryFind = (attempts = 0) => {
        const element = document.querySelector(subStep.targetSelector) as HTMLElement;
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('tooltip-highlight');
          
          setTimeout(() => {
            const rect = element.getBoundingClientRect();
            const tooltip = tooltipRef.current;
            if (!tooltip) return;

            const tooltipRect = tooltip.getBoundingClientRect();
            let top = 0;
            let left = 0;

            switch (subStep.position) {
              case 'top':
                top = rect.top - tooltipRect.height - 16;
                left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                break;
              case 'bottom':
                top = rect.bottom + 16;
                left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                break;
              case 'left':
                top = rect.top + rect.height / 2 - tooltipRect.height / 2;
                left = rect.left - tooltipRect.width - 16;
                break;
              case 'right':
                top = rect.top + rect.height / 2 - tooltipRect.height / 2;
                left = rect.right + 16;
                break;
            }

            const padding = 20;
            top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
            left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

            setPosition({ top, left });
          }, 100);
        } else if (attempts < 20) {
          setTimeout(() => tryFind(attempts + 1), 200);
        }
      };
      tryFind();
    };

    const timeoutId = setTimeout(findTarget, 100);

    return () => {
      clearTimeout(timeoutId);
      const element = document.querySelector(subStep.targetSelector) as HTMLElement;
      if (element) {
        element.classList.remove('tooltip-highlight');
      }
    };
  }, [subStep]);

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[101] w-80 transition-all duration-300 animate-in fade-in zoom-in-95"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold text-gray-900">
              {subStep.title}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <X className="text-gray-500" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <p className="text-sm text-gray-600 leading-relaxed">
            {subStep.description}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

