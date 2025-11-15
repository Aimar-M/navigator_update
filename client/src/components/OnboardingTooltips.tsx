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
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [userWantsTooltipBack, setUserWantsTooltipBack] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<number | NodeJS.Timeout | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const currentStepData = onboardingSteps[currentStep];
  const isCompletionStep = currentStepData?.id === 'completion';
  const isWelcomeStep = currentStepData?.id === 'welcome';
  const hasNoTarget = !currentStepData?.targetSelector || currentStepData.targetSelector === '';
  
  // Check if current step is a form step (steps 6-10, indices 5-9)
  const isFormStep = currentStep >= 5 && currentStep <= 9;
  
  // Get mobile-aware position
  const effectivePosition = currentStepData 
    ? getStepPosition(currentStepData.id, currentStepData.position, isMobile)
    : 'center';

  // Detect when user is typing in form fields - pause tooltips
  useEffect(() => {
    if (!isVisible || !isFormStep) return;

    const handleInput = () => {
      setIsUserTyping(true);
      setUserWantsTooltipBack(false); // Reset flag when user types
    };

    // Listen for input events on all form fields
    const formFields = document.querySelectorAll('input, textarea, select');
    formFields.forEach(field => {
      field.addEventListener('input', handleInput);
      field.addEventListener('keydown', handleInput);
    });

    return () => {
      formFields.forEach(field => {
        field.removeEventListener('input', handleInput);
        field.removeEventListener('keydown', handleInput);
      });
    };
  }, [isVisible, isFormStep, currentStep]);

  // Detect clicks on elements with data-tooltip - instant navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleElementClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickedElement = target.closest('[data-tooltip]') as HTMLElement;
      
      if (!clickedElement) return;
      
      const tooltipId = clickedElement.getAttribute('data-tooltip');
      if (!tooltipId) return;

      // Find which step this element belongs to
      const stepIndex = onboardingSteps.findIndex(step => {
        // Extract tooltip ID from selector (e.g., '[data-tooltip="trip-name"]' -> 'trip-name')
        const selectorId = step.targetSelector.replace('[data-tooltip="', '').replace('"]', '');
        return selectorId === tooltipId;
      });

      if (stepIndex === -1 || stepIndex <= currentStep) return;

      // If clicked element is for a future step, navigate and advance immediately
      const targetStep = onboardingSteps[stepIndex];
      
      // Navigate immediately
      if (targetStep.route) {
        if (targetStep.route.includes(':id')) {
          const tripId = localStorage.getItem('onboardingTripId');
          if (tripId) {
            const actualRoute = targetStep.route.replace(':id', tripId);
            navigate(actualRoute);
          }
        } else {
          navigate(targetStep.route);
        }
      }
      
      // Advance to that step immediately (skip all slow checks)
      let stepsToAdvance = stepIndex - currentStep;
      const advanceSteps = () => {
        if (stepsToAdvance > 0) {
          nextStep();
          stepsToAdvance--;
          if (stepsToAdvance > 0) {
            setTimeout(advanceSteps, 50); // Small delay between steps
          }
        }
      };
      advanceSteps();
    };

    document.addEventListener('click', handleElementClick, true);
    return () => {
      document.removeEventListener('click', handleElementClick, true);
    };
  }, [isVisible, currentStep, navigate, nextStep]);

  // Detect independent form actions and auto-advance
  useEffect(() => {
    if (!isVisible || !isFormStep || (isUserTyping && !userWantsTooltipBack)) return;

    // Detect if user moved form step independently (step 8 → step 9)
    if (currentStep === 7 && currentStepData?.id === 'dates') {
      const checkFormStep = () => {
        const detailsField = document.querySelector('[data-tooltip="details"]');
        const isOnFormStep2 = detailsField !== null && 
                              (detailsField as HTMLElement).offsetParent !== null;
        
        if (isOnFormStep2) {
          // User moved form step independently - auto-advance
          nextStep();
        }
      };

      const interval = setInterval(checkFormStep, 300);
      return () => clearInterval(interval);
    }

    // Detect if user created trip independently (step 10 → step 11)
    if (currentStep === 9 && currentStepData?.id === 'downpayment') {
      const checkTripCreated = () => {
        const tripId = localStorage.getItem('onboardingTripId');
        const currentPath = window.location.pathname;
        
        if (tripId && currentPath.includes(`/trips/${tripId}`)) {
          const hasContent = document.querySelector('[data-tooltip="upload-photo"]') !== null ||
                            document.querySelector('[data-tooltip="trip-details"]') !== null;
          
          if (hasContent) {
            // User created trip independently - auto-advance
            nextStep();
          }
        }
      };

      const interval = setInterval(checkTripCreated, 300);
      return () => clearInterval(interval);
    }
  }, [isVisible, isFormStep, currentStep, currentStepData, isUserTyping, userWantsTooltipBack, nextStep]);

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

  // Auto-advance when trip is created (step 10 → step 11) - BACKUP
  // This runs as a backup in case immediate advance didn't work or user didn't click Next
  useEffect(() => {
    // Watch during step 10 (downpayment step) OR step 11 (in case we advanced but action hasn't completed)
    if (!isVisible || (currentStep !== 9 && currentStep !== 10) || 
        (currentStepData?.id !== 'downpayment' && currentStepData?.id !== 'upload-photo')) {
      return;
    }

    // Only run backup if we're on step 10, or if we're on step 11 but trip hasn't been created yet
    const isOnStep10 = currentStep === 9 && currentStepData?.id === 'downpayment';
    const isOnStep11Waiting = currentStep === 10 && currentStepData?.id === 'upload-photo';
    
    if (!isOnStep10 && !isOnStep11Waiting) {
      return;
    }

    // Check if trip was created and we've navigated to trip details page
    const checkTripCreated = () => {
      const tripId = localStorage.getItem('onboardingTripId');
      const currentPath = window.location.pathname;
      
      // Trip is created if:
      // 1. onboardingTripId exists in localStorage (set when trip is created)
      // 2. We're on the trip details page (/trips/:id)
      // 3. The trip details page has loaded (check for key elements)
      if (tripId && currentPath.includes(`/trips/${tripId}`)) {
        // Wait for page content to be ready
        const hasContent = document.querySelector('[data-tooltip="upload-photo"]') !== null ||
                          document.querySelector('[data-tooltip="trip-details"]') !== null;
        
        if (hasContent) {
          // Trip is created and page is ready
          // If we're still on step 10, advance to step 11
          // If we're on step 11 but waiting, the tooltip is already showing correctly
          if (isOnStep10) {
            nextStep();
          }
        }
      }
    };

    // Check immediately
    checkTripCreated();
    
    // Also listen for route changes (in case navigation happens)
    const interval = setInterval(checkTripCreated, 200);
    
    // Cleanup after 10 seconds (shouldn't take that long)
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [currentStep, isVisible, currentStepData, nextStep]);

  // Auto-advance when form step changes (step 8 → step 9) - BACKUP
  // This runs as a backup in case immediate advance didn't work or user didn't click Next
  useEffect(() => {
    // Watch during step 8 (dates step) OR step 9 (in case we advanced but form hasn't moved yet)
    if (!isVisible || (currentStep !== 7 && currentStep !== 8) ||
        (currentStepData?.id !== 'dates' && currentStepData?.id !== 'details')) {
      return;
    }

    // Only run backup if we're on step 8, or if we're on step 9 but form hasn't moved yet
    const isOnStep8 = currentStep === 7 && currentStepData?.id === 'dates';
    const isOnStep9Waiting = currentStep === 8 && currentStepData?.id === 'details';
    
    if (!isOnStep8 && !isOnStep9Waiting) {
      return;
    }

    // Check if TripForm has moved to step 2
    const checkFormStep = () => {
      // Look for indicators that form is on step 2 (details step)
      // The details field should be visible when form is on step 2
      const detailsField = document.querySelector('[data-tooltip="details"]');
      const isOnFormStep2 = detailsField !== null && 
                            (detailsField as HTMLElement).offsetParent !== null;
      
      if (isOnFormStep2) {
        // Form has moved to step 2
        // If we're still on step 8, advance to step 9
        // If we're on step 9 but waiting, the tooltip is already showing correctly
        if (isOnStep8) {
          nextStep();
        }
      }
    };

    // Check immediately
    checkFormStep();
    
    // Poll for form step change (check every 200ms)
    const interval = setInterval(checkFormStep, 200);
    
    // Cleanup after 5 seconds (form step change should happen quickly)
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [currentStep, isVisible, currentStepData, nextStep]);

  // Find and highlight target element
  useEffect(() => {
    // Skip if no target selector (e.g., welcome step or completion step with center position)
    // Also skip if user is actively typing (unless they clicked Next/Previous)
    if (!isVisible || !currentStepData || hasNoTarget || !isOnTripOverviewPage || (isUserTyping && !userWantsTooltipBack)) {
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
            // Retry immediately on next frame
            requestAnimationFrame(() => {
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
            });
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
          
          if (!isVisible && attempts < 3) {
            // Element exists but not visible yet - fast retries (3 attempts × 50ms = 150ms max)
            setTimeout(() => tryFind(attempts + 1), 50);
            return;
          }

          // Only scroll if element is not in viewport - use instant scroll for speed
          const isInViewport = rect.top >= 0 && rect.left >= 0 && 
                               rect.bottom <= window.innerHeight && 
                               rect.right <= window.innerWidth;
          if (!isInViewport) {
            element.scrollIntoView({ behavior: 'instant', block: 'center' });
          }
          
          setTargetElement(element);
          element.classList.add('tooltip-highlight');
          
          // Set up ResizeObserver to handle layout shifts (e.g., when images load on slow connections)
          if ('ResizeObserver' in window) {
            // Clean up any existing observer
            if (resizeObserverRef.current) {
              resizeObserverRef.current.disconnect();
            }
            
            resizeObserverRef.current = new ResizeObserver(() => {
              // Update position immediately on next frame for snappy response
              if (scrollTimeoutRef.current) {
                cancelAnimationFrame(scrollTimeoutRef.current as any);
              }
              scrollTimeoutRef.current = requestAnimationFrame(() => {
                updatePosition(element);
              }) as any;
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

          // Position immediately - don't wait for images (they'll cause layout shifts later via ResizeObserver)
          // Use requestAnimationFrame for immediate positioning in next frame
          requestAnimationFrame(() => {
            updatePosition(element);
          });
        } else if (attempts < 5) {
          // All steps: fast retries (5 attempts × 100ms = 500ms max) - target < 1 second total
          setTimeout(() => tryFind(attempts + 1), 100);
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
        // Retry immediately on next frame instead of setTimeout
        requestAnimationFrame(() => updatePosition(element));
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

    // All steps: start immediately on next frame for fastest positioning
    const timeoutId = requestAnimationFrame(() => {
      findTarget();
    });

    // Throttle function using requestAnimationFrame for smooth, fast updates
    const throttledUpdatePosition = () => {
      if (targetElement) {
        if (scrollTimeoutRef.current) {
          if (typeof scrollTimeoutRef.current === 'number') {
            cancelAnimationFrame(scrollTimeoutRef.current);
          } else {
            clearTimeout(scrollTimeoutRef.current);
          }
        }
        // Use requestAnimationFrame for immediate update on next frame
        scrollTimeoutRef.current = requestAnimationFrame(() => {
          updatePosition(targetElement);
        }) as any;
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
      if (typeof timeoutId === 'number') {
        cancelAnimationFrame(timeoutId);
      } else {
        clearTimeout(timeoutId);
      }
      if (scrollTimeoutRef.current) {
        if (typeof scrollTimeoutRef.current === 'number') {
          cancelAnimationFrame(scrollTimeoutRef.current);
        } else {
          clearTimeout(scrollTimeoutRef.current);
        }
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
  }, [currentStep, isVisible, currentStepData, hasNoTarget, targetElement, isOnTripOverviewPage, effectivePosition, isMobile, isFormStep, isUserTyping, userWantsTooltipBack]);
  
  // Recalculate position when mobile state changes
  useEffect(() => {
    if (targetElement && isVisible && currentStepData && !hasNoTarget) {
      const updatePosition = () => {
        const rect = targetElement.getBoundingClientRect();
        const tooltip = tooltipRef.current;
        if (!tooltip) return;

        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.width === 0 || tooltipRect.height === 0) {
          requestAnimationFrame(() => updatePosition());
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
      
      requestAnimationFrame(() => updatePosition());
    }
  }, [isMobile, targetElement, isVisible, currentStepData, hasNoTarget, effectivePosition]);

  // Handle form actions (steps 5, 8 and 10)
  const handleNext = () => {
    setUserWantsTooltipBack(true);
    setIsUserTyping(false);
    
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
          // Poll for submit button to appear (form needs to transition from step 2 → 3)
          const tryClickSubmit = (attempts = 0) => {
            const tripFormSubmitButton = document.querySelector('[data-trip-form-submit]') as HTMLButtonElement;
            if (tripFormSubmitButton && !tripFormSubmitButton.disabled) {
              // Button is ready - click it to create trip
              tripFormSubmitButton.click();
            } else if (attempts < 20) {
              // Button not ready yet, retry (up to 4 seconds total)
              setTimeout(() => tryClickSubmit(attempts + 1), 200);
            }
          };
          
          // Start trying to click submit button after a short delay
          setTimeout(() => {
            tryClickSubmit();
          }, 300);
          
          // Advance immediately for better UX, auto-advance effect will handle backup if needed
          setTimeout(() => {
            nextStep();
          }, 300);
          return;
        }
        
        // For step 8 (dates), advance immediately for better UX
        // Auto-advance effect will handle backup if form step change detection is needed
        if (currentStepData?.id === 'dates') {
          setTimeout(() => {
            nextStep();
          }, 300);
          return;
        }
        
        // For other steps with triggerFormAction, wait a bit then move to next step
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
    setUserWantsTooltipBack(true);
    setIsUserTyping(false);
    previousStep();
  };

  const handleDismiss = () => {
    dismissOnboarding();
  };

  // For steps 11-17, don't show until we're on trip overview page
  // Also don't show if user is actively typing (unless they clicked Next/Previous)
  if (!isVisible || !currentStepData || (isUserTyping && !userWantsTooltipBack)) return null;
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


