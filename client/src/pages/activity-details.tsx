import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Clock, DollarSign, Users, CheckIcon, XIcon, Trash2, ExternalLink, UserCheck, MoreHorizontal, Edit3, Save, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import GooglePlacesAutocomplete from "@/components/google-places-autocomplete";
import ActivityFormDialog, { ActivityFormData } from "@/components/ActivityFormDialog";

const API_BASE = import.meta.env.VITE_API_URL || '';


interface ActivityRSVP {
  id: number;
  activityId: number;
  userId: number;
  status: string;
  user: {
    id: number;
    name: string;
    avatar?: string;
  };
}

interface ActivityDetail {
  id: number;
  tripId: number;
  name: string;
  description?: string;
  date: string;
  startTime?: string;
  activityType?: string;
  activityLink?: string;
  location?: string;
  duration?: string;
  cost?: string;
  paymentType: string;
  maxParticipants?: number;
  createdBy: number;
  creator?: {
    id: number;
    name: string;
    avatar?: string;
  };
  rsvps: ActivityRSVP[];
}

interface Trip {
  id: number;
  organizer: number;
  adminOnlyItinerary?: boolean;
}

interface TripMember {
  tripId: number;
  userId: number;
  isOrganizer: boolean;
  isAdmin?: boolean;
  status: string;
  user?: {
    id: number;
    name: string;
    username: string;
    avatar?: string;
  };
}

