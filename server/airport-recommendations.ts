console.log('✈️ Airport Recommendations module loaded successfully');

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
  distance: number; // in kilometers
  score: number; // 0-100 recommendation score
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

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Find airports near a location using Google Places API
export async function findNearbyAirports(location: UserLocation, radius: number = 200): Promise<Airport[]> {
  try {
    console.log('🔍 [AIRPORT-RECOMMENDATIONS] Finding airports near:', location);
    
    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured');
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.append('location', `${location.latitude},${location.longitude}`);
    url.searchParams.append('radius', (radius * 1000).toString()); // Convert km to meters
    url.searchParams.append('type', 'airport');
    url.searchParams.append('key', GOOGLE_PLACES_API_KEY);
    url.searchParams.append('language', 'en');

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Places API error:', response.status, errorText);
      throw new Error(`Places API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('❌ Places API status error:', data.status, data.error_message);
      throw new Error(`Places API error: ${data.status} - ${data.error_message}`);
    }

    const airports = data.results?.map((result: any) => ({
      place_id: result.place_id,
      name: result.name,
      formatted_address: result.vicinity,
      geometry: {
        location: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        }
      },
      rating: result.rating,
      types: result.types || []
    })) || [];

    console.log(`✅ [AIRPORT-RECOMMENDATIONS] Found ${airports.length} airports`);
    return airports;
  } catch (error: any) {
    console.error('❌ [AIRPORT-RECOMMENDATIONS] Error finding airports:', error.message);
    throw error;
  }
}

// Get detailed airport information
export async function getAirportDetails(placeId: string): Promise<Airport | null> {
  try {
    console.log('📍 [AIRPORT-RECOMMENDATIONS] Getting airport details for:', placeId);
    
    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured');
    }
    
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('key', GOOGLE_PLACES_API_KEY);
    url.searchParams.append('language', 'en');
    url.searchParams.append('fields', 'place_id,name,formatted_address,geometry,rating,types,website,international_phone_number');
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Places Details API error:', response.status, errorText);
      throw new Error(`Places Details API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error('❌ Places Details API status error:', data.status, data.error_message);
      throw new Error(`Places Details API error: ${data.status} - ${data.error_message}`);
    }

    const result = data.result;
    return {
      place_id: result.place_id,
      name: result.name,
      formatted_address: result.formatted_address,
      geometry: {
        location: {
          lat: result.geometry?.location?.lat,
          lng: result.geometry?.location?.lng
        }
      },
      rating: result.rating,
      types: result.types || []
    };
  } catch (error: any) {
    console.error('❌ [AIRPORT-RECOMMENDATIONS] Airport details error:', error.message);
    throw error;
  }
}

// Calculate recommendation score for an airport - prioritize distance from user
function calculateAirportScore(
  airport: Airport, 
  userLocation: UserLocation, 
  destination: Destination
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Distance from user (closer is better, max 80 points) - PRIMARY FACTOR
  const distanceFromUser = calculateDistance(
    userLocation.latitude, 
    userLocation.longitude,
    airport.geometry.location.lat,
    airport.geometry.location.lng
  );
  
  if (distanceFromUser <= 25) {
    score += 80;
    reasons.push('Very close to your location');
  } else if (distanceFromUser <= 50) {
    score += 70;
    reasons.push('Close to your location');
  } else if (distanceFromUser <= 100) {
    score += 60;
    reasons.push('Reasonable distance from your location');
  } else if (distanceFromUser <= 200) {
    score += 50;
    reasons.push('Moderate distance from your location');
  } else {
    score += 30;
    reasons.push('Further from your location');
  }

  // Airport rating (max 20 points) - SECONDARY FACTOR
  if (airport.rating && airport.rating >= 4.5) {
    score += 20;
    reasons.push('Highly rated airport');
  } else if (airport.rating && airport.rating >= 4.0) {
    score += 15;
    reasons.push('Well-rated airport');
  } else if (airport.rating && airport.rating >= 3.5) {
    score += 10;
    reasons.push('Decent airport rating');
  }

  return { score, reasons };
}

// Get airport recommendations based on user location and destination
export async function getAirportRecommendations(
  userLocation: UserLocation,
  destination: Destination,
  maxResults: number = 5
): Promise<AirportRecommendation[]> {
  try {
    console.log('🎯 [AIRPORT-RECOMMENDATIONS] Getting recommendations for:', { userLocation, destination });
    
    // Find nearby airports - use larger radius to get more options for comparison
    const airports = await findNearbyAirports(userLocation, 500); // 500km radius
    
    if (airports.length === 0) {
      console.log('⚠️ [AIRPORT-RECOMMENDATIONS] No airports found nearby');
      return [];
    }

    // Calculate scores and create recommendations
    const recommendations: AirportRecommendation[] = airports.map(airport => {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        airport.geometry.location.lat,
        airport.geometry.location.lng
      );
      
      const { score, reasons } = calculateAirportScore(airport, userLocation, destination);
      
      console.log(`🏢 [AIRPORT-RECOMMENDATIONS] ${airport.name}: ${distance.toFixed(1)}km away, score: ${score}`);
      
      return {
        airport,
        distance,
        score,
        reasons
      };
    });

    // Sort by score (highest first) and return top results
    const sortedRecommendations = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    if (sortedRecommendations.length > 0) {
      console.log(`✅ [AIRPORT-RECOMMENDATIONS] Selected closest airport: ${sortedRecommendations[0].airport.name} (${sortedRecommendations[0].distance.toFixed(1)}km away, score: ${sortedRecommendations[0].score})`);
    }
    
    console.log(`✅ [AIRPORT-RECOMMENDATIONS] Generated ${sortedRecommendations.length} recommendations`);
    return sortedRecommendations;
  } catch (error: any) {
    console.error('❌ [AIRPORT-RECOMMENDATIONS] Error getting recommendations:', error.message);
    throw error;
  }
}

// Health check function
export function getAirportRecommendationsStatus() {
  const hasApiKey = !!process.env.GOOGLE_PLACES_API_KEY;
  
  return {
    status: hasApiKey ? 'ready' : 'missing_api_key',
    hasApiKey,
    message: hasApiKey 
      ? 'Airport recommendations service is ready' 
      : 'Google Places API key is required for airport recommendations'
  };
}
