import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Trash2, AlertTriangle, Lock, Shield, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from '@/lib/queryClient';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AccountSettings() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Delete profile functionality
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: { currentPassword: string; newPassword: string }) => {
      return await apiRequest('PUT', `${API_BASE}/api/users/password`, passwordData);
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "There was a problem changing your password. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `${API_BASE}/api/auth/delete-account`);
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      // Clear all data and redirect to landing page
      queryClient.clear();
      // Clear authentication state
      localStorage.removeItem('auth_token');
      sessionStorage.clear();
      // Use window.location for a hard redirect to avoid race conditions
      window.location.href = "/";
    },
    onError: (error: any) => {
      // Check if error has blocking trips information
      const blockingTrips = error?.blockingTrips || [];
      const errorMessage = error?.message || "There was a problem deleting your account. Please try again.";
      
      if (blockingTrips.length > 0) {
        // Group trips by reason type
        const organizerTrips = blockingTrips.filter((trip: any) => trip.reason?.includes('organizer'));
        const balanceTrips = blockingTrips.filter((trip: any) => !trip.reason?.includes('organizer'));
        
        // Create a more concise message
        let description = "You cannot delete your account because:\n\n";
        
        if (organizerTrips.length > 0) {
          const tripCount = organizerTrips.length;
          if (tripCount <= 3) {
            // Show all trips if 3 or fewer
            const tripNames = organizerTrips.map((trip: any) => `• ${trip.tripName}`).join('\n');
            description += `You are organizing ${tripCount} trip${tripCount > 1 ? 's' : ''}:\n${tripNames}\n\n`;
          } else {
            // Show first 3 and count if more
            const tripNames = organizerTrips.slice(0, 3).map((trip: any) => `• ${trip.tripName}`).join('\n');
            description += `You are organizing ${tripCount} trips:\n${tripNames}\n... and ${tripCount - 3} more trip${tripCount - 3 > 1 ? 's' : ''}\n\n`;
          }
          description += "Please transfer organizer role or delete these trips first.";
        }
        
        if (balanceTrips.length > 0) {
          if (organizerTrips.length > 0) {
            description += "\n\n";
          }
          const tripCount = balanceTrips.length;
          if (tripCount <= 3) {
            const tripNames = balanceTrips.map((trip: any) => `• ${trip.tripName}`).join('\n');
            description += `You have unsettled balances in ${tripCount} trip${tripCount > 1 ? 's' : ''}:\n${tripNames}\n\n`;
          } else {
            const tripNames = balanceTrips.slice(0, 3).map((trip: any) => `• ${trip.tripName}`).join('\n');
            description += `You have unsettled balances in ${tripCount} trips:\n${tripNames}\n... and ${tripCount - 3} more trip${tripCount - 3 > 1 ? 's' : ''}\n\n`;
          }
          description += "Please settle all balances before deleting your account.";
        }
        
        toast({
          title: "Cannot Delete Account",
          description: description,
          variant: "destructive",
          duration: 20000, // Show for 20 seconds for longer messages
        });
      } else {
        toast({
          title: "Account Deletion Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
    } catch (error) {
      // Error handling is done in the mutation's onError
    }
  };

  // Handle delete account button click
  const handleDeleteAccountClick = () => {
    setShowDeleteModal(true);
  };

  // Handle delete account confirmation
  const handleDeleteAccount = async () => {
    if (deleteConfirmation.toLowerCase() === "delete") {
      try {
        await deleteAccountMutation.mutateAsync();
      } catch (error) {
        // Error is already handled by the mutation's onError handler
        // This catch prevents uncaught promise rejection
        console.error('Account deletion error:', error);
      }
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 p-4 pb-20 md:pb-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Profile</span>
            </Button>
          </div>
          <p className="text-gray-600">
            Manage your account security and privacy settings.
          </p>

          {/* Password Change Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Change Password</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-6">
                Update your password to keep your account secure.
              </p>
              
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter your current password"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter your new password"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be at least 6 characters long
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm your new password"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Changing Password...
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Account Actions Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Account Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Warning</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Deleting your account is permanent and cannot be undone. This will remove all your data from our servers.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Before deleting your account, please consider:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li>• All your trips and travel data will be permanently lost</li>
                    <li>• You will be removed from all shared trips</li>
                    <li>• Your payment history and settlements will be deleted</li>
                    <li>• This action cannot be reversed</li>
                  </ul>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mt-3">
                    <p className="text-sm font-medium text-yellow-800 mb-1">
                      Important: Account Deletion Requirements
                    </p>
                    <p className="text-xs text-yellow-700">
                      You cannot delete your account if you have unsettled balances in any trip, are organizing trips, or have pending settlements. Please settle all balances and transfer organizer roles before deleting your account.
                    </p>
                  </div>
                </div>

                <div className="flex justify-start pt-4">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteAccountClick}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
            </div>
            <p className="text-gray-600 mb-4">
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="mb-4"
            />
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation.toLowerCase() !== "delete" || deleteAccountMutation.isPending}
              >
                {deleteAccountMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <MobileNavigation />
    </div>
  );
}
