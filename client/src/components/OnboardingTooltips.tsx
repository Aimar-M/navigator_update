import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  route?: string;
  action?: () => void;
  triggerFormAction?: 'next-step' | 'create-trip';
}

const onboardingSteps: OnboardingStep[] = [
  // 👋 Welcome Step (Step 0)
  {
    id: 'welcome',
    title: 'Welcome to Navigator',
    description: 'We\'re excited to have you! To get the best experience, please save this webpage to your homescreen.',
    targetSelector: '', // No target - centered card
    position: 'center',
    route: '/dashboard'
  },
  // 🏠 Dashboard Section (Steps 1-5)
  {
    id: 'dashboard-overview',
    title: 'Welcome to your Dashboard',
    description: 'This is your travel hub — where you\'ll see all your trips in one place.',
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
    description: 'Get notified when your group settles up.',
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
    triggerFormAction: 'next-step'
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
    description: 'Update the name, description, dates, aiports, accomodations, or destination anytime.',
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
    description: 'Plan your itinerary, chat with friends, manage shared expenses, and organize polls.',
    targetSelector: '[data-tooltip="page-components"]',
    position: 'top',
    route: '/trips/:id'
  },
  {
    id: 'navigator-logo',
    title: 'Navigator Logo',
    description: 'Go back home',
    targetSelector: '[data-tooltip="navigator-logo"]',
    position: 'right',
    route: '/trips/:id'
  },
  {
    id: 'completion',
    title: '🎉 You\'re all set!',
    description: 'Your first trip is ready — invite your friends, start planning, and explore together.\n\nNavigator makes group travel simple. 🌍\n\nRemember to save Navigator to your homescreen for a better experience.',
    targetSelector: '[data-tooltip="completion"]',
    position: 'center',
    route: '/trips/:id'
  }
];

const TOTAL_STEPS = onboardingSteps.length;

// Get mobile-aware position for a step
function getStepPosition(stepId: string, desktopPosition: 'top' | 'bottom' | 'left' | 'right' | 'center', isMobile: boolean): 'top' | 'bottom' | 'left' | 'right' | 'center' {
  if (!isMobile) return desktopPosition;
  
  // Mobile position overrides
  switch (stepId) {
    case 'search-icon':
      return 'bottom';
    case 'settlements-icon':
      return 'bottom';
    case 'create-trip-prompt':
      return 'bottom';
    case 'navigator-logo':
      return 'bottom';
    case 'page-components':
      return 'bottom';
    default:
      return desktopPosition;
  }
}

