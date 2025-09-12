import { useState } from 'react';
import { Download, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ValidationErrors } from '@/components/ValidationErrors';
import { validateBusiness } from '@/lib/validation';
import { Business } from '@/types/business';
import { toast } from '@/hooks/use-toast';

interface JsonExportProps {
  businesses: Business[];
}

export const JsonExport = ({ businesses }: JsonExportProps) => {
  const [open, setOpen] = useState(false);
  const [validationResults, setValidationResults] = useState<Array<{ business: Business; isValid: boolean; errors: any[] }>>([]);

  const validateAllBusinesses = () => {
    // Only validate and export active businesses
    const activeBusinesses = businesses.filter(b => (b as any).status === 'active');
    const results = activeBusinesses.map(business => {
      const jsonBusiness = convertToJsonSchema(business);
      const validation = validateBusiness(jsonBusiness);
      return {
        business,
        isValid: validation.isValid,
        errors: validation.errors
      };
    });
    setValidationResults(results);
  };

  const convertToJsonSchema = (business: Business) => {
    return {
      storeCode: business.storeCode,
      businessName: business.businessName,
      addressLine1: business.addressLine1,
      addressLine2: business.addressLine2 || null,
      addressLine3: business.addressLine3 || null,
      addressLine4: business.addressLine4 || null,
      addressLine5: business.addressLine5 || null,
      postalCode: business.postalCode || null,
      district: business.district || null,
      city: business.city || null,
      state: business.state || null,
      country: business.country,
      latitude: business.latitude || null,
      longitude: business.longitude || null,
      primaryCategory: business.primaryCategory,
      additionalCategories: business.additionalCategories || null,
      website: business.website || null,
      primaryPhone: business.primaryPhone || null,
      additionalPhones: business.additionalPhones || null,
      adwords: business.adwords || null,
      openingDate: business.openingDate || null,
      fromTheBusiness: business.fromTheBusiness || null,
      labels: business.labels || null,
      mondayHours: business.mondayHours || null,
      tuesdayHours: business.tuesdayHours || null,
      wednesdayHours: business.wednesdayHours || null,
      thursdayHours: business.thursdayHours || null,
      fridayHours: business.fridayHours || null,
      saturdayHours: business.saturdayHours || null,
      sundayHours: business.sundayHours || null,
      specialHours: business.specialHours || null,
      moreHours: business.moreHours || null,
      temporarilyClosed: business.temporarilyClosed || false,
      logoPhoto: business.logoPhoto || null,
      coverPhoto: business.coverPhoto || null,
      otherPhotos: business.otherPhotos || null,
      appointmentURL: business.appointmentURL || null,
      menuURL: business.menuURL || null,
      reservationsURL: business.reservationsURL || null,
      orderAheadURL: business.orderAheadURL || null,
      customServices: business.customServices || null,
      socialMediaUrls: business.socialMediaUrls || null
    };
  };

  const exportJson = () => {
    const validBusinesses = validationResults.filter(result => result.isValid);
    
    if (validBusinesses.length === 0) {
      toast({
        title: "Export Failed",
        description: "No valid businesses to export. Please fix validation errors first.",
        variant: "destructive",
      });
      return;
    }

    const exportData = validBusinesses.map(result => convertToJsonSchema(result.business));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-locations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${validBusinesses.length} valid business locations`,
    });
    
    setOpen(false);
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      validateAllBusinesses();
    }
  };

  const validCount = validationResults.filter(r => r.isValid).length;
  const invalidCount = validationResults.length - validCount;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Business Locations (JSON Schema)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {validationResults.length > 0 && (
            <div className="flex gap-4">
              <Badge variant={validCount > 0 ? "default" : "secondary"}>
                {validCount} Valid
              </Badge>
              <Badge variant={invalidCount > 0 ? "destructive" : "secondary"}>
                {invalidCount} Invalid
              </Badge>
            </div>
          )}

          {validationResults.length > 0 && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {validationResults.map((result, index) => (
                <div key={result.business.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{result.business.businessName}</h4>
                    <Badge variant={result.isValid ? "default" : "destructive"}>
                      {result.isValid ? "Valid" : "Invalid"}
                    </Badge>
                  </div>
                  
                  {!result.isValid && (
                    <ValidationErrors errors={result.errors} className="mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {validCount > 0 ? (
                `Ready to export ${validCount} valid business location${validCount !== 1 ? 's' : ''}`
              ) : (
                "Fix validation errors to enable export"
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={exportJson} 
                disabled={validCount === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export JSON ({validCount})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};