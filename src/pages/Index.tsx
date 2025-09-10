import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Upload, Download } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Google Business Profile Manager
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline your business profile management with comprehensive CRUD operations, 
            smart import/export functionality, and multi-location support.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <a href="/auth">Get Started</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/auth">Sign In</a>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <Building2 className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Multi-Location Support</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage unlimited business locations with comprehensive Google Business Profile data structure.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Secure authentication with user-specific business data and optional team collaboration.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Upload className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Smart Import</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload Excel/CSV files with intelligent column mapping and data validation.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Download className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Export Options</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Export your business data as JSON or CSV for easy integration with other tools.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Features List */}
        <Card className="mb-16">
          <CardHeader>
            <CardTitle>Complete Google Business Profile Schema Support</CardTitle>
            <CardDescription>
              Our platform supports the full Google Business Profile data structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">Basic Information</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Business Name & Categories</li>
                  <li>• Contact Information</li>
                  <li>• Website & Description</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Location Data</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Complete Address Details</li>
                  <li>• GPS Coordinates</li>
                  <li>• Service Areas</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Business Details</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Operating Hours</li>
                  <li>• Products & Services</li>
                  <li>• Business Attributes</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Media & Reviews</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Photo Management</li>
                  <li>• Review Statistics</li>
                  <li>• Alt Text Support</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Google Integration</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Place ID Management</li>
                  <li>• CID & Profile IDs</li>
                  <li>• Knowledge Graph IDs</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Data Management</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Excel/CSV Import</li>
                  <li>• JSON Export</li>
                  <li>• Bulk Operations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="inline-block">
            <CardContent className="pt-6">
              <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
              <p className="text-muted-foreground mb-6">
                Join thousands of businesses managing their Google profiles efficiently
              </p>
              <Button size="lg" asChild>
                <a href="/auth">Create Your Account</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
