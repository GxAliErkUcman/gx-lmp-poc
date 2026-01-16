import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, RotateCcw, Search, Languages, Check, Plus, Trash2 } from 'lucide-react';
import { 
  getDefaultTranslations, 
  getAllTranslations, 
  saveTranslations, 
  getAllLanguages, 
  addCustomLanguage, 
  removeCustomLanguage,
  type Language 
} from '@/lib/i18n';
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
  
  const [languages, setLanguages] = useState<Language[]>([]);
  const [targetLang, setTargetLang] = useState('de');
  const [translations, setTranslations] = useState<FlatTranslation[]>([]);
  const [editedTranslations, setEditedTranslations] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Add language dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newLangCode, setNewLangCode] = useState('');
  const [newLangName, setNewLangName] = useState('');
  const [newLangFlag, setNewLangFlag] = useState('');
  
  // Delete language dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [langToDelete, setLangToDelete] = useState<Language | null>(null);

  // Load available languages
  useEffect(() => {
    const loadLanguages = () => {
      const allLangs = getAllLanguages();
      setLanguages(allLangs);
      
      // If current target doesn't exist, default to first non-English language
      if (!allLangs.some(l => l.code === targetLang)) {
        const nonEnglish = allLangs.find(l => l.code !== 'en');
        if (nonEnglish) {
          setTargetLang(nonEnglish.code);
        }
      }
    };
    
    loadLanguages();
  }, []);

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

  // Load translations when target language changes
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
    setEditedTranslations({});
    setHasChanges(false);
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

  // Calculate translation progress
  const translationProgress = useMemo(() => {
    let translated = 0;
    let total = translations.length;
    
    translations.forEach(item => {
      const currentValue = editedTranslations[item.key] ?? item.translatedValue;
      if (currentValue !== item.originalValue) {
        translated++;
      }
    });
    
    return { translated, total };
  }, [translations, editedTranslations]);

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
        description: `Your ${getCurrentLanguage()?.name || targetLang} translations have been saved.`,
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

  // Get current language object
  const getCurrentLanguage = () => languages.find(l => l.code === targetLang);

  // Handle adding a new language
  const handleAddLanguage = () => {
    if (!newLangCode || !newLangName) {
      toast({
        title: "Missing Fields",
        description: "Please enter both language code and name.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate code format (2-3 lowercase letters)
    if (!/^[a-z]{2,3}$/.test(newLangCode)) {
      toast({
        title: "Invalid Code",
        description: "Language code must be 2-3 lowercase letters (e.g., 'tr', 'es', 'fra').",
        variant: "destructive",
      });
      return;
    }
    
    try {
      addCustomLanguage(newLangCode, newLangName, newLangFlag || '🌐');
      
      // Refresh languages list
      setLanguages(getAllLanguages());
      
      // Switch to the new language
      setTargetLang(newLangCode);
      
      // Reset form
      setNewLangCode('');
      setNewLangName('');
      setNewLangFlag('');
      setAddDialogOpen(false);
      
      toast({
        title: "Language Added",
        description: `${newLangName} has been added. You can now start translating.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add language.",
        variant: "destructive",
      });
    }
  };

  // Handle deleting a language
  const handleDeleteLanguage = () => {
    if (!langToDelete) return;
    
    try {
      removeCustomLanguage(langToDelete.code);
      
      // Refresh languages list
      const updatedLangs = getAllLanguages();
      setLanguages(updatedLangs);
      
      // Switch to German or first available non-English
      const newTarget = updatedLangs.find(l => l.code === 'de') || updatedLangs.find(l => l.code !== 'en');
      if (newTarget) {
        setTargetLang(newTarget.code);
      }
      
      setDeleteDialogOpen(false);
      setLangToDelete(null);
      
      toast({
        title: "Language Deleted",
        description: `${langToDelete.name} has been removed.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete language.",
        variant: "destructive",
      });
    }
  };

  // Format namespace for display
  const formatNamespace = (ns: string): string => {
    return ns.charAt(0).toUpperCase() + ns.slice(1);
  };

  // Non-English languages for the selector
  const editableLanguages = languages.filter(l => l.code !== 'en');
  const currentLang = getCurrentLanguage();

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5" />
              Translation Editor
            </CardTitle>
            <CardDescription className="mt-1">
              Edit translations. English shown as source language on the left.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Language selector */}
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="w-[180px]">
                <SelectValue>
                  {currentLang && (
                    <span className="flex items-center gap-2">
                      <span>{currentLang.flag}</span>
                      <span>{currentLang.name}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {editableLanguages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                      {lang.isCustom && (
                        <Badge variant="secondary" className="text-[10px] ml-1">Custom</Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Add Language button */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="Add Language">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Add New Language</DialogTitle>
                  <DialogDescription>
                    Add a new language for translation. Untranslated strings will fall back to English.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="lang-code">Language Code *</Label>
                    <Input
                      id="lang-code"
                      value={newLangCode}
                      onChange={(e) => setNewLangCode(e.target.value.toLowerCase())}
                      placeholder="e.g., tr, es, fr, it"
                      maxLength={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      2-3 letter code (ISO 639-1)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lang-name">Language Name *</Label>
                    <Input
                      id="lang-name"
                      value={newLangName}
                      onChange={(e) => setNewLangName(e.target.value)}
                      placeholder="e.g., Türkçe, Español, Français"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lang-flag">Flag Emoji</Label>
                    <Input
                      id="lang-flag"
                      value={newLangFlag}
                      onChange={(e) => setNewLangFlag(e.target.value)}
                      placeholder="e.g., 🇹🇷, 🇪🇸, 🇫🇷"
                      maxLength={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. Defaults to 🌐 if not provided.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddLanguage}>
                    Add Language
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Delete Language button (only for custom languages) */}
            {currentLang?.isCustom && (
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="text-destructive hover:text-destructive"
                    title="Delete Language"
                    onClick={() => setLangToDelete(currentLang)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Language</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete {langToDelete?.flag} {langToDelete?.name}? 
                      All translations for this language will be permanently removed.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteLanguage}>
                      Delete Language
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            
            {hasChanges && (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                Unsaved Changes
              </Badge>
            )}
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="gap-1">
            🇬🇧 EN → {currentLang?.flag || '🌐'} {targetLang.toUpperCase()}
          </Badge>
          <Badge 
            variant={translationProgress.translated === translationProgress.total ? "default" : "secondary"}
            className={translationProgress.translated === translationProgress.total ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}
          >
            {translationProgress.translated}/{translationProgress.total} translated
            {translationProgress.translated === translationProgress.total && " ✓"}
          </Badge>
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
        <ScrollArea className="h-[calc(100vh-420px)]">
          <Accordion type="multiple" defaultValue={Object.keys(groupedTranslations)} className="space-y-2">
            {Object.entries(groupedTranslations).map(([namespace, items]) => {
              const filteredItems = filterTranslations(items);
              if (filteredItems.length === 0) return null;
              
              // Calculate namespace progress
              const nsTranslated = filteredItems.filter(item => {
                const currentValue = editedTranslations[item.key] ?? item.translatedValue;
                return currentValue !== item.originalValue;
              }).length;
              
              return (
                <AccordionItem key={namespace} value={namespace} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatNamespace(namespace)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {nsTranslated}/{filteredItems.length}
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
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {currentLang?.flag || '🌐'} {targetLang.toUpperCase()}
                                </Badge>
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