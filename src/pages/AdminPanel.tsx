import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, MapPin, Clock, Download, UserPlus, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


interface Client {
  id: string;
  name: string;
  user_count: number;
  active_locations: number;
  pending_locations: number;
  last_updated: string;
}

interface ClientOption {
  id: string;
  name: string;
}

const AdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [isCreateClientDialogOpen, setIsCreateClientDialogOpen] = useState(false);
  const [isDeleteClientDialogOpen, setIsDeleteClientDialogOpen] = useState(false);
  const [createClientLoading, setCreateClientLoading] = useState(false);
  const [deleteClientLoading, setDeleteClientLoading] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteUsersChecked, setDeleteUsersChecked] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [newClientName, setNewClientName] = useState('');
  
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    clientId: ''
  });

  useEffect(() => {
    if (user === null) {
      navigate('/auth?redirect=/admin', { replace: true });
      return;
    }
    if (user) {
      (async () => {
        const isAdmin = await checkAdminAccess();
        if (isAdmin) {
          fetchData();
        } else {
          navigate('/dashboard');
        }
      })();
    }
  }, [user]);

  const checkAdminAccess = async (): Promise<boolean> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (error || !profile || profile.role !== 'admin') {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges to access this panel.",
          variant: "destructive"
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking admin access:', error);
      return false;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch client statistics using the database function
      const { data: clientStats, error: statsError } = await supabase
        .rpc('get_client_statistics');

      if (statsError) throw statsError;

      // Map the database response to match our Client interface
      const mappedClients = clientStats?.map((stat: any) => ({
        id: stat.client_id,
        name: stat.client_name,
        user_count: stat.user_count,
        active_locations: stat.active_locations,
        pending_locations: stat.pending_locations,
        last_updated: stat.last_updated
      })) || [];
      
      setClients(mappedClients);

      // Fetch all clients for the dropdown
      const { data: allClients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (clientsError) throw clientsError;

      setClientOptions(allClients || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin panel data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.clientId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      setCreateUserLoading(true);

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          clientId: newUser.clientId
        }
      });

      if (error) throw error;

      toast({
        title: "User Created",
        description: "User invitation sent successfully. They will receive an email to set up their password.",
      });

      setNewUser({ firstName: '', lastName: '', email: '', clientId: '' });
      setIsCreateUserDialogOpen(false);
      fetchData(); // Refresh the data
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user.",
        variant: "destructive"
      });
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleManualExport = async (userId: string) => {
    try {
      setExportLoading(userId);

      const { data, error } = await supabase.functions.invoke('manual-json-export', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: "Export Generated",
        description: `Manual export created: ${data.fileName} (${data.businessCount} businesses)`,
      });
    } catch (error: any) {
      console.error('Error generating manual export:', error);
      toast({
        title: "Export Error",
        description: error.message || "Failed to generate manual export.",
        variant: "destructive"
      });
    } finally {
      setExportLoading(null);
    }
  };

  const handleCreateAdminUser = async () => {
    try {
      setCreateAdminLoading(true);

      const { data, error } = await supabase.functions.invoke('create-admin-user', {});

      if (error) throw error;

      toast({
        title: "Admin User Created",
        description: "GX-Admin user created successfully. Email: admin@gx-admin.com, Password: 495185Erk",
      });

      fetchData(); // Refresh the data
    } catch (error: any) {
      console.error('Error creating admin user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create admin user.",
        variant: "destructive"
      });
    } finally {
      setCreateAdminLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a client name.",
        variant: "destructive"
      });
      return;
    }

    try {
      setCreateClientLoading(true);

      const { error } = await supabase
        .from('clients')
        .insert([{ name: newClientName.trim() }]);

      if (error) throw error;

      toast({
        title: "Client Created",
        description: `Client "${newClientName}" created successfully.`,
      });

      setNewClientName('');
      setIsCreateClientDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create client.",
        variant: "destructive"
      });
    } finally {
      setCreateClientLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    
    if (deleteConfirmation !== 'DELETE') {
      toast({
        title: "Confirmation Required",
        description: "Please type 'DELETE' to confirm this action.",
        variant: "destructive"
      });
      return;
    }

    try {
      setDeleteClientLoading(true);

      const { data, error } = await supabase.functions.invoke('delete-client', {
        body: {
          clientId: clientToDelete.id,
          deleteUsers: deleteUsersChecked
        }
      });

      if (error) throw error;

      toast({
        title: "Client Deleted",
        description: `Client "${clientToDelete.name}" and ${deleteUsersChecked ? 'associated users' : 'data'} deleted successfully.`,
      });

      setIsDeleteClientDialogOpen(false);
      setClientToDelete(null);
      setDeleteConfirmation('');
      setDeleteUsersChecked(false);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete client.",
        variant: "destructive"
      });
    } finally {
      setDeleteClientLoading(false);
    }
  };

  const openDeleteDialog = (client: Client) => {
    setClientToDelete(client);
    setIsDeleteClientDialogOpen(true);
    setDeleteConfirmation('');
    setDeleteUsersChecked(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleCreateAdminUser}
            disabled={createAdminLoading}
          >
            {createAdminLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Admin User
          </Button>
          <Dialog open={isCreateClientDialogOpen} onOpenChange={setIsCreateClientDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Client</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Enter client name"
                  />
                </div>
                <Button
                  onClick={handleCreateClient}
                  disabled={createClientLoading}
                  className="w-full"
                >
                  {createClientLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Client
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Create New User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="client">Client</Label>
                <Select value={newUser.clientId} onValueChange={(value) => setNewUser({ ...newUser, clientId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientOptions.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreateUser}
                disabled={createUserLoading}
                className="w-full"
              >
                {createUserLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create User & Send Invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Client Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-center">Active Locations</TableHead>
                <TableHead className="text-center">Pending Locations</TableHead>
                <TableHead className="text-center">Last Updated</TableHead>
                <TableHead className="text-center">Actions</TableHead>
                <TableHead className="text-center">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-4 h-4" />
                      {client.user_count}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <MapPin className="w-4 h-4 text-green-600" />
                      {client.active_locations}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      {client.pending_locations}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {client.last_updated ? new Date(client.last_updated).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleManualExport(client.id)}
                      disabled={exportLoading === client.id}
                    >
                      {exportLoading === client.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Export
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openDeleteDialog(client)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {clients.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No clients found
            </div>
          )}
        </CardContent>
        </Card>

        {/* Delete Client Confirmation Dialog */}
        <Dialog open={isDeleteClientDialogOpen} onOpenChange={setIsDeleteClientDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm text-destructive font-medium mb-2">
                  ⚠️ Warning: This is a destructive action
                </p>
                <p className="text-sm">
                  You are about to delete client "{clientToDelete?.name}" and all associated data.
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="deleteUsers"
                  checked={deleteUsersChecked}
                  onChange={(e) => setDeleteUsersChecked(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="deleteUsers" className="text-sm">
                  Also delete all users associated with this client
                </Label>
              </div>

              <div>
                <Label htmlFor="deleteConfirm">
                  Type <strong>DELETE</strong> to confirm:
                </Label>
                <Input
                  id="deleteConfirm"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type DELETE to confirm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteClientDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteClient}
                  disabled={deleteClientLoading || deleteConfirmation !== 'DELETE'}
                  className="flex-1"
                >
                  {deleteClientLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Delete Client
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };
  
  export default AdminPanel;