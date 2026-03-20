import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Eye, MapPin, Users, Loader2, UserPlus, Image, Search, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServiceUserCreateDialog from '@/components/ServiceUserCreateDialog';
import { invalidateSeoWeightsCache } from '@/lib/seoScoring';

interface ClientInfo {
  id: string;
  name: string;
  active_locations: number;
  pending_locations: number;
  custom_photos_enabled: boolean;
  seo_weight_profile_id: string | null;
  users: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    roles: string[];
  }[];
}

export const AllClientsView = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [selectedClientForUser, setSelectedClientForUser] = useState<{ id: string; name: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;
  const [seoProfiles, setSeoProfiles] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchAllClientData();
    fetchSeoProfiles();
  }, []);

  const fetchSeoProfiles = async () => {
    try {
      const { data } = await supabase
        .from('seo_weight_profiles')
        .select('id, name')
        .order('name');
      setSeoProfiles(data || []);
    } catch (e) {
      console.error('Error fetching SEO profiles:', e);
    }
  };

  const handleSeoProfileChange = async (clientId: string, profileId: string | null) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ seo_weight_profile_id: profileId } as any)
        .eq('id', clientId);
      if (error) throw error;
      invalidateSeoWeightsCache();
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, seo_weight_profile_id: profileId } : c));
      toast({
        title: 'SEO Profile Updated',
        description: profileId ? 'Client assigned to custom SEO profile.' : 'Client reverted to global SEO weights.',
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update SEO profile.', variant: 'destructive' });
    }
  };

  const fetchAllClientData = async () => {
    try {
      setLoading(true);

      // Fetch ALL clients (admins have access to all)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, custom_photos_enabled, seo_weight_profile_id')
        .order('name');

      if (clientsError) throw clientsError;

      if (!clientsData || clientsData.length === 0) {
        setClients([]);
        return;
      }

      // For each client, fetch locations and users
      const clientInfoPromises = clientsData.map(async (client) => {
        // Fetch active and pending locations
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('status')
          .eq('client_id', client.id);

        if (businessError) throw businessError;

        const active_locations = businessData?.filter(b => b.status === 'active').length || 0;
        const pending_locations = businessData?.filter(b => b.status === 'pending').length || 0;

        // Fetch users from profiles (client users)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .eq('client_id', client.id);

        if (profilesError) throw profilesError;

        // Fetch service users assigned via user_client_access
        const { data: serviceAccessData, error: serviceAccessError } = await supabase
          .from('user_client_access')
          .select('user_id')
          .eq('client_id', client.id);

        if (serviceAccessError) throw serviceAccessError;

        const serviceUserIds = serviceAccessData?.map(sa => sa.user_id) || [];
        
        // Fetch service user profiles
        let serviceUsersData: any[] = [];
        if (serviceUserIds.length > 0) {
          const { data: serviceProfiles, error: serviceProfilesError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, email')
            .in('user_id', serviceUserIds);

          if (serviceProfilesError) throw serviceProfilesError;
          serviceUsersData = serviceProfiles || [];
        }

        // Combine all user IDs (deduplicate)
        const allUserIds = [...new Set([
          ...(profilesData?.map(p => p.user_id) || []),
          ...serviceUsersData.map(p => p.user_id)
        ])];

        // For each user, fetch their roles
        const usersWithRoles = await Promise.all(
          allUserIds.map(async (userId) => {
            // Find profile from either source
            const profile = profilesData?.find(p => p.user_id === userId) || 
                          serviceUsersData.find(p => p.user_id === userId);
            
            if (!profile) return null;

            const { data: rolesData, error: rolesError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', userId);

            if (rolesError) throw rolesError;

            const roles = rolesData?.map(r => r.role) || [];

            return {
              ...profile,
              roles
            };
          })
        );

        return {
          id: client.id,
          name: client.name,
          active_locations,
          pending_locations,
          custom_photos_enabled: (client as any).custom_photos_enabled ?? false,
          seo_weight_profile_id: (client as any).seo_weight_profile_id ?? null,
          users: usersWithRoles.filter(u => u !== null) as typeof usersWithRoles[0][]
        };
      });

      const clientInfo = await Promise.all(clientInfoPromises);
      setClients(clientInfo);
    } catch (error) {
      console.error('Error fetching client data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load client data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewClient = (clientId: string) => {
    navigate(`/client-dashboard?client=${clientId}`);
  };

  const handleCreateUser = (clientId: string, clientName: string) => {
    setSelectedClientForUser({ id: clientId, name: clientName });
    setCreateUserDialogOpen(true);
  };

  const handleUserCreated = () => {
    fetchAllClientData();
  };

  const handleToggleCustomPhotos = async (clientId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ custom_photos_enabled: enabled } as any)
        .eq('id', clientId);

      if (error) throw error;

      setClients(prev => prev.map(c => c.id === clientId ? { ...c, custom_photos_enabled: enabled } : c));

      toast({
        title: enabled ? 'Other Photos Enabled' : 'Other Photos Disabled',
        description: `Other photos ${enabled ? 'enabled' : 'disabled'} for this client.`,
      });
    } catch (error: any) {
      console.error('Error toggling other photos:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update other photos setting.',
        variant: 'destructive',
      });
    }
  };

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.users.some(u => u.email.toLowerCase().includes(term) || `${u.first_name} ${u.last_name}`.toLowerCase().includes(term))
    );
  }, [clients, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredClients.slice(start, start + PAGE_SIZE);
  }, [filteredClients, currentPage]);

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{searchTerm ? 'No clients matching your search.' : 'No clients found'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paginatedClients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{client.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCreateUser(client.id, client.name)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create User
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewClient(client.id)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Locations Summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      Active Locations
                    </span>
                    <Badge variant="default">{client.active_locations}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      Pending Locations
                    </span>
                    <Badge variant="secondary">{client.pending_locations}</Badge>
                  </div>
                </div>

                {/* Other Photos Toggle */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`custom-photos-${client.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Image className="w-4 h-4 text-muted-foreground" />
                      Other Photos
                    </Label>
                    <Switch
                      id={`custom-photos-${client.id}`}
                      checked={client.custom_photos_enabled}
                      onCheckedChange={(checked) => handleToggleCustomPhotos(client.id, checked)}
                    />
                  </div>
                </div>

                {/* SEO Weight Profile */}
                {seoProfiles.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm">
                        <BarChart3 className="w-4 h-4 text-muted-foreground" />
                        SEO Profile
                      </Label>
                      <Select
                        value={client.seo_weight_profile_id || 'global'}
                        onValueChange={(val) => handleSeoProfileChange(client.id, val === 'global' ? null : val)}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Global (Default)</SelectItem>
                          {seoProfiles.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Team Members
                    </span>
                    <Badge variant="outline">{client.users.length}</Badge>
                  </div>
                  {client.users.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {/* Service Team Section */}
                      {(() => {
                        const serviceUsers = client.users.filter(u => 
                          u.roles.includes('service_user')
                        );
                        return serviceUsers.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-1.5">
                              Service Team
                            </div>
                            <div className="space-y-1.5">
                              {serviceUsers.map((user) => (
                                <div
                                  key={user.user_id}
                                  className="p-2 rounded-lg bg-muted/50 text-sm"
                                >
                                  <div className="font-medium">
                                    {user.first_name} {user.last_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Client Users Section */}
                      {(() => {
                        const clientUsers = client.users.filter(u => 
                          !u.roles.includes('service_user')
                        );
                        return clientUsers.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-1.5">
                              Client
                            </div>
                            <div className="space-y-1.5">
                              {clientUsers.map((user) => (
                                <div
                                  key={user.user_id}
                                  className="p-2 rounded-lg bg-muted/50 text-sm"
                                >
                                  <div className="font-medium">
                                    {user.first_name} {user.last_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </div>
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {user.roles.map((role) => (
                                      <Badge key={role} variant="secondary" className="text-xs">
                                        {role.replace('_', ' ')}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No team members</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredClients.length)} of {filteredClients.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create User Dialog */}
      {selectedClientForUser && (
        <ServiceUserCreateDialog
          open={createUserDialogOpen}
          onOpenChange={setCreateUserDialogOpen}
          clientId={selectedClientForUser.id}
          clientName={selectedClientForUser.name}
          onUserCreated={handleUserCreated}
        />
      )}
    </>
  );
};