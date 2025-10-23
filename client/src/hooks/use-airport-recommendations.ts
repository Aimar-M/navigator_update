import { useState, useCallback } from 'react';

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

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface Destination {
  latitude: number;
  longitude: number;
  name: string;
}

interface UseAirportRecommendationsReturn {
  recommendations: AirportRecommendation[];
  loading: boolean;
  error: string | null;
  getRecommendations: (userLocation: UserLocation, destination: Destination, maxResults?: number) => Promise<void>;
  clearRecommendations: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useAirportRecommendations(): UseAirportRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<AirportRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRecommendations = useCallback(async (
    userLocation: UserLocation,
    destination: Destination,
    maxResults: number = 5
  ) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/api/airport-recommendations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userLocation,
          destination,
          maxResults
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get airport recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error: any) {
      console.error('Error getting airport recommendations:', error);
      setError(error.message || 'Failed to get airport recommendations');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearRecommendations = useCallback(() => {
    setRecommendations([]);
    setError(null);
  }, []);

  return {
    recommendations,
    loading,
    error,
    getRecommendations,
    clearRecommendations
  };
}
