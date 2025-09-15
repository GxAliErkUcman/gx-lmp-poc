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
import { Loader2, Users, MapPin, Clock, Download, UserPlus } from 'lucide-react';
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
  
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    clientId: ''
  });

  useEffect(() => {
    if (user === null) {
      navigate('/auth');
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
    </div>
  );
};

export default AdminPanel;