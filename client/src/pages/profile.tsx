import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Camera, Edit, Save, X, Calendar, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from '@/lib/queryClient';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Profile() {
  const [, navigate] = useLocation();
  const { user, refreshUser, updateUserData } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    bio: "",
    location: "",
    venmoUsername: "",
    paypalEmail: "",
  });

  // Fetch user profile data
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: [`${API_BASE}/api/auth/me`],
    enabled: !!user,
  });

  // Fetch user's trip statistics
  const { data: tripStats, isLoading: isStatsLoading } = useQuery({
    queryKey: [`${API_BASE}/api/users/stats`],
    enabled: !!user,
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      const profileData = profile as any;
      setFormData({
        username: profileData.username || "",
        email: profileData.email || "",
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        bio: profileData.bio || "",
        location: profileData.location || "",
        venmoUsername: profileData.venmoUsername || "",
        paypalEmail: profileData.paypalEmail || "",
      });
    }
  }, [profile]);

  // 1. Save formData to localStorage on change
  useEffect(() => {
    if (isEditing) {
      localStorage.setItem('profileEditDraft', JSON.stringify(formData));
    }
  }, [formData, isEditing]);

  // 2. On mount (when entering edit mode), restore from localStorage if present
  useEffect(() => {
    if (isEditing) {
      const draft = localStorage.getItem('profileEditDraft');
      if (draft) {
        setFormData(JSON.parse(draft));
      }
    }
  }, [isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Validate Venmo username format
    if (name === 'venmoUsername' && value && !value.startsWith('@')) {
      setFormData(prev => ({ ...prev, [name]: '@' + value.replace('@', '') }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Ensure Venmo username starts with '@'
    const venmo = formData.venmoUsername?.trim();
    const safeFormData = {
      ...formData,
      venmoUsername: venmo ? (venmo.startsWith('@') ? venmo : '@' + venmo.replace(/^@*/, '')) : ''
    };

    try {
      // FIX: Send the data as a plain object, not as a stringified JSON in a 'body' property
      const response = await apiRequest('PUT', `${API_BASE}/api/users/profile`, safeFormData);
      console.log('Profile update response:', response);
      
      // Verify the response contains the updated data
      if (response && typeof response === 'object') {
        console.log('Response username:', response.username, 'Expected:', safeFormData.username);
        console.log('Response firstName:', response.firstName, 'Expected:', safeFormData.firstName);
        console.log('Response lastName:', response.lastName, 'Expected:', safeFormData.lastName);
        
        // Check if the server actually returned the updated data
        const serverDataMatches = 
          response.username === safeFormData.username &&
          response.firstName === safeFormData.firstName &&
          response.lastName === safeFormData.lastName;
        
        console.log('Server data matches expected:', serverDataMatches);
        
        if (!serverDataMatches) {
          console.warn('Server response does not match expected data - this might indicate a server issue');
        }
        
        // Log the full response structure
        console.log('Full profile update response:', response);
        console.log('Response keys:', Object.keys(response));
        console.log('Response values:', Object.values(response));
      }
      
      // Check if username changed to invalidate all related queries
      const profileData = profile as any;
      const usernameChanged = profileData?.username !== safeFormData.username;
      const nameChanged = (profileData?.firstName !== safeFormData.firstName) || (profileData?.lastName !== safeFormData.lastName);
      
      console.log('Profile update completed. Changes detected:', { usernameChanged, nameChanged });
      console.log('Current auth context user:', user);
      console.log('Current profile data:', profileData);
      console.log('Form data being submitted:', safeFormData);
      console.log('Data structure comparison:', {
        authUser: {
          id: user?.id,
          username: user?.username,
          name: user?.name,
          email: user?.email
        },
        profileData: {
          id: profileData?.id,
          username: profileData?.username,
          firstName: profileData?.firstName,
          lastName: profileData?.lastName,
          email: profileData?.email
        }
      });
      
      // Always refresh profile data
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/auth/me`] });
      
      // Comprehensive approach: invalidate all queries that contain user data
      if (usernameChanged || nameChanged) {
        console.log('Username or name changed, invalidating all user-related queries...');
        
        try {
          // Get all queries from the query client
          const queries = queryClient.getQueryCache().getAll();
          console.log('Total queries in cache:', queries.length);
          
          // Find and invalidate all queries that might contain user data
          let invalidatedCount = 0;
          queries.forEach(query => {
            const queryKey = query.queryKey;
            const queryKeyString = Array.isArray(queryKey) ? queryKey.join('/') : String(queryKey);
            
            // Check if this query contains user-related data
            if (
              queryKeyString.includes('/trips') ||
              queryKeyString.includes('/expenses') ||
              queryKeyString.includes('/settlements') ||
              queryKeyString.includes('/activities') ||
              queryKeyString.includes('/flights') ||
              queryKeyString.includes('/memberships') ||
              queryKeyString.includes('/users') ||
              queryKeyString.includes('/chats') ||
              queryKeyString.includes('/messages') ||
              queryKeyString.includes('/polls') ||
              queryKeyString.includes('/rsvp')
            ) {
              console.log('Invalidating query:', queryKeyString);
              queryClient.invalidateQueries({ queryKey });
              invalidatedCount++;
            }
          });
          
          console.log(`Invalidated ${invalidatedCount} user-related queries`);
          
          // Also refresh the current user data
          if (refreshUser) {
            await refreshUser();
          }
          
          // Immediately update the auth context with the new data
          if (response && typeof response === 'object') {
            console.log('Immediately updating auth context with new user data...');
            updateUserData({
              username: response.username,
              firstName: response.firstName,
              lastName: response.lastName,
              name: response.name || `${response.firstName || ''} ${response.lastName || ''}`.trim()
            });
            console.log('Auth context updated with new user data');
          } else {
            // Fallback: update with form data if server response is incomplete
            console.log('Server response incomplete, updating auth context with form data...');
            updateUserData({
              username: safeFormData.username,
              firstName: safeFormData.firstName,
              lastName: safeFormData.lastName,
              name: `${safeFormData.firstName || ''} ${safeFormData.lastName || ''}`.trim()
            });
            console.log('Auth context updated with form data');
          }
          
          // Force a small delay to ensure all invalidations are processed
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Show success message
          if (usernameChanged) {
            toast({
              title: "Username Updated",
              description: `Your username has been updated and ${invalidatedCount} data sources have been refreshed. The changes should now appear throughout the app.`,
            });
            
            // For username changes, offer an option to reload the page if needed
            setTimeout(() => {
              if (confirm("Username updated! If you still don't see the changes throughout the app, would you like to reload the page for a complete refresh?")) {
                window.location.reload();
              }
            }, 3000);
          } else {
            toast({
              title: "Profile Updated",
              description: `Your name has been updated and ${invalidatedCount} data sources have been refreshed. The changes should now appear throughout the app.`,
            });
          }
          
        } catch (error) {
          console.error('Error during query invalidation:', error);
          
          // Fallback: show message about refreshing
          if (usernameChanged) {
            toast({
              title: "Username Updated",
              description: "Your username has been updated. If you don't see the changes throughout the app, please refresh the page.",
            });
          } else {
            toast({
              title: "Profile Updated",
              description: "Your name has been updated. If you don't see the changes throughout the app, please refresh the page.",
            });
          }
        }
      } else {
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error updating profile",
        description: "There was a problem updating your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      localStorage.removeItem('profileEditDraft');
      // Always reset formData to latest profile after save
      if (profile) {
        const profileData = profile as any;
        setFormData({
          username: profileData.username || "",
          email: profileData.email || "",
          firstName: profileData.firstName || "",
          lastName: profileData.lastName || "",
          bio: profileData.bio || "",
          location: profileData.location || "",
          venmoUsername: profileData.venmoUsername || "",
          paypalEmail: profileData.paypalEmail || "",
        });
      }
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    localStorage.removeItem('profileEditDraft');
    // Reset form data to original values
    if (profile) {
      const profileData = profile as any;
      setFormData({
        username: profileData.username || "",
        email: profileData.email || "",
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        bio: profileData.bio || "",
        location: profileData.location || "",
        venmoUsername: profileData.venmoUsername || "",
        paypalEmail: profileData.paypalEmail || "",
      });
    }
  };

  const getDisplayName = () => {
    const profileData = profile as any;
    if (profileData?.firstName || profileData?.lastName) {
      return `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim();
    }
    return profileData?.username || "User";
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.split(" ").map((n: string) => n[0]).join("").toUpperCase();
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  if (isProfileLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 p-4 pb-20 md:pb-4">
          <div className="max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </main>
        <MobileNavigation />
      </div>
    );
  }

  const profileData = profile as any;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 p-4 pb-20 md:pb-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="p-6">
              {/* Profile Completion Bar goes here */}
              <ProfileCompletionBar formData={profileData} />
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage 
                        src={profileData?.avatar 
                          ? (profileData.avatar.startsWith('data:')
                              ? profileData.avatar
                              : (profileData.avatar.startsWith('http') ? profileData.avatar : `${API_BASE}${profileData.avatar}`))
                          : undefined}
                        alt={getDisplayName()} 
                      />
                      <AvatarFallback className="text-lg font-medium">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            // Read as base64
                            const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => resolve(reader.result as string);
                              reader.onerror = reject;
                              reader.readAsDataURL(f);
                            });
                            const imageBase64 = await toBase64(file);
                            const API_BASE = import.meta.env.VITE_API_URL || '';
                            const token = localStorage.getItem('auth_token');
                            const res = await fetch(`${API_BASE}/api/users/avatar`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                              },
                              credentials: 'include',
                              body: JSON.stringify({ imageBase64 }),
                            });
                            if (!res.ok) {
                              const msg = await res.text();
                              throw new Error(msg || 'Failed to upload avatar');
                            }
                            toast({ title: 'Profile photo updated' });
                            // Refresh profile and header avatar
                            await refreshUser();
                            await queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/auth/me`] });
                          } catch (err) {
                            console.error(err);
                            toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Please try again', variant: 'destructive' });
                          } finally {
                            // clear input value so same file can be re-selected
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 rounded-full p-0 pointer-events-none"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </label>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{getDisplayName()}</h1>
                    <p className="text-gray-600">@{profileData?.username}</p>
                    {profileData?.location && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {profileData.location}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant={isEditing ? "outline" : "default"}
                  onClick={() => isEditing ? cancelEdit() : setIsEditing(true)}
                  className="flex items-center space-x-2"
                >
                  {isEditing ? (
                    <>
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4" />
                      <span>Edit Profile</span>
                    </>
                  )}
                </Button>
              </div>

              {profileData?.bio && (
                <p className="text-gray-700 mb-4">{profileData.bio}</p>
              )}

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Joined {new Date(profileData?.createdAt || "").toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trip Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Travel Stats</CardTitle>
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="text-center">
                      <Skeleton className="h-8 w-12 mx-auto mb-2" />
                      <Skeleton className="h-4 w-16 mx-auto" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{(tripStats as any)?.totalTrips || 0}</div>
                    <div className="text-sm text-gray-600">Total Trips</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{(tripStats as any)?.upcomingTrips || 0}</div>
                    <div className="text-sm text-gray-600">Upcoming</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{(tripStats as any)?.companionsCount || 0}</div>
                    <div className="text-sm text-gray-600">Travel Companions</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Profile Form */}
          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Your first name"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Your last name"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <Input
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Your username"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Note: Username changes will require a page refresh to appear throughout the app.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="City, Country"
                    />
                  </div>

                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                      Bio
                    </label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>

                  {/* Payment Methods Section */}
                  <div className="border-t pt-6 mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Preferred Payment Methods</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Add your payment information to streamline settlement workflows. Both fields are optional.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="venmoUsername" className="block text-sm font-medium text-gray-700 mb-1">
                          Venmo Username
                        </label>
                        <Input
                          id="venmoUsername"
                          name="venmoUsername"
                          value={formData.venmoUsername}
                          onChange={handleInputChange}
                          placeholder="@username"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Used to generate one-click payment links in the settlement workflow
                        </p>
                      </div>

                      <div>
                        <label htmlFor="paypalEmail" className="block text-sm font-medium text-gray-700 mb-1">
                          PayPal Email
                        </label>
                        <Input
                          id="paypalEmail"
                          name="paypalEmail"
                          type="email"
                          value={formData.paypalEmail}
                          onChange={handleInputChange}
                          placeholder="user@example.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Used to generate one-click payment links in the settlement workflow
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Users without online payment methods will be offered a "Settle in Cash" option 
                        during the settlement workflow, which requires separate confirmation from both parties.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <MobileNavigation />
    </div>
  );
}

function ProfileCompletionBar({ formData }: { formData: any }) {
  // Define required fields for completion
  const fields = [
    { key: 'username', label: 'Username' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'bio', label: 'Bio' },
    { key: 'location', label: 'Location' },
    { key: 'venmoUsername', label: 'Venmo Username' },
    { key: 'paypalEmail', label: 'PayPal Email' },
  ];
  const completed = fields.filter(f => formData[f.key] && formData[f.key].trim() !== '').length;
  const percent = Math.round((completed / fields.length) * 100);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Profile Completion</span>
        <span className="text-xs text-gray-500">{percent}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      <ul className="text-xs text-gray-600 space-y-1">
        {fields.map(f => (
          <li key={f.key} className="flex items-center gap-2">
            {formData[f.key] && formData[f.key].trim() !== '' ? (
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
            ) : (
              <span className="inline-block w-3 h-3 bg-gray-300 rounded-full"></span>
            )}
            {f.label}
          </li>
        ))}
      </ul>
    </div>
  );
}