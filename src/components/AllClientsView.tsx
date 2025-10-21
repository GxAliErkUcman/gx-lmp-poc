import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, MapPin, Users, Loader2, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ServiceUserCreateDialog from '@/components/ServiceUserCreateDialog';

interface ClientInfo {
  id: string;
  name: string;
  active_locations: number;
  pending_locations: number;
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

  useEffect(() => {
    fetchAllClientData();
  }, []);

  const fetchAllClientData = async () => {
    try {
      setLoading(true);

      // Fetch ALL clients (admins have access to all)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No clients found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
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

                {/* Users Summary */}
                <div className="border-t pt-4">
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