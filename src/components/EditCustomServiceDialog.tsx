import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, X, AlertTriangle } from 'lucide-react';
import { CategorySelect } from '@/components/CategorySelect';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CustomService {
  id: string;
  service_name: string;
  service_description?: string | null;
  service_category_id?: string | null;
}

interface EditCustomServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: CustomService;
  onSaved: () => void;
}

const categoryNameToGcid = (categoryName: string): string => {
  return `gcid:${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
};

const gcidToCategoryName = (gcid: string): string => {
  return gcid.replace(/^gcid:/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const parseCategoryIds = (categoryId: string | null | undefined): string[] => {
  if (!categoryId) return [];
  return categoryId.split(',').map(s => s.trim()).filter(Boolean);
};

const joinCategoryIds = (gcids: string[]): string | null => {
  if (gcids.length === 0) return null;
  return gcids.join(',');
};

const EditCustomServiceDialog = ({
  open,
  onOpenChange,
  service,
  onSaved,
}: EditCustomServiceDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(service.service_name);
  const [description, setDescription] = useState(service.service_description || '');
  const [categories, setCategories] = useState<string[]>(parseCategoryIds(service.service_category_id));
  const [pendingCategory, setPendingCategory] = useState('');

  const handleAddCategory = () => {
    if (!pendingCategory) return;
    const gcid = categoryNameToGcid(pendingCategory);
    if (!categories.includes(gcid)) {
      setCategories([...categories, gcid]);
    }
    setPendingCategory('');
  };

  const handleRemoveCategory = (gcid: string) => {
    setCategories(categories.filter(c => c !== gcid));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Validation Error', description: 'Service name is required', variant: 'destructive' });
      return;
    }
    if (name.length > 140) {
      toast({ title: 'Validation Error', description: 'Service name must be 140 characters or less', variant: 'destructive' });
      return;
    }
    if (description && description.length > 250) {
      toast({ title: 'Validation Error', description: 'Description must be 250 characters or less', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('client_custom_services')
        .update({
          service_name: name.trim(),
          service_description: description.trim() || null,
          service_category_id: joinCategoryIds(categories),
        })
        .eq('id', service.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Custom service updated successfully' });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating service:', error);
      toast({ title: 'Error', description: error.message || 'Failed to update custom service', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Custom Service</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Service Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={140}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">{name.length}/140 characters</p>
          </div>

          <div>
            <Label>Service Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={250}
              rows={3}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">{description.length}/250 characters</p>
          </div>

          <div className="space-y-2">
            <Label>Assigned Categories (Optional)</Label>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {categories.map(gcid => (
                  <Badge key={gcid} variant="secondary" className="gap-1 pr-1">
                    {gcidToCategoryName(gcid)}
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(gcid)}
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex-1">
                <CategorySelect
                  value={pendingCategory}
                  onValueChange={setPendingCategory}
                  placeholder="Select a category to add"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCategory}
                disabled={!pendingCategory}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {categories.length > 0 && (
              <Alert variant="default" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  This service is locked to businesses with {categories.length === 1 ? 'this category' : 'one of these categories'}: {categories.map(g => gcidToCategoryName(g)).join(', ')}
                </AlertDescription>
              </Alert>
            )}
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No category restriction — available to all businesses
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCustomServiceDialog;
export { categoryNameToGcid, gcidToCategoryName, parseCategoryIds, joinCategoryIds };
export type { CustomService };
