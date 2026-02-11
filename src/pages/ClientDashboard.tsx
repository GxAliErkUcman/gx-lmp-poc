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
import { UserSettingsDialog } from '@/components/UserSettingsDialog';
import jasonerLogo from '@/assets/jasoner-horizontal-logo.png';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JsonExport } from '@/components/JsonExport';
import ServiceUserCreateDialog from '@/components/ServiceUserCreateDialog';
import { UserPlus, History as HistoryIcon, Wrench, MoreVertical } from 'lucide-react';
import { VersionHistoryDialog } from '@/components/VersionHistoryDialog';
import ClientCustomServicesDialog from '@/components/ClientCustomServicesDialog';
import { ApiImportDialog } from '@/components/ApiImportDialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import NeedAttentionBanner from '@/components/NeedAttentionBanner';
import { hasExportValidationErrors } from '@/lib/exportValidation';

// Energie 360° client ID for data source filter
const ENERGIE_360_CLIENT_ID = 'e77c44c5-0585-4225-a5ea-59a38edb85fb';

const ClientDashboard = () => {
  const { t } = useTranslation();
  const { user, signOut, loading: authLoading, urlAuthProcessing } = useAuth();
  const { hasRole } = useAdmin();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importMergeMode, setImportMergeMode] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [multiEditDialogOpen, setMultiEditDialogOpen] = useState(false);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'new' | 'async'>('active');
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
  const [dataSourceFilter, setDataSourceFilter] = useState<'all' | 'api' | 'crud'>('all');
  const [apiSourcedBusinessIds, setApiSourcedBusinessIds] = useState<Set<string>>(new Set());
  
  const { isImportDisabled } = useFieldPermissions(selectedClientId);
  const isEnergie360 = selectedClientId === ENERGIE_360_CLIENT_ID;

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

  // Fetch API feed locations after businesses are loaded (for Energie 360° only)
  useEffect(() => {
    if (selectedClientId === ENERGIE_360_CLIENT_ID && businesses.length > 0) {
      fetchApiSourcedBusinessIds();
    } else if (selectedClientId !== ENERGIE_360_CLIENT_ID) {
      setApiSourcedBusinessIds(new Set());
      setDataSourceFilter('all');
    }
  }, [selectedClientId, businesses]);

  const fetchApiSourcedBusinessIds = async () => {
    try {
      // Get all store codes that exist in the API feed
      const { data, error } = await supabase
        .from('api_feed_locations')
        .select('store_code')
        .eq('client_id', ENERGIE_360_CLIENT_ID);
      
      if (error) throw error;
      
      const apiStoreCodes = new Set((data || []).map(d => d.store_code));
      
      // Now map these store codes to business IDs
      const apiBusinessIds = new Set(
        businesses
          .filter(b => apiStoreCodes.has(b.storeCode))
          .map(b => b.id)
      );
      
      setApiSourcedBusinessIds(apiBusinessIds);
    } catch (error) {
      console.error('Error fetching API feed locations:', error);
    }
  };

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

  const fetchBusinesses = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('client_id', selectedClientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      let businessList = (data || []) as Business[];

      // Apply country restrictions if user has them
      if (user) {
        const { data: countryAccess } = await supabase
          .from('user_country_access')
          .select('country_code')
          .eq('user_id', user.id);
        
        if (countryAccess && countryAccess.length > 0) {
          const allowedCountries = countryAccess.map(ca => ca.country_code);
          businessList = businessList.filter(b => b.country && allowedCountries.includes(b.country));
        }
      }

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
      if (!silent) setLoading(false);
    }
  };

  // Wait for auth (and URL-based login) to initialize before checking user/redirecting
  if (authLoading || urlAuthProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isServiceUser && !isAdmin && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleDeleteBusiness = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business?')) return;

    try {
      // Deletion tracking is now handled automatically by database trigger
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

  // Apply data source filter for Energie 360°
  const dataSourceFilteredBusinesses = isEnergie360 && dataSourceFilter !== 'all'
    ? businesses.filter(b => {
        const isApiSourced = apiSourcedBusinessIds.has(b.id);
        if (dataSourceFilter === 'api') return isApiSourced;
        if (dataSourceFilter === 'crud') return !isApiSourced;
        return true;
      })
    : businesses;

  // Filter by status, async flag, and export validation errors
  // Active: status=active AND not async AND no export validation errors
  const activeBusinesses = dataSourceFilteredBusinesses.filter(b => b.status === 'active' && (b as any).is_async !== true && !hasExportValidationErrors(b));
  // Need Attention: status=pending OR async=true OR (active but has export validation errors)
  const pendingBusinesses = dataSourceFilteredBusinesses.filter(b => b.status === 'pending' || (b as any).is_async === true || (b.status === 'active' && (b as any).is_async !== true && hasExportValidationErrors(b)));
  // Async only (for Energie 360° tab)
  const asyncBusinesses = dataSourceFilteredBusinesses.filter(b => (b as any).is_async === true);
  
  // Filter businesses created within the last 3 days
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const newBusinesses = dataSourceFilteredBusinesses.filter(b => new Date(b.created_at) >= threeDaysAgo);

  const selectedClient = accessibleClients.find(c => c.id === selectedClientId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(isAdmin ? '/admin' : '/service-user-home')}
                className="px-2 sm:px-3"
              >
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('nav.backToOverview')}</span>
              </Button>
              <img src={jasonerLogo} alt="Logo" className="h-6 sm:h-8" />
              {/* Client Selector */}
              <Select value={selectedClientId} onValueChange={handleClientChange}>
                <SelectTrigger className="w-full sm:w-[280px]">
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
            <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end">
              <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">{user.email}</span>
              <UserSettingsDialog variant="ghost" />
              <Button variant="ghost" size="sm" onClick={() => signOut()} className="px-2 sm:px-3">
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('nav.signOut')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 mb-6 sm:mb-8">
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold mb-2">
                  {accessibleClients.find(c => c.id === selectedClientId)?.name || 'Client Dashboard'}
                </h1>
                <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <span>{t('status.total')}: {dataSourceFilteredBusinesses.length}{dataSourceFilter !== 'all' ? ` (of ${businesses.length})` : ''}</span>
                  <span>{t('status.active')}: {activeBusinesses.length}</span>
                  <span>{t('status.pending')}: {pendingBusinesses.length}</span>
                </div>
              </div>
              
              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-2 flex-wrap">
                <ApiImportDialog 
                  clientId={selectedClientId} 
                  clientName={accessibleClients.find(c => c.id === selectedClientId)?.name || ''}
                  onSyncComplete={() => fetchBusinesses(true)}
                />
                <JsonExport 
                  businesses={businesses} 
                  clientName={accessibleClients.find(c => c.id === selectedClientId)?.name} 
                  onNavigateToBusiness={handleEditBusiness}
                />
                <Button 
                  variant="outline" 
                  onClick={() => setVersionHistoryOpen(true)}
                >
                  <HistoryIcon className="w-4 h-4 mr-2" />
                  {t('actions.versionHistory')}
                </Button>
                <Button variant="outline" onClick={() => setSettingsDialogOpen(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  {t('actions.settings')}
                </Button>
                <Button variant="outline" onClick={() => setCustomServicesDialogOpen(true)}>
                  <Wrench className="w-4 h-4 mr-2" />
                  {t('actions.customServices')}
                </Button>
                <Button onClick={() => {
                  setEditingBusiness(null);
                  setBusinessDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('actions.addBusiness')}
                </Button>
                {!isImportDisabled() && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setImportMergeMode(true);
                        setImportDialogOpen(true);
                      }}
                      className="bg-sage-100 hover:bg-sage-200 border-sage-300 text-sage-800 dark:bg-sage-900/30 dark:hover:bg-sage-900/50 dark:border-sage-700 dark:text-sage-300"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t('actions.mergeImport')}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setImportMergeMode(false);
                        setImportDialogOpen(true);
                      }}
                      className="bg-sage-100 hover:bg-sage-200 border-sage-300 text-sage-800 dark:bg-sage-900/30 dark:hover:bg-sage-900/50 dark:border-sage-700 dark:text-sage-300"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t('actions.import')}
                    </Button>
                  </>
                )}
              </div>

              {/* Mobile Actions */}
              <div className="flex md:hidden items-center gap-2">
                <Button 
                  onClick={() => {
                    setEditingBusiness(null);
                    setBusinessDialogOpen(true);
                  }}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('actions.addBusiness')}
                </Button>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-auto max-h-[80vh]">
                    <div className="flex flex-col gap-2 mt-4">
                      <ApiImportDialog 
                        clientId={selectedClientId} 
                        clientName={accessibleClients.find(c => c.id === selectedClientId)?.name || ''}
                        onSyncComplete={() => fetchBusinesses(true)}
                      />
                      <JsonExport 
                        businesses={businesses} 
                        clientName={accessibleClients.find(c => c.id === selectedClientId)?.name} 
                        onNavigateToBusiness={handleEditBusiness}
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => setVersionHistoryOpen(true)}
                        className="w-full justify-start"
                      >
                        <HistoryIcon className="w-4 h-4 mr-2" />
                        {t('actions.versionHistory')}
                      </Button>
                      <Button variant="outline" onClick={() => setSettingsDialogOpen(true)} className="w-full justify-start">
                        <Settings className="w-4 h-4 mr-2" />
                        {t('actions.settings')}
                      </Button>
                      <Button variant="outline" onClick={() => setCustomServicesDialogOpen(true)} className="w-full justify-start">
                        <Wrench className="w-4 h-4 mr-2" />
                        {t('actions.customServices')}
                      </Button>
                      {!isImportDisabled() && (
                        <>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setImportMergeMode(true);
                              setImportDialogOpen(true);
                            }} 
                            className="w-full justify-start bg-sage-100 hover:bg-sage-200 border-sage-300 text-sage-800 dark:bg-sage-900/30 dark:hover:bg-sage-900/50 dark:border-sage-700 dark:text-sage-300"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {t('actions.mergeImport')}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setImportMergeMode(false);
                              setImportDialogOpen(true);
                            }} 
                            className="w-full justify-start bg-sage-100 hover:bg-sage-200 border-sage-300 text-sage-800 dark:bg-sage-900/30 dark:hover:bg-sage-900/50 dark:border-sage-700 dark:text-sage-300"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {t('actions.import')}
                          </Button>
                        </>
                      )}
                      <Button 
                        onClick={() => setCreateUserDialogOpen(true)}
                        className="w-full justify-start"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {t('actions.createUser')}
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="mb-6 hidden md:block">
              <Button 
                onClick={() => setCreateUserDialogOpen(true)}
                size="lg"
                className="w-full sm:w-auto"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                {t('actions.createUser')} {selectedClient?.name}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {t('messages.createUserDescription')}
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
                
                {/* Data Source filter - Only for Energie 360° */}
                {isEnergie360 && (
                  <Select value={dataSourceFilter} onValueChange={(v) => setDataSourceFilter(v as 'all' | 'api' | 'crud')}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Data Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="api">API Only</SelectItem>
                      <SelectItem value="crud">CRUD Only</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {businesses.length === 0 ? (
              <Card>
                <CardContent className="py-8 sm:py-12 text-center">
                  <p className="text-muted-foreground mb-4">{t('messages.noBusinessesFound')}</p>
                  <Button onClick={() => setBusinessDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('actions.addFirstBusiness')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'pending' | 'new' | 'async')}>
                <TabsList className="mb-4 w-full flex flex-wrap h-auto gap-1 p-1">
                  <TabsTrigger value="active" className="flex-1 min-w-[80px] text-xs sm:text-sm">
                    {t('status.active')} ({activeBusinesses.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="flex-1 min-w-[80px] text-xs sm:text-sm">
                    {t('tabs.needAttention')} ({pendingBusinesses.length})
                  </TabsTrigger>
                  <TabsTrigger value="new" className="flex-1 min-w-[80px] text-xs sm:text-sm">
                    {t('tabs.new')} ({newBusinesses.length})
                  </TabsTrigger>
                  {isEnergie360 && (
                    <TabsTrigger value="async" className="flex-1 min-w-[80px] text-xs sm:text-sm">
                      Async ({asyncBusinesses.length})
                    </TabsTrigger>
                  )}
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
                  <NeedAttentionBanner 
                    pendingBusinesses={pendingBusinesses} 
                    showAsyncInfo={isEnergie360}
                  />
                  {viewMode === 'table' ? (
                    <BusinessTableView
                      businesses={pendingBusinesses}
                      onEdit={handleEditBusiness}
                      onDelete={handleDeleteBusiness}
                      onMultiEdit={handleMultiEdit}
                      onMultiDelete={handleMultiDelete}
                      showValidationErrors={true}
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

                <TabsContent value="new">
                  {viewMode === 'table' ? (
                    <BusinessTableView
                      businesses={newBusinesses}
                      onEdit={handleEditBusiness}
                      onDelete={handleDeleteBusiness}
                      onMultiEdit={handleMultiEdit}
                      onMultiDelete={handleMultiDelete}
                    />
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {newBusinesses.map((business) => (
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

                {/* Async Locations Tab - Only for Energie 360° */}
                {isEnergie360 && (
                  <TabsContent value="async">
                    {viewMode === 'table' ? (
                      <BusinessTableView
                        businesses={asyncBusinesses}
                        onEdit={handleEditBusiness}
                        onDelete={handleDeleteBusiness}
                        onMultiEdit={handleMultiEdit}
                        onMultiDelete={handleMultiDelete}
                      />
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {asyncBusinesses.map((business) => (
                          <Card key={business.id}>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                {business.businessName}
                                <Badge variant="destructive" className="text-xs">Async</Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2 text-sm">
                                <p className="text-muted-foreground">{business.addressLine1}</p>
                                <p className="text-muted-foreground">{business.city}, {business.state}</p>
                                <p className="text-xs text-destructive mt-2">Missing from Eco-Movement feed</p>
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
                )}
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
        onSuccess={() => fetchBusinesses(true)}
        clientId={selectedClientId}
      />
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) setImportMergeMode(false);
        }}
        onSuccess={() => fetchBusinesses(true)}
        clientId={selectedClientId}
        mergeMode={importMergeMode}
      />
      <MultiEditDialog
        open={multiEditDialogOpen}
        onOpenChange={setMultiEditDialogOpen}
        selectedIds={selectedBusinessIds}
        onSuccess={() => fetchBusinesses(true)}
        clientId={selectedClientId}
      />
      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        onLogoUploaded={() => fetchBusinesses(true)}
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
        onImport={() => fetchBusinesses(true)}
        onEditBusiness={(businessId) => {
          const business = businesses.find(b => b.id === businessId);
          if (business) {
            handleEditBusiness(business);
          }
        }}
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
