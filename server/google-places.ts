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

// Google Places API configuration
const places = google.places({ version: 'v1', auth: authClient });

// Place Autocomplete function
export async function getPlaceAutocomplete(input: string, sessionToken?: string) {
  try {
    console.log('🔍 [PLACES-API] Getting place autocomplete for:', input);
    
    const response = await places.autocomplete({
      input: input,
      sessionToken: sessionToken,
      language: 'en',
      region: 'us', // You can make this configurable
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ [PLACES-API] Autocomplete error:', error.message);
    throw error;
  }
}

// Place Details function
export async function getPlaceDetails(placeId: string, sessionToken?: string) {
  try {
    console.log('📍 [PLACES-API] Getting place details for:', placeId);
    
    const response = await places.details({
      placeId: placeId,
      sessionToken: sessionToken,
      language: 'en',
      fields: [
        'place_id',
        'name',
        'formatted_address',
        'geometry',
        'rating',
        'types'
      ].join(','),
    });

    return response.data;
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
