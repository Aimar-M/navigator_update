# Coachmark Implementation Plan

## Overview
This document outlines the implementation plan for a new coachmark (onboarding tooltip) system based on the reference implementation. The system will guide users through the app with step-by-step tooltips that highlight UI elements.

---

## Architecture Overview

### Core Components

1. **OnboardingTooltips Component** (`client/src/components/OnboardingTooltips.tsx`)
   - Main component that manages the multi-step onboarding flow
   - Handles step navigation, positioning, and visibility
   - Manages highlight effects and tooltip display

2. **Onboarding Context/Hook** (`client/src/hooks/use-onboarding.tsx`)
   - Manages onboarding state (current step, completion status)
   - Provides methods: `nextStep()`, `previousStep()`, `skipStep()`, `completeOnboarding()`
   - Persists state in localStorage

3. **CSS Animations** (`client/src/index.css`)
   - `tooltip-highlight` class with multi-layer glow effects
   - `pulse-highlight` animation (2s infinite)
   - `shimmer` animation (3s infinite)

---

## Implementation Steps

### Phase 1: Core Infrastructure

#### Step 1.1: Create Onboarding Hook/Context
**File**: `client/src/hooks/use-onboarding.tsx`

**Features**:
- Context provider for onboarding state
- State management:
  - `currentStep: number` (0-based index)
  - `isVisible: boolean`
  - `isCompleted: boolean`
  - `isNewUser: boolean` (computed: checks if user has 0 trips)
- Methods:
  - `startOnboarding()`
  - `nextStep()`
  - `previousStep()`
  - `skipStep()`
  - `completeOnboarding()` - Called when user completes step 16, marks `hasSeenOnboarding = true` in backend
  - `dismissOnboarding()` - Called when user clicks X button, marks `hasSeenOnboarding = true` in backend
  - `isStepActive(stepIndex: number)`
  - `checkIfNewUser()` - Fetches user's trips and returns true if count === 0
- **New User Detection Logic** (Backend-based, reliable):
  ```typescript
  // In use-onboarding.tsx
  const checkIfNewUser = async () => {
    if (!user) return false;
    
    // PRIMARY CHECK: Fetch user's trips from backend (source of truth)
    // If user has any trips, they're not a new user
    const trips = await apiRequest('GET', '/api/trips');
    return trips.length === 0;
  };
  
  // On mount, check if user is new
  useEffect(() => {
    if (!user) return;
    
    // Check localStorage first (performance optimization - avoid API call if already checked)
    const cachedCheck = localStorage.getItem('onboarding_check_complete');
    if (cachedCheck === 'true') {
      // Already checked, skip
      return;
    }
    
    // Always verify with backend (localStorage can be cleared)
    checkIfNewUser().then(isNew => {
      if (isNew) {
        setIsVisible(true);
        setCurrentStep(0);
      }
      // Cache the check result (but don't rely on it as source of truth)
      localStorage.setItem('onboarding_check_complete', 'true');
    });
  }, [user]);
  ```

- **Onboarding Tracking** (Backend-based):
  - Add `hasSeenOnboarding: boolean` field to user schema (default: `false`)
  - Set to `true` when user has seen the onboarding (see "When `hasSeenOnboarding` becomes true" below)
  - Check this field on mount to determine if onboarding should show
  - localStorage can be used as cache, but backend is source of truth

- **When `hasSeenOnboarding` becomes `true`**:
  - **Option A (Recommended)**: Set to `true` when user dismisses/exits onboarding at ANY point
    - User clicks X button on any step → `hasSeenOnboarding = true`
    - User completes all steps (step 16) → `hasSeenOnboarding = true`
    - **Logic**: Once user has seen onboarding, don't show it again (even if they didn't complete it)
  
  - **Option B**: Set to `true` only when user completes all steps
    - User must reach step 16 (completion message) → `hasSeenOnboarding = true`
    - If user exits early, they'll see onboarding again next time
    - **Logic**: Only mark as seen if they complete the full flow

- **Why Backend is Better**:
  - ✅ Survives cache clearing
  - ✅ Works across devices/browsers
  - ✅ Reliable and persistent
  - ✅ Can't be manipulated by user

#### Step 1.2: Define Step Configuration
**Location**: Inside `OnboardingTooltips.tsx` or separate config file

