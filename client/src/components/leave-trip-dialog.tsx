import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

const API_BASE = import.meta.env.VITE_API_URL || '';

interface LeaveTripDialogProps {
  tripId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface RemovalEligibility {
  canRemove: boolean;
  reason?: string;
  balance: number;
  manualExpenseBalance: number;
  prepaidActivityBalance: number;
  prepaidActivitiesOwed: any[];
  suggestions?: string[];
}

export function LeaveTripDialog({
  tripId,
  isOpen,
  onClose,
  onSuccess
}: LeaveTripDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Check if user can leave (balance check)
  const { data: eligibility, isLoading: isCheckingEligibility } = useQuery<RemovalEligibility>({
    queryKey: [`${API_BASE}/api/trips/${tripId}/members/${user?.id}/removal-eligibility`],
    enabled: isOpen && !!user,
    retry: false,
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const response = await fetch(
        `${API_BASE}/api/trips/${tripId}/members/${user.id}/removal-eligibility`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to check eligibility');
      return response.json();
    }
  });

  // Leave trip mutation
  const leaveTripMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `${API_BASE}/api/trips/${tripId}/leave`, {});
    },
    onSuccess: () => {
      // Invalidate all trip-related queries
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips`] });
      
      toast({
        title: "Left trip successfully",
        description: "You have been removed from the trip.",
      });
      
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to leave trip",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleLeave = () => {
    if (!eligibility?.canRemove) return;
    leaveTripMutation.mutate();
  };

  const handleClose = () => {
    setConfirmLeave(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Leave Trip
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to leave this trip? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isCheckingEligibility ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : eligibility ? (
            <>
              {eligibility.canRemove ? (
                <>
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      You can safely leave this trip. All balances are settled.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2 text-sm">
                    <p className="font-medium">What will happen when you leave:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                      <li>You will be removed from the member list</li>
                      <li>Your RSVPs will be declined for all activities</li>
                      <li>Activities you created will be reassigned to the organizer</li>
                      <li>Expenses you submitted will be marked accordingly</li>
                      <li>Your financial history will be preserved</li>
                    </ul>
                  </div>

                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Warning:</strong> This action is permanent. You will need to be re-invited to rejoin.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="confirmLeave"
                      checked={confirmLeave}
                      onChange={(e) => setConfirmLeave(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="confirmLeave" className="text-sm">
                      I understand that this action cannot be undone
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Cannot leave trip:</strong> {eligibility.reason}
                    </AlertDescription>
                  </Alert>

                  {eligibility.balance !== 0 && (
                    <div className="space-y-3 bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-medium text-red-900">Outstanding Balance</p>
                          <div className="space-y-1 text-sm text-red-800">
                            <p>
                              Total Balance: <strong>{formatCurrency(Math.abs(eligibility.balance))}</strong>
                              {eligibility.balance > 0 ? " owed to you" : " you owe"}
                            </p>
                            
                            {eligibility.manualExpenseBalance !== 0 && (
                              <p>
                                From manual expenses: <strong>{formatCurrency(Math.abs(eligibility.manualExpenseBalance))}</strong>
                              </p>
                            )}
                            
                            {eligibility.prepaidActivityBalance !== 0 && (
                              <p>
                                From prepaid activities: <strong>{formatCurrency(Math.abs(eligibility.prepaidActivityBalance))}</strong>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {eligibility.prepaidActivitiesOwed && eligibility.prepaidActivitiesOwed.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-red-300">
                          <p className="text-sm font-medium text-red-900 mb-2">Prepaid Activities:</p>
                          <ul className="space-y-1 text-sm text-red-800">
                            {eligibility.prepaidActivitiesOwed.map((activity: any, index: number) => (
                              <li key={index}>
                                • {activity.name}: {formatCurrency(activity.amountOwed)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {eligibility.suggestions && eligibility.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">To leave this trip:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                        {eligibility.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to check eligibility. Please try again.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={leaveTripMutation.isPending}
          >
            Cancel
          </Button>
          {eligibility?.canRemove && (
            <Button
              variant="destructive"
              onClick={handleLeave}
              disabled={!confirmLeave || leaveTripMutation.isPending}
            >
              {leaveTripMutation.isPending ? "Leaving..." : "Leave Trip"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

