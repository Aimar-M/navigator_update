import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AirportRecommendations from '@/components/airport-recommendations';
import TripAirportSelector from '@/components/trip-airport-selector';
import GooglePlacesAutocomplete from '@/components/google-places-autocomplete';

export default function AirportTest() {
  const [destination, setDestination] = useState<{latitude: number, longitude: number, name: string} | null>(null);
  const [selectedAirport, setSelectedAirport] = useState<any>(null);

  const handleDestinationSelect = (place: any) => {
    if (place.geometry?.location) {
      setDestination({
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        name: place.name || place.formatted_address
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Airport Recommendations Test
          </h1>
          <p className="text-gray-600">
            Test the location-based airport recommendation feature
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Destination Selection */}
          <Card>
            <CardHeader>
              <CardTitle>1. Select Destination</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Where are you going?
                  </label>
                  <GooglePlacesAutocomplete
                    value={destination?.name || ''}
                    onChange={(value) => {
                      if (!value) setDestination(null);
                    }}
                    onPlaceSelect={handleDestinationSelect}
                    placeholder="Search for a destination..."
                    types="(cities)"
                  />
                </div>
                
                {destination && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800">
                      Selected: {destination.name}
                    </p>
                    <p className="text-xs text-green-600">
                      Lat: {destination.latitude.toFixed(4)}, Lng: {destination.longitude.toFixed(4)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Airport Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>2. Airport Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {destination ? (
                <AirportRecommendations
                  destination={destination}
                  onAirportSelect={setSelectedAirport}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    Please select a destination to see airport recommendations
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trip Airport Selector */}
        {destination && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>3. Trip Airport Selector</CardTitle>
              </CardHeader>
              <CardContent>
                <TripAirportSelector
                  destination={destination}
                  onAirportSelect={setSelectedAirport}
                  selectedAirport={selectedAirport}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Selected Airport Summary */}
        {selectedAirport && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Selected Airport</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">
                    {selectedAirport.name}
                  </h3>
                  <p className="text-sm text-blue-700 mb-2">
                    {selectedAirport.formatted_address}
                  </p>
                  {selectedAirport.rating && (
                    <p className="text-sm text-blue-600">
                      ⭐ Rating: {selectedAirport.rating.toFixed(1)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* API Status Check */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>API Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={async () => {
                  try {
                    const response = await fetch('/api/airport-recommendations/status');
                    const data = await response.json();
                    alert(`API Status: ${data.status}\nMessage: ${data.message}`);
                  } catch (error) {
                    alert(`Error: ${error}`);
                  }
                }}
                variant="outline"
              >
                Check Airport Recommendations API Status
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