**Step Structure**:
```typescript
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
  targetSelector: string; // CSS selector or data-tooltip attribute
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'; // 5 positions total
  route?: string; // Optional: route to navigate to for this step
  action?: () => void; // Optional: custom action when step is reached
  showAllComponents?: boolean; // For step 15: show all remaining components simultaneously
  subSteps?: OnboardingSubStep[]; // For step 15: array of tooltips to show at once
  triggerFormAction?: 'next-step' | 'create-trip'; // For trip form integration
}
```

**Positions Available**:
- `'top'` - Tooltip appears above the target element (used for form fields and trip details)
- `'bottom'` - Tooltip appears below the target element (used for dashboard overview)
- `'left'` - Tooltip appears to the left of the target element (used for settlements icon)
- `'right'` - Tooltip appears to the right of the target element (used for search icon and create trip button)
- `'center'` - Tooltip appears centered on screen (for completion messages or showing multiple components)

**Note**: Position assignments have been optimized based on UI layout - form fields use 'top' to avoid covering inputs, icons use 'left'/'right' based on their position in the header, and dashboard elements use 'bottom'.

**Complete Step Configuration** (based on provided script):
```typescript
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
      // Navigate to create trip page
      // The TripForm component will auto-fill "My First Trip" when it detects onboarding
      navigate('/create-trip');
    }
  },
  
  // 🧭 Create Trip Flow (Steps 6-10)
  // NOTE: When navigating to /create-trip, TripForm should auto-fill "My First Trip" in the name field
  {
    id: 'trip-name',
    title: 'Name your trip',
    description: 'Give it a title',
    targetSelector: '[data-tooltip="trip-name"]',
    position: 'top',
    route: '/create-trip'
    // Name is already auto-filled when user arrives at /create-trip
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
    triggerFormAction: 'next-step' // Triggers TripForm's internal nextStep() to move from step 1 to step 2
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
    triggerFormAction: 'create-trip' // Triggers TripForm's handleSubmit() to create the trip
  },
  
  // 🏖 Trip Overview Page (Steps 11-15)
  {
    id: 'upload-photo',
    title: 'Add a cover photo',
    description: 'Give your trip a face — upload something that captures the vibe.',
    targetSelector: '[data-tooltip="upload-photo"]',
    position: 'top',
    route: '/trips/:id' // Dynamic route - will be set when trip is created
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
    showAllComponents: true, // Flag to show multiple tooltips at once
    // Sub-steps that will show simultaneously:
    subSteps: [
      {
        id: 'itinerary-tab',
        title: 'Itinerary',
        description: 'Plan your trip schedule and activities.',
        targetSelector: '[data-tooltip="itinerary-tab"]',
        position: 'bottom'
      },
      {
        id: 'chat-tab',
        title: 'Chat',
        description: 'Talk with your group, share updates, and vote seamlessly.',
        targetSelector: '[data-tooltip="chat-tab"]',
        position: 'bottom'
      },
      {
        id: 'expenses-tab',
        title: 'Expenses',
        description: 'Track and split costs effortlessly.',
        targetSelector: '[data-tooltip="expenses-tab"]',
        position: 'bottom'
      },
      {
        id: 'polls-tab',
        title: 'Polls',
        description: 'Create dedicated polls and let everyone decide together.',
        targetSelector: '[data-tooltip="polls-tab"]',
        position: 'bottom'
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
```

**Special Requirements**:
- **New User Detection** (Backend-based, reliable):
  - On mount, fetch user's trips from backend via `/api/trips`
  - **Source of Truth**: If `trips.length === 0`, user is new → show onboarding
  - **No localStorage dependency**: This check always uses backend data
  - localStorage is only used as a performance cache (to avoid repeated API calls)
  - If cache is cleared, the check will still work correctly
  
- **Onboarding Tracking** (Backend-based):
  - Add `hasSeenOnboarding: boolean` field to user schema (default: `false`)
  - **When `hasSeenOnboarding` becomes `true`**:
    - **Recommended**: When user dismisses/exits onboarding at ANY point
      - User clicks X button on any step → `PUT /api/users/profile { hasSeenOnboarding: true }`
      - User completes step 16 → `PUT /api/users/profile { hasSeenOnboarding: true }`
      - **Rationale**: Once user has seen onboarding, don't show it again
    - **Alternative**: Only when user completes all steps (step 16)
      - User must reach completion message → `hasSeenOnboarding = true`
      - If user exits early, they'll see onboarding again next session
  - **Check Logic**: On mount, check `if (!user.hasSeenOnboarding && trips.length === 0) → show onboarding`
  
