import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/use-admin';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, Store, Trash2, Settings, Wrench, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import CreateUserDialog from '@/components/CreateUserDialog';
import StoreOwnerAssignmentDialog from '@/components/StoreOwnerAssignmentDialog';
import SettingsDialog from '@/components/SettingsDialog';
import ClientCustomServicesDialog from '@/components/ClientCustomServicesDialog';
import ClientFieldPermissionsDialog from '@/components/ClientFieldPermissionsDialog';
import BusinessTableView from '@/components/BusinessTableView';
import BusinessDialog from '@/components/BusinessDialog';
import ImportDialog from '@/components/ImportDialog';
import { useFieldPermissions } from '@/hooks/use-field-permissions';
import type { Business } from '@/types/business';
import jasonerLogo from '@/assets/jasoner-horizontal-logo.png';

interface UserProfile {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  client_id: string;
  role: string;
}

interface ServiceUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
}

const ClientAdminPanel = () => {
  const { user, signOut } = useAuth();
  const { hasRole } = useAdmin();
  const userId = user?.id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [serviceUsers, setServiceUsers] = useState<ServiceUser[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>('');
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [storeAssignmentDialogOpen, setStoreAssignmentDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [customServicesDialogOpen, setCustomServicesDialogOpen] = useState(false);
  const [fieldPermissionsDialogOpen, setFieldPermissionsDialogOpen] = useState(false);
  
  const { isImportDisabled } = useFieldPermissions(clientId || undefined);

  useEffect(() => {
    if (!user) return;
    
    const checkRoleAndFetch = async () => {
      const isClientAdmin = await hasRole('client_admin');
      if (!isClientAdmin) {
        navigate('/dashboard', { replace: true });
        return;
      }
      await fetchData();
    };
    
    checkRoleAndFetch();
  }, [user]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Get current user's profile to find their client_id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('client_id, clients(name)')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;

      const userClientId = profileData.client_id;
      setClientId(userClientId);
      setClientName((profileData as any).clients?.name || '');

      // Fetch users for this client
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, client_id')
        .eq('client_id', userClientId);

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const userIds = (profilesData || []).map((p) => p.user_id);
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Create a map of user_id to role
      const roleMap = new Map(
        (rolesData || []).map((r) => [r.user_id, r.role])
      );

      // Transform the data to include role
      const transformedUsers: UserProfile[] = (profilesData || []).map((u) => ({
        user_id: u.user_id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        client_id: u.client_id,
        role: roleMap.get(u.user_id) || 'user',
      }));

      setUsers(transformedUsers);

      // Fetch service users who have access to this client
      const { data: serviceAccessData, error: serviceAccessError } = await supabase
        .from('user_client_access')
        .select('user_id')
        .eq('client_id', userClientId);

      if (serviceAccessError) {
        console.error('Error fetching service access:', serviceAccessError);
        setServiceUsers([]);
      } else if (serviceAccessData && serviceAccessData.length > 0) {
        const serviceUserIds = serviceAccessData.map((sa) => sa.user_id);
        
        // Fetch profiles for these service users
        const { data: serviceProfilesData, error: serviceProfilesError } = await supabase
          .from('profiles')
          .select('user_id, email, first_name, last_name')
          .in('user_id', serviceUserIds);

        if (serviceProfilesError) {
          console.error('Error fetching service profiles:', serviceProfilesError);
          setServiceUsers([]);
        } else {
          // Due to RLS, client admins may not be able to read roles of service users
          // (service users usually belong to a different client). For display
          // purposes, treat anyone assigned via user_client_access as a Service User.
          const transformedServiceUsers: ServiceUser[] = (serviceProfilesData || [])
            .map((p) => ({
              user_id: p.user_id,
              email: p.email,
              first_name: p.first_name,
              last_name: p.last_name,
            }));
          setServiceUsers(transformedServiceUsers);
        }
      } else {
        setServiceUsers([]);
      }

      // Fetch businesses for this client
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('client_id', userClientId)
        .order('created_at', { ascending: false });

      if (businessError) throw businessError;

      setBusinesses((businessData || []) as Business[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleManageStores = (userId: string) => {
    setSelectedUserId(userId);
    setStoreAssignmentDialogOpen(true);
  };

  const handleEditBusiness = (business: Business) => {
    setEditingBusiness(business);
    setBusinessDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;

      setUsers(users.filter((u) => u.user_id !== userId));
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBusiness = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business?')) return;

    try {
      // Deletion tracking is now handled automatically by database trigger
      const { error } = await supabase.from('businesses').delete().eq('id', id);
      if (error) throw error;

      setBusinesses(businesses.filter((b) => b.id !== id));
      toast({
        title: 'Success',
        description: 'Business deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting business:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete business',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const regularUsers = users.filter((u) => u.role === 'user' || u.role === 'client_admin');
  const ownerUsers = users.filter((u) => u.role === 'store_owner');
  const clientUserCount = regularUsers.length + ownerUsers.length;
  const activeBusinesses = businesses.filter((b) => b.status === 'active');
  const pendingBusinesses = businesses.filter((b) => b.status === 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 font-montserrat">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-40 flex items-center justify-center">
              <img
                src={jasonerLogo}
                alt="Jasoner Logo"
                className="h-full w-auto object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{clientName}</h1>
              <p className="text-sm text-muted-foreground">Client Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => setSettingsDialogOpen(true)} 
              variant="outline"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button 
              onClick={() => setCustomServicesDialogOpen(true)} 
              variant="outline"
            >
              <Wrench className="w-4 h-4 mr-2" />
              Custom Services
            </Button>
            <Button 
              onClick={() => setFieldPermissionsDialogOpen(true)} 
              variant="outline"
            >
              <Shield className="w-4 h-4 mr-2" />
              Field Permissions
            </Button>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button onClick={signOut} variant="outline" className="shadow-modern">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
              <Badge variant="secondary">{clientUserCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="stores" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Stores
              <Badge variant="secondary">{businesses.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Team Management</h2>
                <p className="text-muted-foreground">
                  Manage users and store owners for {clientName}
                </p>
              </div>
              <Button onClick={() => setCreateUserDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </div>

            {/* Regular Users */}
            <Card>
              <CardHeader>
                <CardTitle>Client Users</CardTitle>
              </CardHeader>
              <CardContent>
                {regularUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No users found</p>
                ) : (
                  <div className="space-y-2">
                     {regularUsers.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {user.role === 'client_admin' ? 'Client Admin' : 'User'}
                          </Badge>
                          {user.user_id !== userId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteUser(user.user_id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Store Owners */}
            <Card>
              <CardHeader>
                <CardTitle>Store Owners</CardTitle>
              </CardHeader>
              <CardContent>
                {ownerUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No owners found</p>
                ) : (
                  <div className="space-y-2">
                    {ownerUsers.map((owner) => (
                      <div
                        key={owner.user_id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">
                            {owner.first_name} {owner.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">{owner.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Owner</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleManageStores(owner.user_id)}
                          >
                            Manage Stores
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUser(owner.user_id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="stores" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Store Management</h2>
                <p className="text-muted-foreground">
                  {activeBusinesses.length} active, {pendingBusinesses.length} pending
                </p>
              </div>
              <div className="flex gap-2">
                {!isImportDisabled() && (
                  <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                    Import
                  </Button>
                )}
                <Button onClick={() => setBusinessDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Store
                </Button>
              </div>
            </div>

            {businesses.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-muted-foreground">No stores found</p>
                </CardContent>
              </Card>
            ) : (
              <BusinessTableView
                businesses={businesses}
                onEdit={handleEditBusiness}
                onDelete={handleDeleteBusiness}
                onMultiEdit={() => {}}
                onMultiDelete={() => {}}
                showValidationErrors={true}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <CreateUserDialog
        open={createUserDialogOpen}
        onOpenChange={setCreateUserDialogOpen}
        clientId={clientId || ''}
        onUserCreated={() => fetchData(true)}
      />

      {selectedUserId && clientId && (
        <StoreOwnerAssignmentDialog
          open={storeAssignmentDialogOpen}
          onOpenChange={setStoreAssignmentDialogOpen}
          userId={selectedUserId}
          clientId={clientId}
          onAssigned={() => fetchData(true)}
        />
      )}

      <BusinessDialog
        open={businessDialogOpen}
        onOpenChange={(open) => {
          setBusinessDialogOpen(open);
          if (!open) {
            setEditingBusiness(null);
          }
        }}
        business={editingBusiness}
        onSuccess={() => fetchData(true)}
        clientId={clientId || undefined}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => fetchData(true)}
        clientId={clientId || undefined}
      />

      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        onLogoUploaded={() => fetchData(true)}
        clientId={clientId || undefined}
      />

      <ClientCustomServicesDialog
        open={customServicesDialogOpen}
        onOpenChange={setCustomServicesDialogOpen}
        clientId={clientId || ''}
        onSuccess={fetchData}
      />

      <ClientFieldPermissionsDialog
        open={fieldPermissionsDialogOpen}
        onOpenChange={setFieldPermissionsDialogOpen}
        clientId={clientId || ''}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default ClientAdminPanel;
