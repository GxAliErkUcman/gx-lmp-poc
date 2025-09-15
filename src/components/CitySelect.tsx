import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// Common cities by country
const CITIES_BY_COUNTRY: Record<string, string[]> = {
  'AT': ['Vienna', 'Salzburg', 'Innsbruck', 'Graz', 'Linz', 'Klagenfurt'],
  'BE': ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges'],
  'BG': ['Sofia', 'Plovdiv', 'Varna', 'Burgas', 'Ruse', 'Stara Zagora'],
  'CA': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City'],
  'CH': ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne', 'Winterthur'],
  'CZ': ['Prague', 'Brno', 'Ostrava', 'Plzen', 'Liberec', 'Olomouc'],
  'DE': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig'],
  'DK': ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers'],
  'ES': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao'],
  'FI': ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku'],
  'FR': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'],
  'GB': ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Leeds', 'Sheffield', 'Edinburgh', 'Bristol', 'Cardiff'],
  'GR': ['Athens', 'Thessaloniki', 'Patras', 'Piraeus', 'Larissa', 'Heraklion'],
  'HR': ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Pula'],
  'HU': ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs', 'Győr'],
  'IE': ['Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford', 'Drogheda'],
  'IT': ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania'],
  'LU': ['Luxembourg City', 'Esch-sur-Alzette', 'Differdange', 'Dudelange'],
  'NL': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere'],
  'NO': ['Oslo', 'Bergen', 'Stavanger', 'Trondheim', 'Drammen', 'Fredrikstad'],
  'PL': ['Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Katowice'],
  'PT': ['Lisbon', 'Porto', 'Vila Nova de Gaia', 'Amadora', 'Braga', 'Funchal'],
  'RO': ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Craiova'],
  'SE': ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro'],
  'SI': ['Ljubljana', 'Maribor', 'Celje', 'Kranj', 'Velenje', 'Koper'],
  'SK': ['Bratislava', 'Košice', 'Prešov', 'Žilina', 'Banská Bystrica', 'Nitra'],
  'US': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington DC', 'Boston', 'El Paso', 'Nashville', 'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Kansas City', 'Mesa', 'Atlanta', 'Omaha', 'Colorado Springs', 'Raleigh', 'Miami', 'Long Beach', 'Virginia Beach', 'Oakland', 'Minneapolis', 'Tampa', 'Tulsa', 'Arlington', 'Wichita']
};

interface CitySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  countryCode?: string;
  placeholder?: string;
  allowCustom?: boolean;
}

export const CitySelect = ({ 
  value, 
  onValueChange, 
  countryCode,
  placeholder = "Select city...",
  allowCustom = true
}: CitySelectProps) => {
  const [customCity, setCustomCity] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const cities = useMemo(() => {
    if (!countryCode) return [];
    return CITIES_BY_COUNTRY[countryCode] || [];
  }, [countryCode]);

  const handleValueChange = (selectedValue: string) => {
    if (selectedValue === '__custom__') {
      setShowCustomInput(true);
      return;
    }
    setShowCustomInput(false);
    onValueChange(selectedValue);
  };

  const handleCustomSubmit = () => {
    if (customCity.trim()) {
      onValueChange(customCity.trim());
      setShowCustomInput(false);
      setCustomCity('');
    }
  };

  if (showCustomInput) {
    return (
      <div className="flex gap-2">
        <Input
          value={customCity}
          onChange={(e) => setCustomCity(e.target.value)}
          placeholder="Enter city name..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCustomSubmit();
            }
            if (e.key === 'Escape') {
              setShowCustomInput(false);
              setCustomCity('');
            }
          }}
          autoFocus
        />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleCustomSubmit}
            className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCustomInput(false);
              setCustomCity('');
            }}
            className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (!countryCode) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Select country first..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (cities.length === 0) {
    return (
      <Input
        value={value || ''}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[200px] overflow-y-auto bg-background border z-50">
        {cities.map((city) => (
          <SelectItem key={city} value={city}>
            {city}
          </SelectItem>
        ))}
        {allowCustom && (
          <SelectItem value="__custom__" className="font-medium text-primary">
            + Enter custom city...
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};