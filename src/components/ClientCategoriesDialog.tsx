import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

interface Category {
  id: number;
  category_name: string;
}

interface ClientCategory {
  id: string;
  category_name: string;
  source_category_id: number | null;
}

export function ClientCategoriesDialog({ open, onOpenChange, clientId, clientName }: ClientCategoriesDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<ClientCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [remoteResults, setRemoteResults] = useState<Category[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, clientId]);

  // Fetch remote filtered results when searching
  useEffect(() => {
    if (!searchValue) {
      setRemoteResults(null);
      return;
    }
    setSearchLoading(true);
    const handler = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, category_name')
          .ilike('category_name', `%${searchValue}%`)
          .order('category_name')
          .limit(5000);
        if (error) throw error;
        setRemoteResults(data || []);
      } catch (e) {
        console.error('Search fetch error:', e);
        setRemoteResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [searchValue]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, category_name')
        .order('category_name');

      if (categoriesError) throw categoriesError;
      setAllCategories(categories || []);

      // Load existing client categories
      const { data: clientCats, error: clientCatsError } = await supabase
        .from('client_categories')
        .select('id, category_name, source_category_id')
        .eq('client_id', clientId);

      if (clientCatsError) throw clientCatsError;
      setSelectedCategories(clientCats || []);
    } catch (error: any) {
      console.error('Error loading categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExistingCategory = (category: Category) => {
    // Check if already added
    if (selectedCategories.some(c => c.category_name === category.category_name)) {
      return;
    }

    setSelectedCategories([
      ...selectedCategories,
      {
        id: crypto.randomUUID(),
        category_name: category.category_name,
        source_category_id: category.id
      }
    ]);
    setSearchOpen(false);
  };

  const handleAddManualCategory = () => {
    if (!newCategoryName.trim()) return;

    // Check if already added
    if (selectedCategories.some(c => c.category_name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      toast({
        title: "Duplicate Category",
        description: "This category is already in the list.",
        variant: "destructive"
      });
      return;
    }

    setSelectedCategories([
      ...selectedCategories,
      {
        id: crypto.randomUUID(),
        category_name: newCategoryName.trim(),
        source_category_id: null
      }
    ]);
    setNewCategoryName('');
  };

  const handleRemoveCategory = (categoryId: string) => {
    setSelectedCategories(selectedCategories.filter(c => c.id !== categoryId));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete all existing categories for this client
      const { error: deleteError } = await supabase
        .from('client_categories')
        .delete()
        .eq('client_id', clientId);

      if (deleteError) throw deleteError;

      // Insert new categories
      if (selectedCategories.length > 0) {
        const { error: insertError } = await supabase
          .from('client_categories')
          .insert(
            selectedCategories.map(cat => ({
              client_id: clientId,
              category_name: cat.category_name,
              source_category_id: cat.source_category_id
            }))
          );

        if (insertError) throw insertError;
      }

      toast({
        title: "Categories Updated",
        description: `Custom categories saved for ${clientName}.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving categories:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save categories.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Advanced search with normalization and scoring
  const getFilteredCategories = () => {
    const source = remoteResults ?? allCategories;
    
    if (!searchValue) {
      return source.filter(cat => !selectedCategories.some(sc => sc.category_name === cat.category_name));
    }

    const normalize = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove diacritics
        .replace(/\s+/g, ' ') // collapse spaces
        .trim()
        .toLowerCase();

    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const q = normalize(searchValue);
    const wordRe = new RegExp(`\\b${escapeRegExp(q)}`, 'i');

    const ranked = source
      .map((c) => ({
        c,
        n: normalize(c.category_name),
      }))
      .filter((o) => o.n.includes(q))
      .filter((o) => !selectedCategories.some(sc => sc.category_name === o.c.category_name))
      .map((o) => {
        let score = 0;
        if (o.n === q) score = 400; // exact match
        else if (o.n.startsWith(q)) score = 300; // starts with
        else if (wordRe.test(o.n)) score = 200; // word boundary
        else score = 100; // contains
        return { ...o, score };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.c.category_name.localeCompare(b.c.category_name);
      })
      .map((o) => o.c);

    return ranked;
  };

  const filteredCategories = getFilteredCategories();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Categories for {clientName}</DialogTitle>
          <DialogDescription>
            Select existing categories or add custom ones. Users from this client will only see these categories.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Add from existing categories */}
            <div className="space-y-2">
              <Label>Add from Existing Categories</Label>
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={searchOpen}
                    className="w-full justify-between"
                  >
                    Select a category...
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search categories..." 
                      value={searchValue}
                      onValueChange={setSearchValue}
                    />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>
                        {loading || searchLoading ? (searchLoading ? "Searching..." : "Loading categories...") : "No categories found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredCategories.map((category) => (
                          <CommandItem
                            key={category.id}
                            value={category.category_name}
                            onSelect={() => handleAddExistingCategory(category)}
                          >
                            <Check className="mr-2 h-4 w-4 opacity-0" />
                            {category.category_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Add custom category */}
            <div className="space-y-2">
              <Label>Or Add Custom Category</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddManualCategory();
                    }
                  }}
                />
                <Button onClick={handleAddManualCategory}>Add</Button>
              </div>
            </div>

            {/* Selected categories list */}
            <div className="space-y-2">
              <Label>Selected Categories ({selectedCategories.length})</Label>
              <div className="border rounded-md p-2 min-h-[200px] max-h-[300px] overflow-y-auto">
                {selectedCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No categories selected. Client will see all default categories.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {selectedCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-2 bg-secondary rounded-md"
                      >
                        <span className="text-sm">
                          {cat.category_name}
                          {cat.source_category_id === null && (
                            <span className="ml-2 text-xs text-muted-foreground">(Custom)</span>
                          )}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCategory(cat.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Categories
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
