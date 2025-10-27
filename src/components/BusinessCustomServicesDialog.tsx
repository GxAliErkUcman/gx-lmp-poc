import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BusinessCustomServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId?: string;
  clientId?: string;
  businessCategories?: string[]; // primaryCategory and additionalCategories
  currentServices?: any[]; // Currently assigned services
  onSave: (services: any[]) => void;
}

interface ClientService {
  id: string;
  service_name: string;
  service_description?: string | null;
  service_category_id?: string | null;
}

const BusinessCustomServicesDialog = ({
  open,
  onOpenChange,
  businessId,
  clientId,
  businessCategories = [],
  currentServices = [],
  onSave,
}: BusinessCustomServicesDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [availableServices, setAvailableServices] = useState<ClientService[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && clientId) {
      loadAvailableServices();
    }
  }, [open, clientId]);

  useEffect(() => {
    // Initialize selected services from currentServices
    if (currentServices && currentServices.length > 0) {
      const selectedIds = availableServices
        .filter(service =>
          currentServices.some(cs => cs.serviceName === service.service_name)
        )
        .map(s => s.id);
      setSelectedServiceIds(selectedIds);
    }
  }, [currentServices, availableServices]);

  const loadAvailableServices = async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_custom_services')
        .select('*')
        .eq('client_id', clientId)
        .order('service_name');

      if (error) throw error;
      setAvailableServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available services',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const gcidToCategoryName = (gcid: string): string => {
    return gcid.replace(/^gcid:/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const isServiceCompatible = (service: ClientService): boolean => {
    if (!service.service_category_id) return true;
    
    const categoryName = gcidToCategoryName(service.service_category_id);
    return businessCategories.some(cat =>
      cat.toLowerCase() === categoryName.toLowerCase()
    );
  };

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSave = () => {
    const selectedServices = availableServices
      .filter(service => selectedServiceIds.includes(service.id))
      .map(service => ({
        serviceName: service.service_name,
        serviceDescription: service.service_description || null,
        serviceCategoryId: service.service_category_id || null,
      }));

    onSave(selectedServices);
    onOpenChange(false);
  };

  const incompatibleServices = availableServices.filter(s => !isServiceCompatible(s));
  const hasIncompatibleSelected = selectedServiceIds.some(id =>
    !isServiceCompatible(availableServices.find(s => s.id === id)!)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Select Custom Services</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {incompatibleServices.length > 0 && (
              <Alert variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {incompatibleServices.length} service(s) require categories not assigned to this business.
                  Add the required category to use these services.
                </AlertDescription>
              </Alert>
            )}

            {availableServices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No custom services configured for this client yet.
              </p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {availableServices.map((service) => {
                    const isCompatible = isServiceCompatible(service);
                    const isSelected = selectedServiceIds.includes(service.id);

                    return (
                      <Card
                        key={service.id}
                        className={`p-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : isCompatible
                            ? 'hover:border-primary/50'
                            : 'opacity-60 cursor-not-allowed'
                        }`}
                        onClick={() => isCompatible && toggleService(service.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isSelected ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{service.service_name}</h4>
                            {service.service_description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {service.service_description}
                              </p>
                            )}
                            {service.service_category_id && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs px-2 py-1 bg-muted rounded">
                                  Requires: {gcidToCategoryName(service.service_category_id)}
                                </span>
                                {!isCompatible && (
                                  <span className="text-xs text-destructive">
                                    (Not assigned to business)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            <div className="text-sm text-muted-foreground">
              Selected: {selectedServiceIds.length} service(s)
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || hasIncompatibleSelected}
          >
            Save Services
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessCustomServicesDialog;