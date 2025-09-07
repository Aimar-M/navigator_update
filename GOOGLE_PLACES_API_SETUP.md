# Google Places API Setup Guide

This guide will help you set up Google Places API for enhanced location features in your Navigator app.

## ✅ What's Already Set Up

You already have:
- ✅ Google Cloud Project (`navigatorv2`)
- ✅ Service Account credentials
- ✅ Gmail API integration
- ✅ `googleapis` package installed

## Step 1: Enable Places API

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project: `navigatorv2`

2. **Enable Places API (New)**
   - Go to **APIs & Services** → **Library**
   - Search for "Places API (New)"
   - Click **Enable**

## Step 2: Update Service Account Permissions

Your existing service account needs these scopes:

1. **Go to your Service Account**
   - APIs & Services → Credentials
   - Click on your existing service account

2. **Add these scopes:**
   ```
   https://www.googleapis.com/auth/maps.places
   https://www.googleapis.com/auth/maps.places.autocomplete
   https://www.googleapis.com/auth/maps.places.details
   ```

## Step 3: Set Up Billing (Required)

Google Places API requires billing to be enabled:

1. **Go to Billing**
   - APIs & Services → Billing
   - Link a billing account or create one

2. **Set up billing alerts** (recommended)
   - Set monthly budget alerts
   - Monitor usage in the console

## Step 4: Test the Integration

The API routes are already set up! Test them:

### Test Place Autocomplete
```bash
curl "http://localhost:3000/api/places/autocomplete?input=Paris"
```

### Test Place Details
```bash
curl "http://localhost:3000/api/places/details?placeId=ChIJD7fiBh9u5kcRYJSMaMOCCwQ"
```

## Step 5: Update Your Components

### Replace City Autocomplete

In your trip forms, replace the existing `CityAutocomplete` with `GooglePlacesAutocomplete`:

```tsx
import GooglePlacesAutocomplete from '../components/google-places-autocomplete';

// In your form component:
<GooglePlacesAutocomplete
  value={formData.destination}
  onChange={(value) => setFormData(prev => ({ ...prev, destination: value }))}
  onPlaceSelect={(place) => {
    // Handle place selection with full details
    console.log('Selected place:', place);
  }}
  placeholder="Where are you going?"
  types="(cities)" // Restrict to cities only
  country="us" // Optional: restrict to specific country
/>
```

### Enhanced Features Available

1. **Rich Place Details**
   - Place names and addresses
   - Coordinates (lat/lng)
   - Ratings and place types

2. **Smart Suggestions**
   - Real-time autocomplete
   - Contextual results
   - Type-specific filtering

## Step 6: Usage Examples

### For Trip Destinations
```tsx
<GooglePlacesAutocomplete
  value={destination}
  onChange={setDestination}
  onPlaceSelect={(place) => {
    // Store coordinates for mapping
    setDestinationCoords({
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng
    });
  }}
  types="(cities)"
  placeholder="Choose your destination"
/>
```

### For Activities
```tsx
<GooglePlacesAutocomplete
  value={activityLocation}
  onChange={setActivityLocation}
  onPlaceSelect={(place) => {
    // Get rich activity details
    setActivityDetails({
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      photos: place.photos,
      website: place.website
    });
  }}
  types="establishment"
  placeholder="Where is this activity?"
/>
```

### For Nearby Search
```tsx
// Find attractions near destination
const findNearbyAttractions = async (lat: number, lng: number) => {
  const response = await fetch(`/api/places/nearby?lat=${lat}&lng=${lng}&type=tourist_attraction&radius=5000`);
  const data = await response.json();
  return data.results;
};
```

## Pricing Information

### Places API (New) - Pay Per Use
- **Autocomplete (per session)**: $0.017
- **Place Details**: $0.017
- **Text Search**: $0.032
- **Nearby Search**: $0.032

### Geocoding API
- **Geocoding**: $0.005 per request
- **Reverse Geocoding**: $0.005 per request

### Directions API
- **Directions**: $0.005 per request
- **Distance Matrix**: $0.005 per request

### Free Tier
- **$200 free credit** per month
- Covers approximately 11,000 autocomplete sessions
- Or 40,000 geocoding requests

## Best Practices

1. **Use Session Tokens**
   - Generated automatically in the component
   - Reduces billing for related requests

2. **Implement Debouncing**
   - Already implemented in the component
   - Reduces unnecessary API calls

3. **Cache Results**
   - Store frequently accessed places
   - Reduce API costs

4. **Set Usage Limits**
   - Monitor usage in Google Cloud Console
   - Set up billing alerts

## Troubleshooting

### Common Issues

1. **"API not enabled" error**
   - Enable the required APIs in Google Cloud Console

2. **"Billing required" error**
   - Set up billing account
   - Add payment method

3. **"Quota exceeded" error**
   - Check usage limits
   - Consider implementing caching

4. **"Invalid API key" error**
   - Verify service account credentials
   - Check environment variables

### Environment Variables Required

Make sure these are set in your Railway deployment:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@navigatorv2.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=your-private-key
```

## Next Steps

1. **Enable the APIs** in Google Cloud Console
2. **Set up billing** (required for Places API)
3. **Test the endpoints** to ensure they work
4. **Replace existing components** with Google Places versions
5. **Monitor usage** and costs in the console

The integration is ready to use! Your existing Google Cloud setup makes this process much simpler.
