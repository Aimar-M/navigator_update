import { useState } from "react";
import { useLocation } from "wouter";
import { MoreVertical, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeaveTripDialog } from "@/components/leave-trip-dialog";

interface TripSettingsMenuProps {
  tripId: number;
  isOrganizer: boolean;
  className?: string;
}

export default function TripSettingsMenu({ 
  tripId, 
  isOrganizer,
  className = "" 
}: TripSettingsMenuProps) {
  const [isLeaveTripDialogOpen, setIsLeaveTripDialogOpen] = useState(false);
  const [, navigate] = useLocation();

  const handleLeaveSuccess = () => {
    // Navigate to homepage after leaving
    navigate("/");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={className}
            aria-label="Trip settings"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Only show Leave Trip option if not the organizer */}
          {!isOrganizer && (
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-600 cursor-pointer"
              onClick={() => setIsLeaveTripDialogOpen(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Leave Trip</span>
            </DropdownMenuItem>
          )}
          
          {isOrganizer && (
            <DropdownMenuItem disabled className="text-gray-400">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Leave Trip (Organizers cannot leave)</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <LeaveTripDialog
        tripId={tripId}
        isOpen={isLeaveTripDialogOpen}
        onClose={() => setIsLeaveTripDialogOpen(false)}
        onSuccess={handleLeaveSuccess}
      />
    </>
  );
}

