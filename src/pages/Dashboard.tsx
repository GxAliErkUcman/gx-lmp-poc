import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/use-admin';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Upload, Edit, Trash2, Grid, Table2, Settings, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import BusinessDialog from '@/components/BusinessDialog';
import { JsonExport } from '@/components/JsonExport';
import ImportDialog from '@/components/ImportDialog';
import BusinessTableView from '@/components/BusinessTableView';
import MultiEditDialog from '@/components/MultiEditDialog';
import type { Business } from '@/types/business';
import SettingsDialog from '@/components/SettingsDialog';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import { UserSettingsDialog } from '@/components/UserSettingsDialog';
import jasonerLogo from '@/assets/jasoner-horizontal-logo.png';
import { useTranslation } from 'react-i18next';
import NeedAttentionBanner from '@/components/NeedAttentionBanner';
import { isActiveBusiness, hasCriticalErrors } from '@/lib/exportValidation';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, signOut, loading: authLoading, urlAuthProcessing } = useAuth();
  const { hasRole } = useAdmin();
  const navigate = useNavigate();
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
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>('');

  const handleLogoUploaded = () => {
    // Refresh businesses to get updated logo
    fetchBusinesses();
  };

// Recovery link safety redirect: if a recovery token lands on dashboard, send to reset-password
const location = useLocation();
useEffect(() => {
  const search = location.search || '';
  const hash = location.hash || '';
  const params = new URLSearchParams(search);
  if (params.get('type') === 'recovery' || hash.includes('type=recovery') || params.get('code')) {
    navigate(`/reset-password${search}${hash}`, { replace: true });
  }
}, [location.search, location.hash, navigate]);

