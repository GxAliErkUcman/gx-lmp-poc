import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Clock, Link, Wrench } from 'lucide-react';
import LogoUpload from './LogoUpload';
import AccountSocialsDialog from './AccountSocialsDialog';
import AccountOpeningHoursDialog from './AccountOpeningHoursDialog';
import AccountServiceUrlsDialog from './AccountServiceUrlsDialog';
import ClientCustomServicesDialog from './ClientCustomServicesDialog';
import { Button } from '@/components/ui/button';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogoUploaded: () => void;
  clientId?: string;
}

const SettingsDialog = ({ open, onOpenChange, onLogoUploaded, clientId }: SettingsDialogProps) => {
  const [socialsDialogOpen, setSocialsDialogOpen] = useState(false);
  const [openingHoursDialogOpen, setOpeningHoursDialogOpen] = useState(false);
  const [serviceUrlsDialogOpen, setServiceUrlsDialogOpen] = useState(false);
  const [customServicesDialogOpen, setCustomServicesDialogOpen] = useState(false);

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

  const handleCustomServicesSuccess = () => {
    setCustomServicesDialogOpen(false);
    onLogoUploaded(); // This callback will refresh the businesses data
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Account Logo</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground mb-3 text-sm">
                    Upload your company logo to display across all your business listings.
                  </p>
                  <LogoUpload onLogoUploaded={onLogoUploaded} clientId={clientId} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Social Media Links</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground mb-3 text-sm">
                    Manage social media links that will be applied across all your business locations.
                  </p>
                  <Button 
                    onClick={() => setSocialsDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Manage Social Media Links
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Opening Hours</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground mb-3 text-sm">
                    Set opening hours that will be applied to all your business locations.
                  </p>
                  <Button 
                    onClick={() => setOpeningHoursDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Manage Opening Hours
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Service URLs</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground mb-3 text-sm">
                    Set service URLs (appointments, menu, reservations, order ahead) for all locations.
                  </p>
                  <Button 
                    onClick={() => setServiceUrlsDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center gap-2"
                  >
                    <Link className="w-4 h-4" />
                    Manage Service URLs
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Custom Services</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground mb-3 text-sm">
                    Configure custom services that can be assigned to your business locations.
                  </p>
                  <Button 
                    onClick={() => setCustomServicesDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center gap-2"
                  >
                    <Wrench className="w-4 h-4" />
                    Manage Custom Services
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
        clientId={clientId}
      />

      <AccountOpeningHoursDialog
        open={openingHoursDialogOpen}
        onOpenChange={setOpeningHoursDialogOpen}
        onSuccess={handleOpeningHoursSuccess}
        clientId={clientId}
      />

      <AccountServiceUrlsDialog
        open={serviceUrlsDialogOpen}
        onOpenChange={setServiceUrlsDialogOpen}
        onSuccess={handleServiceUrlsSuccess}
        clientId={clientId}
      />

      <ClientCustomServicesDialog
        open={customServicesDialogOpen}
        onOpenChange={setCustomServicesDialogOpen}
        clientId={clientId}
        onSuccess={handleCustomServicesSuccess}
      />
    </>
  );
};

export default SettingsDialog;