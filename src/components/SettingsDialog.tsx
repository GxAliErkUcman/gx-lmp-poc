import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, User, Building } from 'lucide-react';
import LogoUpload from './LogoUpload';
import AccountSocialsDialog from './AccountSocialsDialog';
import { Button } from '@/components/ui/button';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogoUploaded: () => void;
}

const SettingsDialog = ({ open, onOpenChange, onLogoUploaded }: SettingsDialogProps) => {
  const [socialsDialogOpen, setSocialsDialogOpen] = useState(false);

  const handleSocialsSuccess = () => {
    setSocialsDialogOpen(false);
    // Trigger any necessary updates in parent component
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                General Settings
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Account-Wide Settings
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="general" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>General Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Configure your general application preferences here.
                    </p>
                    {/* Future general settings can be added here */}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="account" className="mt-0">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Logo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        Upload your company logo to display across all your business listings.
                      </p>
                      <LogoUpload onLogoUploaded={onLogoUploaded} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Social Media Links</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        Manage social media links that will be applied across all your business locations.
                      </p>
                      <Button 
                        onClick={() => setSocialsDialogOpen(true)}
                        variant="outline"
                        className="w-full"
                      >
                        Manage Social Media Links
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AccountSocialsDialog
        open={socialsDialogOpen}
        onOpenChange={setSocialsDialogOpen}
        onSuccess={handleSocialsSuccess}
      />
    </>
  );
};

export default SettingsDialog;