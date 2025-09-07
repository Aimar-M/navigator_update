import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

interface PlaceDetails {
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

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: PlaceDetails) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
  types?: string; // e.g., 'establishment', 'geocode', '(cities)', etc.
  country?: string; // e.g., 'us', 'ca', 'gb'
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search for a place...",
  required = false,
  id,
  name,
  className = "",
  types,
  country,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Generate session token for billing optimization
  useEffect(() => {
    setSessionToken(Math.random().toString(36).substring(2, 15));
  }, []);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounced search function
  const searchPlaces = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const params = new URLSearchParams({
        input: query,
        sessionToken: sessionToken,
      });

      if (types) params.append('types', types);
      if (country) params.append('region', country);

      const API_BASE = import.meta.env.VITE_API_URL || 'https://api.navigatortrips.com';
      const response = await fetch(`${API_BASE}/api/places/autocomplete?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      const predictions = data.predictions || [];
      
      setSuggestions(predictions);
      setShowSuggestions(predictions.length > 0);
    } catch (error) {
      console.error('Error fetching place suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new debounce
    debounceRef.current = setTimeout(() => {
      searchPlaces(newValue);
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = async (suggestion: PlacePrediction) => {
    setInputValue(suggestion.description);
    onChange(suggestion.description);
    setShowSuggestions(false);
    setActiveSuggestion(-1);

    // Fetch place details if callback provided
    if (onPlaceSelect) {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://api.navigatortrips.com';
        const response = await fetch(`${API_BASE}/api/places/details?placeId=${suggestion.place_id}&sessionToken=${sessionToken}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch place details');
        }

        const data = await response.json();
        const placeDetails = data.result;
        
        onPlaceSelect(placeDetails);
      } catch (error) {
        console.error('Error fetching place details:', error);
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestion(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeSuggestion >= 0) {
          handleSuggestionSelect(suggestions[activeSuggestion]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        break;
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setActiveSuggestion(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const getPlaceTypeIcon = (types: string[]) => {
    if (types.includes('lodging')) return '🏨';
    if (types.includes('restaurant')) return '🍽️';
    if (types.includes('tourist_attraction')) return '🎯';
    if (types.includes('airport')) return '✈️';
    if (types.includes('locality')) return '🏙️';
    if (types.includes('country')) return '🌍';
    return '📍';
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          required={required}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id}
              onClick={() => handleSuggestionSelect(suggestion)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                index === activeSuggestion ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-lg mt-0.5">
                  {getPlaceTypeIcon(suggestion.types)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {suggestion.structured_formatting.main_text}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {suggestion.structured_formatting.secondary_text}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;