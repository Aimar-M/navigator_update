import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, HelpCircle, Clock, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const API_BASE = import.meta.env.VITE_API_URL || '';

interface EnhancedRSVPButtonsProps {
  tripId: number;
  userId: number;
  currentRsvpStatus: string;
  tripName: string;
  requiresDownPayment?: boolean;
  downPaymentAmount?: number;
  onRsvpUpdate?: (newStatus: string) => void;
  className?: string;
}

export default function EnhancedRSVPButtons({
  tripId,
  userId,
  currentRsvpStatus,
  tripName,
  requiresDownPayment = false,
  downPaymentAmount,
  onRsvpUpdate,
  className = ""
}: EnhancedRSVPButtonsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const rsvpMutation = useMutation({
    mutationFn: async (rsvpStatus: string) => {
      try {
        // First try to update RSVP status (if user is already a member)
        const response = await apiRequest('PUT', `${API_BASE}/api/trips/${tripId}/members/${userId}/rsvp`, {
          rsvpStatus
        });
        
        // Create notification for the trip organizer
        await apiRequest('POST', `${API_BASE}/api/notifications`, {
          type: 'rsvp_response',
          title: `RSVP Response for ${tripName}`,
          message: `A member has ${rsvpStatus === 'confirmed' ? 'confirmed' : rsvpStatus === 'declined' ? 'declined' : 'marked maybe for'} your trip.`,
          data: {
            tripId,
            memberId: userId,
            rsvpStatus,
            tripName
          }
        });
        
        return response;
      } catch (error: any) {
        // If user is not a member yet, add them as a member first
        if (error.message?.includes('Trip member not found')) {
          // Add user as a member with the RSVP status
          const addMemberResponse = await apiRequest('POST', `${API_BASE}/api/trips/${tripId}/join`, {
            rsvpStatus: rsvpStatus
          });
          
          // Create notification for the trip organizer
          await apiRequest('POST', `${API_BASE}/api/notifications`, {
            type: 'rsvp_response',
            title: `RSVP Response for ${tripName}`,
            message: `A member has ${rsvpStatus === 'confirmed' ? 'confirmed' : rsvpStatus === 'declined' ? 'declined' : 'marked maybe for'} your trip.`,
            data: {
              tripId,
              memberId: userId,
              rsvpStatus,
              tripName
            }
          });
          
          return addMemberResponse;
        }
        throw error;
      }
    },
    onSuccess: (data, rsvpStatus) => {
      const statusMessages = {
        'confirmed': 'You\'re going! Welcome to the trip.',
        'declined': 'You\'ve declined the invitation.',
        'maybe': 'You\'ve marked yourself as maybe. We\'ll keep you updated!'
      };
      
      toast({
        title: "RSVP Updated",
        description: statusMessages[rsvpStatus as keyof typeof statusMessages] || "Your RSVP has been updated.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips/${tripId}/members`] });
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips`] });
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips/memberships/pending`] });
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/notifications`] });
      
      // Clear pending invitation from localStorage if it exists
      localStorage.removeItem('pendingInvitation');
      
      if (onRsvpUpdate) {
        onRsvpUpdate(rsvpStatus);
      }
    },
    onError: (error: any) => {
      console.error('RSVP Error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('Trip member not found')) {
        toast({
          title: "Not a Trip Member",
          description: "You need to be a member of this trip to RSVP. Please use the invitation link to join first.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "RSVP Failed",
          description: error.message || "Failed to update RSVP. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleRsvp = async (status: string) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await rsvpMutation.mutateAsync(status);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maybe':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'declined':
        return <XCircle className="h-4 w-4" />;
      case 'maybe':
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Going';
      case 'declined':
        return 'Not Going';
      case 'maybe':
        return 'Maybe';
      default:
        return 'Pending';
    }
  };

  return (
    <Card className={`bg-white rounded-2xl shadow-lg border-0 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-3" style={{ color: '#1A1A1A' }}>
          <User className="h-6 w-6" style={{ color: '#3A8DFF' }} />
          RSVP for {tripName}
        </CardTitle>
        {currentRsvpStatus !== 'pending' && (
          <div className="flex items-center gap-2">
            <Badge className={`px-3 py-1 rounded-full font-medium border ${getStatusColor(currentRsvpStatus)}`}>
              <div className="flex items-center gap-2">
                {getStatusIcon(currentRsvpStatus)}
                {getStatusText(currentRsvpStatus)}
              </div>
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Payment Notice */}
        {requiresDownPayment && currentRsvpStatus === 'confirmed' && (
          <div className="p-4 rounded-xl border" style={{ backgroundColor: '#F5F9FF', borderColor: '#CED6E0' }}>
            <div className="text-center">
              <div className="font-semibold text-sm mb-2" style={{ color: '#1A1A1A' }}>
                Payment Required
              </div>
              <div className="text-2xl font-bold mb-2" style={{ color: '#3A8DFF' }}>
                ${downPaymentAmount}
              </div>
              <div className="text-xs" style={{ color: '#4B5A6A' }}>
                Down payment required to secure your spot
              </div>
            </div>
          </div>
        )}

        {/* RSVP Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            onClick={() => handleRsvp('confirmed')}
            disabled={isSubmitting}
            className={`flex items-center gap-2 py-4 text-base font-semibold transition-all duration-300 ${
              currentRsvpStatus === 'confirmed'
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 border-2'
            }`}
          >
            <CheckCircle className="h-5 w-5" />
            {currentRsvpStatus === 'confirmed' ? 'Going' : 'Yes, I\'m Going'}
          </Button>

          {/* <Button
            onClick={() => handleRsvp('maybe')}
            disabled={isSubmitting}
            className={`flex items-center gap-2 py-4 text-base font-semibold transition-all duration-300 ${
              currentRsvpStatus === 'maybe'
                ? 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-lg'
                : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 border-2'
            }`}
          >
            <HelpCircle className="h-5 w-5" />
            {currentRsvpStatus === 'maybe' ? 'Maybe' : 'Maybe'}
          </Button> */}

          <Button
            onClick={() => handleRsvp('declined')}
            disabled={isSubmitting}
            className={`flex items-center gap-2 py-4 text-base font-semibold transition-all duration-300 ${
              currentRsvpStatus === 'declined'
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 border-2'
            }`}
          >
            <XCircle className="h-5 w-5" />
            {currentRsvpStatus === 'declined' ? 'Not Going' : 'No, Can\'t Go'}
          </Button>
        </div>

        {/* Status Messages */}
        {currentRsvpStatus === 'maybe' && (
          <div className="p-4 rounded-xl border" style={{ backgroundColor: '#FFF3CD', borderColor: '#FFEAA7' }}>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" style={{ color: '#F39C12' }} />
              <div className="text-sm font-medium" style={{ color: '#8B4513' }}>
                You're marked as "Maybe" - we'll keep you updated on trip details!
              </div>
            </div>
          </div>
        )}

        {currentRsvpStatus === 'declined' && (
          <div className="p-4 rounded-xl border" style={{ backgroundColor: '#F8D7DA', borderColor: '#F5C6CB' }}>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4" style={{ color: '#DC3545' }} />
              <div className="text-sm font-medium" style={{ color: '#721C24' }}>
                You've declined this invitation. You can change your mind anytime!
              </div>
            </div>
          </div>
        )}

        {currentRsvpStatus === 'confirmed' && (
          <div className="p-4 rounded-xl border" style={{ backgroundColor: '#D4EDDA', borderColor: '#C3E6CB' }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" style={{ color: '#28A745' }} />
              <div className="text-sm font-medium" style={{ color: '#155724' }}>
                You're confirmed for this trip! Welcome aboard!
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
