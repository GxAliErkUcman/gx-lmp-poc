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
}

interface Category {
  id: number;
  category_name: string;
}

export function CategorySelect({ 
  value, 
  onValueChange, 
  placeholder = "Select category...",
  required = false
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, category_name')
          .order('category_name');

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Custom search function that prioritizes exact matches
  const getFilteredCategories = () => {
    if (!searchValue) return categories;

    const searchLower = searchValue.toLowerCase();
    const exactMatches: Category[] = [];
    const partialMatches: Category[] = [];

    categories.forEach(category => {
      const categoryLower = category.category_name.toLowerCase();
      
      if (categoryLower === searchLower) {
        exactMatches.push(category);
      } else if (categoryLower.includes(searchLower)) {
        partialMatches.push(category);
      }
    });

    // Sort partial matches alphabetically
    partialMatches.sort((a, b) => a.category_name.localeCompare(b.category_name));

    return [...exactMatches, ...partialMatches];
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
            ? categories.find((category) => category.category_name === value)?.category_name
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
              {loading ? "Loading categories..." : "No category found."}
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