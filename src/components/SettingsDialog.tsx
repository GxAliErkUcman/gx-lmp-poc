import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Clock, Link } from 'lucide-react';
import LogoUpload from './LogoUpload';
import AccountSocialsDialog from './AccountSocialsDialog';
import AccountOpeningHoursDialog from './AccountOpeningHoursDialog';
import AccountServiceUrlsDialog from './AccountServiceUrlsDialog';
import { Button } from '@/components/ui/button';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogoUploaded: () => void;
}

const SettingsDialog = ({ open, onOpenChange, onLogoUploaded }: SettingsDialogProps) => {
  const [socialsDialogOpen, setSocialsDialogOpen] = useState(false);
  const [openingHoursDialogOpen, setOpeningHoursDialogOpen] = useState(false);
  const [serviceUrlsDialogOpen, setServiceUrlsDialogOpen] = useState(false);

  const handleSocialsSuccess = () => {
    setSocialsDialogOpen(false);
    // Trigger refresh in parent component
    onLogoUploaded(); // This callback will refresh the businesses data
  };

  const handleOpeningHoursSuccess = () => {
    setOpeningHoursDialogOpen(false);
    onLogoUploaded(); // This callback will refresh the businesses data
  };

  const handleServiceUrlsSuccess = () => {
    setServiceUrlsDialogOpen(false);
    onLogoUploaded(); // This callback will refresh the businesses data
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

          <div className="mt-6">
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

              <Card>
                <CardHeader>
                  <CardTitle>Opening Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Set opening hours that will be applied to all your business locations.
                  </p>
                  <Button 
                    onClick={() => setOpeningHoursDialogOpen(true)}
                    variant="outline"
                    className="w-full flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Manage Opening Hours
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Service URLs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Set service URLs (appointments, menu, reservations, order ahead) for all locations.
                  </p>
                  <Button 
                    onClick={() => setServiceUrlsDialogOpen(true)}
                    variant="outline"
                    className="w-full flex items-center gap-2"
                  >
                    <Link className="w-4 h-4" />
                    Manage Service URLs
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AccountSocialsDialog
        open={socialsDialogOpen}
        onOpenChange={setSocialsDialogOpen}
        onSuccess={handleSocialsSuccess}
      />

      <AccountOpeningHoursDialog
        open={openingHoursDialogOpen}
        onOpenChange={setOpeningHoursDialogOpen}
        onSuccess={handleOpeningHoursSuccess}
      />

      <AccountServiceUrlsDialog
        open={serviceUrlsDialogOpen}
        onOpenChange={setServiceUrlsDialogOpen}
        onSuccess={handleServiceUrlsSuccess}
      />
    </>
  );
};

export default SettingsDialog;