export default function ActivityDetails() {
  const { activityId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>("");
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [editCapDialogOpen, setEditCapDialogOpen] = useState(false);
  const [newMaxParticipants, setNewMaxParticipants] = useState<string>("");
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<ActivityFormData>({
    name: "",
    description: "",
    date: "",
    startTime: "",
    activityType: "",
    activityLink: "",
    location: "",
    duration: "",
    cost: "",
    paymentType: "free",
    maxParticipants: "",
    checkInDate: "",
    checkOutDate: ""
  });

  const { data: activity, isLoading } = useQuery<ActivityDetail>({
    queryKey: [`${API_BASE}/api/activities/${activityId}`],
  });

  const { data: currentUser } = useQuery<{ id: number; name: string; email: string }>({
    queryKey: [`${API_BASE}/api/auth/me`],
  });

  // Fetch trip details to check admin permissions
  const { data: trip } = useQuery<Trip>({
    queryKey: [`${API_BASE}/api/trips/${activity?.tripId}`],
    enabled: !!activity?.tripId,
  });

  // Fetch trip members to check admin status
  const { data: members = [] } = useQuery<TripMember[]>({
    queryKey: [`${API_BASE}/api/trips/${activity?.tripId}/members`],
    enabled: !!activity?.tripId,
  });

  // Check if current user can edit/delete activities
  const isOrganizer = currentUser && trip && trip.organizer === currentUser.id;
  const currentUserMembership = members.find(member => member.userId === currentUser?.id);
  const isCurrentUserAdmin = currentUserMembership?.isAdmin || isOrganizer;
  const canEditActivity = !trip?.adminOnlyItinerary || isCurrentUserAdmin || (currentUser && activity?.createdBy === currentUser.id);

  // Calculate confirmed members count for registration cap dropdown
  const confirmedMembersCount = members.filter(member => 
    member.status === 'confirmed' && member.rsvpStatus === 'confirmed'
  ).length;

  // Generate participant cap options
  const generateParticipantOptions = (totalMembers: number) => {
    const options = [];
    
    // Add "No cap" option
    options.push({ value: 'unlimited', label: 'No cap' });
    
    // Add numbers from 1 to totalMembers
    for (let i = 1; i <= totalMembers; i++) {
      options.push({ 
        value: i.toString(), 
        label: i.toString()
      });
    }
    
    return options;
  };

  const participantOptions = generateParticipantOptions(confirmedMembersCount);

  // Generate trip days for the date selector
  const generateTripDays = () => {
    if (!(trip as any)?.startDate || !(trip as any)?.endDate) return [] as { value: string; label: string; dayNumber: number; date: Date }[];
    const startDate = new Date((trip as any).startDate);
    const endDate = new Date((trip as any).endDate);
    const days: { value: string; label: string; dayNumber: number; date: Date }[] = [];
    const currentDate = new Date(startDate);
    let dayNumber = 1;
    while (currentDate <= endDate) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      const monthDay = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push({
        value: currentDate.toISOString().split('T')[0],
        label: `Day ${dayNumber} - ${dayName}, ${monthDay}`,
        dayNumber,
        date: new Date(currentDate)
      });
      currentDate.setDate(currentDate.getDate() + 1);
      dayNumber++;
    }
    return days;
  };
  const tripDays = generateTripDays();

  const rsvpMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("POST", `${API_BASE}/api/activities/${activityId}/rsvp`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/activities/${activityId}`] });
      if (activity?.tripId) {
        queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips/${activity.tripId}/activities`] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `${API_BASE}/api/activities/${activityId}`);
    },
    onSuccess: () => {
      toast({
        title: "Activity deleted",
        description: "The activity has been removed from the trip.",
      });
      setLocation(`/trips/${activity?.tripId}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: async (newOwnerId: number) => {
      return await apiRequest("PUT", `${API_BASE}/api/activities/${activityId}/transfer-ownership`, { newOwnerId });
    },
    onSuccess: () => {
      toast({
        title: "Ownership transferred",
        description: "Activity ownership has been successfully transferred.",
      });
      setTransferDialogOpen(false);
      setSelectedNewOwner("");
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/activities/${activityId}`] });
      if (activity?.tripId) {
        queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips/${activity.tripId}/activities`] });
        queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips/${activity.tripId}/expenses`] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Transfer failed",
        description: error.message || "Failed to transfer ownership. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCapMutation = useMutation({
    mutationFn: async (maxParticipants: string) => {
      return await apiRequest("PUT", `${API_BASE}/api/activities/${activityId}`, {
        maxParticipants: maxParticipants && maxParticipants !== 'unlimited' ? parseInt(maxParticipants) : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/activities/${activityId}`] });
      if (activity?.tripId) {
        queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips/${activity.tripId}/activities`] });
      }
      toast({
        title: "Cap Updated",
        description: "The participant limit has been updated successfully.",
      });
      setEditCapDialogOpen(false);
    },
    onError: (error: any) => {
      console.error("Update cap error:", error);
      toast({
        title: "Update Failed",
        description: error?.response?.data?.message || "There was a problem updating the cap. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Edit activity mutation
  const editActivityMutation = useMutation({
    mutationFn: async (activityData: any) => {
      return await apiRequest("PUT", `${API_BASE}/api/activities/${activityId}`, activityData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/activities/${activityId}`] });
      if (activity?.tripId) {
        queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips/${activity.tripId}/activities`] });
      }
      toast({
        title: "Activity Updated",
        description: "The activity has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      console.error("Edit activity error:", error);
      toast({
        title: "Update Failed",
        description: error?.response?.data?.message || "There was a problem updating the activity. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Initialize edit form data when activity loads
  useEffect(() => {
    if (activity && !isEditing) {
      setEditFormData({
        name: activity.name || "",
        description: activity.description || "",
        date: activity.date ? new Date(activity.date).toISOString().split('T')[0] : "",
        startTime: activity.startTime || "",
        activityType: activity.activityType || "",
        activityLink: activity.activityLink || "",
        location: activity.location || "",
        duration: activity.duration || "",
        cost: activity.cost || "",
        paymentType: activity.paymentType || "free",
        maxParticipants: activity.maxParticipants?.toString() || "",
        checkInDate: activity.checkInDate ? new Date(activity.checkInDate).toISOString().split('T')[0] : "",
        checkOutDate: activity.checkOutDate ? new Date(activity.checkOutDate).toISOString().split('T')[0] : ""
      });
    }
  }, [activity, isEditing]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Activity not found</h2>
          <Button onClick={() => setLocation("/")}>Go back</Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const goingRSVPs = activity.rsvps?.filter(rsvp => rsvp.status === "going") || [];
  const notGoingRSVPs = activity.rsvps?.filter(rsvp => rsvp.status === "not going") || [];
  const userRSVP = activity.rsvps?.find(rsvp => rsvp.userId === currentUser?.id);
  const spotsLeft = activity.maxParticipants ? activity.maxParticipants - goingRSVPs.length : null;
  
  // Check if activity is full and user can RSVP as going
  const isFull = activity.maxParticipants && goingRSVPs.length >= activity.maxParticipants;
  const canRSVPGoing = !isFull || userRSVP?.status === "going";

  const handleRSVP = async (status: string) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await rsvpMutation.mutateAsync(status);
      toast({
        title: status === "going" ? "You're going!" : "You're not going",
        description: status === "going" 
          ? "You've been added to the attendee list" 
          : "You've been removed from the attendee list",
      });
    } catch (error: any) {
      console.error("RSVP error:", error);
      const errorMessage = error?.response?.data?.message || "There was a problem with your RSVP. Please try again.";
      toast({
        title: "RSVP Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // Reset form data when canceling edit
      if (activity) {
        setEditFormData({
          name: activity.name || "",
          description: activity.description || "",
          date: activity.date ? new Date(activity.date).toISOString().split('T')[0] : "",
          startTime: activity.startTime || "",
          activityType: activity.activityType || "",
          activityLink: activity.activityLink || "",
          location: activity.location || "",
          duration: activity.duration || "",
          cost: activity.cost || "",
          paymentType: activity.paymentType || "free",
          maxParticipants: activity.maxParticipants?.toString() || "",
          checkInDate: activity.checkInDate ? new Date(activity.checkInDate).toISOString().split('T')[0] : "",
          checkOutDate: activity.checkOutDate ? new Date(activity.checkOutDate).toISOString().split('T')[0] : ""
        });
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Activity name is required.",
        variant: "destructive"
      });
      return;
    }

    // For now, do not send date fields via PUT (server does not coerce strings to Date)

    // Validate cost is required only for prepaid (split payment) activities
    if (editFormData.paymentType === "prepaid" && (!editFormData.cost || parseFloat(editFormData.cost) <= 0)) {
      toast({
        title: "Cost required",
        description: "Please provide a valid cost for split payment activities",
        variant: "destructive"
      });
      return;
    }

    // Validate website if pay in advance
    if (editFormData.paymentType === "pay_in_advance" && !editFormData.activityLink) {
      toast({
        title: "Website required",
        description: "Please provide a website link for advance payment activities",
        variant: "destructive"
      });
      return;
    }

    // Build payload matching add flow semantics
    const payload: any = {
      name: editFormData.name.trim(),
      description: editFormData.description?.trim() || null,
      startTime: editFormData.startTime?.trim() || null,
      activityType: editFormData.activityType?.trim() || null,
      activityLink: editFormData.activityLink?.trim() || null,
      location: editFormData.location?.trim() || null,
      duration: editFormData.duration?.trim() || null,
      cost: editFormData.cost ? editFormData.cost : null,
      paymentType: editFormData.paymentType,
      maxParticipants: editFormData.maxParticipants && editFormData.maxParticipants !== 'unlimited'
        ? parseInt(editFormData.maxParticipants)
        : null,
    };
    // Intentionally omit date, checkInDate, checkOutDate to avoid schema Date parsing issues on PUT

    await editActivityMutation.mutateAsync(payload);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation(`/trips/${activity.tripId}/itinerary`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Itinerary
        </Button>
        
      </div>

      {/* Activity Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              {!isEditing ? (
                <>
                  <CardTitle className="text-2xl font-bold text-gray-900">{activity.name}</CardTitle>
                  
                  {/* Creator/Owner Information */}
                  {activity.creator && (
                    <div className="flex items-center gap-2 mt-2 mb-1">
                      <span className="text-sm text-gray-500">Created by</span>
                      <div className="flex items-center gap-2">
                        {activity.creator.avatar ? (
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={activity.creator.avatar} />
                            <AvatarFallback className="text-xs">{activity.creator.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {activity.creator.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900">{activity.creator.name}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-gray-500 mt-1">
                    {formatDate(activity.date)}
                    {activity.startTime && (
                      <span className="ml-2 font-medium text-blue-600">
                        at {activity.startTime}
                      </span>
                    )}
                  </div>
                </>
              ) : null}
            </div>
            {!isEditing && (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className="bg-primary-100 text-primary-800">
                    {goingRSVPs.length} Going
                  </Badge>
                  {activity.maxParticipants ? (
                    <>
                      <Badge variant="secondary" className="text-xs">
                        Cap: {activity.maxParticipants}
                      </Badge>
                      <Badge 
                        variant={spotsLeft === 0 ? "destructive" : spotsLeft && spotsLeft <= 3 ? "default" : "outline"}
                        className="text-xs"
                      >
                        {spotsLeft && spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
                      </Badge>
                    </>
                  ) : null}
                </div>
                
                {/* Actions dropdown - show for users who can edit */}
                {currentUser && canEditActivity && (activity.createdBy === currentUser.id || isCurrentUserAdmin) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                        <Edit3 className="mr-2 h-4 w-4" />
                        Edit Activity
                      </DropdownMenuItem>
                      {currentUser && activity.createdBy === currentUser.id && (
                        <DropdownMenuItem onSelect={() => setTransferDialogOpen(true)}>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Transfer Ownership
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onSelect={() => {
                          if (confirm("Are you sure you want to delete this activity? This will also remove any associated expenses.")) {
                            deleteMutation.mutate();
                          }
                        }}
                        className="text-red-600 focus:text-red-600"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deleteMutation.isPending ? "Deleting..." : "Delete Activity"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        {!isEditing && (
          <CardContent>
            {activity.description && (
              <p className="text-gray-700 mb-4">{activity.description}</p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {activity.activityType && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {activity.activityType}
                  </Badge>
                </div>
              )}
              
              {activity.activityLink && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-gray-500" />
                  <a 
                    href={activity.activityLink.startsWith('http') ? activity.activityLink : `https://${activity.activityLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    View Activity Website
                  </a>
                </div>
              )}
              
              {activity.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{activity.location}</span>
                </div>
              )}
              
              {activity.duration && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{activity.duration}</span>
                </div>
              )}
              
              {activity.cost && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">${activity.cost}</span>
                </div>
              )}
              
              {activity.paymentType && (
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={activity.paymentType === 'free' ? 'secondary' : activity.paymentType === 'prepaid' ? 'default' : 'outline'}
                  >
                    {activity.paymentType === 'free' ? 'Free' : 
                     activity.paymentType === 'payment_onsite' ? 'Pay Onsite' : 
                     'Prepaid'}
                  </Badge>
                </div>
              )}
            </div>

            {/* RSVP Buttons */}
            <div className="flex gap-3 mb-6">
              <Button
                variant={userRSVP?.status === "going" ? "default" : "outline"}
                onClick={() => handleRSVP("going")}
                disabled={isSubmitting || !canRSVPGoing}
                className={`flex items-center gap-2 ${userRSVP?.status === "going" ? "bg-green-600 hover:bg-green-700" : ""} ${!canRSVPGoing ? "opacity-50 cursor-not-allowed" : ""}`}
                title={!canRSVPGoing ? "Activity is full" : ""}
              >
                <CheckIcon className="h-4 w-4" />
                {userRSVP?.status === "going" ? "You're Going" : "Going"}
              </Button>
              
              {/* Prevent activity creator from declining prepaid activities */}
              {!(currentUser && activity.createdBy === currentUser.id && activity.paymentType === 'prepaid') && (
                <Button
                  variant={userRSVP?.status === "not going" ? "default" : "outline"}
                  onClick={() => handleRSVP("not going")}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 ${userRSVP?.status === "not going" ? "bg-red-600 hover:bg-red-700" : ""}`}
                >
                  <XIcon className="h-4 w-4" />
                  {userRSVP?.status === "not going" ? "You're Not Going" : "Not Going"}
                </Button>
              )}
              
            </div>
            
            {/* Show message for prepaid activity creators - moved below button container */}
            {currentUser && activity.createdBy === currentUser.id && activity.paymentType === 'prepaid' && (
              <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded mt-4">
                <span>As the creator of this prepaid activity, you must attend.</span>
              </div>
            )}
            
          </CardContent>
        )}
      </Card>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Activity Ownership</DialogTitle>
            <DialogDescription>
              Select a new owner for this activity. This will transfer ownership and any associated responsibilities to the new owner.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Select New Owner
            </label>
            <Select value={selectedNewOwner} onValueChange={setSelectedNewOwner}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a trip member..." />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter(m => {
                    // Only show confirmed members who are not the current owner
                    if (m.status !== 'confirmed' || m.userId === activity.createdBy) {
                      return false;
                    }
                    // Only show members who have RSVP'd "going" to this activity
                    const userRSVP = activity.rsvps?.find(rsvp => rsvp.userId === m.userId);
                    return userRSVP && userRSVP.status === 'going';
                  })
                  .map(member => (
                    <SelectItem key={member.userId} value={member.userId.toString()}>
                      {member.user?.name || member.user?.username || `User ${member.userId}`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setTransferDialogOpen(false);
                setSelectedNewOwner("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedNewOwner) {
                  transferOwnershipMutation.mutate(parseInt(selectedNewOwner));
                }
              }}
              disabled={!selectedNewOwner || transferOwnershipMutation.isPending}
            >
              {transferOwnershipMutation.isPending ? "Transferring..." : "Transfer Ownership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Cap Dialog */}
      <Dialog open={editCapDialogOpen} onOpenChange={setEditCapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activity.maxParticipants ? "Edit Participant Cap" : "Add Participant Cap"}</DialogTitle>
            <DialogDescription>
              {activity.maxParticipants 
                ? "Update the maximum number of participants for this activity."
                : "Set a maximum number of participants for this activity."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Participant Limit</label>
              <Select
                value={newMaxParticipants}
                onValueChange={setNewMaxParticipants}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose participant limit..." />
                </SelectTrigger>
                <SelectContent>
                  {participantOptions.map((option, index) => (
                    <SelectItem key={index} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditCapDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateCapMutation.mutate(newMaxParticipants)}
              disabled={updateCapMutation.isPending}
            >
              {updateCapMutation.isPending ? (activity.maxParticipants ? "Updating..." : "Adding...") : (activity.maxParticipants ? "Update Cap" : "Add Cap")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Participants Lists */}
      {!isEditing && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Going */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Going ({goingRSVPs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {goingRSVPs.length > 0 ? (
                <div className="space-y-3">
                  {goingRSVPs.map((rsvp) => (
                    <div key={rsvp.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={rsvp.user.avatar} />
                        <AvatarFallback className="bg-green-100 text-green-600">
                          {(rsvp.user.name || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-900">{rsvp.user.name || 'Unknown User'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No one has confirmed yet</p>
              )}
            </CardContent>
          </Card>

          {/* Not Going */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XIcon className="h-5 w-5 text-red-600" />
                Not Going ({notGoingRSVPs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notGoingRSVPs.length > 0 ? (
                <div className="space-y-3">
                  {notGoingRSVPs.map((rsvp) => (
                    <div key={rsvp.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={rsvp.user.avatar} />
                        <AvatarFallback className="bg-red-100 text-red-600">
                          {(rsvp.user.name || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-900">{rsvp.user.name || 'Unknown User'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No one has declined yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      <ActivityFormDialog
        open={isEditing}
        onOpenChange={(open) => {
          setIsEditing(open);
          if (!open && activity) {
            setEditFormData({
              name: activity.name || "",
              description: activity.description || "",
              date: activity.date ? new Date(activity.date).toISOString().split('T')[0] : "",
              startTime: activity.startTime || "",
              activityType: activity.activityType || "",
              activityLink: activity.activityLink || "",
              location: activity.location || "",
              duration: activity.duration || "",
              cost: activity.cost || "",
              paymentType: activity.paymentType || "free",
              maxParticipants: activity.maxParticipants?.toString() || "",
              checkInDate: (activity as any).checkInDate ? new Date((activity as any).checkInDate).toISOString().split('T')[0] : "",
              checkOutDate: (activity as any).checkOutDate ? new Date((activity as any).checkOutDate).toISOString().split('T')[0] : ""
            });
          }
        }}
        title="Edit Itinerary Item"
        submitLabel={editActivityMutation.isPending ? "Saving..." : "Save Changes"}
        isSubmitting={editActivityMutation.isPending}
        formData={editFormData}
        setFormData={setEditFormData}
        onSubmit={handleSaveEdit}
        tripDays={tripDays}
        participantOptions={participantOptions}
      />
    </div>
  );
}