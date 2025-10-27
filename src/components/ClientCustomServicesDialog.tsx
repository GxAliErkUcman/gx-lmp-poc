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
import { Loader2, Plus, Trash2, Search, Edit2 } from 'lucide-react';
import { CategorySelect } from '@/components/CategorySelect';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ClientCustomServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  onSuccess?: () => void;
}

interface CustomService {
  id: string;
  service_name: string;
  service_description?: string | null;
  service_category_id?: string | null;
}

interface Category {
  id: number;
  category_name: string;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // New service form
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [newServiceCategoryId, setNewServiceCategoryId] = useState('');

  useEffect(() => {
    if (open && clientId) {
      loadData();
    }
  }, [open, clientId]);

  const loadData = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      // Load existing services
      const { data: servicesData, error: servicesError } = await supabase
        .from('client_custom_services')
        .select('*')
        .eq('client_id', clientId)
        .order('service_name');

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, category_name')
        .order('category_name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
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

  const categoryNameToGcid = (categoryName: string): string => {
    return `gcid:${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
  };

  const gcidToCategoryName = (gcid: string): string => {
    return gcid.replace(/^gcid:/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleAddService = async () => {
    if (!clientId) return;
    if (!newServiceName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Service name is required',
        variant: 'destructive',
      });
      return;
    }

    if (newServiceName.length > 140) {
      toast({
        title: 'Validation Error',
        description: 'Service name must be 140 characters or less',
        variant: 'destructive',
      });
      return;
    }

    if (newServiceDescription && newServiceDescription.length > 250) {
      toast({
        title: 'Validation Error',
        description: 'Service description must be 250 characters or less',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const serviceData: any = {
        client_id: clientId,
        service_name: newServiceName.trim(),
        service_description: newServiceDescription.trim() || null,
        service_category_id: newServiceCategoryId ? categoryNameToGcid(newServiceCategoryId) : null,
      };

      const { error } = await supabase
        .from('client_custom_services')
        .insert(serviceData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Custom service added successfully',
      });

      // Reset form
      setNewServiceName('');
      setNewServiceDescription('');
      setNewServiceCategoryId('');
      
      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('Error adding service:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add custom service',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateService = async (service: CustomService) => {
    if (!service.service_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Service name is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('client_custom_services')
        .update({
          service_name: service.service_name.trim(),
          service_description: service.service_description?.trim() || null,
          service_category_id: service.service_category_id || null,
        })
        .eq('id', service.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Custom service updated successfully',
      });

      setEditingId(null);
      await loadData();
    } catch (error: any) {
      console.error('Error updating service:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update custom service',
        variant: 'destructive',
      });
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

      toast({
        title: 'Success',
        description: 'Custom service deleted successfully',
      });

      await loadData();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete custom service',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredServices = services.filter(service =>
    service.service_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Manage Custom Services</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Add New Service Form */}
            <Card className="p-4 bg-muted/50">
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
                    {newServiceName.length}/140 characters
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
                    {newServiceDescription.length}/250 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="service-category">Service Category (Optional)</Label>
                  <div className="mt-1">
                    <CategorySelect
                      value={newServiceCategoryId}
                      onValueChange={setNewServiceCategoryId}
                      placeholder="Select a category"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    If specified, businesses must have this category to use this service
                  </p>
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search services..."
                className="pl-10"
              />
            </div>

            {/* Services List */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filteredServices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {searchTerm ? 'No services found' : 'No custom services yet. Add one above.'}
                  </p>
                ) : (
                  filteredServices.map((service) => (
                    <Card key={service.id} className="p-3">
                      {editingId === service.id ? (
                        <div className="space-y-2">
                          <Input
                            value={service.service_name}
                            onChange={(e) => {
                              setServices(services.map(s =>
                                s.id === service.id
                                  ? { ...s, service_name: e.target.value }
                                  : s
                              ));
                            }}
                            maxLength={140}
                          />
                          <Textarea
                            value={service.service_description || ''}
                            onChange={(e) => {
                              setServices(services.map(s =>
                                s.id === service.id
                                  ? { ...s, service_description: e.target.value }
                                  : s
                              ));
                            }}
                            maxLength={250}
                            rows={2}
                          />
                          <CategorySelect
                            value={service.service_category_id ? gcidToCategoryName(service.service_category_id) : ''}
                            onValueChange={(value) => {
                              setServices(services.map(s =>
                                s.id === service.id
                                  ? { ...s, service_category_id: value ? categoryNameToGcid(value) : null }
                                  : s
                              ));
                            }}
                            placeholder="Select a category"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleUpdateService(service)}
                              disabled={saving}
                              size="sm"
                            >
                              Save
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingId(null);
                                loadData();
                              }}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{service.service_name}</h4>
                            {service.service_description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {service.service_description}
                              </p>
                            )}
                            {service.service_category_id && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Category: {gcidToCategoryName(service.service_category_id)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              onClick={() => setEditingId(service.id)}
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
                      )}
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClientCustomServicesDialog;