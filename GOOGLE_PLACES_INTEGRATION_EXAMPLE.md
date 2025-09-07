# Google Places Integration Example

This shows how to replace your existing `CityAutocomplete` with the new `GooglePlacesAutocomplete` component.

## Current Implementation (trip-form.tsx)

```tsx
// Current code in trip-form.tsx (lines 150-162)
<div className="mb-4">
  <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
    Destination
  </label>
  <CityAutocomplete
    id="destination"
    name="destination"
    value={formData.destination}
    onChange={(value) => setFormData(prev => ({ ...prev, destination: value }))}
    placeholder="Where are you going?"
    required
  />
</div>
```

## Enhanced Implementation with Google Places

```tsx
// Enhanced code with Google Places API
import GooglePlacesAutocomplete from '../components/google-places-autocomplete';

// Add to your component state
const [destinationCoords, setDestinationCoords] = useState<{lat: number, lng: number} | null>(null);
const [destinationDetails, setDestinationDetails] = useState<any>(null);

// Replace the destination field
<div className="mb-4">
  <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
    Destination
  </label>
  <GooglePlacesAutocomplete
    id="destination"
    name="destination"
    value={formData.destination}
    onChange={(value) => setFormData(prev => ({ ...prev, destination: value }))}
    onPlaceSelect={(place) => {
      // Store coordinates for mapping features
      setDestinationCoords({
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      });
      
      // Store rich place details
      setDestinationDetails({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        photos: place.photos,
        website: place.website
      });
      
      console.log('Selected destination:', place);
    }}
    placeholder="Where are you going?"
    types="(cities)" // Restrict to cities only
    country="us" // Optional: restrict to specific country
    required
  />
</div>
```

## Benefits of the Enhanced Version

### 1. **Rich Location Data**
- Automatic coordinate extraction
- Place photos and ratings
- Official website links
- Structured address information

### 2. **Better User Experience**
- Real-time suggestions as you type
- Visual place type indicators (🏨 🍽️ 🎯 ✈️)
- Contextual secondary text
- Keyboard navigation support

### 3. **Enhanced Trip Planning**
- Store coordinates for mapping
- Access to place photos for trip previews
- Rating information for decision making
- Official websites for more details

## Additional Use Cases

### For Activity Locations
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
      website: place.website,
      phone: place.formatted_phone_number,
      openingHours: place.opening_hours
    });
  }}
  types="establishment" // Restaurants, attractions, etc.
  placeholder="Where is this activity?"
/>
```

### For Accommodation Search
```tsx
<GooglePlacesAutocomplete
  value={accommodationLocation}
  onChange={setAccommodationLocation}
  onPlaceSelect={(place) => {
    // Get accommodation details
    setAccommodationDetails({
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      priceLevel: place.price_level,
      photos: place.photos,
      website: place.website,
      phone: place.formatted_phone_number
    });
  }}
  types="lodging" // Hotels, hostels, etc.
  placeholder="Where are you staying?"
/>
```

### For Nearby Attractions
```tsx
// Function to find attractions near destination
const findNearbyAttractions = async (lat: number, lng: number) => {
  try {
    const response = await fetch(`/api/places/nearby?lat=${lat}&lng=${lng}&type=tourist_attraction&radius=5000`);
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error finding nearby attractions:', error);
    return [];
  }
};

// Use in your component
useEffect(() => {
  if (destinationCoords) {
    findNearbyAttractions(destinationCoords.lat, destinationCoords.lng)
      .then(attractions => {
        setNearbyAttractions(attractions);
      });
  }
}, [destinationCoords]);
```

## Migration Steps

1. **Install the new component** (already created)
2. **Update your imports** in trip-form.tsx
3. **Replace CityAutocomplete** with GooglePlacesAutocomplete
4. **Add state for coordinates and details**
5. **Test the integration**

## Backward Compatibility

The new component maintains the same basic interface as `CityAutocomplete`, so the migration is straightforward:

- Same `value` and `onChange` props
- Same `placeholder` and `required` props
- Additional `onPlaceSelect` callback for rich data
- Additional `types` and `country` props for filtering

## Cost Considerations

- **Autocomplete**: $0.017 per session (includes multiple suggestions)
- **Place Details**: $0.017 per selection
- **Free Tier**: $200/month covers ~11,000 autocomplete sessions

The component includes debouncing and session tokens to minimize costs.
