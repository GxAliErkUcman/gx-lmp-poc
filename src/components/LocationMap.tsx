import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface LocationMapProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationChange: (lat: number | null, lng: number | null) => void;
  address?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

const LocationMap = ({ latitude, longitude, onLocationChange, address, addressLine1, city, state, country, postalCode }: LocationMapProps) => {
  const { t } = useTranslation();
  const { t: tFields } = useTranslation('fields');
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

  const getCountryCode = (countryName: string): string => {
    const countryCodes: { [key: string]: string } = {
      'Austria': 'AT', 'Germany': 'DE', 'Switzerland': 'CH', 'Turkey': 'TR',
      'United States': 'US', 'United Kingdom': 'GB', 'France': 'FR', 'Italy': 'IT',
      'Spain': 'ES', 'Netherlands': 'NL', 'Belgium': 'BE', 'Poland': 'PL',
      'Czech Republic': 'CZ', 'Hungary': 'HU', 'Slovakia': 'SK', 'Slovenia': 'SI', 'Croatia': 'HR'
    };
    return countryCodes[countryName] || '';
  };

  const handleLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMapLatitude(val);
    const lat = parseFloat(val);
    const lng = parseFloat(mapLongitude);
    if (!isNaN(lat) && lat >= -90 && lat <= 90 && !isNaN(lng) && lng >= -180 && lng <= 180) {
      onLocationChange(lat, lng);
    } else if (val.trim() === '' && mapLongitude.trim() === '') {
      onLocationChange(null, null);
    }
  };

  const handleLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMapLongitude(val);
    const lat = parseFloat(mapLatitude);
    const lng = parseFloat(val);
    if (!isNaN(lat) && lat >= -90 && lat <= 90 && !isNaN(lng) && lng >= -180 && lng <= 180) {
      onLocationChange(lat, lng);
    } else if (val.trim() === '' && mapLatitude.trim() === '') {
      onLocationChange(null, null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="map-latitude" className="text-sm">{tFields('latitude')}</Label>
          <Input
            id="map-latitude"
            type="number"
            step="any"
            value={mapLatitude}
            onChange={handleLatChange}
            placeholder="e.g., 40.7128"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="map-longitude" className="text-sm">{tFields('longitude')}</Label>
          <Input
            id="map-longitude"
            type="number"
            step="any"
            value={mapLongitude}
            onChange={handleLngChange}
            placeholder="e.g., -74.0060"
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          disabled={loading}
        >
          <Navigation className="w-4 h-4 mr-2" />
          {loading ? t('actions.gettingLocation') : t('actions.useCurrentLocation')}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={geocodeAddress}
          disabled={loading || (!address && !addressLine1)}
        >
          <MapPin className="w-4 h-4 mr-2" />
          {loading ? t('actions.geocoding') : t('actions.findFromAddress')}
        </Button>
      </div>
    </div>
  );
};

export default LocationMap;
