import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Grid, Table2, HelpCircle, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import BusinessDialog from '@/components/BusinessDialog';
import BusinessTableView from '@/components/BusinessTableView';
import MultiEditDialog from '@/components/MultiEditDialog';
import type { Business } from '@/types/business';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import { UserSettingsDialog } from '@/components/UserSettingsDialog';
import jasonerLogo from '@/assets/jasoner-horizontal-logo.png';
import NeedAttentionBanner from '@/components/NeedAttentionBanner';
import { isActiveBusiness, hasCriticalErrors } from '@/lib/exportValidation';

const StoreOwnerDashboard = () => {
  const { user, signOut, loading: authLoading, urlAuthProcessing } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [multiEditDialogOpen, setMultiEditDialogOpen] = useState(false);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [userLogo, setUserLogo] = useState<string | null>(null);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [businessesToDelete, setBusinessesToDelete] = useState<string[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);

  const fetchBusinesses = async () => {
    try {
      // Fetch businesses that the store owner has access to via store_owner_access table
      const { data: accessData, error: accessError } = await supabase
        .from('store_owner_access')
        .select('business_id')
        .eq('user_id', user?.id);

      if (accessError) throw accessError;

      const businessIds = accessData?.map(a => a.business_id) || [];

      if (businessIds.length === 0) {
        setBusinesses([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .in('id', businessIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const businessList = (data || []) as Business[];
      setBusinesses(businessList);
      
      // Get client_id from first business
      if (businessList.length > 0 && businessList[0].client_id) {
        setClientId(businessList[0].client_id);
      }
      
      // Get user's logo from any business
      const logoUrl = businessList.length > 0 ? businessList[0].logoPhoto : null;
      setUserLogo(logoUrl);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast({
        title: "Error",
        description: "Failed to load your locations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchBusinesses();
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
    if (!confirm('Are you sure you want to delete this location?')) return;

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
        description: "Location deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting business:', error);
      toast({
        title: "Error",
        description: "Failed to delete location",
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
        description: `${businessesToDelete.length} locations deleted successfully`,
      });
      
      setBusinessesToDelete([]);
    } catch (error) {
      console.error('Error deleting businesses:', error);
      toast({
        title: "Error",
        description: "Failed to delete locations",
        variant: "destructive",
      });
    }
  };

  const activeBusinesses = businesses.filter(b => isActiveBusiness(b));
  const pendingBusinesses = businesses.filter(b => hasCriticalErrors(b));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading your locations...</div>
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
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Your Locations</h2>
            <p className="text-sm text-muted-foreground">
              {activeBusinesses.length} active, {pendingBusinesses.length} need attention
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex border rounded-xl p-1 bg-card shadow-card">
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
          </div>
        </div>

        {businesses.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">No locations assigned to you yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active' | 'pending')}>
            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-auto gap-1 p-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
              <TabsTrigger value="active" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">Active Locations</span>
                <span className="sm:hidden">Active</span>
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
                <span className="hidden sm:inline">Need Attention</span>
                <span className="sm:hidden">Attention</span>
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
                    <p className="text-muted-foreground">No active locations found.</p>
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
                    <Card key={business.id} className="shadow-card hover:shadow-modern transition-shadow duration-300 cursor-pointer" onClick={() => handleEditBusiness(business)}>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg line-clamp-2">{business.businessName}</h3>
                          {business.primaryCategory && (
                            <Badge variant="secondary">{business.primaryCategory}</Badge>
                          )}
                          {business.city && business.state && (
                            <div className="text-muted-foreground text-sm">
                              {business.city}, {business.state}
                            </div>
                          )}
                          {business.primaryPhone && (
                            <div className="text-muted-foreground text-sm">{business.primaryPhone}</div>
                          )}
                          {business.website && (
                            <div className="text-muted-foreground text-sm truncate">
                              <a 
                                href={business.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:underline"
                                onClick={(e) => e.stopPropagation()}
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
                    <p className="text-muted-foreground">No pending locations found.</p>
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
                    <Card key={business.id} className="shadow-card hover:shadow-modern transition-shadow duration-300 border-amber-200 bg-amber-50/50 cursor-pointer" onClick={() => handleEditBusiness(business)}>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-lg line-clamp-2">{business.businessName}</h3>
                            <Badge variant="destructive" className="shrink-0">Needs Attention</Badge>
                          </div>
                          {business.primaryCategory && (
                            <Badge variant="secondary">{business.primaryCategory}</Badge>
                          )}
                          {business.city && business.state && (
                            <div className="text-muted-foreground text-sm">
                              {business.city}, {business.state}
                            </div>
                          )}
                          {business.primaryPhone && (
                            <div className="text-muted-foreground text-sm">{business.primaryPhone}</div>
                          )}
                          {business.website && (
                            <div className="text-muted-foreground text-sm truncate">
                              <a 
                                href={business.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:underline"
                                onClick={(e) => e.stopPropagation()}
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

      <DeleteConfirmationDialog
        open={deleteConfirmDialogOpen}
        onOpenChange={setDeleteConfirmDialogOpen}
        onConfirm={confirmMultiDelete}
        itemCount={businessesToDelete.length}
        itemType="location"
      />
    </div>
  );
};

export default StoreOwnerDashboard;
