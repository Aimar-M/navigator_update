import React, { useState, useEffect } from 'react';
import { MapPin, Plane, Navigation, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useAirportRecommendations } from '@/hooks/use-airport-recommendations';
import GooglePlacesAutocomplete from './google-places-autocomplete';

interface Airport {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  types: string[];
}

interface TripAirportSelectorProps {
  onAirportSelect: (airport: Airport) => void;
  selectedAirport?: Airport | null;
  className?: string;
}

export default function TripAirportSelector({ 
  onAirportSelect, 
  selectedAirport,
  className = "" 
}: TripAirportSelectorProps) {
  const { position, error, isLoading, requestLocation } = useGeolocation();
  const { recommendations, loading, error: recommendationsError, getRecommendations } = useAirportRecommendations();
  const [destination, setDestination] = useState<{latitude: number, longitude: number, name: string} | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Get recommendations when we have both user location and destination
  useEffect(() => {
    if (position && destination && !showRecommendations) {
      setShowRecommendations(true);
      getRecommendations(
        { latitude: position.latitude, longitude: position.longitude },
        destination
      );
    }
  }, [position, destination, getRecommendations, showRecommendations]);

  const handleDestinationSelect = (place: any) => {
    if (place.geometry?.location) {
      setDestination({
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        name: place.name || place.formatted_address
      });
    }
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${Math.round(distance)}km`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plane className="h-5 w-5" />
            <span>Select Departure Airport</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Destination Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trip Destination
            </label>
            <GooglePlacesAutocomplete
              value={destination?.name || ''}
              onChange={(value) => {
                if (!value) setDestination(null);
              }}
              onPlaceSelect={handleDestinationSelect}
              placeholder="Where are you going?"
              types="(cities)"
            />
          </div>

          {/* Location Access */}
          {!position && !error && (
            <div className="text-center py-4">
              <Navigation className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">
                We need your location to recommend the best airports
              </p>
              <Button onClick={requestLocation} disabled={isLoading} size="sm">
                {isLoading ? 'Getting Location...' : 'Allow Location Access'}
              </Button>
            </div>
          )}

          {/* Location Error */}
          {error && (
            <div className="text-center py-4">
              <Navigation className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600 mb-3">{error.message}</p>
              <Button onClick={requestLocation} size="sm" variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {/* Recommendations Loading */}
          {position && destination && loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Finding the best airports...</p>
            </div>
          )}

          {/* Recommendations Error */}
          {recommendationsError && (
            <div className="text-center py-4">
              <Plane className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600 mb-3">{recommendationsError}</p>
              <Button 
                onClick={() => getRecommendations(
                  { latitude: position!.latitude, longitude: position!.longitude },
                  destination!
                )} 
                size="sm" 
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Airport Recommendations */}
          {position && destination && recommendations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">
                  Recommended Airports
                </h4>
                <Badge variant="outline" className="text-xs">
                  {recommendations.length} found
                </Badge>
              </div>

              <div className="space-y-2">
                {recommendations.map((rec, index) => (
                  <Card 
                    key={rec.airport.place_id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedAirport?.place_id === rec.airport.place_id 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onAirportSelect(rec.airport)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {selectedAirport?.place_id === rec.airport.place_id ? (
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Plane className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-medium text-gray-900 truncate">
                              {rec.airport.name}
                            </h5>
                            <p className="text-xs text-gray-500 truncate">
                              {rec.airport.formatted_address}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-3">
                          <div className="text-right">
                            <div className="text-xs text-gray-600">
                              {formatDistance(rec.distance)} away
                            </div>
                            {rec.airport.rating && (
                              <div className="text-xs text-gray-500">
                                ⭐ {rec.airport.rating.toFixed(1)}
                              </div>
                            )}
                          </div>
                          <Badge 
                            className={`${getScoreColor(rec.score)} text-white text-xs`}
                          >
                            {getScoreLabel(rec.score)}
                          </Badge>
                        </div>
                      </div>

                      {rec.reasons.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600">
                            {rec.reasons.slice(0, 2).join(' • ')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Recommendations */}
          {position && destination && recommendations.length === 0 && !loading && (
            <div className="text-center py-4">
              <Plane className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                No airports found near your location. Try a different destination.
              </p>
            </div>
          )}

          {/* Selected Airport Summary */}
          {selectedAirport && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Selected: {selectedAirport.name}
                  </p>
                  <p className="text-xs text-green-600">
                    {selectedAirport.formatted_address}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
