import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, Search, ArrowUp, ArrowDown, Settings, Filter, X } from 'lucide-react';
import { Business } from '@/types/business';
import ManageColumnsDialog, { type ColumnConfig } from './ManageColumnsDialog';


interface BusinessTableViewProps {
  businesses: Business[];
  onEdit: (business: Business) => void;
  onDelete: (id: string) => void;
  onMultiEdit: (selectedIds: string[]) => void;
}

const BusinessTableView = ({ businesses, onEdit, onDelete, onMultiEdit }: BusinessTableViewProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBusinesses, setFilteredBusinesses] = useState(businesses);
  const [currentSort, setCurrentSort] = useState<{ key: keyof Business, direction: 'asc' | 'desc' } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [manageColumnsOpen, setManageColumnsOpen] = useState(false);
  
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'storeCode', label: 'Store Code', visible: true, required: true },
    { key: 'businessName', label: 'Business Name', visible: true, required: true },
    { key: 'primaryCategory', label: 'Category', visible: true },
    { key: 'city', label: 'City', visible: true },
    { key: 'country', label: 'Country', visible: true },
    { key: 'primaryPhone', label: 'Phone', visible: true },
    { key: 'website', label: 'Website', visible: false },
    { key: 'labels', label: 'Labels', visible: false },
  ]);


  // Get unique values for filter dropdowns
  const uniqueCategories = [...new Set(businesses.map(b => b.primaryCategory).filter(Boolean))];
  const uniqueCities = [...new Set(businesses.map(b => b.city).filter(Boolean))];

  // Filter businesses based on search term and filters
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    applyFilters(term, categoryFilter, cityFilter);
  };

  const handleCategoryFilter = (category: string) => {
    const filterValue = category === "all" ? "" : category;
    setCategoryFilter(filterValue);
    applyFilters(searchTerm, filterValue, cityFilter);
  };

  const handleCityFilter = (city: string) => {
    const filterValue = city === "all" ? "" : city;
    setCityFilter(filterValue);
    applyFilters(searchTerm, categoryFilter, filterValue);
  };

  const applyFilters = (search: string, category: string, city: string) => {
    let filtered = businesses.filter(business => {
      const matchesSearch = !search || 
        business.businessName?.toLowerCase().includes(search.toLowerCase()) ||
        business.city?.toLowerCase().includes(search.toLowerCase()) ||
        business.primaryCategory?.toLowerCase().includes(search.toLowerCase()) || 
        business.storeCode?.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = !category || business.primaryCategory === category;
      const matchesCity = !city || business.city === city;
      
      return matchesSearch && matchesCategory && matchesCity;
    });
    
    setFilteredBusinesses(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setCityFilter('');
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
    applyFilters(searchTerm, categoryFilter, cityFilter);
  }, [businesses, searchTerm, categoryFilter, cityFilter]);

  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div className="space-y-4">
      {/* Search and controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {(categoryFilter || cityFilter) && (
              <Badge variant="secondary" className="ml-1">
                {[categoryFilter, cityFilter].filter(Boolean).length}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setManageColumnsOpen(true)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Manage View
          </Button>
        </div>
        
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onMultiEdit(selectedIds)}
            >
              Edit Selected
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Category:</span>
            <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
              <SelectTrigger className="w-48">
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
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">City:</span>
            <Select value={cityFilter} onValueChange={handleCityFilter}>
              <SelectTrigger className="w-48">
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
          
          {(categoryFilter || cityFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
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
                  {column.key === 'storeCode' ? (
                    <div
                      className="flex items-center gap-1 cursor-pointer text-gray-700 dark:text-gray-300"
                      onClick={() => handleSort('storeCode')}
                    >
                      <span>{column.label}</span>
                      {currentSort?.key === 'storeCode' && (
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
                        {/^(STORE)\d{6}$/.test(business.storeCode || '') && (
                          <Badge variant="destructive">Replace store code</Badge>
                        )}
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
          {searchTerm || categoryFilter || cityFilter ? 'No businesses found matching your criteria.' : 'No businesses found.'}
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