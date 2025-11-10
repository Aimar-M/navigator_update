import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, DollarSign, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
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
  message: string;
}

export default function OutstandingBalancesPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Fetch trips with unsettled balances
  const { data: tripsWithBalances = [], isLoading } = useQuery<TripWithBalance[]>({
    queryKey: [`${API_BASE}/api/user/unsettled-balances`],
    queryFn: async () => {
      return await apiRequest<TripWithBalance[]>('GET', `${API_BASE}/api/user/unsettled-balances`);
    },
    enabled: !!user,
    retry: false,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${absAmount.toFixed(2)}`;
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  const allSettled = !isLoading && tripsWithBalances.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 p-4 pb-20 md:pb-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-6 w-6 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">Outstanding Balances</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </div>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {allSettled ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>All Settled</span>
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
                      All your trip expenses have been settled.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-medium mb-2">
                      You have outstanding balances in {tripsWithBalances.length} trip{tripsWithBalances.length > 1 ? 's' : ''}.
                    </p>
                    <p className="text-yellow-700 text-sm">
                      Review your balances below and settle up with your travel companions.
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
                                  {trip.message.replace(/ You must settle this before deleting your account\.?/g, '')}
                                </p>
                                <Button
                                  onClick={() => navigate(`/trips/${trip.tripId}/expenses`)}
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