- **Step 5 (Create Trip Prompt)**: When "Next" is clicked, navigates to `/create-trip`. The TripForm component should detect onboarding mode and auto-fill "My First Trip" in the name field immediately.
  
- **Step 8 (Dates)**: When "Next" is clicked, it should trigger TripForm's internal `nextStep()` function to move from form step 1 to form step 2 (showing description and downpayment fields).
  
- **Step 10 (Downpayment)**: When "Next" is clicked, it should trigger TripForm's `handleSubmit()` function to create the trip, then navigate to the trip details page.
  
- **Step 15 (Page Components)**: 
  - **Multiple Tooltips Simultaneously**: Show 5 tooltips at once (one for each: Itinerary, Chat, Expenses, Polls, Navigator Logo)
  - Each tooltip has its own X button and can be dismissed independently
  - Track which tooltips have been dismissed
  - Once ALL 5 tooltips are dismissed, automatically show Step 16 (completion message)
  - Implementation: Render multiple `<TooltipCard>` components simultaneously, each with its own state for visibility
  
- **Step 16 (Completion)**: Final celebration message - only shows after all step 15 tooltips are dismissed
  
- **Exit Button**: X button on every step to allow seamless exit
  
- **Auto-fill Timing**: "My First Trip" should be pre-filled when navigating to `/create-trip`, not when reaching step 6

---

### Phase 2: Component Implementation

#### Step 2.1: Create OnboardingTooltips Component
**File**: `client/src/components/OnboardingTooltips.tsx`

**Key Features**:

1. **State Management**:
   - `currentStep`: Current step index
   - `isVisible`: Controls visibility
   - `targetElement`: DOM reference to highlighted element
   - `tooltipPosition`: Calculated position for tooltip

2. **Element Targeting**:
   - Uses `querySelector` with `data-tooltip` attributes
   - Retry logic: up to 20 attempts, 200ms intervals
   - Auto-scrolls target element into view with `scrollIntoView({ behavior: 'smooth', block: 'center' })`

3. **Highlight Effect**:
   - Adds `tooltip-highlight` class to target element
   - Auto-removes highlight after 15 seconds or on click
   - Updates position when step changes

4. **Positioning Logic**:
   - Calculates position based on `getBoundingClientRect()`
   - Supports 4 positions: `top`, `bottom`, `left`, `right`
   - Centers tooltip relative to target element
   - Uses fixed positioning with calculated offsets
   - Keeps tooltip within viewport bounds

