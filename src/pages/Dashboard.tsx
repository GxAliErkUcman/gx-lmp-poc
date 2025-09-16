import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Upload, Edit, Trash2, Grid, Table2, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import BusinessDialog from '@/components/BusinessDialog';
import ImportDialog from '@/components/ImportDialog';
import BusinessTableView from '@/components/BusinessTableView';
import MultiEditDialog from '@/components/MultiEditDialog';
import { JsonExport } from '@/components/JsonExport';
import type { Business } from '@/types/business';
import LogoUpload from '@/components/LogoUpload';
import AccountSocialsDialog from '@/components/AccountSocialsDialog';
import jasonerLogo from '@/assets/jasoner-horizontal-logo.png';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [multiEditDialogOpen, setMultiEditDialogOpen] = useState(false);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [userLogo, setUserLogo] = useState<string | null>(null);
  const [accountSocialsDialogOpen, setAccountSocialsDialogOpen] = useState(false);

// Auth redirect handled below after hooks

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const businessList = (data || []) as Business[];
      setBusinesses(businessList);
      
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
    fetchBusinesses();
  }, [user]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleDeleteBusiness = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business?')) return;

    try {
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

  const activeBusinesses = businesses.filter(b => (b as any).status === 'active');
  const pendingBusinesses = businesses.filter(b => (b as any).status === 'pending');

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
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-24 flex items-center justify-center">
              <img 
                src={jasonerLogo} 
                alt="Jasoner Logo" 
                className="h-full w-auto object-contain"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button onClick={signOut} variant="outline" className="shadow-modern">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">Your Locations</h2>
            <p className="text-muted-foreground">
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
            
            {/* Action Buttons - Symmetric Layout */}
            <div className="flex items-center gap-2">
              <LogoUpload onLogoUploaded={fetchBusinesses} />
              <Button 
                onClick={() => setAccountSocialsDialogOpen(true)}
                variant="outline"
                size="default"
                className="shadow-modern"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Set Socials
              </Button>
              <Button 
                onClick={() => setImportDialogOpen(true)}
                variant="outline"
                size="default"
                className="shadow-modern"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <JsonExport businesses={activeBusinesses} />
              <Button 
                onClick={() => setBusinessDialogOpen(true)}
                className="shadow-modern bg-gradient-primary hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Business
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
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="active" className="flex items-center gap-2">
                Active Locations
                {activeBusinesses.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeBusinesses.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                Need Attention
                {pendingBusinesses.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {pendingBusinesses.length}
                  </Badge>
                )}
              </TabsTrigger>
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
      />

      <AccountSocialsDialog
        open={accountSocialsDialogOpen}
        onOpenChange={setAccountSocialsDialogOpen}
        onSuccess={() => {
          fetchBusinesses();
          setAccountSocialsDialogOpen(false);
        }}
      />
    </div>
  );
};

export default Dashboard;