// Auth redirect handled below after hooks

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
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
          // NOTE: businesses.country is historically inconsistent (sometimes code like "UZ", sometimes name like "Uzbekistan").
          // Normalize both sides to ISO code before filtering.
          const { getCountryCode } = await import('@/components/CountrySelect');
          const allowedCountries = countryAccess.map(ca => ca.country_code);
          businessList = businessList.filter(b => {
            const normalized = b.country ? getCountryCode(b.country) : '';
            return normalized && allowedCountries.includes(normalized);
          });
        }
      }

      setBusinesses(businessList);
      
      // Get user's client_id and client name from their profile
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id, clients(name)')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.client_id) {
          setClientId(profile.client_id);
          setClientName((profile as any).clients?.name || '');
        }
      }
      
      // Get user's logo from any business (since it's account-wide)
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

  useEffect(() => {
    if (!user) return;
    
    const checkRoleAndRedirect = async () => {
      const isServiceUser = await hasRole('service_user');
      if (isServiceUser) {
        navigate('/service-user-home', { replace: true });
        return;
      }
      
      const isClientAdmin = await hasRole('client_admin');
      if (isClientAdmin) {
        navigate('/client-admin', { replace: true });
        return;
      }
      
      const isStoreOwner = await hasRole('store_owner');
      if (isStoreOwner) {
        navigate('/store-owner', { replace: true });
        return;
      }
      
      fetchBusinesses();
    };
    
    checkRoleAndRedirect();
  }, [user]);

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

  const handleDeleteBusiness = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business?')) return;

    try {
      // Deletion tracking is now handled automatically by database trigger
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', id);

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

  const handleMultiEdit = (selectedIds: string[]) => {
    setSelectedBusinessIds(selectedIds);
    setMultiEditDialogOpen(true);
  };

  const handleMultiDelete = (selectedIds: string[]) => {
    setBusinessesToDelete(selectedIds);
    setDeleteConfirmDialogOpen(true);
  };

  const confirmMultiDelete = async () => {
    try {
      const { error } = await supabase
        .from('businesses')
        .delete()
        .in('id', businessesToDelete);

      if (error) throw error;

      setBusinesses(businesses.filter(b => !businessesToDelete.includes(b.id)));
      toast({
        title: "Success",
        description: `${businessesToDelete.length} businesses deleted successfully`,
      });
      
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

  const activeBusinesses = businesses.filter(b => isActiveBusiness(b));
  const pendingBusinesses = businesses.filter(b => hasCriticalErrors(b));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading your businesses...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 font-montserrat">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-20 sm:h-40 flex items-center justify-center">
              <img 
                src={jasonerLogo} 
                alt="Jasoner Logo" 
                className="h-full w-auto object-contain"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end">
            <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">{user.email}</span>
            {userLogo && (
              <div className="h-10 sm:h-20 flex items-center justify-center">
                <img 
                  src={userLogo} 
                  alt="User Logo" 
                  className="h-full w-auto object-contain"
                />
              </div>
            )}
            <UserSettingsDialog variant="outline" />
            <Button onClick={() => window.open('/guide', '_blank')} variant="outline" className="shadow-modern text-xs sm:text-sm">
              <HelpCircle className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Help</span>
            </Button>
            <Button onClick={signOut} variant="outline" className="shadow-modern text-xs sm:text-sm">
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t('nav.yourLocations')}</h2>
            <p className="text-sm text-muted-foreground">
              {activeBusinesses.length} {t('status.active').toLowerCase()}, {pendingBusinesses.length} {t('tabs.needAttention').toLowerCase()}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* View Mode Toggle */}
            <div className="flex border rounded-xl p-1 bg-card shadow-card self-start">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-lg"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-lg"
              >
                <Table2 className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                onClick={() => setSettingsDialogOpen(true)}
                variant="outline"
                size="sm"
                className="shadow-modern flex-1 sm:flex-none"
              >
                <Settings className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('nav.accountSettings')}</span>
              </Button>
              <Button 
                onClick={() => setImportDialogOpen(true)}
                variant="outline"
                size="sm"
                className="shadow-modern flex-1 sm:flex-none"
              >
                <Upload className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('actions.import')}</span>
              </Button>
              <JsonExport businesses={businesses} clientName={clientName || 'Export'} onNavigateToBusiness={handleEditBusiness} />
              <Button 
                onClick={() => setBusinessDialogOpen(true)}
                size="sm"
                className="shadow-modern bg-gradient-primary hover:opacity-90 flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                {t('actions.add')}
              </Button>
            </div>
          </div>
        </div>

        {businesses.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-primary rounded-full flex items-center justify-center">
                <Plus className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="text-muted-foreground mb-6 space-y-1">
                <p className="text-lg font-medium">No businesses found</p>
                <p>Get started by adding your first business profile.</p>
              </div>
              <Button 
                onClick={() => setBusinessDialogOpen(true)}
                className="shadow-modern bg-gradient-primary hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Business
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active' | 'pending')}>
            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-auto gap-1 p-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="active" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                      <span className="hidden sm:inline">{t('tabs.activeLocations')}</span>
                      <span className="sm:hidden">{t('status.active')}</span>
                      {activeBusinesses.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {activeBusinesses.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>These locations are validated and sent to g-Xperts for publishing.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="pending" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                      <span className="hidden sm:inline">{t('tabs.needAttention')}</span>
                      <span className="sm:hidden">{t('status.pending')}</span>
                      {pendingBusinesses.length > 0 && (
                        <Badge variant="destructive" className="ml-1 text-xs">
                          {pendingBusinesses.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The locations here require further data input. They miss mandatory fields. These locations won't be published until these issues are addressed.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TabsList>
            
            <TabsContent value="active">
              {activeBusinesses.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-16 text-center">
                    <p className="text-muted-foreground">No active businesses found.</p>
                  </CardContent>
                </Card>
              ) : viewMode === 'table' ? (
                <BusinessTableView
                  businesses={activeBusinesses}
                  onEdit={handleEditBusiness}
                  onDelete={handleDeleteBusiness}
                  onMultiEdit={handleMultiEdit}
                  onMultiDelete={handleMultiDelete}
                  showValidationErrors={false}
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {activeBusinesses.map((business) => (
                    <Card key={business.id} className="shadow-card hover:shadow-modern transition-shadow duration-300">
                      <CardHeader>
                        <CardTitle className="flex items-start justify-between">
                          <span className="line-clamp-2">{business.businessName}</span>
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditBusiness(business)}
                              className="hover:bg-primary/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteBusiness(business.id)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          {business.primaryCategory && (
                            <Badge variant="secondary">{business.primaryCategory}</Badge>
                          )}
                          {business.city && business.state && (
                            <div className="text-muted-foreground">
                              {business.city}, {business.state}
                            </div>
                          )}
                          {business.primaryPhone && (
                            <div className="text-muted-foreground">{business.primaryPhone}</div>
                          )}
                          {business.website && (
                            <div className="text-muted-foreground truncate">
                              <a 
                                href={business.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {business.website}
                              </a>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="pending">
              <NeedAttentionBanner pendingBusinesses={pendingBusinesses} />
              {pendingBusinesses.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-16 text-center">
                    <p className="text-muted-foreground">No pending businesses found.</p>
                  </CardContent>
                </Card>
              ) : viewMode === 'table' ? (
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
                    <Card key={business.id} className="shadow-card hover:shadow-modern transition-shadow duration-300 border-amber-200 bg-amber-50/50">
                      <CardHeader>
                        <CardTitle className="flex items-start justify-between">
                          <div>
                            <span className="line-clamp-2">{business.businessName}</span>
                            <Badge variant="destructive" className="mt-2">Needs Attention</Badge>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditBusiness(business)}
                              className="hover:bg-primary/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteBusiness(business.id)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          {business.primaryCategory && (
                            <Badge variant="secondary">{business.primaryCategory}</Badge>
                          )}
                          {/^(STORE)\d{6}$/.test(business.storeCode || '') && (
                            <div className="text-destructive">Auto store code assigned — please set your store code</div>
                          )}
                          {business.city && business.state && (
                            <div className="text-muted-foreground">
                              {business.city}, {business.state}
                            </div>
                          )}
                          {business.primaryPhone && (
                            <div className="text-muted-foreground">{business.primaryPhone}</div>
                          )}
                          {business.website && (
                            <div className="text-muted-foreground truncate">
                              <a 
                                href={business.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {business.website}
                              </a>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <BusinessDialog
        open={businessDialogOpen}
        onOpenChange={(open) => {
          setBusinessDialogOpen(open);
          if (!open) {
            setEditingBusiness(null);
          }
        }}
        business={editingBusiness}
        onSuccess={() => {
          fetchBusinesses();
          setBusinessDialogOpen(false);
          setEditingBusiness(null);
        }}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => {
          fetchBusinesses();
          setImportDialogOpen(false);
        }}
      />

      <MultiEditDialog
        open={multiEditDialogOpen}
        onOpenChange={setMultiEditDialogOpen}
        selectedIds={selectedBusinessIds}
        onSuccess={() => {
          fetchBusinesses();
          setMultiEditDialogOpen(false);
          setSelectedBusinessIds([]);
        }}
        clientId={clientId || undefined}
      />

      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        onLogoUploaded={fetchBusinesses}
      />

      <DeleteConfirmationDialog
        open={deleteConfirmDialogOpen}
        onOpenChange={setDeleteConfirmDialogOpen}
        onConfirm={confirmMultiDelete}
        itemCount={businessesToDelete.length}
        itemType="businesses"
      />
    </div>
  );
};

export default Dashboard;