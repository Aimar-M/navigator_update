import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GooglePlacesAutocomplete from "@/components/google-places-autocomplete";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export type ActivityFormData = {
  name: string;
  description: string;
  date: string;
  startTime: string;
  activityType: string;
  activityLink: string;
  location: string;
  duration: string;
  cost: string;
  paymentType: string;
  maxParticipants: string;
  checkInDate: string;
  checkOutDate: string;
};

type TripDay = {
  value: string;
  label: string;
  dayNumber: number;
  date: Date;
};

type ParticipantOption = { value: string; label: string };

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  submitLabel: string;
  isSubmitting: boolean;
  formData: ActivityFormData;
  setFormData: (updater: (prev: ActivityFormData) => ActivityFormData) => void;
  onSubmit: () => void;
  tripDays: TripDay[];
  participantOptions: ParticipantOption[];
}

export default function ActivityFormDialog(props: ActivityFormDialogProps) {
  const { open, onOpenChange, title = "Itinerary Item", submitLabel, isSubmitting, formData, setFormData, onSubmit, tripDays, participantOptions } = props;
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="activity-name">Title *</Label>
            <Input
              id="activity-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Visit Museum, Beach Day, etc."
            />
          </div>

          <div>
            <Label htmlFor="activity-description">Description</Label>
            <Textarea
              id="activity-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what you'll be doing..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="activity-type">Category</Label>
            <Select
              value={formData.activityType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, activityType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Food & Drink">Food & Drink</SelectItem>
                <SelectItem value="Transportation">Transportation</SelectItem>
                <SelectItem value="Attraction">Attraction</SelectItem>
                <SelectItem value="Event">Event</SelectItem>
                <SelectItem value="Activity">Activity</SelectItem>
                <SelectItem value="Accommodation">Accommodation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.activityType === "Accommodation" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="activity-checkin">Check In *</Label>
                <Select
                  value={formData.checkInDate}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, checkInDate: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select check-in day..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tripDays.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="activity-checkout">Check Out *</Label>
                <Select
                  value={formData.checkOutDate}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, checkOutDate: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select check-out day..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tripDays.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="activity-date">Trip Day *</Label>
                <Select
                  value={formData.date}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, date: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a day..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tripDays.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="activity-start-time">Start Time</Label>
                <Input
                  id="activity-start-time"
                  type="time"
                  step="300"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  placeholder="HH:MM"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="activity-payment-type">Payment Type</Label>
              <Select 
                value={formData.paymentType} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, paymentType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="included">Included in Trip Deposit</SelectItem>
                  <SelectItem value="payment_onsite">Payment Onsite</SelectItem>
                  <SelectItem value="pay_in_advance">Pay via link</SelectItem>
                  <SelectItem value="prepaid">Split Payment (group cost)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="activity-cost">
                Cost {formData.paymentType === "prepaid" ? "*" : "(optional)"}
              </Label>
              <Input
                id="activity-cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                placeholder={formData.paymentType === "prepaid" ? "Enter cost amount" : "0.00"}
                required={formData.paymentType === "prepaid"}
                className={formData.paymentType === "prepaid" && !formData.cost ? "border-red-300" : ""}
              />
              {formData.paymentType === "prepaid" && !formData.cost && (
                <p className="text-sm text-red-600 mt-1">Cost is required for split payment activities</p>
              )}
            </div>
          </div>

          <div className="md:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="w-full flex items-center justify-center gap-2"
            >
              {showMoreDetails ? "Hide Details" : "Add More Details"}
              {showMoreDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          <div className={`space-y-4 ${showMoreDetails ? 'block' : 'hidden md:block'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="activity-duration">Duration</Label>
                <Input
                  id="activity-duration"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 2 hours, Half day"
                />
              </div>

              <div>
                <Label htmlFor="activity-location">Location</Label>
                <GooglePlacesAutocomplete
                  id="activity-location"
                  value={formData.location}
                  onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                  onPlaceSelect={(place) => {
                    if (place.geometry?.location) {
                      // placeholder for coordinates use in the future
                    }
                  }}
                  placeholder="Where is this activity?"
                  types="establishment"
                  dropdownDirection="up"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="activity-link">
                  Website {formData.paymentType === "pay_in_advance" ? "*" : ""}
                </Label>
                <Input
                  id="activity-link"
                  type="url"
                  value={formData.activityLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, activityLink: e.target.value }))}
                  placeholder="https://example.com/activity-booking"
                  required={formData.paymentType === "pay_in_advance"}
                  className={formData.paymentType === "pay_in_advance" && !formData.activityLink ? "border-red-300" : ""}
                />
                {formData.paymentType === "pay_in_advance" && !formData.activityLink && (
                  <p className="text-sm text-red-600 mt-1">Website link is required for advance payment activities</p>
                )}
              </div>

              <div>
                <Label htmlFor="activity-max-participants">
                  Registration cap (optional)
                </Label>
                <Select
                  value={formData.maxParticipants}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, maxParticipants: value }))}
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
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={onSubmit}
              disabled={isSubmitting}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


