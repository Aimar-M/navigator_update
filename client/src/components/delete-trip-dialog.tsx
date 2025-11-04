import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const API_BASE = import.meta.env.VITE_API_URL || '';

interface DeleteTripDialogProps {
  tripId: number;
  tripName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteTripDialog({
  tripId,
  tripName,
  isOpen,
  onClose,
}: DeleteTripDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [confirmDelete, setConfirmDelete] = useState("");

  // Delete trip mutation
  const deleteTripMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `${API_BASE}/api/trips/${tripId}`);
    },
    onSuccess: () => {
      // Invalidate all trip-related queries
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/api/trips`] });
      
      toast({
        title: "Trip deleted successfully",
        description: "The trip has been permanently deleted.",
      });
      
      // Navigate to homepage after deletion
      navigate("/");
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete trip",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    }
  });

  const handleDelete = () => {
    if (confirmDelete !== "DELETE") return;
    deleteTripMutation.mutate();
  };

  const handleClose = () => {
    setConfirmDelete("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Trip
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the trip and all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Deleting this trip will permanently remove:
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm bg-red-50 border border-red-200 rounded-lg p-4">
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
              <li>All trip members and their memberships</li>
              <li>All activities and RSVPs</li>
              <li>All expenses and financial records</li>
              <li>All messages and chat history</li>
              <li>All polls and survey responses</li>
              <li>All flight information</li>
              <li>All trip settings and configurations</li>
            </ul>
          </div>

          {tripName && (
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Trip to delete:</p>
              <p className="bg-gray-100 p-2 rounded border">{tripName}</p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="confirmDelete" className="text-sm font-medium text-gray-700">
              Type <strong className="text-red-600">DELETE</strong> to confirm:
            </label>
            <Input
              id="confirmDelete"
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="border-red-300 focus:border-red-500 focus:ring-red-500"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={deleteTripMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmDelete !== "DELETE" || deleteTripMutation.isPending}
          >
            {deleteTripMutation.isPending ? "Deleting..." : "Delete Trip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