5. **UI Elements**:

   **Overlay**:
   - Position: `fixed inset-0` (full screen)
   - Background: `bg-black/20` (20% opacity black)
   - Z-index: `z-100`
   - Purpose: Dims the background to focus attention on the highlighted element

   **Tooltip Card Structure** (using shadcn/ui Card components, aligned with Navigator design):
   ```tsx
   <Card className="w-80 border-0 shadow-lg z-101 bg-white">
     <CardHeader className="pb-3">
       <div className="flex items-start justify-between gap-2">
         <CardTitle className="text-base font-semibold text-gray-900">
           {step.title}
         </CardTitle>
         <Button variant="ghost" size="sm" onClick={handleDismiss}>
           <X className="text-gray-500" />
         </Button>
       </div>
     </CardHeader>
     <CardContent className="space-y-4 pt-0">
       <p className="text-sm text-gray-600 leading-relaxed">
         {step.description}
       </p>
       <div className="flex items-center justify-between pt-2 border-t border-gray-200">
         <span className="text-xs text-gray-500">
           {currentStep + 1} of {totalSteps}
         </span>
         <div className="flex items-center gap-2">
           {showPrevious && (
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
   ```

   **Card Specifications** (aligned with Navigator design system):
   - **Width**: `w-80` (320px)
   - **Border**: `border-0` (no border, consistent with enhanced components like RSVP buttons)
   - **Shadow**: `shadow-lg` (matches Navigator's card shadow pattern, e.g., enhanced-rsvp-buttons)
   - **Background**: `bg-white` (standard Navigator background)
   - **Z-index**: `z-101` (above overlay)
   - **Animation**: `fade-in-0 zoom-in-95` (Tailwind animate-in)
   - **Border Radius**: `rounded-lg` (from Card component, 0.5rem via --radius CSS variable)

   **Card Header** (aligned with Navigator patterns):
   - Contains title and close (X) button
   - Title: `text-base font-semibold text-gray-900` (matches trip-form and expense-tracker patterns)
   - Padding: `pb-3` (reduced from default `p-6` for tighter spacing, consistent with enhanced-rsvp-buttons)
   - Close button: Ghost variant, small size (`size="sm"` = `h-9`), positioned top-right

   **Card Content** (aligned with Navigator typography):
   - Description text: `text-sm text-gray-600 leading-relaxed` (matches Navigator's description text pattern, e.g., expense-tracker, about page)
   - Padding: `pt-0` (CardContent default is `p-6 pt-0`, so content starts right after header)
   - Progress indicator: Shows "X of 15" format in `text-xs text-gray-500` (matches Navigator's secondary text pattern)
   - Navigation buttons: Previous and Next with text labels

   **Navigation Buttons** (using Navigator's Button component):
   - **Previous Button**: 
     - Variant: `outline` (matches Navigator's secondary action pattern)
     - Size: `sm` (h-9, rounded-md, px-3 per Button component)
     - Text: "Previous" with left arrow icon (`ArrowLeft`)
     - Icon: Automatically sized to `size-4` via Button's `[&_svg]:size-4` (no manual sizing needed)
     - Icon position: Left side of text (Button uses `gap-2` for spacing)
     - Only shown when not on first step
   
   - **Next Button**:
     - Variant: `default` (primary - uses `bg-primary` which is `237 90% 58%` - Navigator's blue)
     - Size: `sm` (h-9, rounded-md, px-3)
     - Text: "Next" with right arrow icon (`ArrowRight`)
     - Icon: Automatically sized to `size-4` via Button component
     - Icon position: Right side of text (Button uses `gap-2` for spacing)
     - Always visible (except on last step where it becomes "Complete")
   
   - **Close Button (X)**:
     - Position: Top-right corner of card header
     - Variant: `ghost` (hover:bg-accent, matches Navigator's subtle button pattern)
     - Size: `sm` (h-9)
     - Icon: `X` from lucide-react, automatically `size-4` via Button component
     - Icon color: `text-gray-500` (matches Navigator's secondary icon color)
     - Always visible on every step

   **Icons** (from lucide-react, auto-sized by Button component):
   - `X` - Close/dismiss button (size-4, text-gray-500)
   - `ArrowRight` - Next button (size-4, inherits button text color)
   - `ArrowLeft` - Previous button (size-4, inherits button text color)
   
   **Design System Alignment**:
   - ✅ Uses Navigator's primary color (`--primary: 237 90% 58%`) for Next button
   - ✅ Matches Navigator's typography scale (`text-base`, `text-sm`, `text-xs`)
   - ✅ Uses Navigator's gray scale (`text-gray-900`, `text-gray-600`, `text-gray-500`)
   - ✅ Matches Navigator's shadow pattern (`shadow-lg` instead of `shadow-2xl`)
   - ✅ Uses Navigator's spacing patterns (`gap-2`, `space-y-4`, `pt-2`)
   - ✅ Button icons automatically sized via Button component's built-in styles
   - ✅ Consistent with Navigator's Card component usage (border-0, shadow-lg, bg-white)

6. **Lifecycle**:
   - Starts after 1 second delay
   - Finds target element
   - Scrolls element into view
   - Adds highlight class
   - Updates position on scroll/resize

---

### Phase 3: Styling & Animations

#### Step 3.1: Add CSS Animations
**File**: `client/src/index.css`

**Add the following styles**:

```css
/* Tooltip Highlight Effect */
.tooltip-highlight {
  position: relative;
  z-index: 50;
  animation: pulse-highlight 2s infinite;
  transition: all 0.3s ease-out;
}

.tooltip-highlight::before {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  background: hsl(var(--primary) / 0.2);
  border-radius: 12px;
  z-index: -1;
  animation: pulse-highlight 2s infinite;
}

.tooltip-highlight::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(
    45deg,
    hsl(var(--primary) / 0.3),
    hsl(var(--accent) / 0.3),
    hsl(var(--primary) / 0.3)
  );
  border-radius: 10px;
  z-index: -1;
  animation: shimmer 3s ease-in-out infinite;
  background-size: 200% 200%;
}

@keyframes pulse-highlight {
  0%, 100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.02);
    opacity: 1;
  }
}

@keyframes shimmer {
  0%, 100% {
    opacity: 0.5;
    background-position: -200% center;
  }
  50% {
    opacity: 0.8;
    background-position: 200% center;
  }
}
```

---

### Phase 4: Integration

#### Step 4.1: Add OnboardingProvider to App
**File**: `client/src/main.tsx` or `client/src/App.tsx`

Wrap the app with `OnboardingProvider`:
```tsx
<OnboardingProvider>
  <App />
</OnboardingProvider>
```

#### Step 4.2: Add OnboardingTooltips Component
**File**: `client/src/App.tsx` or main layout component

Add `<OnboardingTooltips />` at the root level (renders conditionally based on state).

#### Step 4.3: Add data-tooltip Attributes
**Files**: Various component files (home.tsx, trip-details.tsx, etc.)

Add `data-tooltip` attributes to target elements:
```tsx
<div data-tooltip="search" className="...">
  {/* Search bar */}
</div>

<button data-tooltip="create-trip" className="...">
  Create Trip
</button>
```

---

## Technical Specifications

### Component Props
```typescript
interface OnboardingTooltipsProps {
  steps: OnboardingStep[];
  onComplete?: () => void;
  startDelay?: number; // Default: 1000ms
  highlightTimeout?: number; // Default: 15000ms
  retryAttempts?: number; // Default: 20
  retryInterval?: number; // Default: 200ms
}
```

### Step Configuration
```typescript
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string; // e.g., '[data-tooltip="search"]'
  position: 'top' | 'bottom' | 'left' | 'right';
}
```

### Data Persistence Strategy

**Backend (Source of Truth)**:
- **User Schema Field**: Add `hasSeenOnboarding: boolean` to user table
  - Default: `false` (new users haven't seen onboarding)
  - Set to `true` when user has seen onboarding (see "When `hasSeenOnboarding` becomes true" below)
  - Check this field on mount: `if (!user.hasSeenOnboarding && trips.length === 0) → show onboarding`
  
- **When `hasSeenOnboarding` becomes `true`**:
  - **Recommended**: When user dismisses/exits onboarding at ANY point
    - User clicks X button → `PUT /api/users/profile { hasSeenOnboarding: true }`
    - User completes step 16 → `PUT /api/users/profile { hasSeenOnboarding: true }`
    - **Rationale**: Once user has seen onboarding, don't show it again (even if incomplete)
  
  - **Alternative**: Only when user completes all steps
    - User must reach step 16 (completion) → `hasSeenOnboarding = true`
    - If user exits early, they'll see onboarding again next session
    - **Rationale**: Only mark as seen if they complete the full flow

**localStorage (Cache Only)**:
- `onboarding_check_complete`: boolean (performance cache - avoid repeated API calls)
- `onboardingCurrentStep`: number (optional: for resuming if needed)
- `onboardingTripId`: number (optional: stores trip ID created during onboarding)

**Important**: localStorage is used for performance optimization only. Always verify with backend data.

---

## Design Specifications

### Tooltip Card
- **Width**: 320px (`w-80`)
- **Border**: None (`border-0`)
- **Shadow**: `shadow-2xl`
- **Animation**: `fade-in-0 zoom-in-95` (Tailwind animate-in)
- **Z-index**: 101 (above overlay)

### Overlay
- **Position**: `fixed inset-0`
- **Background**: `bg-black/20` (20% opacity black)
- **Z-index**: 100

### Highlight Effect
- **Border radius**: 12px (outer), 10px (inner)
- **Padding**: 4px (outer), 2px (inner)
- **Colors**: Uses CSS variables (`--primary`, `--accent`)
- **Animations**: Pulse (2s) + Shimmer (3s)

---

## Implementation Checklist

### Core Files to Create
- [ ] `client/src/hooks/use-onboarding.tsx` - Context and hook
- [ ] `client/src/components/OnboardingTooltips.tsx` - Main component
- [ ] Update `client/src/index.css` - Add animations

### Backend Changes (Required)
- [ ] Add `hasSeenOnboarding: boolean` field to user schema (migration)
  - Default: `false`
  - Type: `boolean`
  - Migration: `ALTER TABLE users ADD COLUMN has_seen_onboarding boolean DEFAULT false;`
- [ ] Update user profile endpoint to accept `hasSeenOnboarding` field
  - Update `PUT /api/users/profile` to accept `hasSeenOnboarding` in request body
  - Update user schema validation to include this field
- [ ] Update user query to include `hasSeenOnboarding` field
  - Ensure user object returned from `/api/users/profile` includes `hasSeenOnboarding`

### Files to Modify

**What "Modify" Means**: Adding `data-tooltip` attributes to existing HTML/JSX elements. These attributes are used by the OnboardingTooltips component to find and highlight specific elements. No functional changes to existing code, just adding identification attributes.

**Files to Modify**:

- [ ] `client/src/main.tsx` or `client/src/App.tsx` - Add OnboardingProvider wrapper
- [ ] `client/src/App.tsx` - Add `<OnboardingTooltips />` component
- [ ] `client/src/pages/home.tsx` - **Add `data-tooltip` attributes** to:
  - Main dashboard container: `data-tooltip="dashboard-overview"`
  - Search bar container: `data-tooltip="search-icon"`
  - Create trip button: `data-tooltip="create-trip-prompt"`
- [ ] `client/src/components/header.tsx` - **Add `data-tooltip` attributes** to:
  - Settlements icon button: `data-tooltip="settlements-icon"` (if exists)
  - Notification bell button: `data-tooltip="notification-bell"`
  - Navigator logo link: `data-tooltip="navigator-logo"` (for step 15)
- [ ] `client/src/components/trip-form.tsx` - **Modify this file**:
  - **Add `data-tooltip` attributes** to:
    - Trip name input: `data-tooltip="trip-name"`
    - Destination input: `data-tooltip="destination"`
    - Date inputs container: `data-tooltip="dates"`
    - Description textarea: `data-tooltip="details"`
    - Downpayment section: `data-tooltip="downpayment"`
  - **Add logic** to auto-fill "My First Trip" when onboarding is active (check localStorage or onboarding context)
  - **Expose methods** for onboarding to trigger: `nextStep()` and `handleSubmit()` (via ref or context)
- [ ] `client/src/pages/trip-details.tsx` - **Add `data-tooltip` attributes** to:
  - Photo upload component: `data-tooltip="upload-photo"`
  - Edit trip button: `data-tooltip="trip-details"`
  - Invite button: `data-tooltip="invite-friends"`
  - Tab container: `data-tooltip="page-components"`
- [ ] `client/src/components/trip-tabs.tsx` - **Add `data-tooltip` attributes** to:
  - Itinerary tab button: `data-tooltip="itinerary-tab"`
  - Chat tab button: `data-tooltip="chat-tab"`
  - Expenses tab button: `data-tooltip="expenses-tab"`
  - Polls tab button: `data-tooltip="polls-tab"`

### Features to Implement
- [ ] Step-based navigation (Previous/Next)
- [ ] Progress indicator ("X of 15" format)
- [ ] Skip/Close (X) button on every step for seamless exit
- [ ] Element targeting with retry logic
- [ ] Auto-scroll to target elements
- [ ] Highlight effect with CSS animations
- [ ] Auto-remove highlight after timeout
- [ ] Responsive positioning
- [ ] Viewport boundary detection
- [ ] localStorage persistence
- [ ] Smooth animations and transitions
- [ ] Route navigation between steps (Dashboard → Create Trip → Trip Details)
- [ ] Auto-fill "My First Trip" for new users in step 6
- [ ] Show all components in step 15 (Itinerary, Chat, Expenses, Polls tabs, Logo)
- [ ] New user detection (only show for users with no trips)
- [ ] Handle dynamic route `/trips/:id` after trip creation

---

## Testing Considerations

1. **Element Targeting**: Test with elements that load asynchronously
2. **Positioning**: Test on different screen sizes and scroll positions
3. **Highlight Effect**: Verify animations work correctly
4. **State Persistence**: Test localStorage save/restore
5. **Navigation**: Test Previous/Next/Skip flows
6. **Completion**: Verify onboarding doesn't restart after completion

---

## Future Enhancements (Optional)

1. **Step Conditions**: Only show certain steps based on user state
2. **Customizable Themes**: Allow different highlight colors
3. **Analytics**: Track which steps users skip
4. **Resume Capability**: Allow users to resume from last step
5. **Mobile Optimizations**: Adjust tooltip size/position for mobile
6. **Accessibility**: Add ARIA labels and keyboard navigation

---

## Implementation Flow

### User Journey
1. **New user signs up** → Onboarding starts automatically
2. **Dashboard (Steps 1-5)**: User learns about dashboard features
3. **Create Trip (Step 5)**: User clicks "Create Trip" → navigates to `/create-trip`
4. **Create Trip Flow (Steps 6-10)**: User fills out trip form
   - Step 6: Trip name auto-fills "My First Trip"
   - User completes form and creates trip
5. **Trip Created**: System captures trip ID, navigates to `/trips/:id`
6. **Trip Overview (Steps 11-15)**: User learns about trip features
   - Step 15: Shows all components at once
   - Step 16: Completion message
7. **Onboarding Complete**: 
   - When user exits/dismisses onboarding OR completes step 16:
     - Update backend: `PUT /api/users/profile { hasSeenOnboarding: true }`
   - Won't show again even if localStorage is cleared (backend is source of truth)

### Special Handling

- **New User Detection** (Backend-based, reliable):
  - On app load, `use-onboarding.tsx` fetches user's trips from backend via `/api/trips`
  - **Source of Truth**: If `trips.length === 0`, user is "new" → show onboarding
  - **No localStorage dependency**: Always checks backend (survives cache clearing)
  - localStorage is only used as performance cache to avoid repeated API calls
  - If localStorage is cleared, the check still works correctly from backend
  
- **Onboarding Tracking**:
  - Add `hasSeenOnboarding: boolean` field to user schema (default: `false`)
  - **When `hasSeenOnboarding` becomes `true`**:
    - **Recommended**: When user dismisses/exits onboarding at ANY point
      - User clicks X button → `PUT /api/users/profile { hasSeenOnboarding: true }`
      - User completes step 16 → `PUT /api/users/profile { hasSeenOnboarding: true }`
      - **Rationale**: Once user has seen onboarding, don't show it again (even if incomplete)
    - **Alternative**: Only when user completes all steps (step 16)
      - User must reach completion message → `hasSeenOnboarding = true`
      - If user exits early, they'll see onboarding again next session
  - **Check Logic**: On mount, check `if (!user.hasSeenOnboarding && trips.length === 0) → show onboarding`
  
- **Route Navigation**: Component must handle navigation between routes
  
- **Dynamic Routes**: Step 11+ need trip ID from created trip (stored in localStorage when trip is created)
  
- **Auto-fill Logic**: When navigating to `/create-trip` from onboarding, TripForm should immediately auto-fill "My First Trip" in the name field (check onboarding context/localStorage on mount)
  
- **Form Integration**: 
  - Step 8 (dates): Onboarding "Next" button triggers TripForm's `nextStep()` to move from form step 1 → step 2
  - Step 10 (downpayment): Onboarding "Next" button triggers TripForm's `handleSubmit()` to create the trip
  
- **Step 15 Multi-Tooltip Implementation**:
  - When step 15 is active, render 5 tooltip cards simultaneously
  - Each tooltip has its own state: `dismissedTooltips: Set<string>`
  - Each tooltip can be dismissed independently via X button
  - Track dismissed tooltips: `['itinerary-tab', 'chat-tab', 'expenses-tab', 'polls-tab', 'navigator-logo']`
  - When all 5 are dismissed, automatically advance to step 16 (completion)
  - Each tooltip positions itself relative to its target element
  
- **Exit Anytime**: X button on every step allows user to exit seamlessly

## Notes

- The implementation should be non-intrusive and easily dismissible
- Highlight effects should be subtle but noticeable
- Tooltip positioning should adapt to viewport constraints
- The system should gracefully handle missing target elements
- All animations should be performant and smooth
- **New Users Only**: Check user's trip count before showing onboarding
- **Seamless Exit**: X button should be prominent and always accessible
- **Route Management**: Handle navigation between Dashboard → Create Trip → Trip Details
- **Trip ID Tracking**: Store trip ID when created to navigate to trip details page

