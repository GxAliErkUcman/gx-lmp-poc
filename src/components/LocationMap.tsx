import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LocationMapProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  address?: string;
  // Structured address components for better geocoding
  addressLine1?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

const LocationMap = ({ latitude, longitude, onLocationChange, address, addressLine1, city, state, country, postalCode }: LocationMapProps) => {
  const [mapLatitude, setMapLatitude] = useState<string>(latitude?.toString() || '');
  const [mapLongitude, setMapLongitude] = useState<string>(longitude?.toString() || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMapLatitude(latitude?.toString() || '');
    setMapLongitude(longitude?.toString() || '');
  }, [latitude, longitude]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapLatitude(latitude.toString());
        setMapLongitude(longitude.toString());
        onLocationChange(latitude, longitude);
        setLoading(false);
        toast({
          title: "Location detected",
          description: "Your current location has been set",
        });
      },
      (error) => {
        setLoading(false);
        toast({
          title: "Location error",
          description: "Failed to get your current location",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const geocodeAddress = async () => {
    // Build structured address from components
    const addressComponents = [addressLine1, city, state, country].filter(Boolean);
    const fullAddress = address || addressComponents.join(', ');
    
    if (!fullAddress && addressComponents.length === 0) {
      toast({
        title: "No address provided",
        description: "Please fill in the address fields first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let results = null;
      
      // Strategy 1: Try structured search with individual components
      if (addressLine1 && city && country) {
        const structuredQuery = new URLSearchParams({
          format: 'json',
          street: addressLine1,
          city: city,
          ...(state && { state }),
          country: country,
          ...(postalCode && { postalcode: postalCode }),
          limit: '3',
          addressdetails: '1'
        });
        
        const structuredResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?${structuredQuery}`
        );
        const structuredData = await structuredResponse.json();
        
        if (structuredData && structuredData.length > 0) {
          results = structuredData[0];
        }
      }
      
      // Strategy 2: Fallback to free-form search with better formatting
      if (!results) {
        const freeformQuery = new URLSearchParams({
          format: 'json',
          q: fullAddress,
          limit: '3',
          addressdetails: '1',
          ...(country && { countrycodes: getCountryCode(country) })
        });
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${freeformQuery}`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          results = data[0];
        }
      }

      if (results) {
        const { lat, lon } = results;
        setMapLatitude(lat);
        setMapLongitude(lon);
        onLocationChange(parseFloat(lat), parseFloat(lon));
        toast({
          title: "Address geocoded",
          description: `Coordinates found: ${parseFloat(lat).toFixed(6)}, ${parseFloat(lon).toFixed(6)}`,
        });
      } else {
        toast({
          title: "Address not found",
          description: "Could not find precise coordinates for this address. Try entering coordinates manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Geocoding error",
        description: "Failed to geocode the address",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get country codes for better geocoding
  const getCountryCode = (countryName: string): string => {
    const countryCodes: { [key: string]: string } = {
      'Austria': 'AT',
      'Germany': 'DE', 
      'Switzerland': 'CH',
      'Turkey': 'TR',
      'United States': 'US',
      'United Kingdom': 'GB',
      'France': 'FR',
      'Italy': 'IT',
      'Spain': 'ES',
      'Netherlands': 'NL',
      'Belgium': 'BE',
      'Poland': 'PL',
      'Czech Republic': 'CZ',
      'Hungary': 'HU',
      'Slovakia': 'SK',
      'Slovenia': 'SI',
      'Croatia': 'HR'
    };
    
    return countryCodes[countryName] || '';
  };

  const updateCoordinates = () => {
    const lat = parseFloat(mapLatitude);
    const lng = parseFloat(mapLongitude);

    if (isNaN(lat) || isNaN(lng)) {
      toast({
        title: "Invalid coordinates",
        description: "Please enter valid latitude and longitude values",
        variant: "destructive",
      });
      return;
    }

    if (lat < -90 || lat > 90) {
      toast({
        title: "Invalid latitude",
        description: "Latitude must be between -90 and 90",
        variant: "destructive",
      });
      return;
    }

    if (lng < -180 || lng > 180) {
      toast({
        title: "Invalid longitude",
        description: "Longitude must be between -180 and 180",
        variant: "destructive",
      });
      return;
    }

    onLocationChange(lat, lng);
    toast({
      title: "Coordinates updated",
      description: "Location coordinates have been set",
    });
  };

  const openInMaps = () => {
    if (mapLatitude && mapLongitude) {
      const url = `https://www.google.com/maps?q=${mapLatitude},${mapLongitude}`;
      // Create a temporary link element to avoid service worker preload issues
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      // Programmatically click the link to avoid service worker navigation preload warnings
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Location Coordinates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coordinate inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={mapLatitude}
              onChange={(e) => setMapLatitude(e.target.value)}
              placeholder="e.g., 40.7128"
            />
          </div>
          <div>
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={mapLongitude}
              onChange={(e) => setMapLongitude(e.target.value)}
              placeholder="e.g., -74.0060"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={loading}
          >
            <Navigation className="w-4 h-4 mr-2" />
            {loading ? 'Getting Location...' : 'Use Current Location'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={geocodeAddress}
            disabled={loading || (!address && !addressLine1)}
          >
            <MapPin className="w-4 h-4 mr-2" />
            {loading ? 'Geocoding...' : 'Find from Address'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={updateCoordinates}
            disabled={!mapLatitude || !mapLongitude}
          >
            Update Coordinates
          </Button>
          
          {mapLatitude && mapLongitude && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openInMaps}
            >
              View on Google Maps
            </Button>
          )}
        </div>

        {/* Current coordinates display */}
        {latitude && longitude && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Current Coordinates:</p>
            <p className="text-sm text-muted-foreground">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          </div>
        )}

        {/* Helpful notes */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Use "Current Location" to auto-detect your position</p>
          <p>• Use "Find from Address" to geocode the address you entered</p>
          <p>• You can also manually enter precise coordinates</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationMap;