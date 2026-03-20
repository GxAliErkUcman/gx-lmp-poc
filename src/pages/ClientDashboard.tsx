import { useEffect, useState, useMemo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/use-admin';
import { useFieldPermissions } from '@/hooks/use-field-permissions';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Upload, Edit, Trash2, Grid, Table2, Settings, LogOut, ArrowLeft, ChevronDown, FileDown, FolderSync, Globe, HelpCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import BusinessDialog from '@/components/BusinessDialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import ImportDialog from '@/components/ImportDialog';
import BusinessTableView from '@/components/BusinessTableView';
import MultiEditDialog from '@/components/MultiEditDialog';
import type { Business } from '@/types/business';
import SettingsDialog from '@/components/SettingsDialog';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import { UserSettingsDialog } from '@/components/UserSettingsDialog';
import jasonerLogo from '@/assets/jasoner-new-logo.png';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JsonExport } from '@/components/JsonExport';
import ServiceUserCreateDialog from '@/components/ServiceUserCreateDialog';
import { UserPlus, History as HistoryIcon, Wrench, MoreVertical } from 'lucide-react';
import { VersionHistoryDialog } from '@/components/VersionHistoryDialog';
import ClientCustomServicesDialog from '@/components/ClientCustomServicesDialog';
import { ApiImportDialog } from '@/components/ApiImportDialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import { fetchAllBusinesses } from '@/lib/fetchAllRows';
import NeedAttentionBanner from '@/components/NeedAttentionBanner';
import { isActiveBusiness, hasCriticalErrors } from '@/lib/exportValidation';
import ClientSeoOverview from '@/components/ClientSeoOverview';
import { calculateSeoScore } from '@/lib/seoScoring';
import { useSeoWeights } from '@/hooks/use-seo-weights';
import { Activity, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import DashboardSummaryCards from '@/components/DashboardSummaryCards';
import { SeoScoreBadge } from '@/components/SeoScoreCard';

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
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'new' | 'async' | 'seo'>('active');
  const [userLogo, setUserLogo] = useState<string | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [businessesToDelete, setBusinessesToDelete] = useState<string[]>([]);
  const [isServiceUser, setIsServiceUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessibleClients, setAccessibleClients] = useState<{id: string; name: string; custom_photos_enabled?: boolean}[]>([]);
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

      if (!adminRole && !serviceUserRole) {
        navigate('/dashboard');
        return;
      }

      await fetchAccessibleClients(adminRole);
    };

    checkRoleAndFetch();
  }, [user]);

  useEffect(() => {
    if (accessibleClients.length === 0) return;

    const clientFromUrl = searchParams.get('client');
    let targetClientId = '';
    
    if (clientFromUrl && accessibleClients.some(c => c.id === clientFromUrl)) {
      targetClientId = clientFromUrl;
    } else if (!selectedClientId || !accessibleClients.some(c => c.id === selectedClientId)) {
      targetClientId = accessibleClients[0].id;
    }

    if (targetClientId && targetClientId !== selectedClientId) {
      setSelectedClientId(targetClientId);
    }
  }, [searchParams, accessibleClients]);

  useEffect(() => {
    if (!selectedClientId) return;
    fetchBusinesses();
  }, [selectedClientId]);

  useEffect(() => {
    if (selectedClientId === ENERGIE_360_CLIENT_ID && businesses.length > 0) {
      fetchApiSourcedBusinessIds();
    } else if (selectedClientId !== ENERGIE_360_CLIENT_ID) {
      setApiSourcedBusinessIds(new Set());
      setDataSourceFilter('all');
    }
  }, [selectedClientId, businesses]);

  const avgSeoScore = useMemo(() => {
    if (!businesses.length || (!isServiceUser && !isAdmin)) return null;
    const scores = businesses.map(b => calculateSeoScore(b).overallScore);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [businesses, isServiceUser, isAdmin]);

  const fetchApiSourcedBusinessIds = async () => {
    try {
      const { data, error } = await supabase
        .from('api_feed_locations')
        .select('store_code')
        .eq('client_id', ENERGIE_360_CLIENT_ID);
      
      if (error) throw error;
      
      const apiStoreCodes = new Set((data || []).map(d => d.store_code));
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
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, custom_photos_enabled')
          .order('name');

        if (clientsError) throw clientsError;
        setAccessibleClients(clientsData || []);
      } else {
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
          .select('id, name, custom_photos_enabled')
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
      let businessList = await fetchAllBusinesses(selectedClientId);

      if (user) {
        const { data: countryAccess } = await supabase
          .from('user_country_access')
          .select('country_code')
          .eq('user_id', user.id);

        if (countryAccess && countryAccess.length > 0) {
          const { getCountryCode } = await import('@/components/CountrySelect');
          const allowedCountries = countryAccess.map(ca => ca.country_code);
          businessList = businessList.filter(b => {
            const normalized = b.country ? getCountryCode(b.country) : '';
            return normalized && allowedCountries.includes(normalized);
          });
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

  if (authLoading || urlAuthProcessing) {
    return <LoadingSpinner fullScreen />;
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
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', id)
        .eq('client_id', selectedClientId);

      if (error) throw error;

      setBusinesses(businesses.filter(b => b.id !== id));
      toast({ title: "Success", description: "Business deleted successfully" });
    } catch (error) {
      console.error('Error deleting business:', error);
      toast({ title: "Error", description: "Failed to delete business", variant: "destructive" });
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
      const { error } = await supabase
        .from('businesses')
        .delete()
        .in('id', businessesToDelete)
        .eq('client_id', selectedClientId);

      if (error) throw error;

      setBusinesses(businesses.filter(b => !businessesToDelete.includes(b.id)));
      toast({ title: "Success", description: `${businessesToDelete.length} businesses deleted successfully` });
      setDeleteConfirmDialogOpen(false);
      setBusinessesToDelete([]);
    } catch (error) {
      console.error('Error deleting businesses:', error);
      toast({ title: "Error", description: "Failed to delete businesses", variant: "destructive" });
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSearchParams({ client: clientId });
  };

  const handleUserCreated = () => {
    toast({ title: 'Success', description: 'User created successfully' });
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

  const activeBusinesses = dataSourceFilteredBusinesses.filter(b => isActiveBusiness(b));
  const pendingBusinesses = dataSourceFilteredBusinesses.filter(b => hasCriticalErrors(b));
  const asyncBusinesses = dataSourceFilteredBusinesses.filter(b => (b as any).is_async === true);
  
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const newBusinesses = dataSourceFilteredBusinesses.filter(b => new Date(b.created_at) >= threeDaysAgo);

  const selectedClient = accessibleClients.find(c => c.id === selectedClientId);

  // Helper to get SEO band
  const getSeoBand = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 50) return 'yellow';
    return 'red';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Streamlined Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Back + Logo + Client Selector */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(isAdmin ? '/admin' : '/service-user-home')}
                className="shrink-0 h-9 w-9"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <img src={jasonerLogo} alt="Logo" className="h-6 sm:h-7 shrink-0" />
              <div className="hidden sm:block w-px h-6 bg-border" />
              <Select value={selectedClientId} onValueChange={handleClientChange}>
                <SelectTrigger className="w-full sm:w-[240px] border-0 bg-muted/50 font-medium">
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

            {/* Right: User info */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <span className="text-xs text-muted-foreground hidden lg:inline truncate max-w-[180px]">{user.email}</span>
              <UserSettingsDialog variant="ghost" />
              <Button variant="ghost" size="icon" onClick={() => window.open('/admin-guide', '_blank')} className="h-9 w-9">
                <HelpCircle className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => signOut()} className="h-9 w-9">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-6 py-5 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Title + Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="min-w-0 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                    {selectedClient?.name || 'Client Dashboard'}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {dataSourceFilteredBusinesses.length} location{dataSourceFilteredBusinesses.length !== 1 ? 's' : ''}
                    {dataSourceFilter !== 'all' && ` (filtered from ${businesses.length})`}
                  </p>
                </div>
                {(() => {
                  const clientLogo = businesses.find(b => b.logoPhoto)?.logoPhoto;
                  return clientLogo ? (
                    <Avatar className="h-12 w-12 ring-1 ring-border shrink-0">
                      <AvatarImage src={clientLogo} alt={selectedClient?.name || 'Client logo'} />
                      <AvatarFallback className="text-xs font-medium">{(selectedClient?.name || '?')[0]}</AvatarFallback>
                    </Avatar>
                  ) : null;
                })()}
              </div>
              
              {/* Desktop Actions — Grouped into logical dropdowns */}
              <div className="hidden md:flex items-center gap-2">
                {/* Primary: Add Location */}
                <Button onClick={() => { setEditingBusiness(null); setBusinessDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('actions.addBusiness')}
                </Button>

                {/* Import Dropdown */}
                {!isImportDisabled() && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-1.5">
                        <Upload className="w-4 h-4" />
                        {t('actions.import')}
                        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setImportMergeMode(false); setImportDialogOpen(true); }}>
                        <Upload className="w-4 h-4 mr-2" />
                        {t('actions.import')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setImportMergeMode(true); setImportDialogOpen(true); }}>
                        <FolderSync className="w-4 h-4 mr-2" />
                        {t('actions.mergeImport')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* API Sync + Export */}
                <ApiImportDialog 
                  clientId={selectedClientId} 
                  clientName={selectedClient?.name || ''}
                  onSyncComplete={() => fetchBusinesses(true)}
                />
                <JsonExport 
                  businesses={businesses} 
                  clientName={selectedClient?.name} 
                  onNavigateToBusiness={handleEditBusiness}
                />

                {/* Tools Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-1.5">
                      <Settings className="w-4 h-4" />
                      Tools
                      <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => setCreateUserDialogOpen(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      {t('actions.createUser')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCustomServicesDialogOpen(true)}>
                      <Wrench className="w-4 h-4 mr-2" />
                      {t('actions.customServices')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setVersionHistoryOpen(true)}>
                      <HistoryIcon className="w-4 h-4 mr-2" />
                      {t('actions.versionHistory')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSettingsDialogOpen(true)}>
                      <Settings className="w-4 h-4 mr-2" />
                      {t('actions.settings')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Mobile Actions */}
              <div className="flex md:hidden items-center gap-2">
                <Button 
                  onClick={() => { setEditingBusiness(null); setBusinessDialogOpen(true); }}
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
                        clientName={selectedClient?.name || ''}
                        onSyncComplete={() => fetchBusinesses(true)}
                      />
                      <JsonExport 
                        businesses={businesses} 
                        clientName={selectedClient?.name} 
                        onNavigateToBusiness={handleEditBusiness}
                      />
                      {!isImportDisabled() && (
                        <>
                          <Button variant="outline" onClick={() => { setImportMergeMode(true); setImportDialogOpen(true); }} className="w-full justify-start">
                            <FolderSync className="w-4 h-4 mr-2" />
                            {t('actions.mergeImport')}
                          </Button>
                          <Button variant="outline" onClick={() => { setImportMergeMode(false); setImportDialogOpen(true); }} className="w-full justify-start">
                            <Upload className="w-4 h-4 mr-2" />
                            {t('actions.import')}
                          </Button>
                        </>
                      )}
                      <div className="border-t pt-2 mt-1">
                        <Button variant="outline" onClick={() => setCreateUserDialogOpen(true)} className="w-full justify-start">
                          <UserPlus className="w-4 h-4 mr-2" />
                          {t('actions.createUser')}
                        </Button>
                        <Button variant="outline" onClick={() => setCustomServicesDialogOpen(true)} className="w-full justify-start mt-2">
                          <Wrench className="w-4 h-4 mr-2" />
                          {t('actions.customServices')}
                        </Button>
                        <Button variant="outline" onClick={() => setVersionHistoryOpen(true)} className="w-full justify-start mt-2">
                          <HistoryIcon className="w-4 h-4 mr-2" />
                          {t('actions.versionHistory')}
                        </Button>
                        <Button variant="outline" onClick={() => setSettingsDialogOpen(true)} className="w-full justify-start mt-2">
                          <Settings className="w-4 h-4 mr-2" />
                          {t('actions.settings')}
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {businesses.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/5 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-primary/60" />
                  </div>
                  <h2 className="text-lg font-semibold mb-1">{t('messages.noBusinessesFound')}</h2>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    No locations for this client yet — Import a spreadsheet or add your first location to get started.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button onClick={() => setBusinessDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('actions.addFirstBusiness')}
                    </Button>
                    {!isImportDisabled() && (
                      <Button variant="outline" onClick={() => { setImportMergeMode(false); setImportDialogOpen(true); }}>
                        <Upload className="w-4 h-4 mr-2" />
                        {t('actions.import')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Summary Cards */}
                <DashboardSummaryCards
                  total={dataSourceFilteredBusinesses.length}
                  active={activeBusinesses.length}
                  needAttention={pendingBusinesses.length}
                  avgSeoScore={avgSeoScore}
                />

                {/* View Controls + Data Source Filter */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted rounded-lg p-0.5">
                      <Button
                        variant={viewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className="h-8 px-3"
                      >
                        <Table2 className="w-4 h-4 mr-1.5" />
                        <span className="hidden sm:inline text-xs">Table</span>
                      </Button>
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="h-8 px-3"
                      >
                        <Grid className="w-4 h-4 mr-1.5" />
                        <span className="hidden sm:inline text-xs">Grid</span>
                      </Button>
                    </div>
                    
                    {isEnergie360 && (
                      <Select value={dataSourceFilter} onValueChange={(v) => setDataSourceFilter(v as 'all' | 'api' | 'crud')}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
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

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'pending' | 'new' | 'async' | 'seo')}>
                  <TabsList className="mb-4 w-full flex flex-wrap h-auto gap-1 p-1 bg-muted/60">
                    <TabsTrigger value="active" className="flex-1 min-w-[80px] text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 hidden sm:inline text-emerald-600" />
                      {t('status.active')}
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{activeBusinesses.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="flex-1 min-w-[80px] text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1.5 hidden sm:inline text-amber-600" />
                      {t('tabs.needAttention')}
                      <Badge variant={pendingBusinesses.length > 0 ? "destructive" : "secondary"} className="ml-1.5 text-[10px] px-1.5 py-0">
                        {pendingBusinesses.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="new" className="flex-1 min-w-[80px] text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                      <Plus className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                      {t('tabs.new')}
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{newBusinesses.length}</Badge>
                    </TabsTrigger>
                    {isEnergie360 && (
                      <TabsTrigger value="async" className="flex-1 min-w-[80px] text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                        Async
                        <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{asyncBusinesses.length}</Badge>
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="seo" className="flex-1 min-w-[80px] text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                      <Activity className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                      SEO Health
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="active" className="animate-in fade-in-50 duration-300">
                    {viewMode === 'table' ? (
                      <BusinessTableView
                        businesses={activeBusinesses}
                        onEdit={handleEditBusiness}
                        onDelete={handleDeleteBusiness}
                        onMultiEdit={handleMultiEdit}
                        onMultiDelete={handleMultiDelete}
                        clientName={selectedClient?.name || ''}
                        customPhotosEnabled={selectedClient?.custom_photos_enabled ?? false}
                      />
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {activeBusinesses.map((business) => {
                          const seo = calculateSeoScore(business);
                          return (
                            <Card 
                              key={business.id} 
                              className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 shadow-sm bg-card"
                              onClick={() => handleEditBusiness(business)}
                            >
                              <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{business.businessName || 'Unnamed'}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{business.storeCode}</p>
                                  </div>
                                  <Badge variant="outline" className="shrink-0 text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                                    Active
                                  </Badge>
                                </div>
                                <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                                  {business.addressLine1 && (
                                    <p className="flex items-center gap-1.5 truncate">
                                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                                      {business.addressLine1}
                                    </p>
                                  )}
                                  {(business.city || business.country) && (
                                    <p className="flex items-center gap-1.5 truncate pl-5">
                                      {[business.city, business.state, business.country].filter(Boolean).join(', ')}
                                    </p>
                                  )}
                                  {business.primaryCategory && (
                                    <p className="flex items-center gap-1.5 truncate">
                                      <Globe className="w-3.5 h-3.5 shrink-0" />
                                      {business.primaryCategory}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t">
                                  <SeoScoreBadge score={seo.overallScore} band={getSeoBand(seo.overallScore)} />
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleEditBusiness(business); }}>
                                      <Edit className="w-3.5 h-3.5 mr-1" />
                                      Edit
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="pending" className="animate-in fade-in-50 duration-300">
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
                        clientName={selectedClient?.name || ''}
                        customPhotosEnabled={selectedClient?.custom_photos_enabled ?? false}
                      />
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {pendingBusinesses.map((business) => (
                          <Card 
                            key={business.id} 
                            className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 shadow-sm ring-1 ring-amber-200/50 dark:ring-amber-800/30"
                            onClick={() => handleEditBusiness(business)}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{business.businessName || 'Unnamed'}</h3>
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{business.storeCode}</p>
                                </div>
                                <Badge variant="outline" className="shrink-0 text-[10px] border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Attention
                                </Badge>
                              </div>
                              <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                                {business.addressLine1 && (
                                  <p className="flex items-center gap-1.5 truncate">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    {business.addressLine1}
                                  </p>
                                )}
                                {(business.city || business.country) && (
                                  <p className="flex items-center gap-1.5 truncate pl-5">
                                    {[business.city, business.state, business.country].filter(Boolean).join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-end pt-3 border-t">
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleEditBusiness(business); }}>
                                  <Edit className="w-3.5 h-3.5 mr-1" />
                                  Fix Issues
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="new" className="animate-in fade-in-50 duration-300">
                    {viewMode === 'table' ? (
                      <BusinessTableView
                        businesses={newBusinesses}
                        onEdit={handleEditBusiness}
                        onDelete={handleDeleteBusiness}
                        onMultiEdit={handleMultiEdit}
                        onMultiDelete={handleMultiDelete}
                        clientName={selectedClient?.name || ''}
                        customPhotosEnabled={selectedClient?.custom_photos_enabled ?? false}
                      />
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {newBusinesses.map((business) => (
                          <Card 
                            key={business.id} 
                            className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 shadow-sm ring-1 ring-primary/20"
                            onClick={() => handleEditBusiness(business)}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{business.businessName || 'Unnamed'}</h3>
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{business.storeCode}</p>
                                </div>
                                <Badge variant="outline" className="shrink-0 text-[10px] border-primary/30 text-primary bg-primary/5">
                                  New
                                </Badge>
                              </div>
                              <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                                {business.addressLine1 && (
                                  <p className="flex items-center gap-1.5 truncate">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    {business.addressLine1}
                                  </p>
                                )}
                                {(business.city || business.country) && (
                                  <p className="flex items-center gap-1.5 truncate pl-5">
                                    {[business.city, business.state, business.country].filter(Boolean).join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-end pt-3 border-t">
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleEditBusiness(business); }}>
                                  <Edit className="w-3.5 h-3.5 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {isEnergie360 && (
                    <TabsContent value="async" className="animate-in fade-in-50 duration-300">
                      {viewMode === 'table' ? (
                        <BusinessTableView
                          businesses={asyncBusinesses}
                          onEdit={handleEditBusiness}
                          onDelete={handleDeleteBusiness}
                          onMultiEdit={handleMultiEdit}
                          onMultiDelete={handleMultiDelete}
                          clientName={selectedClient?.name || ''}
                          customPhotosEnabled={selectedClient?.custom_photos_enabled ?? false}
                        />
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {asyncBusinesses.map((business) => (
                            <Card 
                              key={business.id} 
                              className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 shadow-sm ring-1 ring-destructive/20"
                              onClick={() => handleEditBusiness(business)}
                            >
                              <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold truncate">{business.businessName || 'Unnamed'}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{business.storeCode}</p>
                                  </div>
                                  <Badge variant="destructive" className="shrink-0 text-[10px]">Async</Badge>
                                </div>
                                <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                                  {business.addressLine1 && (
                                    <p className="flex items-center gap-1.5 truncate">
                                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                                      {business.addressLine1}
                                    </p>
                                  )}
                                  <p className="text-xs text-destructive mt-1">Missing from Eco-Movement feed</p>
                                </div>
                                <div className="flex items-center justify-end pt-3 border-t">
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleEditBusiness(business); }}>
                                    <Edit className="w-3.5 h-3.5 mr-1" />
                                    Edit
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  )}

                  <TabsContent value="seo" className="animate-in fade-in-50 duration-300">
                    <ClientSeoOverview 
                      businesses={dataSourceFilteredBusinesses} 
                      onEditBusiness={handleEditBusiness}
                      clientName={selectedClient?.name}
                      clientId={selectedClientId}
                      customPhotosEnabled={selectedClient?.custom_photos_enabled ?? false}
                    />
                  </TabsContent>
                </Tabs>
              </>
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
        customPhotosEnabled={selectedClient?.custom_photos_enabled ?? false}
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
          if (business) handleEditBusiness(business);
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
