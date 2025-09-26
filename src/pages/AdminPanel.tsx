import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/use-admin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, MapPin, Clock, Download, UserPlus, Plus, Trash2, Settings, Mail, RefreshCw, Edit } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import GcpSyncButton from '@/components/GcpSyncButton';


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

interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  client_id?: string;
  client_name?: string;
}

const AdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State variables
  const [clients, setClients] = useState<Client[]>([]);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [deleteClientLoading, setDeleteClientLoading] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteUsersChecked, setDeleteUsersChecked] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isCreateClientDialogOpen, setIsCreateClientDialogOpen] = useState(false);
  const [isDeleteClientDialogOpen, setIsDeleteClientDialogOpen] = useState(false);
  const [createClientLoading, setCreateClientLoading] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [isUserManagementDialogOpen, setIsUserManagementDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [clientUsers, setClientUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userManagementLoading, setUserManagementLoading] = useState(false);
  const [clientFileNames, setClientFileNames] = useState<{[clientId: string]: string}>({});
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editClientName, setEditClientName] = useState('');
  
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    clientId: ''
  });

  useEffect(() => {
    const handleUserAuth = async () => {
      if (user === null) {
        navigate('/auth?redirect=/admin', { replace: true });
        return;
      }
      
      if (user) {
        const isAdmin = await handleAdminCheck();
        if (isAdmin) {
          fetchData();
        } else {
          navigate('/dashboard');
        }
      }
    };
    
    handleUserAuth();
  }, [user, navigate]);

  const { checkAdminAccess } = useAdmin();

  const handleAdminCheck = async (): Promise<boolean> => {
    try {
      const isAdmin = await checkAdminAccess();
      if (!isAdmin) {
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
      
      // Filter out admin clients (clients with "admin" in the name)
      const filteredClients = mappedClients.filter(client => 
        !client.name.toLowerCase().includes('admin')
      );
      
      setClients(filteredClients);

      // Fetch all clients for the dropdown
      const { data: allClients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (clientsError) throw clientsError;

      setClientOptions(allClients || []);
      
      // Fetch all users for the Users tab
      await fetchAllUsers();
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

  const fetchAllUsers = async () => {
    try {
      setUsersLoading(true);
      
      const { data: users, error } = await supabase
        .from('profiles')
        .select(`
          user_id, 
          first_name, 
          last_name, 
          email, 
          client_id,
          clients (
            name
          )
        `)
        .neq('role', 'admin');

      if (error) throw error;

      const mappedUsers = (users || []).map(user => ({
        ...user,
        client_name: user.clients?.name || null
      }));

      setAllUsers(mappedUsers);
    } catch (error: any) {
      console.error('Error fetching all users:', error);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive"
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      // First delete the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Then delete the auth user using edge function
      const { error: deleteError } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (deleteError) throw deleteError;

      toast({
        title: "User Deleted",
        description: `${userName} has been deleted successfully.`,
      });

      fetchAllUsers();
      fetchData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user.",
        variant: "destructive"
      });
    }
  };

  const handleSendPasswordRecovery = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast({
        title: "Password Recovery Sent",
        description: `Password recovery email sent to ${email}.`,
      });
    } catch (error: any) {
      console.error('Error sending password recovery:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password recovery email.",
        variant: "destructive"
      });
    }
  };

  const handleReassignUser = async (userId: string, userName: string) => {
    const clientId = window.prompt(`Enter new client ID for ${userName}:`);
    if (!clientId) return;

    // Check if client exists
    const clientExists = clientOptions.find(c => c.id === clientId);
    if (!clientExists) {
      toast({
        title: "Error",
        description: "Client ID not found.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ client_id: clientId })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "User Reassigned",
        description: `${userName} has been reassigned to ${clientExists.name}.`,
      });

      fetchAllUsers();
      fetchData();
    } catch (error: any) {
      console.error('Error reassigning user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reassign user.",
        variant: "destructive"
      });
    }
  };

  const handleEditClientName = async (clientId: string) => {
    if (!editClientName.trim()) {
      toast({
        title: "Error",
        description: "Client name cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .update({ name: editClientName.trim() })
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: "Client Updated",
        description: "Client name updated successfully.",
      });

      setEditingClientId(null);
      setEditClientName('');
      fetchData();
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update client.",
        variant: "destructive"
      });
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

  const handleManualExport = async (clientId: string) => {
    try {
      setExportLoading(clientId);

      const { data, error } = await supabase.functions.invoke('manual-json-export', {
        body: { clientId }
      });

      if (error) throw error;

      // Store the generated fileName for this client
      setClientFileNames(prev => ({
        ...prev,
        [clientId]: data.fileName
      }));

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

  const handleSyncAllToGcp = async () => {
    setSyncAllLoading(true);
    try {
      // Get all JSON files from the json-exports bucket (excluding manual exports)
      const { data: files, error: listError } = await supabase.storage
        .from('json-exports')
        .list('', { 
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (listError) throw listError;

      // Upload all files from the json-exports bucket
      const allFiles = files || [];

      if (allFiles.length === 0) {
        toast({
          title: "No Files to Sync",
          description: "No files found in json-exports bucket to sync to GCP.",
          variant: "destructive",
        });
        return;
      }

      let syncedCount = 0;
      let failedCount = 0;

      // Sync each file to GCP
      for (const file of allFiles) {
        try {
          const { error } = await supabase.functions.invoke('sync-to-gcp', {
            body: {
              fileName: file.name,
              bucketName: 'json-exports'
            }
          });

          if (error) {
            console.error(`Failed to sync ${file.name}:`, error);
            failedCount++;
          } else {
            syncedCount++;
          }
        } catch (error) {
          console.error(`Error syncing ${file.name}:`, error);
          failedCount++;
        }
      }

      toast({
        title: "Sync Complete",
        description: `Synced ${syncedCount} files to GCP. ${failedCount > 0 ? `${failedCount} failed.` : ''}`,
        variant: failedCount > 0 ? "destructive" : "default",
      });

    } catch (error: any) {
      console.error('Error syncing all to GCP:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync files to GCP",
        variant: "destructive",
      });
    } finally {
      setSyncAllLoading(false);
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

  const openUserManagement = async (client: Client) => {
    setSelectedClient(client);
    setIsUserManagementDialogOpen(true);
    setUserSearchQuery('');
    await fetchUsersForClient(client.id);
  };

  const fetchUsersForClient = async (clientId: string) => {
    try {
      setUserManagementLoading(true);

      // Get all users (admin users can now see all profiles)
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, client_id')
        .neq('role', 'admin'); // Exclude admin users

      if (usersError) throw usersError;

      // Separate users assigned to this client vs available users
      const assigned = (allUsers || []).filter(u => u.client_id === clientId);
      const available = (allUsers || []).filter(u => u.client_id !== clientId);

      setClientUsers(assigned);
      setAvailableUsers(available);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive"
      });
    } finally {
      setUserManagementLoading(false);
    }
  };

  const assignUserToClient = async (userId: string) => {
    if (!selectedClient) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ client_id: selectedClient.id })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "User Assigned",
        description: "User successfully assigned to client. Previous assignment removed.",
      });

      await fetchUsersForClient(selectedClient.id);
      fetchData(); // Refresh client stats
    } catch (error: any) {
      console.error('Error assigning user:', error);
      toast({
        title: "Error",
        description: "Failed to assign user to client.",
        variant: "destructive"
      });
    }
  };

  const removeUserFromClient = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ client_id: null })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "User Removed",
        description: "User removed from client.",
      });

      await fetchUsersForClient(selectedClient!.id);
      fetchData(); // Refresh client stats
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: "Failed to remove user from client.",
        variant: "destructive"
      });
    }
  };

  const filteredAvailableUsers = availableUsers.filter(user =>
    user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.first_name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.last_name.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Early return for loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Early return for non-authenticated users  
  if (user === null) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSyncAllToGcp}
            disabled={syncAllLoading}
          >
            {syncAllLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Sync All to GCP
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
                <DialogDescription>
                  Add a new client to manage locations and users.
                </DialogDescription>
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
              <DialogDescription>
                Invite a new user and assign them to a client.
              </DialogDescription>
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

      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList>
          <TabsTrigger value="clients">Client Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
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
                    <TableHead className="text-center">Settings</TableHead>
                    <TableHead className="text-center">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        {editingClientId === client.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editClientName}
                              onChange={(e) => setEditClientName(e.target.value)}
                              className="max-w-[200px]"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleEditClientName(client.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingClientId(null);
                                setEditClientName('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {client.name}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingClientId(client.id);
                                setEditClientName(client.name);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
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
                        <div className="flex items-center justify-center gap-1">
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
                          <GcpSyncButton 
                            fileName={clientFileNames[client.id]}
                            variant="outline"
                            size="sm"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openUserManagement(client)}
                        >
                          <Settings className="w-4 h-4" />
                          Users
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
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email Address</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.client_name || (
                            <span className="text-muted-foreground italic">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendPasswordRecovery(user.email)}
                            >
                              <Mail className="w-4 h-4" />
                              Recovery
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReassignUser(user.user_id, `${user.first_name} ${user.last_name}`)}
                            >
                              <RefreshCw className="w-4 h-4" />
                              Reassign
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(user.user_id, `${user.first_name} ${user.last_name}`)}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {allUsers.length === 0 && !usersLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

        {/* User Management Dialog */}
        <Dialog open={isUserManagementDialogOpen} onOpenChange={setIsUserManagementDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl">Manage Users - {selectedClient?.name}</DialogTitle>
            </DialogHeader>
            
            {userManagementLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 w-8 animate-spin" />
                <span className="ml-2">Loading users...</span>
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-2 gap-8 overflow-hidden">
                {/* Current Users */}
                <div className="space-y-4">
                  <div className="border-b pb-3">
                    <h4 className="text-lg font-semibold">
                      Current Users ({clientUsers.length})
                    </h4>
                    <p className="text-sm text-muted-foreground">Users assigned to this client</p>
                  </div>
                  
                  {clientUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No users assigned to this client</p>
                      <p className="text-sm text-muted-foreground">Assign users from the available list</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {clientUsers.map((user) => (
                        <div key={user.user_id} className="flex items-center justify-between p-4 bg-muted rounded-lg border">
                          <div className="flex-1">
                            <div className="font-semibold text-base">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeUserFromClient(user.user_id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available Users */}
                <div className="space-y-4">
                  <div className="border-b pb-3">
                    <h4 className="text-lg font-semibold">Available Users</h4>
                    <p className="text-sm text-muted-foreground">Search and assign users to this client</p>
                  </div>
                  
                  <div className="space-y-4">
                    <Input
                      placeholder="Search by name or email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full"
                    />
                    
                    {filteredAvailableUsers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <UserPlus className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          {userSearchQuery ? 'No users match your search' : 'No available users'}
                        </p>
                        {userSearchQuery && (
                          <p className="text-sm text-muted-foreground">Try a different search term</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {filteredAvailableUsers.map((user) => (
                          <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex-1">
                              <div className="font-semibold text-base">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                              {user.client_id && (
                                <div className="text-xs text-orange-600 mt-1 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Currently assigned to another client
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => assignUserToClient(user.user_id)}
                              className="ml-4"
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              {user.client_id ? 'Reassign' : 'Assign'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="border-t pt-4 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsUserManagementDialogOpen(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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