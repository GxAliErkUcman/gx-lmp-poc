import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

interface CategorySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  clientId?: string;
}

interface Category {
  id: number;
  category_name: string;
}

export function CategorySelect({ 
  value, 
  onValueChange, 
  placeholder = "Select category...",
  required = false,
  clientId
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [remoteResults, setRemoteResults] = useState<Category[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        let targetClientId = clientId;

        // If no clientId prop provided, get it from user's profile
        if (!targetClientId) {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            setLoading(false);
            return;
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('client_id')
            .eq('user_id', user.id)
            .single();

          targetClientId = profile?.client_id;
        }

        let categoriesData = null;

        // If we have a client_id, try to get client-specific categories
        if (targetClientId) {
          const { data: clientCats, error: clientCatsError } = await supabase
            .from('client_categories')
            .select('id, category_name, source_category_id')
            .eq('client_id', targetClientId)
            .order('category_name');

          // If client has custom categories, use them
          if (!clientCatsError && clientCats && clientCats.length > 0) {
            // Map client_categories to match the Category interface
            categoriesData = clientCats.map(cat => ({
              id: cat.source_category_id || cat.id,
              category_name: cat.category_name
            }));
          }
        }

        // If no client-specific categories found, fall back to default categories
        if (!categoriesData) {
          const { data, error } = await supabase
            .from('categories')
            .select('id, category_name')
            .order('category_name');

          if (error) throw error;
          categoriesData = data || [];
        }

        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [clientId]);

  // Fetch remote filtered results when searching to include items beyond initial limit
  useEffect(() => {
    if (!searchValue) {
      setRemoteResults(null);
      return;
    }
    setSearchLoading(true);
    const handler = setTimeout(async () => {
      try {
        let targetClientId = clientId;

        // If no clientId prop provided, get it from user's profile
        if (!targetClientId) {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('client_id')
              .eq('user_id', user.id)
              .single();

            targetClientId = profile?.client_id;
          }
        }

        let searchData = null;

        // Search in client_categories if we have a client_id
        if (targetClientId) {
          const { data: clientCats } = await supabase
            .from('client_categories')
            .select('id, category_name, source_category_id')
            .eq('client_id', targetClientId)
            .ilike('category_name', `%${searchValue}%`)
            .limit(5000);

          if (clientCats && clientCats.length > 0) {
            searchData = clientCats.map(cat => ({
              id: cat.source_category_id || cat.id,
              category_name: cat.category_name
            }));
          }
        }

        // Fall back to global categories if no client-specific results
        if (!searchData) {
          const { data, error } = await supabase
            .from('categories')
            .select('id, category_name')
            .ilike('category_name', `%${searchValue}%`)
            .limit(5000);
          if (error) throw error;
          searchData = data || [];
        }

        setRemoteResults(searchData);
      } catch (e) {
        console.error('Search fetch error:', e);
        setRemoteResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [searchValue, clientId]);

  // Custom search with normalization and scoring: exact > startsWith > wordBoundary > contains
  const getFilteredCategories = () => {
    if (!searchValue) return categories;

    const normalize = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove diacritics
        .replace(/\s+/g, ' ') // collapse spaces
        .trim()
        .toLowerCase();

    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const q = normalize(searchValue);
    const wordRe = new RegExp(`\\b${escapeRegExp(q)}\\b`, 'i');
    const source = remoteResults ?? categories;

    const ranked = source
      .map((c) => ({
        c,
        n: normalize(c.category_name),
      }))
      // Only keep items that contain the query somewhere (normalized)
      .filter((o) => o.n.includes(q))
      .map((o) => {
        let score = 0;
        if (o.n === q) score = 400; // exact phrase match
        else if (o.n.startsWith(q)) score = 300; // starts with query
        else if (wordRe.test(o.n)) score = 200; // has whole word match
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? (categories.find((category) => category.category_name === value)?.category_name || 
               remoteResults?.find((category) => category.category_name === value)?.category_name || 
               value)
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search categories..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {loading || searchLoading ? (searchLoading ? "Searching..." : "Loading categories...") : "No category found."}
            </CommandEmpty>
            <CommandGroup>
              {!loading && filteredCategories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.category_name}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === category.category_name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {category.category_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}