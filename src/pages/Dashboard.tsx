import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Download, Edit, Trash2, Grid, Table2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import BusinessDialog from '@/components/BusinessDialog';
import ImportDialog from '@/components/ImportDialog';
import BusinessTableView from '@/components/BusinessTableView';
import MultiEditDialog from '@/components/MultiEditDialog';

import type { Business } from '@/types/business';
import { JsonExport } from '@/components/JsonExport';

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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBusinesses((data || []) as Business[]);
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
    fetchBusinesses();
  }, []);

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

  const exportBusinesses = () => {
    try {
      const jsonData = JSON.stringify(businesses, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `businesses-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Exported ${businesses.length} businesses as JSON`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export businesses",
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading your businesses...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Business Profile Manager</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button onClick={signOut} variant="outline">Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Your Businesses</h2>
            <p className="text-muted-foreground">
              Manage {businesses.length} business profile{businesses.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            {/* View Mode Toggle */}
            <div className="flex border rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Table2 className="w-4 h-4" />
              </Button>
            </div>
            
            <Button 
              onClick={() => setImportDialogOpen(true)}
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV/Excel
            </Button>
            <Button 
              onClick={exportBusinesses}
              variant="outline"
              disabled={businesses.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button onClick={() => setBusinessDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Business
            </Button>
          </div>
        </div>

        {businesses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-muted-foreground mb-4">
                No businesses found. Get started by adding your first business profile.
              </div>
              <Button onClick={() => setBusinessDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Business
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <BusinessTableView
            businesses={businesses}
            onEdit={handleEditBusiness}
            onDelete={handleDeleteBusiness}
            onMultiEdit={handleMultiEdit}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <Card key={business.id}>
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span className="line-clamp-2">{business.businessName}</span>
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditBusiness(business)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteBusiness(business.id)}
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
    </div>
  );
};

export default Dashboard;