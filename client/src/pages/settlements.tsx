import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, DollarSign, AlertCircle, CheckCircle, ExternalLink, Clock, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from '@/lib/queryClient';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface TripWithBalance {
  tripId: number;
  tripName: string;
  balance: number;
}

export default function SettlementsPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  // Fetch trips with unsettled balances
  const { data: tripsWithBalances = [], isLoading, refetch } = useQuery<TripWithBalance[]>({
    queryKey: [`${API_BASE}/api/user/unsettled-balances`],
    queryFn: async () => {
      return await apiRequest<TripWithBalance[]>('GET', `${API_BASE}/api/user/unsettled-balances`);
    },
    enabled: !!user,
    retry: false,
  });

  // Fetch pending settlements that need user confirmation
  const { data: pendingSettlements = [] } = useQuery({
    queryKey: [`${API_BASE}/api/settlements/pending`],
    enabled: !!user,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const handleCheckAgain = async () => {
    setIsChecking(true);
    await refetch();
    setIsChecking(false);
  };

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${absAmount.toFixed(2)}`;
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  const hasUnsettledBalances = tripsWithBalances.length > 0;
  const hasPendingSettlements = pendingSettlements.length > 0;
  const allSettled = !isLoading && tripsWithBalances.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 p-4 pb-20 md:pb-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-6 w-6 text-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900">Settle Up</h1>
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
                    <span>All Settled Up!</span>
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
                      You can now delete your account if you wish.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/account-settings')}
                    className="w-full"
                  >
                    Return to Account Settings
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pending Settlements Warning */}
                  {hasPendingSettlements && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Bell className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-blue-800 font-medium mb-1">
                            You have {pendingSettlements.length} pending settlement{pendingSettlements.length > 1 ? 's' : ''} waiting for confirmation
                          </p>
                          <p className="text-blue-700 text-sm">
                            Check your notification bell (🔔) to confirm payments you've received. Pending settlements don't affect your balance until confirmed.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-medium mb-2">
                      You have outstanding balances in {tripsWithBalances.length} trip{tripsWithBalances.length > 1 ? 's' : ''}.
                    </p>
                    <p className="text-yellow-700 text-sm">
                      Please settle all balances before deleting your account. Click on each trip below to go to the expenses page and settle up.
                      {hasPendingSettlements && " Note: Only confirmed settlements count toward your balance."}
                    </p>
                  </div>

                  {/* Trips List - Using similar pattern to expenses page */}
                  <div className="space-y-3">
                    {tripsWithBalances.map((trip) => (
                      <Card
                        key={trip.tripId}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => navigate(`/trips/${trip.tripId}/expenses`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarFallback className="bg-gray-200 text-gray-700">
                                {trip.tripName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 mb-1 truncate">
                                {trip.tripName}
                              </h3>
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
                            </div>
                            <ExternalLink className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      onClick={handleCheckAgain}
                      disabled={isChecking}
                      variant="outline"
                      className="w-full"
                    >
                      {isChecking ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                          Checking...
                        </>
                      ) : (
                        "Check Again"
                      )}
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

