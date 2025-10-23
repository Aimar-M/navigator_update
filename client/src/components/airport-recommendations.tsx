import React, { useState, useEffect } from 'react';
import { MapPin, Plane, Star, Clock, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useAirportRecommendations } from '@/hooks/use-airport-recommendations';

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

interface AirportRecommendation {
  airport: Airport;
  distance: number;
  score: number;
  reasons: string[];
}

interface AirportRecommendationsProps {
  destination: {
    latitude: number;
    longitude: number;
    name: string;
  };
  onAirportSelect?: (airport: Airport) => void;
  className?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AirportRecommendations({ 
  destination, 
  onAirportSelect,
  className = "" 
}: AirportRecommendationsProps) {
  const { position, error, isLoading, requestLocation } = useGeolocation();
  const { recommendations, loading: loadingRecommendations, error: recommendationsError, getRecommendations } = useAirportRecommendations();
  const [destinationCoords, setDestinationCoords] = useState<{latitude: number, longitude: number, name: string} | null>(null);
  const [loadingDestination, setLoadingDestination] = useState(false);

  // Get destination coordinates if not provided
  useEffect(() => {
    if (destination && (destination.latitude === 0 || destination.longitude === 0)) {
      getDestinationCoordinates();
    } else if (destination) {
      setDestinationCoords(destination);
    }
  }, [destination]);

  // Get recommendations when we have both user location and destination coordinates
  useEffect(() => {
    if (position && destinationCoords) {
      getRecommendations(
        { latitude: position.latitude, longitude: position.longitude },
        destinationCoords
      );
    }
  }, [position, destinationCoords, getRecommendations]);

  const getDestinationCoordinates = async () => {
    if (!destination?.name) return;

    setLoadingDestination(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Use Google Places API to get coordinates for the destination
      const response = await fetch(`${API_BASE}/api/places/autocomplete?input=${encodeURIComponent(destination.name)}`, {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to get destination coordinates');
      }

      const data = await response.json();
      if (data.predictions && data.predictions.length > 0) {
        // Get details for the first prediction
        const placeId = data.predictions[0].place_id;
        const detailsResponse = await fetch(`${API_BASE}/api/places/details?placeId=${placeId}`, {
          headers
        });

        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          if (detailsData.result?.geometry?.location) {
            setDestinationCoords({
              latitude: detailsData.result.geometry.location.lat,
              longitude: detailsData.result.geometry.location.lng,
              name: destination.name
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Error getting destination coordinates:', error);
    } finally {
      setLoadingDestination(false);
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

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Location Access Required
            </h3>
            <p className="text-gray-600 mb-4">
              {error.message}
            </p>
            <Button onClick={requestLocation} disabled={isLoading}>
              {isLoading ? 'Requesting...' : 'Allow Location Access'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!position) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Get Airport Recommendations
            </h3>
            <p className="text-gray-600 mb-4">
              We'll find the best airports near you for your trip to {destination.name}.
            </p>
            <Button onClick={requestLocation} disabled={isLoading}>
              {isLoading ? 'Getting Location...' : 'Find My Location'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loadingDestination) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Getting destination coordinates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loadingRecommendations) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Finding the best airports for you...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendationsError) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <Plane className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Unable to Find Airports
            </h3>
            <p className="text-gray-600 mb-4">{recommendationsError}</p>
            <Button onClick={() => {
              if (position && destinationCoords) {
                getRecommendations(
                  { latitude: position.latitude, longitude: position.longitude },
                  destinationCoords
                );
              }
            }}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Airports Found
            </h3>
            <p className="text-gray-600 mb-4">
              We couldn't find any airports near your location. Try expanding your search area.
            </p>
            <Button onClick={() => {
              if (position && destinationCoords) {
                getRecommendations(
                  { latitude: position.latitude, longitude: position.longitude },
                  destinationCoords
                );
              }
            }}>
              Search Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Recommended Airports
          </h3>
          <p className="text-sm text-gray-600">
            Based on your location and trip to {destinationCoords?.name || destination.name}
          </p>
        </div>

      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <Card key={rec.airport.place_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Plane className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {rec.airport.name}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {rec.airport.formatted_address}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge 
                    className={`${getScoreColor(rec.score)} text-white text-xs`}
                  >
                    {getScoreLabel(rec.score)}
                  </Badge>
                  {onAirportSelect && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAirportSelect(rec.airport)}
                    >
                      Select
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="flex items-center text-xs text-gray-600">
                  <MapPin className="h-3 w-3 mr-1" />
                  {formatDistance(rec.distance)} away
                </div>
                {rec.airport.rating && (
                  <div className="flex items-center text-xs text-gray-600">
                    <Star className="h-3 w-3 mr-1" />
                    {rec.airport.rating.toFixed(1)} rating
                  </div>
                )}
              </div>

              {rec.reasons.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-700">Why we recommend this:</p>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    {rec.reasons.slice(0, 3).map((reason, reasonIndex) => (
                      <li key={reasonIndex} className="flex items-start">
                        <span className="text-green-500 mr-1">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 text-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            if (position && destinationCoords) {
              getRecommendations(
                { latitude: position.latitude, longitude: position.longitude },
                destinationCoords
              );
            }
          }}
        >
          Refresh Recommendations
        </Button>
      </div>
    </div>
  );
}
