import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, DollarSign, AlertCircle, CheckCircle, ExternalLink, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from '@/lib/queryClient';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface TripWithBalance {
  tripId: number;
  tripName: string;
  balance: number;
  message: string;
}

export default function DeleteAccountPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch trips with unsettled balances
  const { data: tripsWithBalances = [], isLoading, refetch } = useQuery<TripWithBalance[]>({
    queryKey: [`${API_BASE}/api/user/unsettled-balances`],
    queryFn: async () => {
      return await apiRequest<TripWithBalance[]>('GET', `${API_BASE}/api/user/unsettled-balances`);
    },
    enabled: !!user,
    retry: false,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Cancel deletion mutation
  const cancelDeletionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('PUT', `${API_BASE}/api/user/deletion-status`, { deletionInProgress: false });
    },
    onSuccess: () => {
      toast({
        title: "Deletion Cancelled",
        description: "Your account deletion has been cancelled. All settlements made during this process have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/user/deletion-status`] });
      navigate('/account-settings');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel deletion. Please try again.",
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
      localStorage.removeItem('auth_token');
      sessionStorage.clear();
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Account Deletion Failed",
        description: error.message || "There was a problem deleting your account. Please try again.",
        variant: "destructive",
      });
      setIsDeleting(false);
    },
  });

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${absAmount.toFixed(2)}`;
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccountMutation.mutateAsync();
    } catch (error) {
      // Error handled in mutation
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  const hasUnsettledBalances = tripsWithBalances.length > 0;
  const hasNegativeBalances = tripsWithBalances.some(trip => trip.balance < 0);
  const allSettled = !isLoading && tripsWithBalances.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 p-4 pb-20 md:pb-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Trash2 className="h-6 w-6 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900">Delete Account</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/account-settings')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Settings</span>
            </Button>
          </div>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {allSettled ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Ready to Delete</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span>Outstanding Balances</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Checking balances...</p>
                </div>
              ) : allSettled ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium">
                      Great news! You have no outstanding balances.
                    </p>
                    <p className="text-green-700 text-sm mt-2">
                      You can now proceed with deleting your account.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      variant="destructive"
                      className="flex-1"
                    >
                      {isDeleting ? (
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
                    <Button
                      onClick={() => cancelDeletionMutation.mutate()}
                      disabled={cancelDeletionMutation.isPending || isDeleting}
                      variant="outline"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-medium mb-2">
                      You have outstanding balances in {tripsWithBalances.length} trip{tripsWithBalances.length > 1 ? 's' : ''}.
                    </p>
                    <p className="text-yellow-700 text-sm">
                      Please settle all debts (negative balances) before deleting your account. 
                      You can leave even if you're owed money, but you'll lose that money.
                    </p>
                  </div>

                  {/* Trips List */}
                  <div className="space-y-3">
                    {tripsWithBalances.map((trip) => (
                      <Card key={trip.tripId}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarFallback className="bg-gray-200 text-gray-700">
                                {trip.tripName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 mb-2 truncate">
                                {trip.tripName}
                              </h3>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 flex-wrap">
                                  <Badge
                                    variant={trip.balance > 0 ? "default" : "destructive"}
                                    className={
                                      trip.balance > 0
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }
                                  >
                                    {trip.balance > 0 ? "You're owed" : "You owe"}
                                  </Badge>
                                  <span className={`text-lg font-bold ${trip.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {formatCurrency(trip.balance)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {trip.message}
                                </p>
                                <Button
                                  onClick={() => navigate(`/trips/${trip.tripId}/expenses?fromDeleteFlow=true`)}
                                  variant="outline"
                                  size="sm"
                                  className="mt-2"
                                >
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Settle Up
                                </Button>
                              </div>
                            </div>
                            <ExternalLink className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t space-y-3">
                    <Button
                      onClick={handleDeleteAccount}
                      disabled={hasNegativeBalances || isDeleting}
                      variant="destructive"
                      className="w-full"
                    >
                      {isDeleting ? (
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
                    {hasNegativeBalances && (
                      <p className="text-sm text-red-600 text-center">
                        You must settle all debts before deleting your account.
                      </p>
                    )}
                    <Button
                      onClick={() => cancelDeletionMutation.mutate()}
                      disabled={cancelDeletionMutation.isPending || isDeleting}
                      variant="outline"
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel Deletion
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileNavigation />
    </div>
  );
}

