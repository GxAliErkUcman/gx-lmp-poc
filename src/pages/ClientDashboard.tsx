import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/use-admin';
import { useFieldPermissions } from '@/hooks/use-field-permissions';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Upload, Edit, Trash2, Grid, Table2, Settings, LogOut, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import BusinessDialog from '@/components/BusinessDialog';
import ImportDialog from '@/components/ImportDialog';
import BusinessTableView from '@/components/BusinessTableView';
import MultiEditDialog from '@/components/MultiEditDialog';
import type { Business } from '@/types/business';
import SettingsDialog from '@/components/SettingsDialog';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import jasonerLogo from '@/assets/jasoner-horizontal-logo.png';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JsonExport } from '@/components/JsonExport';
import ServiceUserCreateDialog from '@/components/ServiceUserCreateDialog';
import { UserPlus, History as HistoryIcon, Wrench } from 'lucide-react';
import { VersionHistoryDialog } from '@/components/VersionHistoryDialog';
import ClientCustomServicesDialog from '@/components/ClientCustomServicesDialog';

const ClientDashboard = () => {
  const { user, signOut } = useAuth();
  const { hasRole } = useAdmin();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [multiEditDialogOpen, setMultiEditDialogOpen] = useState(false);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [userLogo, setUserLogo] = useState<string | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [businessesToDelete, setBusinessesToDelete] = useState<string[]>([]);
  const [isServiceUser, setIsServiceUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessibleClients, setAccessibleClients] = useState<{id: string; name: string}[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [customServicesDialogOpen, setCustomServicesDialogOpen] = useState(false);
  
  const { isImportDisabled } = useFieldPermissions(selectedClientId);

  useEffect(() => {
    const checkRoleAndFetch = async () => {
      if (!user) return;

      const adminRole = await hasRole('admin');
      const serviceUserRole = await hasRole('service_user');
      
      setIsAdmin(adminRole);
      setIsServiceUser(serviceUserRole);

      // Allow both admins and service users
      if (!adminRole && !serviceUserRole) {
        navigate('/dashboard');
        return;
      }

      await fetchAccessibleClients(adminRole);
    };

    checkRoleAndFetch();
  }, [user]);

  useEffect(() => {
    const clientFromUrl = searchParams.get('client');
    if (clientFromUrl && accessibleClients.length > 0) {
      setSelectedClientId(clientFromUrl);
    } else if (accessibleClients.length > 0 && !selectedClientId) {
      setSelectedClientId(accessibleClients[0].id);
    }
  }, [searchParams, accessibleClients]);

  useEffect(() => {
    if (selectedClientId) {
      fetchBusinesses();
    }
  }, [selectedClientId]);

  const fetchAccessibleClients = async (isAdminUser: boolean) => {
    try {
      if (isAdminUser) {
        // Admins can access all clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name')
          .order('name');

        if (clientsError) throw clientsError;
        setAccessibleClients(clientsData || []);
      } else {
        // Service users can only access assigned clients
        const { data: accessData, error: accessError } = await supabase
          .from('user_client_access')
          .select('client_id')
          .eq('user_id', user!.id);

        if (accessError) throw accessError;

        const clientIds = accessData.map(a => a.client_id);

        if (clientIds.length === 0) {
          setAccessibleClients([]);
          return;
        }

        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name')
          .in('id', clientIds)
          .order('name');

        if (clientsError) throw clientsError;

        setAccessibleClients(clientsData || []);
      }
    } catch (error) {
      console.error('Error fetching accessible clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load accessible clients',
        variant: 'destructive'
      });
    }
  };

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('client_id', selectedClientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const businessList = (data || []) as Business[];
      setBusinesses(businessList);
      
      const logoUrl = businessList.length > 0 ? businessList[0].logoPhoto : null;
      setUserLogo(logoUrl);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast({
        title: "Error",
        description: "Failed to load businesses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isServiceUser && !isAdmin && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleDeleteBusiness = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business?')) return;

    try {
      // CRITICAL: Only delete businesses from the current client
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', id)
        .eq('client_id', selectedClientId);

      if (error) throw error;

      setBusinesses(businesses.filter(b => b.id !== id));
      toast({
        title: "Success",
        description: "Business deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting business:', error);
      toast({
        title: "Error",
        description: "Failed to delete business",
        variant: "destructive",
      });
    }
  };

  const handleEditBusiness = (business: Business) => {
    setEditingBusiness(business);
    setBusinessDialogOpen(true);
  };

  const handleMultiEdit = (ids: string[]) => {
    setSelectedBusinessIds(ids);
    setMultiEditDialogOpen(true);
  };

  const handleMultiDelete = (ids: string[]) => {
    setBusinessesToDelete(ids);
    setDeleteConfirmDialogOpen(true);
  };

  const confirmMultiDelete = async () => {
    try {
      // CRITICAL: Only delete businesses from the current client
      const { error } = await supabase
        .from('businesses')
        .delete()
        .in('id', businessesToDelete)
        .eq('client_id', selectedClientId);

      if (error) throw error;

      setBusinesses(businesses.filter(b => !businessesToDelete.includes(b.id)));
      toast({
        title: "Success",
        description: `${businessesToDelete.length} businesses deleted successfully`,
      });
      setDeleteConfirmDialogOpen(false);
      setBusinessesToDelete([]);
    } catch (error) {
      console.error('Error deleting businesses:', error);
      toast({
        title: "Error",
        description: "Failed to delete businesses",
        variant: "destructive",
      });
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSearchParams({ client: clientId });
  };

  const handleUserCreated = () => {
    toast({
      title: 'Success',
      description: 'User created successfully',
    });
  };

  const activeBusinesses = businesses.filter(b => b.status === 'active');
  const pendingBusinesses = businesses.filter(b => b.status === 'pending');

  const selectedClient = accessibleClients.find(c => c.id === selectedClientId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(isAdmin ? '/admin' : '/service-user-home')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Overview
              </Button>
              <img src={jasonerLogo} alt="Logo" className="h-8" />
              {/* Client Selector */}
              <Select value={selectedClientId} onValueChange={handleClientChange}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {accessibleClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {accessibleClients.find(c => c.id === selectedClientId)?.name || 'Client Dashboard'}
                </h1>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Total: {businesses.length}</span>
                  <span>Active: {activeBusinesses.length}</span>
                  <span>Pending: {pendingBusinesses.length}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <JsonExport 
                  businesses={businesses} 
                  clientName={accessibleClients.find(c => c.id === selectedClientId)?.name} 
                />
                <Button 
                  variant="outline" 
                  onClick={() => setVersionHistoryOpen(true)}
                >
                  <HistoryIcon className="w-4 h-4 mr-2" />
                  Version History
                </Button>
                <Button variant="outline" onClick={() => setSettingsDialogOpen(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                <Button variant="outline" onClick={() => setCustomServicesDialogOpen(true)}>
                  <Wrench className="w-4 h-4 mr-2" />
                  Custom Services
                </Button>
                {!isImportDisabled() && (
                  <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                )}
                <Button onClick={() => {
                  setEditingBusiness(null);
                  setBusinessDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Business
                </Button>
              </div>
            </div>

            {/* Create User Button - Prominent placement */}
            <div className="mb-6">
              <Button 
                onClick={() => setCreateUserDialogOpen(true)}
                size="lg"
                className="w-full sm:w-auto"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Create User for {selectedClient?.name}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Create Client Admins, Users, or Store Owners for this client
              </p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <Table2 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {businesses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No businesses found for this client</p>
                  <Button onClick={() => setBusinessDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Business
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'pending')}>
                <TabsList className="mb-4">
                  <TabsTrigger value="active">
                    Active Locations ({activeBusinesses.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Need Attention ({pendingBusinesses.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                  {viewMode === 'table' ? (
                    <BusinessTableView
                      businesses={activeBusinesses}
                      onEdit={handleEditBusiness}
                      onDelete={handleDeleteBusiness}
                      onMultiEdit={handleMultiEdit}
                      onMultiDelete={handleMultiDelete}
                    />
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {activeBusinesses.map((business) => (
                        <Card key={business.id}>
                          <CardHeader>
                            <CardTitle>{business.businessName}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <p className="text-muted-foreground">{business.addressLine1}</p>
                              <p className="text-muted-foreground">{business.city}, {business.state}</p>
                              <div className="flex gap-2 mt-4">
                                <Button size="sm" variant="outline" onClick={() => handleEditBusiness(business)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteBusiness(business.id)}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="pending">
                  {viewMode === 'table' ? (
                    <BusinessTableView
                      businesses={pendingBusinesses}
                      onEdit={handleEditBusiness}
                      onDelete={handleDeleteBusiness}
                      onMultiEdit={handleMultiEdit}
                      onMultiDelete={handleMultiDelete}
                    />
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {pendingBusinesses.map((business) => (
                        <Card key={business.id}>
                          <CardHeader>
                            <CardTitle>{business.businessName}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <p className="text-muted-foreground">{business.addressLine1}</p>
                              <p className="text-muted-foreground">{business.city}, {business.state}</p>
                              <div className="flex gap-2 mt-4">
                                <Button size="sm" variant="outline" onClick={() => handleEditBusiness(business)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteBusiness(business.id)}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </main>

      {/* Dialogs */}
      <BusinessDialog
        open={businessDialogOpen}
        onOpenChange={setBusinessDialogOpen}
        business={editingBusiness}
        onSuccess={fetchBusinesses}
        clientId={selectedClientId}
      />
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={fetchBusinesses}
        clientId={selectedClientId}
      />
      <MultiEditDialog
        open={multiEditDialogOpen}
        onOpenChange={setMultiEditDialogOpen}
        selectedIds={selectedBusinessIds}
        onSuccess={fetchBusinesses}
        clientId={selectedClientId}
      />
      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        onLogoUploaded={fetchBusinesses}
        clientId={selectedClientId}
      />
      <DeleteConfirmationDialog
        open={deleteConfirmDialogOpen}
        onOpenChange={setDeleteConfirmDialogOpen}
        onConfirm={confirmMultiDelete}
        itemCount={businessesToDelete.length}
        itemType="business"
      />
      {selectedClient && (
        <ServiceUserCreateDialog
          open={createUserDialogOpen}
          onOpenChange={setCreateUserDialogOpen}
          clientId={selectedClientId}
          clientName={selectedClient.name}
          onUserCreated={handleUserCreated}
        />
      )}
      <VersionHistoryDialog
        open={versionHistoryOpen}
        onOpenChange={setVersionHistoryOpen}
        clientId={selectedClientId}
        onImport={fetchBusinesses}
      />

      <ClientCustomServicesDialog
        open={customServicesDialogOpen}
        onOpenChange={setCustomServicesDialogOpen}
        clientId={selectedClientId}
      />
    </div>
  );
};

export default ClientDashboard;
