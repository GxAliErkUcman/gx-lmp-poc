import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { Business } from '@/types/business';


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
  const [currentSort, setCurrentSort] = useState<{ key: keyof Business, direction: 'asc' | 'desc' } | null>('asc');


  // Filter businesses based on search term
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = businesses.filter(business => 
      business.businessName?.toLowerCase().includes(term.toLowerCase()) ||
      business.city?.toLowerCase().includes(term.toLowerCase()) ||
      business.primaryCategory?.toLowerCase().includes(term.toLowerCase()) || 
      business.storeCode?.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredBusinesses(filtered);
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

    setFilteredBusinesses(sortedArray);
  };

  // Update filtered businesses when businesses prop changes
  React.useEffect(() => {
    handleSearch(searchTerm);
  }, [businesses, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Search and controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search businesses..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
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
              <TableHead>
                <div
                  className="flex items-center gap-1 cursor-pointer text-gray-700 dark:text-gray-300"
                  onClick={() => handleSort('storeCode')}
                >
                  <span>Store Code</span>
                  {currentSort?.key === 'storeCode' && (
                    currentSort.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>Business Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead>Website</TableHead>
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
                <TableCell>
                  {business.storeCode && (
                    <Badge variant="secondary">{business.storeCode}</Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span>{business.businessName}</span>
                    {/^(STORE)\d{6}$/.test(business.storeCode || '') && (
                      <Badge variant="destructive">Replace store code</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {business.primaryCategory && (
                    <Badge variant="secondary">{business.primaryCategory}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {business.city && business.state && (
                    <span className="text-sm text-muted-foreground">
                      {business.city}, {business.state}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{business.primaryPhone || '-'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{business.labels || '-'}</span>
                </TableCell>
                <TableCell>
                  {business.website ? (
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
                  )}
                </TableCell>
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
          {searchTerm ? 'No businesses found matching your search.' : 'No businesses found.'}
        </div>
      )}
    </div>
  );
};

export default BusinessTableView;