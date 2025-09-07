console.log('🗺️ Google Places API module loaded successfully');

// Check if we have the required API key
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
  console.error('❌ GOOGLE_PLACES_API_KEY environment variable is not set');
}

// Place Autocomplete function
export async function getPlaceAutocomplete(input: string, sessionToken?: string) {
  try {
    console.log('🔍 [PLACES-API] Getting place autocomplete for:', input);
    
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured');
    }
    
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.append('input', input);
    url.searchParams.append('key', GOOGLE_PLACES_API_KEY);
    url.searchParams.append('language', 'en');
    url.searchParams.append('region', 'us');
    
    if (sessionToken) {
      url.searchParams.append('sessiontoken', sessionToken);
    }

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

    // Transform the response to match expected format
    const predictions = data.predictions?.map((prediction: any) => ({
      place_id: prediction.place_id,
      description: prediction.description,
      structured_formatting: {
        main_text: prediction.structured_formatting?.main_text,
        secondary_text: prediction.structured_formatting?.secondary_text
      },
      types: prediction.types || []
    })) || [];

    return { predictions };
  } catch (error: any) {
    console.error('❌ [PLACES-API] Autocomplete error:', error.message);
    throw error;
  }
}

// Place Details function
export async function getPlaceDetails(placeId: string, sessionToken?: string) {
  try {
    console.log('📍 [PLACES-API] Getting place details for:', placeId);
    
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured');
    }
    
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('key', GOOGLE_PLACES_API_KEY);
    url.searchParams.append('language', 'en');
    url.searchParams.append('fields', 'place_id,name,formatted_address,geometry,rating,types');
    
    if (sessionToken) {
      url.searchParams.append('sessiontoken', sessionToken);
    }

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

    // Transform the response to match expected format
    const result = {
      place_id: data.result.place_id,
      name: data.result.name,
      formatted_address: data.result.formatted_address,
      geometry: {
        location: {
          lat: data.result.geometry?.location?.lat,
          lng: data.result.geometry?.location?.lng
        }
      },
      rating: data.result.rating,
      types: data.result.types || []
    };

    return { result };
  } catch (error: any) {
    console.error('❌ [PLACES-API] Place details error:', error.message);
    throw error;
  }
}


// Health check function
export function getGooglePlacesStatus() {
  const hasApiKey = !!GOOGLE_PLACES_API_KEY;
  const configured = hasApiKey;
  
  console.log('🔍 [PLACES-API] Status check:', {
    configured,
    hasApiKey,
    timestamp: new Date().toISOString()
  });
  
  return {
    configured,
    ready: configured,
    hasApiKey,
    timestamp: new Date().toISOString()
  };
}
