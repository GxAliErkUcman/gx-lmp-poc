import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SeoWeight {
  id: string;
  factor_key: string;
  factor_label: string;
  category: string;
  weight: number;
  base_score: number;
}

const CATEGORY_ORDER = ['Core Identity', 'Address & Geo', 'Contact & Web', 'Opening Hours', 'Photos & Media', 'Services & Extras'];

const DEFAULT_WEIGHTS: Record<string, number> = {
  additionalCategories: 8,
  fromTheBusiness: 7,
  postalCode: 7,
  latLong: 8,
  primaryPhone: 8,
  website: 9,
  socialMediaUrls: 3,
  openingHours: 10,
  specialHours: 8,
  coverPhoto: 8,
  otherPhotos: 7,
  customServices: 8,
  labels: 2,
  serviceUrls: 3,
};

const SeoWeightsPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weights, setWeights] = useState<SeoWeight[]>([]);
  const [baseScore, setBaseScore] = useState(45);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedWeights, setEditedWeights] = useState<Record<string, number>>({});
  const [editedBase, setEditedBase] = useState<number | null>(null);

  useEffect(() => {
    fetchWeights();
  }, []);

  const fetchWeights = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seo_weights')
        .select('*')
        .order('category');

      if (error) throw error;
      setWeights(data || []);
      setEditedWeights({});
      if (data && data.length > 0) {
        setBaseScore(data[0].base_score);
        setEditedBase(null);
      }
    } catch (error) {
      console.error('Error fetching SEO weights:', error);
      toast({ title: 'Error', description: 'Failed to load SEO weights.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (factorKey: string, value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 0 && num <= 20) {
      setEditedWeights(prev => ({ ...prev, [factorKey]: num }));
    }
  };

  const getWeight = (w: SeoWeight) => editedWeights[w.factor_key] ?? w.weight;
  const getBase = () => editedBase ?? baseScore;

  const totalWeight = weights.reduce((sum, w) => sum + getWeight(w), 0);
  const hasChanges = Object.keys(editedWeights).length > 0 || editedBase !== null;

  const handleSave = async () => {
    try {
      setSaving(true);

      for (const [factorKey, weight] of Object.entries(editedWeights)) {
        const { error } = await supabase
          .from('seo_weights')
          .update({ weight, updated_at: new Date().toISOString(), updated_by: user?.id })
          .eq('factor_key', factorKey);
        if (error) throw error;
      }

      if (editedBase !== null) {
        const { error } = await supabase
          .from('seo_weights')
          .update({ base_score: editedBase, updated_at: new Date().toISOString() })
          .neq('id', '00000000-0000-0000-0000-000000000000'); // update all rows
        if (error) throw error;
      }

      toast({ title: 'Saved', description: 'SEO weights updated. Changes will apply to future score calculations.' });
      await fetchWeights();
    } catch (error) {
      console.error('Error saving weights:', error);
      toast({ title: 'Error', description: 'Failed to save SEO weights.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEditedWeights({});
    setEditedBase(null);
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('Reset all weights to factory defaults? This cannot be undone.')) return;
    try {
      setSaving(true);
      for (const [factorKey, weight] of Object.entries(DEFAULT_WEIGHTS)) {
        const { error } = await supabase
          .from('seo_weights')
          .update({ weight, base_score: 45, updated_at: new Date().toISOString(), updated_by: user?.id })
          .eq('factor_key', factorKey);
        if (error) throw error;
      }
      toast({ title: 'Reset', description: 'All weights restored to defaults.' });
      await fetchWeights();
    } catch (error) {
      console.error('Error resetting weights:', error);
      toast({ title: 'Error', description: 'Failed to reset weights.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    items: weights.filter(w => w.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">SEO Health Weights</h3>
          <p className="text-sm text-muted-foreground">
            Adjust how each factor contributes to the SEO health score. Gate fields (Name, Category, Address, City) are mandatory — if missing, score is always 0.
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" /> Discard
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleResetToDefaults} disabled={saving}>
            Reset to Defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Base score config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Base Score
            <Badge variant="outline" className="text-xs font-normal">
              Awarded when all gate fields are present
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label className="text-sm text-muted-foreground w-48">Minimum score for valid listings</Label>
            <Input
              type="number"
              min={0}
              max={80}
              className="w-20 text-center"
              value={getBase()}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v >= 0 && v <= 80) setEditedBase(v);
              }}
            />
            <span className="text-sm text-muted-foreground">% (remaining {100 - getBase()}% from weighted factors)</span>
          </div>
        </CardContent>
      </Card>

      {/* Factor weights by category */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {grouped.map(({ category, items }) => {
          const catTotal = items.reduce((sum, w) => sum + getWeight(w), 0);
          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {category}
                  <Badge variant="secondary" className="text-xs">{catTotal} pts</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map(w => {
                  const currentWeight = getWeight(w);
                  const isEdited = editedWeights[w.factor_key] !== undefined;
                  return (
                    <div key={w.id} className="flex items-center justify-between gap-2">
                      <Label className="text-sm flex-1">{w.factor_label}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        className={`w-16 text-center text-sm ${isEdited ? 'border-primary ring-1 ring-primary/30' : ''}`}
                        value={currentWeight}
                        onChange={(e) => handleWeightChange(w.factor_key, e.target.value)}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total weighted points (max raw score)</span>
            <span className="font-medium">{totalWeight} pts</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Score formula</span>
            <span className="font-mono text-xs">
              {getBase()}% + (earned / {totalWeight}) × {100 - getBase()}%
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SeoWeightsPanel;