export default function OnboardingTooltips() {
  const { currentStep, isVisible, nextStep, previousStep, dismissOnboarding, completeOnboarding, isStepActive } = useOnboarding();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const currentStepData = onboardingSteps[currentStep];
  const isCompletionStep = currentStepData?.id === 'completion';
  const isWelcomeStep = currentStepData?.id === 'welcome';
  const hasNoTarget = !currentStepData?.targetSelector || currentStepData.targetSelector === '';
  
  // Get mobile-aware position
  const effectivePosition = currentStepData 
    ? getStepPosition(currentStepData.id, currentStepData.position, isMobile)
    : 'center';

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

  // Step 5 navigation is handled in handleNext - no auto-navigation

  // For steps 11-16, wait for trip overview page before showing
  const [isOnTripOverviewPage, setIsOnTripOverviewPage] = useState(false);
  
  useEffect(() => {
    // Steps 11-16 need to be on trip overview page
    if (currentStep >= 10 && currentStepData?.route?.includes(':id')) {
      setIsOnTripOverviewPage(false); // Reset to false when step changes
      
      const checkTripOverview = (attempts = 0) => {
        const tripId = localStorage.getItem('onboardingTripId');
        const currentPath = window.location.pathname;
        const isOnOverview = tripId !== null && currentPath.includes(`/trips/${tripId}`);
        
        if (isOnOverview) {
          // Wait for page content to be ready (not just route match)
          // Check if main content elements exist
          const hasContent = document.querySelector('[data-tooltip]') !== null || 
                           document.body.children.length > 1;
          
          if (hasContent || attempts > 20) {
            // Content is ready or we've waited long enough (4 seconds)
            setIsOnTripOverviewPage(true);
          } else {
            // Keep checking for content
            setTimeout(() => checkTripOverview(attempts + 1), 200);
          }
        } else {
          // Keep checking for route match (up to 10 seconds for slow connections)
          if (attempts < 50) {
            setTimeout(() => checkTripOverview(attempts + 1), 200);
          }
        }
      };
      
      checkTripOverview();
    } else {
      setIsOnTripOverviewPage(true); // For steps 1-10, always show
    }
  }, [currentStep, currentStepData, isVisible]);

  // Find and highlight target element
  useEffect(() => {
    // Skip if no target selector (e.g., welcome step or completion step with center position)
    if (!isVisible || !currentStepData || hasNoTarget || !isOnTripOverviewPage) {
      // For center position steps without target, set position immediately
      if (hasNoTarget && effectivePosition === 'center') {
        const tooltip = tooltipRef.current;
        if (tooltip) {
          const tooltipRect = tooltip.getBoundingClientRect();
          if (tooltipRect.width > 0 && tooltipRect.height > 0) {
            setTooltipPosition({
              top: isMobile 
                ? window.innerHeight / 2 - tooltipRect.height / 2
                : window.innerHeight / 2 - tooltipRect.height / 2,
              left: isMobile
                ? window.innerWidth / 2 - tooltipRect.width / 2
                : window.innerWidth / 2 - tooltipRect.width / 2
            });
          } else {
            // Retry if tooltip hasn't rendered yet
            setTimeout(() => {
              const retryRect = tooltip.getBoundingClientRect();
              if (retryRect.width > 0 && retryRect.height > 0) {
                setTooltipPosition({
                  top: isMobile 
                    ? window.innerHeight / 2 - retryRect.height / 2
                    : window.innerHeight / 2 - retryRect.height / 2,
                  left: isMobile
                    ? window.innerWidth / 2 - retryRect.width / 2
                    : window.innerWidth / 2 - retryRect.width / 2
                });
              }
            }, 100);
          }
        }
      }
      return;
    }

    const findTarget = () => {
      const tryFind = (attempts = 0) => {
        const element = document.querySelector(currentStepData.targetSelector) as HTMLElement;
        if (element) {
          // Check if element is actually visible and has dimensions (not just in DOM)
          const rect = element.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && 
                           rect.top < window.innerHeight && 
                           rect.bottom > 0;
          
          if (!isVisible && attempts < 50) {
            // Element exists but not visible yet - wait longer for slow connections
            setTimeout(() => tryFind(attempts + 1), 200);
            return;
          }

          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTargetElement(element);
          element.classList.add('tooltip-highlight');
          
          // Set up ResizeObserver to handle layout shifts (e.g., when images load on slow connections)
          if ('ResizeObserver' in window) {
            // Clean up any existing observer
            if (resizeObserverRef.current) {
              resizeObserverRef.current.disconnect();
            }
            
            resizeObserverRef.current = new ResizeObserver(() => {
              // Debounce resize observer updates
              if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
              }
              scrollTimeoutRef.current = setTimeout(() => {
                updatePosition(element);
              }, 150);
            });
            resizeObserverRef.current.observe(element);
          }
          
          // Auto-remove highlight after 15 seconds
          if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
          }
          highlightTimeoutRef.current = setTimeout(() => {
            element.classList.remove('tooltip-highlight');
          }, 15000);

          // Wait for images to load before positioning (helps with layout shifts)
          const waitForImages = () => {
            const images = element.querySelectorAll('img');
            let loadedCount = 0;
            const totalImages = images.length;
            
            if (totalImages === 0) {
              // No images, position immediately
              setTimeout(() => updatePosition(element), 300);
              return;
            }

            const checkComplete = () => {
              loadedCount++;
              if (loadedCount === totalImages) {
                // All images loaded, wait a bit more for layout to settle
                setTimeout(() => updatePosition(element), 300);
              }
            };

            images.forEach((img) => {
              if (img.complete) {
                checkComplete();
              } else {
                img.addEventListener('load', checkComplete, { once: true });
                img.addEventListener('error', checkComplete, { once: true });
              }
            });

            // Fallback: if images take too long, position anyway after 2 seconds
            setTimeout(() => {
              if (loadedCount < totalImages) {
                setTimeout(() => updatePosition(element), 300);
              }
            }, 2000);
          };

          // Small delay to ensure element is scrolled into view, then wait for images
          setTimeout(waitForImages, 100);
        } else if (attempts < 50) {
          // Increased from 20 to 50 attempts (10 seconds max instead of 4)
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

      // Use mobile-aware position
      const position = effectivePosition;

      switch (position) {
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

      // Keep tooltip within viewport with mobile-aware padding
      const padding = isMobile ? 16 : 20;
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

      setTooltipPosition({ top, left });
    };

    const timeoutId = setTimeout(() => {
      findTarget();
    }, 1000);

    // Throttle function to limit how often position updates
    const throttledUpdatePosition = () => {
      if (targetElement) {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          updatePosition(targetElement);
        }, 200); // Update at most every 200ms for smoother movement
      }
    };

    const handleResize = () => {
      if (targetElement) {
        updatePosition(targetElement);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', throttledUpdatePosition, true);

    return () => {
      clearTimeout(timeoutId);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (targetElement) {
        targetElement.classList.remove('tooltip-highlight');
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', throttledUpdatePosition, true);
    };
  }, [currentStep, isVisible, currentStepData, hasNoTarget, targetElement, isOnTripOverviewPage, effectivePosition, isMobile]);
  
  // Recalculate position when mobile state changes
  useEffect(() => {
    if (targetElement && isVisible && currentStepData && !hasNoTarget) {
      const updatePosition = () => {
        const rect = targetElement.getBoundingClientRect();
        const tooltip = tooltipRef.current;
        if (!tooltip) return;

        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.width === 0 || tooltipRect.height === 0) {
          setTimeout(updatePosition, 50);
          return;
        }

        let top = 0;
        let left = 0;
        const position = effectivePosition;

        switch (position) {
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

        const padding = isMobile ? 16 : 20;
        top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

        setTooltipPosition({ top, left });
      };
      
      setTimeout(updatePosition, 100);
    }
  }, [isMobile, targetElement, isVisible, currentStepData, hasNoTarget, effectivePosition]);

  // Handle form actions (steps 5, 8 and 10)
  const handleNext = () => {
    // Step 5: Navigate to create-trip when Next is clicked
    if (currentStepData?.id === 'create-trip-prompt') {
      navigate('/create-trip');
      // Small delay to ensure route change happens before moving to next step
      setTimeout(() => {
        nextStep();
      }, 100);
      return;
    }
    
    if (currentStepData?.triggerFormAction === 'next-step') {
      // Trigger TripForm's nextStep
      const tripFormNextButton = document.querySelector('[data-trip-form-next]') as HTMLButtonElement;
      if (tripFormNextButton) {
        tripFormNextButton.click();
        
        // If this is step 10 (downpayment), we're moving from form step 2 → 3
        // After form reaches step 3, auto-click the Create Trip button
        if (currentStepData?.id === 'downpayment') {
          // Wait for form to reach step 3, then auto-submit
          setTimeout(() => {
            const tripFormSubmitButton = document.querySelector('[data-trip-form-submit]') as HTMLButtonElement;
            if (tripFormSubmitButton && !tripFormSubmitButton.disabled) {
              tripFormSubmitButton.click();
            }
          }, 500);
        }
        
        // Wait a bit for form to update, then move to next onboarding step
        setTimeout(() => {
          nextStep();
        }, 300);
      } else {
        // Fallback: just move to next step if button not found
        nextStep();
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

  // For steps 11-17, don't show until we're on trip overview page
  if (!isVisible || !currentStepData) return null;
  if (currentStep >= 10 && currentStepData.route?.includes(':id') && !isOnTripOverviewPage) {
    return null; // Wait for trip overview page
  }

  // Render completion step
  if (isCompletionStep) {
    return (
      <>
        <div 
          className="fixed inset-0 z-[100] bg-black/20 transition-opacity duration-300 animate-in fade-in pointer-events-none"
        />
        <div
          ref={tooltipRef}
          className={cn(
            "fixed z-[101] transition-all duration-300 animate-in fade-in zoom-in-95",
            isMobile ? "w-[calc(100%-32px)] max-w-sm" : "w-80"
          )}
          style={{
            top: isMobile 
              ? `${window.innerHeight / 2 - 100}px`
              : `${window.innerHeight / 2 - 150}px`,
            left: isMobile
              ? '50%'
              : `${window.innerWidth / 2 - 160}px`,
            transform: isMobile ? 'translateX(-50%)' : 'none',
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

  // Render regular step (including welcome step and page-components step)
  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-[100] bg-black/20 transition-opacity duration-300 animate-in fade-in pointer-events-none"
      />
      
      {/* Tooltip Card */}
      <div
        ref={tooltipRef}
        className={cn(
          "fixed z-[101] transition-all duration-300 animate-in fade-in zoom-in-95",
          isMobile ? "w-[calc(100%-32px)] max-w-sm" : "w-80",
          (hasNoTarget || tooltipPosition.top > 0 || tooltipPosition.left > 0) ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: hasNoTarget && effectivePosition === 'center' 
            ? (isMobile ? `${window.innerHeight / 2 - 100}px` : `${window.innerHeight / 2 - 150}px`)
            : `${tooltipPosition.top}px`,
          left: hasNoTarget && effectivePosition === 'center'
            ? (isMobile ? '50%' : `${window.innerWidth / 2 - 160}px`)
            : `${tooltipPosition.left}px`,
          transform: hasNoTarget && effectivePosition === 'center' && isMobile ? 'translateX(-50%)' : 'none',
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
                  {isCompletionStep ? 'Got it!' : 'Next'}
                  {!isCompletionStep && <ArrowRight />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}


