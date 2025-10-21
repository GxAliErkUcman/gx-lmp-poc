import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const serviceUrlsSchema = z.object({
  appointmentURL: z.string().url().optional().or(z.literal('')),
  menuURL: z.string().url().optional().or(z.literal('')),
  reservationsURL: z.string().url().optional().or(z.literal('')),
  orderAheadURL: z.string().url().optional().or(z.literal('')),
});

type ServiceUrlsFormValues = z.infer<typeof serviceUrlsSchema>;

interface AccountServiceUrlsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clientId?: string;
}

const AccountServiceUrlsDialog = ({ open, onOpenChange, onSuccess, clientId }: AccountServiceUrlsDialogProps) => {
  const [loading, setLoading] = React.useState(false);

  const form = useForm<ServiceUrlsFormValues>({
    resolver: zodResolver(serviceUrlsSchema),
    defaultValues: {
      appointmentURL: '',
      menuURL: '',
      reservationsURL: '',
      orderAheadURL: '',
    },
  });

  const onSubmit = async (values: ServiceUrlsFormValues) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Filter out empty values
      const updateData = Object.fromEntries(
        Object.entries(values)
          .filter(([, value]) => value && value.trim() !== '')
      );

      if (Object.keys(updateData).length === 0) {
        toast({
          title: "No changes",
          description: "Please fill in at least one service URL to update",
          variant: "destructive",
        });
        return;
      }

      // Update all businesses for the specified client or user's client
      let updateQuery = supabase
        .from('businesses')
        .update(updateData);

      if (clientId) {
        updateQuery = updateQuery.eq('client_id', clientId);
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('user_id', user.id)
          .single();

        updateQuery = updateQuery.or(`user_id.eq.${user.id}${profile?.client_id ? `,client_id.eq.${profile.client_id}` : ''}`);
      }

      const { error } = await updateQuery;

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service URLs applied to all locations",
      });

      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating service URLs:', error);
      toast({
        title: "Error",
        description: "Failed to update service URLs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Account-Wide Service URLs
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-muted-foreground">
            Set service URLs that will be applied to all your business locations. 
            This will overwrite existing service URLs for all locations.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="appointmentURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/appointments"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="menuURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menu URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/menu"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reservationsURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reservations URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/reservations"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orderAheadURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Ahead URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/order"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Applying...' : 'Apply to All Locations'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountServiceUrlsDialog;