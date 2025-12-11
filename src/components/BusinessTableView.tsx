import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Edit, Trash2, Search, ArrowUp, ArrowDown, Settings, Filter, X, AlertCircle } from 'lucide-react';
import { Business } from '@/types/business';
import ManageColumnsDialog, { type ColumnConfig } from './ManageColumnsDialog';
import { validateBusiness, ValidationError } from '@/lib/validation';


interface BusinessTableViewProps {
  businesses: Business[];
  onEdit: (business: Business) => void;
  onDelete: (id: string) => void;
  onMultiEdit: (selectedIds: string[]) => void;
  onMultiDelete: (selectedIds: string[]) => void;
  showValidationErrors?: boolean;
}

const BusinessTableView = ({ businesses, onEdit, onDelete, onMultiEdit, onMultiDelete, showValidationErrors = true }: BusinessTableViewProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBusinesses, setFilteredBusinesses] = useState(businesses);
  const [currentSort, setCurrentSort] = useState<{ key: keyof Business, direction: 'asc' | 'desc' } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [manageColumnsOpen, setManageColumnsOpen] = useState(false);
  
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'storeCode', label: 'Store Code', visible: true, required: true },
    { key: 'businessName', label: 'Business Name', visible: true, required: true },
    { key: 'primaryCategory', label: 'Category', visible: true },
    { key: 'city', label: 'City', visible: true },
    { key: 'country', label: 'Country', visible: true },
    { key: 'postalCode', label: 'Postal Code', visible: true },
    { key: 'primaryPhone', label: 'Phone', visible: false },
    { key: 'website', label: 'Website', visible: false },
    { key: 'labels', label: 'Labels', visible: false },
    { key: 'goldmine', label: 'Data Goldmine', visible: false },
  ]);


  // Get unique values for filter dropdowns
  const uniqueCategories = [...new Set(businesses.map(b => b.primaryCategory).filter(Boolean))];
  const uniqueCities = [...new Set(businesses.map(b => b.city).filter(Boolean))];
  const uniqueCountries = [...new Set(businesses.map(b => b.country).filter(Boolean))];

  // Filter businesses based on search term and filters
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    applyFilters(term, categoryFilter, cityFilter, countryFilter);
  };

  const handleCategoryFilter = (category: string) => {
    const filterValue = category === "all" ? "" : category;
    setCategoryFilter(filterValue);
    applyFilters(searchTerm, filterValue, cityFilter, countryFilter);
  };

  const handleCityFilter = (city: string) => {
    const filterValue = city === "all" ? "" : city;
    setCityFilter(filterValue);
    applyFilters(searchTerm, categoryFilter, filterValue, countryFilter);
  };

  const handleCountryFilter = (country: string) => {
    const filterValue = country === "all" ? "" : country;
    setCountryFilter(filterValue);
    applyFilters(searchTerm, categoryFilter, cityFilter, filterValue);
  };

  const applyFilters = (search: string, category: string, city: string, country: string) => {
    let filtered = businesses.filter(business => {
      const matchesSearch = !search || 
        business.businessName?.toLowerCase().includes(search.toLowerCase()) ||
        business.city?.toLowerCase().includes(search.toLowerCase()) ||
        business.primaryCategory?.toLowerCase().includes(search.toLowerCase()) || 
        business.storeCode?.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = !category || business.primaryCategory === category;
      const matchesCity = !city || business.city === city;
      const matchesCountry = !country || business.country === country;
      
      return matchesSearch && matchesCategory && matchesCity && matchesCountry;
    });
    
    setFilteredBusinesses(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setCityFilter('');
    setCountryFilter('');
    setFilteredBusinesses(businesses);
  };

  // Handle individual checkbox selection
  const handleSelectBusiness = (businessId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, businessId]);
    } else {
      setSelectedIds(selectedIds.filter(id => id !== businessId));
    }
  };

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredBusinesses.map(b => b.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Check if all visible businesses are selected
  const isAllSelected = filteredBusinesses.length > 0 && 
    filteredBusinesses.every(business => selectedIds.includes(business.id));

  const handleSort = (key: keyof Business) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    // Check if the same column is clicked to toggle the direction
    if (currentSort && currentSort.key === key) {
      direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    }

    // Sort a copy of the array and update the state
    const sortedArray = [...filteredBusinesses].sort((a, b) => {
      const aValue = a[key] || '';
      const bValue = b[key] || '';
      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    setCurrentSort({ key, direction }); 
    setFilteredBusinesses(sortedArray);
  };

  // Update filtered businesses when businesses prop changes
  React.useEffect(() => {
    applyFilters(searchTerm, categoryFilter, cityFilter, countryFilter);
  }, [businesses, searchTerm, categoryFilter, cityFilter, countryFilter]);

  const visibleColumns = columns.filter(col => col.visible);

  // Get validation errors for a business
  const getValidationErrors = (business: Business): ValidationError[] => {
    const { errors } = validateBusiness(business);
    return errors;
  };

  // Map validation errors to user-friendly messages
  const getUserFriendlyErrorMessage = (error: ValidationError, business: Business): string => {
    // Check for procedurally generated store code
    if (error.field === 'storeCode' && /^STORE\d+/.test(business.storeCode || '')) {
      return "Replace the Store Code";
    }
    
    if (error.field === 'storeCode') {
      return "Replace the Store Code";
    }
    
    if (error.field === 'addressLine1') {
      return "Please enter a valid address";
    }
    
    if (error.field === 'fromTheBusiness' && error.message.toLowerCase().includes('url')) {
      return "Please change the description";
    }
    
    if (error.field === 'fromTheBusiness') {
      return "Please change the description";
    }
    
    if (error.field === 'primaryCategory') {
      return "Please enter a valid business category";
    }
    
    if (error.field === 'country') {
      return "Please select a country and replace the address";
    }
    
    return error.message; // fallback to original message
  };

  // Render validation badge
  const renderValidationBadge = (business: Business) => {
    if (!showValidationErrors) return null;
    
    const errors = getValidationErrors(business);
    
    if (errors.length === 0) return null;
    
    if (errors.length === 1) {
      const friendlyMessage = getUserFriendlyErrorMessage(errors[0], business);
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {friendlyMessage}
        </Badge>
      );
    }
    
    // Multiple errors - show with hover card
    return (
      <HoverCard openDelay={100} closeDelay={100}>
        <HoverCardTrigger asChild>
          <div className="inline-block">
            <Badge variant="destructive" className="flex items-center gap-1 cursor-help">
              <AlertCircle className="w-3 h-3" />
              Multiple Issues
            </Badge>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 z-50" side="top" align="start">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-destructive">Validation Issues:</p>
            <ul className="space-y-1.5">
              {errors.map((error, idx) => (
                <li key={idx} className="text-xs flex items-start gap-1.5">
                  <span className="text-destructive mt-0.5">•</span>
                  <span className="font-medium">{getUserFriendlyErrorMessage(error, business)}</span>
                </li>
              ))}
            </ul>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 flex-1 sm:flex-none"
            >
              <Filter className="w-4 h-4" />
              <span className="sm:inline">Filters</span>
              {(categoryFilter || cityFilter || countryFilter) && (
                <Badge variant="secondary" className="ml-1">
                  {[categoryFilter, cityFilter, countryFilter].filter(Boolean).length}
                </Badge>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setManageColumnsOpen(true)}
              className="flex items-center gap-2 flex-1 sm:flex-none"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Manage View</span>
            </Button>
          </div>
        </div>
        
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onMultiEdit(selectedIds)}
              className="text-xs sm:text-sm"
            >
              Edit
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => onMultiDelete(selectedIds)}
              className="text-xs sm:text-sm"
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col gap-3 p-3 sm:p-4 bg-muted/30 rounded-lg sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-xs sm:text-sm font-medium">Category:</span>
            <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-xs sm:text-sm font-medium">City:</span>
            <Select value={cityFilter} onValueChange={handleCityFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {uniqueCities.map(city => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-xs sm:text-sm font-medium">Country:</span>
            <Select value={countryFilter} onValueChange={handleCountryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                {uniqueCountries.map(country => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {(categoryFilter || cityFilter || countryFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="flex items-center gap-2 self-start sm:self-auto"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all businesses"
                />
              </TableHead>
              {visibleColumns.map((column) => (
                <TableHead key={column.key}>
                  {['storeCode', 'businessName', 'primaryCategory', 'city'].includes(column.key) ? (
                    <div
                      className="flex items-center gap-1 cursor-pointer text-gray-700 dark:text-gray-300"
                      onClick={() => handleSort(column.key as keyof Business)}
                    >
                      <span>{column.label}</span>
                      {currentSort?.key === column.key && (
                        currentSort.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBusinesses.map((business) => (
              <TableRow key={business.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(business.id)}
                    onCheckedChange={(checked) => 
                      handleSelectBusiness(business.id, checked as boolean)
                    }
                    aria-label={`Select ${business.businessName}`}
                  />
                </TableCell>
                {visibleColumns.map((column) => (
                  <TableCell key={column.key}>
                    {column.key === 'storeCode' && (
                      business.storeCode && (
                        <Badge variant="secondary">{business.storeCode}</Badge>
                      )
                    )}
                    {column.key === 'businessName' && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{business.businessName}</span>
                        {renderValidationBadge(business)}
                      </div>
                    )}
                    {column.key === 'primaryCategory' && (
                      business.primaryCategory && (
                        <Badge variant="secondary">{business.primaryCategory}</Badge>
                      )
                    )}
                    {column.key === 'city' && (
                      <span className="text-sm">{business.city || '-'}</span>
                    )}
                    {column.key === 'country' && (
                      <span className="text-sm">{business.country || '-'}</span>
                    )}
                    {column.key === 'postalCode' && (
                      <span className="text-sm">{business.postalCode || '-'}</span>
                    )}
                    {column.key === 'primaryPhone' && (
                      <span className="text-sm">{business.primaryPhone || '-'}</span>
                    )}
                    {column.key === 'website' && (
                      business.website ? (
                        <a 
                          href={business.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate max-w-[200px] block"
                        >
                          {business.website}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )
                    )}
                    {column.key === 'labels' && (
                      <span className="text-sm">{business.labels || '-'}</span>
                    )}
                    {column.key === 'goldmine' && (
                      <span className="text-sm text-muted-foreground truncate max-w-[200px] block" title={business.goldmine || ''}>
                        {business.goldmine || '-'}
                      </span>
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(business)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(business.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredBusinesses.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm || categoryFilter || cityFilter || countryFilter ? 'No businesses found matching your criteria.' : 'No businesses found.'}
        </div>
      )}

      <ManageColumnsDialog
        open={manageColumnsOpen}
        onOpenChange={setManageColumnsOpen}
        columns={columns}
        onColumnsChange={setColumns}
      />
    </div>
  );
};

export default BusinessTableView;