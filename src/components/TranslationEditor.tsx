import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Save, RotateCcw, Search, Languages, Check } from 'lucide-react';
import { getDefaultTranslations, getAllTranslations, saveTranslations } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';

interface FlatTranslation {
  key: string;
  namespace: string;
  path: string;
  originalValue: string;
  translatedValue: string;
}

const TranslationEditor = () => {
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const [targetLang] = useState('de'); // Currently only editing German
  const [translations, setTranslations] = useState<FlatTranslation[]>([]);
  const [editedTranslations, setEditedTranslations] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Flatten nested object to array of translations
  const flattenTranslations = (
    obj: Record<string, any>,
    namespace: string,
    parentPath: string = ''
  ): FlatTranslation[] => {
    const result: FlatTranslation[] = [];
    
    for (const key in obj) {
      const fullPath = parentPath ? `${parentPath}.${key}` : key;
      const value = obj[key];
      
      if (typeof value === 'object' && value !== null) {
        result.push(...flattenTranslations(value, namespace, fullPath));
      } else if (typeof value === 'string') {
        result.push({
          key: `${namespace}:${fullPath}`,
          namespace,
          path: fullPath,
          originalValue: value,
          translatedValue: value, // Will be replaced with target lang value
        });
      }
    }
    
    return result;
  };

  // Load translations
  useEffect(() => {
    const defaults = getDefaultTranslations();
    const targetTranslations = getAllTranslations(targetLang);
    
    const flattened: FlatTranslation[] = [];
    
    // Process each namespace
    for (const namespace of Object.keys(defaults)) {
      const nsDefaults = defaults[namespace as keyof typeof defaults];
      const nsTarget = targetTranslations[namespace as keyof typeof targetTranslations] || {};
      
      const defaultFlat = flattenTranslations(nsDefaults, namespace);
      
      // Match with target translations
      defaultFlat.forEach(item => {
        const targetValue = getNestedValue(nsTarget, item.path);
        flattened.push({
          ...item,
          translatedValue: targetValue || item.originalValue,
        });
      });
    }
    
    setTranslations(flattened);
  }, [targetLang]);

  // Get nested value from object by dot-path
  const getNestedValue = (obj: any, path: string): string | undefined => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Group translations by namespace
  const groupedTranslations = translations.reduce((acc, item) => {
    if (!acc[item.namespace]) {
      acc[item.namespace] = [];
    }
    acc[item.namespace].push(item);
    return acc;
  }, {} as Record<string, FlatTranslation[]>);

  // Filter translations by search
  const filterTranslations = (items: FlatTranslation[]) => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.path.toLowerCase().includes(query) ||
      item.originalValue.toLowerCase().includes(query) ||
      (editedTranslations[item.key] || item.translatedValue).toLowerCase().includes(query)
    );
  };

  // Handle translation change
  const handleTranslationChange = (key: string, value: string) => {
    setEditedTranslations(prev => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  // Save all changes
  const handleSave = () => {
    setSaving(true);
    
    try {
      // Build the nested structure for saving
      const translationsByNamespace: Record<string, any> = {};
      
      translations.forEach(item => {
        const editedValue = editedTranslations[item.key];
        if (editedValue !== undefined) {
          if (!translationsByNamespace[item.namespace]) {
            translationsByNamespace[item.namespace] = {};
          }
          
          // Set nested value
          setNestedValue(translationsByNamespace[item.namespace], item.path, editedValue);
        }
      });
      
      // Save to localStorage and update i18next
      saveTranslations(targetLang, translationsByNamespace);
      
      // Update local state to reflect saved changes
      setTranslations(prev => prev.map(item => ({
        ...item,
        translatedValue: editedTranslations[item.key] ?? item.translatedValue,
      })));
      
      setEditedTranslations({});
      setHasChanges(false);
      
      toast({
        title: "Translations Saved",
        description: "Your translation changes have been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving translations:', error);
      toast({
        title: "Error",
        description: "Failed to save translations.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Set nested value in object by dot-path
  const setNestedValue = (obj: any, path: string, value: string) => {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  };

  // Reset all changes
  const handleReset = () => {
    setEditedTranslations({});
    setHasChanges(false);
    toast({
      title: "Changes Reset",
      description: "All unsaved changes have been discarded.",
    });
  };

  // Format namespace for display
  const formatNamespace = (ns: string): string => {
    return ns.charAt(0).toUpperCase() + ns.slice(1);
  };

  // Format path for display
  const formatPath = (path: string): string => {
    return path.split('.').map(p => 
      p.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    ).join(' → ');
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5" />
              Translation Editor
            </CardTitle>
            <CardDescription className="mt-1">
              Edit German translations. Original English values are shown on the left.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              🇬🇧 EN → 🇩🇪 DE
            </Badge>
            {hasChanges && (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                Unsaved Changes
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search translations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[calc(100vh-350px)]">
          <Accordion type="multiple" defaultValue={Object.keys(groupedTranslations)} className="space-y-2">
            {Object.entries(groupedTranslations).map(([namespace, items]) => {
              const filteredItems = filterTranslations(items);
              if (filteredItems.length === 0) return null;
              
              return (
                <AccordionItem key={namespace} value={namespace} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatNamespace(namespace)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {filteredItems.length} items
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {filteredItems.map(item => {
                        const currentValue = editedTranslations[item.key] ?? item.translatedValue;
                        const isEdited = editedTranslations[item.key] !== undefined;
                        const isDifferentFromOriginal = currentValue !== item.originalValue;
                        
                        return (
                          <div key={item.key} className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground">{item.path}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">🇬🇧 EN</Badge>
                              </div>
                              <div className="text-sm bg-background border rounded-md p-2 text-muted-foreground">
                                {item.originalValue}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground">Translation</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">🇩🇪 DE</Badge>
                                {isDifferentFromOriginal && (
                                  <Check className="w-3 h-3 text-green-500" />
                                )}
                                {isEdited && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-yellow-500/10 text-yellow-600">
                                    Modified
                                  </Badge>
                                )}
                              </div>
                              <Input
                                value={currentValue}
                                onChange={(e) => handleTranslationChange(item.key, e.target.value)}
                                className={isEdited ? "border-yellow-500/50" : ""}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TranslationEditor;
