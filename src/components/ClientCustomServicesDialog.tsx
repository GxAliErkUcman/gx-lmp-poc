import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Search, Edit2, X, AlertTriangle } from 'lucide-react';
import { CategorySelect } from '@/components/CategorySelect';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EditCustomServiceDialog, {
  categoryNameToGcid,
  gcidToCategoryName,
  parseCategoryIds,
  joinCategoryIds,
  type CustomService,
} from '@/components/EditCustomServiceDialog';

interface ClientCustomServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  onSuccess?: () => void;
}

const ClientCustomServicesDialog = ({ 
  open, 
  onOpenChange, 
  clientId,
  onSuccess 
}: ClientCustomServicesDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<CustomService[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingService, setEditingService] = useState<CustomService | null>(null);
  
  // New service form
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [newServiceCategories, setNewServiceCategories] = useState<string[]>([]);
  const [pendingCategory, setPendingCategory] = useState('');

  useEffect(() => {
    if (open && clientId) {
      loadData();
    }
  }, [open, clientId]);

  const loadData = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from('client_custom_services')
        .select('*')
        .eq('client_id', clientId)
        .order('service_name');

      if (servicesError) throw servicesError;
      setServices(servicesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load custom services',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    if (!pendingCategory) return;
    const gcid = categoryNameToGcid(pendingCategory);
    if (!newServiceCategories.includes(gcid)) {
      setNewServiceCategories([...newServiceCategories, gcid]);
    }
    setPendingCategory('');
  };

  const handleRemoveCategory = (gcid: string) => {
    setNewServiceCategories(newServiceCategories.filter(c => c !== gcid));
  };

  const handleAddService = async () => {
    if (!clientId) return;
    if (!newServiceName.trim()) {
      toast({ title: 'Validation Error', description: 'Service name is required', variant: 'destructive' });
      return;
    }
    if (newServiceName.length > 140) {
      toast({ title: 'Validation Error', description: 'Service name must be 140 characters or less', variant: 'destructive' });
      return;
    }
    if (newServiceDescription && newServiceDescription.length > 250) {
      toast({ title: 'Validation Error', description: 'Service description must be 250 characters or less', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('client_custom_services')
        .insert({
          client_id: clientId,
          service_name: newServiceName.trim(),
          service_description: newServiceDescription.trim() || null,
          service_category_id: joinCategoryIds(newServiceCategories),
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Custom service added successfully' });
      setNewServiceName('');
      setNewServiceDescription('');
      setNewServiceCategories([]);
      setPendingCategory('');
      await loadData();
    } catch (error: any) {
      console.error('Error adding service:', error);
      toast({ title: 'Error', description: error.message || 'Failed to add custom service', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this custom service? This will not remove it from businesses that already use it.'
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('client_custom_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Custom service deleted successfully' });
      await loadData();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({ title: 'Error', description: 'Failed to delete custom service', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredServices = services.filter(service =>
    service.service_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Custom Services</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 overflow-hidden flex-1 flex flex-col min-h-0">
              {/* Add New Service Form */}
              <Card className="p-4 bg-muted/50 shrink-0">
                <h3 className="font-semibold mb-3">Add New Service</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="service-name">Service Name *</Label>
                    <Input
                      id="service-name"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      placeholder="e.g., Phone Screen Repair"
                      maxLength={140}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {newServiceName.length}/140 characters — The name of the service your locations offer. Examples: "EV Charging", "Wheelchair Accessible Parking", "Drive-Through Service".
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="service-description">Service Description</Label>
                    <Textarea
                      id="service-description"
                      value={newServiceDescription}
                      onChange={(e) => setNewServiceDescription(e.target.value)}
                      placeholder="Brief description of the service"
                      maxLength={250}
                      rows={2}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {newServiceDescription.length}/250 characters — A brief explanation of what the service includes. This is exported alongside the service name. Examples: "Fast charging up to 150kW available 24/7", "Two dedicated accessible parking bays near the entrance".
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Assigned Categories</Label>
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
                      <span>Categories added here will restrict the custom service to locations that belong to the categories selected. Leaving this empty will not put any restrictions on the custom service.</span>
                    </p>
                    {newServiceCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {newServiceCategories.map(gcid => (
                          <Badge key={gcid} variant="secondary" className="gap-1 pr-1">
                            {gcidToCategoryName(gcid)}
                            <button
                              type="button"
                              onClick={() => handleRemoveCategory(gcid)}
                              className="ml-1 rounded-full hover:bg-muted p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <CategorySelect
                          value={pendingCategory}
                          onValueChange={setPendingCategory}
                          placeholder="Select a category to add"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCategory}
                        disabled={!pendingCategory}
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={handleAddService}
                    disabled={saving || !newServiceName.trim()}
                    className="w-full"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Service
                  </Button>
                </div>
              </Card>

              {/* Search */}
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search services..."
                  className="pl-10"
                />
              </div>

              {/* Services List */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-2 pr-2">
                  {filteredServices.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'No services found' : 'No custom services yet. Add one above.'}
                    </p>
                  ) : (
                    filteredServices.map((service) => (
                      <Card key={service.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold">{service.service_name}</h4>
                              {service.service_category_id ? (
                                <div className="flex flex-wrap gap-1">
                                  {parseCategoryIds(service.service_category_id).map(gcid => (
                                    <Badge key={gcid} variant="outline" className="text-xs font-normal">
                                      {gcidToCategoryName(gcid)}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  Eligible for all categories
                                </Badge>
                              )}
                            </div>
                            {service.service_description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {service.service_description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2 shrink-0">
                            <Button
                              onClick={() => setEditingService(service)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteService(service.id)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              disabled={saving}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter className="shrink-0">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Sub-Dialog */}
      {editingService && (
        <EditCustomServiceDialog
          open={!!editingService}
          onOpenChange={(open) => { if (!open) setEditingService(null); }}
          service={editingService}
          onSaved={loadData}
        />
      )}
    </>
  );
};

export default ClientCustomServicesDialog;
