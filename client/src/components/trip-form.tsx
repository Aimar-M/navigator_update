import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useFullStory } from "@/hooks/use-fullstory";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { getRandomDestinationImage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GooglePlacesAutocomplete from "@/components/google-places-autocomplete";
import GooglePlacesMulti from "@/components/google-places-multi";

const API_BASE = import.meta.env.VITE_API_URL || '';


interface TripFormProps {
  onComplete?: () => void;
}

export interface TripFormRef {
  nextStep: () => void;
  handleSubmit: () => void;
}

const TripForm = forwardRef<TripFormRef, TripFormProps>(({ onComplete }, ref) => {
  const { user } = useAuth();
  const { isVisible: isOnboardingVisible } = useOnboarding();
  const { trackTripCreation } = useFullStory();
  const token = user ? localStorage.getItem('auth_token') : null;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [totalSteps] = useState(3);
  const [formData, setFormData] = useState({
    name: "",
    destination: "",
    startDate: "",
    endDate: "",
    description: "",
    requiresDownPayment: false,
    downPaymentAmount: "",
  });

  // Auto-fill "My First Trip" for new users in onboarding
  useEffect(() => {
    if (isOnboardingVisible && formData.name === "") {
      setFormData(prev => ({ ...prev, name: "My First Trip" }));
    }
  }, [isOnboardingVisible]);

  // Expose methods for onboarding
  useImperativeHandle(ref, () => ({
    nextStep: () => {
      if (step < totalSteps) {
        setStep((prev) => prev + 1);
      }
    },
    handleSubmit: () => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSubmit(fakeEvent);
    }
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const nextStep = () => {
    // Only move to the next step within the form, not to another page
    if (step < totalSteps) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You need to be logged in to create a trip.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Only include dates if they are provided
      const tripData: any = {
        ...formData,
        organizer: user.id,
        status: "planning",
        downPaymentAmount: formData.requiresDownPayment ? formData.downPaymentAmount : null,
      };
      
      // Only add dates if they are provided
      if (formData.startDate) {
        tripData.startDate = new Date(formData.startDate);
      }
      if (formData.endDate) {
        tripData.endDate = new Date(formData.endDate);
      }
      
      // Use fetch directly with authentication token
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/api/trips`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(tripData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Trip creation failed:', errorData);
        throw new Error(errorData.message || 'Failed to create trip');
      }
      
      const trip = await response.json();
      
      // Track trip creation with FullStory
      trackTripCreation(trip.id.toString(), trip.name, user.id.toString());
      
      toast({
        title: "Trip created",
        description: "Your trip has been created successfully.",
      });
      
      await queryClient.refetchQueries({ queryKey: [`${API_BASE}/api/trips`], exact: false });
      
      // Store trip ID for onboarding navigation
      if (isOnboardingVisible) {
        localStorage.setItem('onboardingTripId', trip.id.toString());
      }
      
      if (onComplete) {
        onComplete();
      } else {
        navigate(`/trips/${trip.id}`);
      }
    } 
    catch (error) {
      toast({
        title: "Failed to create trip",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

      

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Trip Name
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Summer Beach Vacation"
                required
                data-tooltip="trip-name"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
                Destination
              </label>
              <div data-tooltip="destination">
                <GooglePlacesMulti
                  id="destination"
                  name="destination"
                  value={formData.destination}
                  onChange={(value) => setFormData(prev => ({ ...prev, destination: value }))}
                  placeholder="Where are you going?"
                  types="(cities)"
                  className=""
                />
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4" data-tooltip="dates">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <Input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <Input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate || undefined}
                />
              </div>
            </div>
          </>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Trip Description
              </label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What's this trip about? Add details to help your friends understand what to expect."
                rows={5}
                data-tooltip="details"
              />
            </div>
            
            <div className="border-t pt-4" data-tooltip="downpayment">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Options</h3>
              
              <div className="mb-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="requiresDownPayment"
                    checked={formData.requiresDownPayment}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Require down payment before RSVP confirmation
                  </span>
                </label>
                <p className="text-sm text-gray-500 mt-1 ml-7">
                  Members must submit payment before their RSVP is confirmed and they gain full access to trip features.
                </p>
              </div>
              
              {formData.requiresDownPayment && (
                <div className="ml-7">
                  <label htmlFor="downPaymentAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Down Payment Amount ($)
                  </label>
                  <Input
                    type="number"
                    id="downPaymentAmount"
                    name="downPaymentAmount"
                    value={formData.downPaymentAmount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full max-w-xs"
                  />
                </div>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Trip Summary</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Trip Name:</p>
              <p className="text-sm text-gray-900 mb-2">{formData.name}</p>
              
              <p className="text-sm font-medium text-gray-700">Destination:</p>
              <p className="text-sm text-gray-900 mb-2">{formData.destination}</p>
              
              <p className="text-sm font-medium text-gray-700">Dates:</p>
              <p className="text-sm text-gray-900 mb-2">
                {formData.startDate && formData.endDate 
                  ? `${formData.startDate} to ${formData.endDate}`
                  : formData.startDate 
                    ? `Start: ${formData.startDate}`
                    : formData.endDate
                      ? `End: ${formData.endDate}`
                      : "Not set (you can add dates later)"}
              </p>
              
              {formData.description && (
                <>
                  <p className="text-sm font-medium text-gray-700">Description:</p>
                  <p className="text-sm text-gray-900 mb-2">{formData.description}</p>
                </>
              )}
              
              {formData.requiresDownPayment && (
                <>
                  <p className="text-sm font-medium text-gray-700">Down Payment:</p>
                  <p className="text-sm text-gray-900 mb-2">
                    ${formData.downPaymentAmount} required before RSVP confirmation
                  </p>
                </>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-primary-700">
                Please review the trip details above before clicking "Create Trip" to confirm.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        // Only trip name is required, dates are optional
        return formData.name.trim() !== "";
      case 2:
        // Description is optional, but down payment amount is required if down payment is enabled
        return !formData.requiresDownPayment || (formData.downPaymentAmount.trim() !== "" && parseFloat(formData.downPaymentAmount) > 0);
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Plan a New Trip</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-gray-900">
              {step === 1 && "Trip Basics"}
              {step === 2 && "Trip Details"}
              {step === 3 && "Review & Create"}
            </h4>
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-2">
                {step} of {totalSteps}
              </span>
              <div className="w-16 h-1 bg-gray-200 rounded-full">
                <div
                  className="h-1 bg-primary-600 rounded-full"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {renderStep()}
          
          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={prevStep}>
                Back
              </Button>
            ) : (
              <div></div>
            )}
            
            {step < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!isStepValid()}
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Trip"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

TripForm.displayName = "TripForm";

export default TripForm;
