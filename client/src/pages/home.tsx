import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Search, Plus } from "lucide-react";
import TripCard from "@/components/trip-card";
import EnhancedTripCard from "@/components/enhanced-trip-card";

import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from '@/lib/queryClient';

console.log("=== VITE_API_URL: ====", import.meta.env.VITE_API_URL);

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const token = user ? localStorage.getItem('auth_token') : null;

  console.log("user:", user, "token:", token);
  
  // Handle pending invitation by ensuring it gets processed through proper RSVP workflow
  useEffect(() => {
    const handlePendingInvitation = async () => {
      const pendingInvitation = localStorage.getItem('pendingInvitation');
      if (pendingInvitation && user && token) {
        try {
          // Accept the invitation to add user to trip membership (but with pending RSVP status)
          const response = await apiRequest('POST', `${API_BASE}/api/invite/${pendingInvitation}/accept`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });
          
          if (response.ok) {
            // Refresh data to show the pending trip card
            queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips/memberships/pending`] });
            queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips`] });
          } else {
            console.error('Failed to accept invitation:', response.statusText);
          }
        } catch (error) {
          console.error('Error accepting invitation:', error);
        } finally {
          // Always clear the pending invitation from localStorage
          localStorage.removeItem('pendingInvitation');
        }
      }
    };

    handlePendingInvitation();
  }, [user, token, queryClient]);
  
  console.log(user, token, API_BASE);

  // Use React Query with proper dependencies to avoid setState during render
  console.log("Before useQuery: user", user, "token", token);
  const { data: trips, isLoading } = useQuery({
    queryKey: [`${API_BASE}/api/trips`,user?.id,token],
    queryFn: async () => {
      // // if (!user || !token) return [];

      console.log('Fetching trips from API');
      fetch('https://navigatorupdate-production.up.railway.app/api/trips', {
        headers: { Authorization: 'Bearer 42' }
      }).then(r => r.json()).then(console.log).catch(console.error);
      
      // Add token to authorization header
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await apiRequest('GET', `${API_BASE}/api/trips`, { headers });
      const text = await response.text();
      console.log("get trips response:", text);
      try{
        const data = JSON.parse(text);
        console.log('parsed data: data');
        return data;
      } catch (e) {
        console.error('JSON parse error:', e);
        return [];
      }
      if (!response.ok) throw new Error("Failed to fetch trips");
      return response.json();
    },
    enabled: !!user && !!token,
    staleTime:0,
  });
  
  // Define mutations for pinning and archiving trips
  const pinTripMutation = useMutation({
    mutationFn: async (tripId: number) => {
      if (!token) throw new Error("Not authenticated");
      
      const trip = trips?.find((t: any) => t.id === tripId);
      if (!trip) throw new Error("Trip not found");
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await apiRequest('PUT', `${API_BASE}/api/trips/${tripId}`, {
        headers,
        body: JSON.stringify({ isPinned: !trip.isPinned })
      });
      
      if (!response.ok) throw new Error("Failed to update trip");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips`] });
      toast({
        title: "Success",
        description: "Trip pin status updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  });
  
  const archiveTripMutation = useMutation({
    mutationFn: async (tripId: number) => {
      if (!token) throw new Error("Not authenticated");
      
      const trip = trips?.find((t: any) => t.id === tripId);
      if (!trip) throw new Error("Trip not found");
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await apiRequest('PUT', `${API_BASE}/api/trips/${tripId}`, {
        headers,
        body: JSON.stringify({ isArchived: !trip.isArchived })
      });
      
      if (!response.ok) throw new Error("Failed to update trip");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips`] });
      toast({
        title: "Success",
        description: "Trip archive status updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  });
  
  // Fetch pending invitations (trip memberships with "pending" status)
  const { data: pendingInvitations, isLoading: pendingInvitationsLoading } = useQuery({
    queryKey: [`${API_BASE}/api/trips/invitations/pending`, !!user, token],
    queryFn: async () => {
      // if (!user || !token) return [];
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };
      
      // This would be the endpoint for pending invitations
      const response = await apiRequest('GET', `${API_BASE}/api/trips/memberships/pending`, { headers });
      if (!response.ok) throw new Error("Failed to fetch pending invitations");
      
      const data = await response.json();
      
      // Set notification indicator if there are pending invitations
      if (data.length > 0) {
        setHasNewNotifications(true);
      }
      
      return data;
    },
    enabled: !!user && !!token,
  });

  // Group trips by simplified categories (past, upcoming, and invitations)
  const currentDate = new Date();
  
  // Convert pending invitations to trip format for display
  const pendingTripsFromInvitations = pendingInvitations?.map((invitation: any) => ({
    id: invitation.trip.id,
    name: invitation.trip.name,
    destination: invitation.trip.destination,
    startDate: invitation.trip.startDate,
    endDate: invitation.trip.endDate,
    description: invitation.trip.description,
    memberCount: 0, // We don't have this info from invitations
    status: invitation.membership.status,
    isPending: true,
    rsvpStatus: invitation.membership.rsvpStatus,
    isArchived: false,
    isPinned: false,
    cover: null,
    requiresDownPayment: invitation.trip.requiresDownPayment,
    downPaymentAmount: invitation.trip.downPaymentAmount,
    organizer: invitation.organizer
  })) || [];

  // Helper to sort trips by pinned status first, then by date proximity
  const sortTripsByPinnedAndProximity = (tripA: any, tripB: any) => {
    // Pinned trips always come first
    if (tripA.isPinned && !tripB.isPinned) {
      return -1;
    }
    if (!tripA.isPinned && tripB.isPinned) {
      return 1;
    }
    
    // If both are pinned or both are not pinned, sort by date proximity
    const dateA = new Date(tripA.startDate);
    const dateB = new Date(tripB.startDate);
    
    // Calculate difference from today
    const diffA = Math.abs(dateA.getTime() - currentDate.getTime());
    const diffB = Math.abs(dateB.getTime() - currentDate.getTime());
    
    return diffA - diffB; // Closest dates first
  };
  
  // Handler functions for pinning and archiving
  const handlePinTrip = (id: number) => {
    pinTripMutation.mutate(id);
  };
  
  const handleArchiveTrip = (id: number) => {
    archiveTripMutation.mutate(id);
  };

  // Combine confirmed trips with pending invitations
  const allTripsIncludingPending = [...(trips || []), ...pendingTripsFromInvitations];
  
  // Past trips = trips with end date before current date
  const pastTrips = allTripsIncludingPending.filter((trip: any) => {
    const endDate = new Date(trip.endDate);
    return endDate < currentDate && 
      (showArchived ? true : !trip.isArchived) && // Only show archived if selected
      (searchTerm === "" || 
        trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchTerm.toLowerCase()));
  }).sort(sortTripsByPinnedAndProximity);

  // debugging 
  const currentDateToday = new Date();

  console.log("All trips:", allTripsIncludingPending);
  console.log("Current date:", currentDateToday);
  allTripsIncludingPending.forEach(trip => {
    console.log(
      "Trip:",
      trip.name,
      "Start:",
      trip.startDate,
      "End:",
      trip.endDate,
      "Parsed End:",
      new Date(trip.endDate)
    );
  });

  
  
  // Upcoming trips = trips with end date on or after current date
  const upcomingTrips = allTripsIncludingPending.filter((trip: any) => {
    const endDate = new Date(trip.endDate);
    return endDate >= currentDate && 
      (showArchived ? true : !trip.isArchived) && // Only show archived if selected
      (searchTerm === "" || 
        trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchTerm.toLowerCase()));
  }).sort(sortTripsByPinnedAndProximity);
  
  // All trips (filtered for search and archive status)
  const filteredTrips = allTripsIncludingPending.filter((trip: any) => {
    return (showArchived ? true : !trip.isArchived) && // Only show archived if selected
      (searchTerm === "" || 
        trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchTerm.toLowerCase()));
  }).sort(sortTripsByPinnedAndProximity);
  
  // Invitations are handled separately through pendingInvitations

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden pb-16 md:pb-0">
        {/* Navigation Panel */}
        <div className="w-full md:w-80 md:min-w-[320px] bg-white border-r border-gray-200 md:h-full overflow-y-auto">


          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search trips or destinations..."
                className="w-full pl-10 pr-4 py-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Trip List */}
          <div className="pt-2">
            <div className="px-4 pb-2 flex justify-between items-center">
              <h2 className="text-sm font-medium text-gray-500 uppercase">Your Trips</h2>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-600 hover:bg-primary-50"
                onClick={() => navigate("/create-trip")}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {/* We've moved the invitations section to the Tabs, so this section is no longer needed */}
            
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-3 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : trips && trips.length > 0 ? (
              <div className="space-y-1">
                <Tabs defaultValue="upcoming" className="w-full">
                  <TabsList className="w-full justify-start px-4 pb-2">
                    <TabsTrigger value="upcoming" className="text-xs">Upcoming</TabsTrigger>
                    <TabsTrigger value="archived" className="text-xs">Archived</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upcoming">
                    {/* Only non-archived, upcoming trips */}
                    {upcomingTrips.filter((trip: any) => !trip.isArchived).length > 0 ? (
                      upcomingTrips.filter((trip: any) => !trip.isArchived).map((trip: any) => (
                        <div key={trip.id} className="px-1">
                          <EnhancedTripCard
                            id={trip.id}
                            name={trip.name}
                            destination={trip.destination}
                            startDate={trip.startDate}
                            endDate={trip.endDate}
                            status={trip.status}
                            memberCount={trip.memberCount}
                            imageUrl={trip.cover}
                            isPinned={!!trip.isPinned}
                            isArchived={!!trip.isArchived}
                            isPending={!!trip.isPending}
                            rsvpStatus={trip.rsvpStatus}
                            onPin={handlePinTrip}
                            onArchive={handleArchiveTrip}
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">No upcoming trips.</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="new">
                    {pendingInvitations && pendingInvitations.length > 0 ? (
                      <div className="space-y-2 px-1">
                        {pendingInvitations.map((invitation: any) => (
                          <Card key={invitation.membership.tripId} className="border-orange-200 bg-orange-50">
                            <CardContent className="p-3">
                              <div className="flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-medium text-gray-900">{invitation.trip?.name}</h4>
                                    <p className="text-sm text-gray-600">
                                      {invitation.trip?.destination} • {new Date(invitation.trip?.startDate).toLocaleDateString()} - {new Date(invitation.trip?.endDate).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      Invited by {invitation.organizer?.name || invitation.organizer?.username}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2 mt-2">
                                  <p className="text-sm font-medium text-gray-700">Will you be attending this trip?</p>
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="default"
                                      className="w-full bg-green-600 hover:bg-green-700"
                                      onClick={async () => {
                                        // Update status to confirmed
                                        const data = { status: 'confirmed' };
                                        const response = await apiRequest('PUT', `${API_BASE}/api/trips/${invitation.membership.tripId}/members/${user.id}`, {
                                          body:data,
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`
                                          },
                                        });
                                        if (response.ok) {
                                          toast({
                                            title: "Attendance confirmed!",
                                            description: "You're now confirmed for this trip"
                                          });
                                          // Refresh data
                                          queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips`] });
                                          queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips/memberships/pending`] });
                                        } else {
                                          throw new Error("Failed to confirm attendance");
                                        }
                                      }}
                                    >
                                      I'll be there!
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="w-full border-red-200 text-red-600 hover:bg-red-50"
                                      onClick={async () => {
                                        // Update status to declined
                                        const data = { status: 'declined' };
                                        const response = await apiRequest('PUT', `${API_BASE}/api/trips/${invitation.membership.tripId}/members/${user.id}`, {
                                          body: data,
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`
                                          },
                                        });
                                        if (response.ok) {
                                          toast({
                                            title: "Trip declined",
                                            description: "You've been removed from this trip and it has been archived"
                                          });
                                          // Refresh data to show updated trip list and archived section
                                          queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips`] });
                                          queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips/memberships/pending`] });
                                        } else {
                                          throw new Error("Failed to decline invitation");
                                        }
                                      }}
                                    >
                                      I can't attend
                                    </Button>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Your response helps the organizer plan appropriately
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-4">No new trip invitations.</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="archived">
                    {/* Only archived trips */}
                    {filteredTrips.filter((trip: any) => trip.isArchived).length > 0 ? (
                      filteredTrips.filter((trip: any) => trip.isArchived).map((trip: any) => (
                        <div key={trip.id} className="px-1">
                          <EnhancedTripCard
                            id={trip.id}
                            name={trip.name}
                            destination={trip.destination}
                            startDate={trip.startDate}
                            endDate={trip.endDate}
                            status={trip.status}
                            memberCount={trip.memberCount}
                            imageUrl={trip.cover}
                            isPinned={!!trip.isPinned}
                            isArchived={!!trip.isArchived}
                            isPending={!!trip.isPending}
                            rsvpStatus={trip.rsvpStatus}
                            onPin={handlePinTrip}
                            onArchive={handleArchiveTrip}
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">No archived trips.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="text-center p-8">
                <h3 className="text-lg font-semibold mb-2">No trips yet!</h3>
                <p className="text-gray-500 mb-4">Start planning your first adventure.</p>
                <Button onClick={() => navigate("/create-trip")}>
                  <Plus className="h-4 w-4 mr-2" /> Create a Trip
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Welcome Content Panel if no trip is selected */}
        <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-8 text-center pt-12">
          <img
            src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&h=400"
            alt="Group of friends on vacation"
            className="rounded-lg mb-6 w-full max-w-xl object-cover shadow-md"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Navigator!</h1>
          <p className="text-gray-600 max-w-md mb-6">
            Plan trips with friends, create itineraries, chat with your travel group,
            and make your next adventure unforgettable.
          </p>
          <Button onClick={() => navigate("/create-trip")} className="mb-3">
            <Plus className="h-4 w-4 mr-2" /> Create a Trip
          </Button>
          <p className="text-sm text-gray-500">
            Or select a trip from the sidebar to view details.
          </p>
        </div>
      </main>
      
      <MobileNavigation />
    </div>
  );
}
