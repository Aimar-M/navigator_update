import { google } from 'googleapis';

console.log('🗺️ Google Places API module loaded successfully');

// Create auth client using existing Google credentials
const authClient = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/maps.places',
    'https://www.googleapis.com/auth/maps.places.autocomplete',
    'https://www.googleapis.com/auth/maps.places.details',
  ],
});

// Get access token for API requests
async function getAccessToken() {
  try {
    const auth = await authClient.getAccessToken();
    return auth.token;
  } catch (error) {
    console.error('❌ Error getting access token:', error);
    throw error;
  }
}

// Place Autocomplete function
export async function getPlaceAutocomplete(input: string, sessionToken?: string) {
  try {
    console.log('🔍 [PLACES-API] Getting place autocomplete for:', input);
    
    const accessToken = await getAccessToken();
    
    const url = new URL('https://places.googleapis.com/v1/places:autocomplete');
    url.searchParams.append('input', input);
    url.searchParams.append('languageCode', 'en');
    url.searchParams.append('regionCode', 'us');
    
    if (sessionToken) {
      url.searchParams.append('sessionToken', sessionToken);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat'
      },
      body: JSON.stringify({
        input: input,
        languageCode: 'en',
        regionCode: 'us',
        sessionToken: sessionToken
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Places API error:', response.status, errorText);
      throw new Error(`Places API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Transform the response to match expected format
    const predictions = data.suggestions?.map((suggestion: any) => ({
      place_id: suggestion.placePrediction?.placeId,
      description: suggestion.placePrediction?.text?.text,
      structured_formatting: {
        main_text: suggestion.placePrediction?.structuredFormat?.mainText?.text,
        secondary_text: suggestion.placePrediction?.structuredFormat?.secondaryText?.text
      },
      types: suggestion.placePrediction?.types || []
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
    
    const accessToken = await getAccessToken();
    
    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,types'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Places Details API error:', response.status, errorText);
      throw new Error(`Places Details API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Transform the response to match expected format
    const result = {
      place_id: data.id,
      name: data.displayName?.text,
      formatted_address: data.formattedAddress,
      geometry: {
        location: {
          lat: data.location?.latitude,
          lng: data.location?.longitude
        }
      },
      rating: data.rating,
      types: data.types || []
    };

    return { result };
  } catch (error: any) {
    console.error('❌ [PLACES-API] Place details error:', error.message);
    throw error;
  }
}


// Health check function
export function getGooglePlacesStatus() {
  const hasServiceAccountEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const hasServiceAccountKey = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const configured = hasServiceAccountEmail && hasServiceAccountKey;
  
  console.log('🔍 [PLACES-API] Status check:', {
    configured,
    hasServiceAccountEmail,
    hasServiceAccountKey,
    timestamp: new Date().toISOString()
  });
  
  return {
    configured,
    ready: configured,
    hasServiceAccountEmail,
    hasServiceAccountKey,
    timestamp: new Date().toISOString()
  };
}
