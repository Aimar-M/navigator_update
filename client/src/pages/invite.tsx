import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, Users, Check, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDateRange } from "@/lib/utils";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import { apiRequest } from "@/lib/queryClient";

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  // Fetch invitation details
  const { data: inviteData, isLoading: inviteLoading, error: inviteError } = useQuery({
    queryKey: [`${API_BASE}/api/invite/${token}`],
    queryFn: async () => {
      try {
        console.log(`Fetching invitation details for token: ${token}`);
        const data = await apiRequest('GET', `${API_BASE}/api/invite/${token}`);
        console.log("Invitation data:", data);
        return data;
      } catch (error) {
        console.error('Error fetching invitation:', error);
        throw error;
      }
    },
  });

  const handleAcceptInvitation = async () => {
    if (!user) {
      localStorage.setItem('pendingInvitation', token);
      toast({
        title: 'Authentication Required',
        description: 'Please sign in or register to join this trip',
      });
      navigate('/login');
      return;
    }
    setAcceptingInvite(true);
    try {
      const authToken = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      // Use fetch directly to POST with headers
      const response = await fetch(`${API_BASE}/api/invite/${token}/accept`, {
        method: 'POST',
        headers,
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to accept invitation');
      }
      const result = await response.json();
      toast({
        title: 'Success!',
        description: 'You have joined the trip',
      });
      navigate(`/trips/${result.tripId}`);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Failed to accept invitation',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setAcceptingInvite(false);
    }
  };

  // Check if invitation has expired
  const isExpired = inviteData?.invitation?.expiresAt
    ? new Date(inviteData.invitation.expiresAt) < new Date()
    : false;

  if (inviteLoading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md mx-auto shadow-md">
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        </main>
        <MobileNavigation />
      </div>
    );
  }

  if (inviteError || !inviteData) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md mx-auto shadow-md">
            <CardHeader>
              <CardTitle>Invitation Error</CardTitle>
              <CardDescription>
                This invitation link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                The invitation link you followed might be incorrect, or it may have already been used.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => navigate("/")}>
                Return to Home
              </Button>
            </CardFooter>
          </Card>
        </main>
        <MobileNavigation />
      </div>
    );
  }

  const { trip } = inviteData;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-md">
          <CardHeader>
            <CardTitle>Trip Invitation</CardTitle>
            <CardDescription>
              You've been invited to join a trip
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">{trip.name}</h2>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{trip.destination}</span>
                </div>
              </div>
              
              <div className="flex items-center text-gray-500 text-sm">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
              </div>
              
              {trip.organizer && (
                <div className="flex items-center text-gray-500 text-sm">
                  <Users className="h-4 w-4 mr-1" />
                  <span>Organized by {trip.organizer.name}</span>
                </div>
              )}
              
              {isExpired && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  This invitation has expired.
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <div className="w-full space-y-3">
              <Button 
                className="w-full" 
                disabled={isExpired || acceptingInvite}
                onClick={handleAcceptInvitation}
              >
                {acceptingInvite ? "Joining..." : user ? "Join Trip" : "Sign in to Join Trip"}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate("/")}
              >
                Return to Home
              </Button>
            </div>
          </CardFooter>
        </Card>
      </main>
      <MobileNavigation />
    </div>
  );
}