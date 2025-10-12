import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';
import type { Business } from '@/types/business';

interface StoreOwnerAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  clientId: string;
  onAssigned: () => void;
}

export default function StoreOwnerAssignmentDialog({
  open,
  onOpenChange,
  userId,
  clientId,
  onAssigned,
}: StoreOwnerAssignmentDialogProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBusinessesAndAssignments();
    }
  }, [open, userId, clientId]);

  const fetchBusinessesAndAssignments = async () => {
    setLoading(true);
    try {
      // Fetch businesses for this client
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('client_id', clientId)
        .order('businessName');

      if (businessError) throw businessError;

      setBusinesses((businessData || []) as Business[]);

      // Fetch existing assignments
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('store_owner_access')
        .select('business_id')
        .eq('user_id', userId);

      if (assignmentError) throw assignmentError;

      const assignedIds = (assignmentData || []).map((a) => a.business_id);
      setSelectedStoreIds(assignedIds);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load stores',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete all existing assignments for this user
      const { error: deleteError } = await supabase
        .from('store_owner_access')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (selectedStoreIds.length > 0) {
        const assignments = selectedStoreIds.map((businessId) => ({
          user_id: userId,
          business_id: businessId,
        }));

        const { error: insertError } = await supabase
          .from('store_owner_access')
          .insert(assignments);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: 'Store assignments updated successfully',
      });
      onAssigned();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to save store assignments',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredBusinesses = businesses.filter(
    (business) =>
      business.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.storeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Assign Stores to Owner</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, store code, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Loading stores...</div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                {selectedStoreIds.length} of {businesses.length} stores selected
              </div>

              <ScrollArea className="h-[400px] rounded-md border p-4">
                <div className="space-y-2">
                  {filteredBusinesses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery
                        ? 'No stores match your search'
                        : 'No stores available'}
                    </div>
                  ) : (
                    filteredBusinesses.map((business) => (
                      <div
                        key={business.id}
                        className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50"
                      >
                        <Checkbox
                          id={business.id}
                          checked={selectedStoreIds.includes(business.id)}
                          onCheckedChange={() => handleToggleStore(business.id)}
                        />
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor={business.id}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {business.businessName}
                          </Label>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>Store Code: {business.storeCode}</div>
                            {business.city && (
                              <div>
                                Location: {business.city}
                                {business.state && `, ${business.state}`}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save Assignments'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
