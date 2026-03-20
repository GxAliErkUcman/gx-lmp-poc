import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RotateCcw, Plus, Trash2, Copy, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { invalidateSeoWeightsCache } from '@/lib/seoScoring';

interface SeoWeight {
  id: string;
  factor_key: string;
  factor_label: string;
  category: string;
  weight: number;
  base_score: number;
}

interface SeoProfile {
  id: string;
  name: string;
  base_score: number;
  created_at: string;
  items: Record<string, number>;
  assignedClients: { id: string; name: string }[];
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

const FACTOR_LABELS: Record<string, { label: string; category: string }> = {
  additionalCategories: { label: 'Additional Categories', category: 'Core Identity' },
  fromTheBusiness: { label: 'Description (From the Business)', category: 'Core Identity' },
  postalCode: { label: 'Postal Code', category: 'Address & Geo' },
  latLong: { label: 'Latitude / Longitude', category: 'Address & Geo' },
  primaryPhone: { label: 'Phone Number', category: 'Contact & Web' },
  website: { label: 'Website', category: 'Contact & Web' },
  socialMediaUrls: { label: 'Social Media URLs', category: 'Contact & Web' },
  openingHours: { label: 'Opening Hours (7 days)', category: 'Opening Hours' },
  specialHours: { label: 'Special / Holiday Hours', category: 'Opening Hours' },
  coverPhoto: { label: 'Cover Photo', category: 'Photos & Media' },
  otherPhotos: { label: 'Other Photos (3+)', category: 'Photos & Media' },
  customServices: { label: 'Custom Services', category: 'Services & Extras' },
  labels: { label: 'Labels', category: 'Services & Extras' },
  serviceUrls: { label: 'Service URLs', category: 'Services & Extras' },
};

const SeoWeightsPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Global weights
  const [weights, setWeights] = useState<SeoWeight[]>([]);
  const [baseScore, setBaseScore] = useState(45);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedWeights, setEditedWeights] = useState<Record<string, number>>({});
  const [editedBase, setEditedBase] = useState<number | null>(null);

  // Profiles
  const [profiles, setProfiles] = useState<SeoProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileEdits, setProfileEdits] = useState<Record<string, number>>({});
  const [profileBaseEdit, setProfileBaseEdit] = useState<number | null>(null);
  const [profileNameEdit, setProfileNameEdit] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Create profile dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignProfileId, setAssignProfileId] = useState<string | null>(null);
  const [allClients, setAllClients] = useState<{ id: string; name: string; seo_weight_profile_id: string | null }[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  useEffect(() => {
    fetchWeights();
    fetchProfiles();
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

  const fetchProfiles = async () => {
    try {
      setProfilesLoading(true);
      const { data: profilesData, error } = await supabase
        .from('seo_weight_profiles')
        .select('*')
        .order('name');

      if (error) throw error;

      const profilesList: SeoProfile[] = [];

      for (const p of (profilesData || [])) {
        // Fetch items
        const { data: items } = await supabase
          .from('seo_weight_profile_items')
          .select('factor_key, weight')
          .eq('profile_id', p.id);

        // Fetch assigned clients
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name')
          .eq('seo_weight_profile_id', p.id);

        const itemsMap: Record<string, number> = {};
        (items || []).forEach((i: any) => { itemsMap[i.factor_key] = i.weight; });

        profilesList.push({
          id: p.id,
          name: p.name,
          base_score: p.base_score,
          created_at: p.created_at,
          items: itemsMap,
          assignedClients: clients || [],
        });
      }

      setProfiles(profilesList);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setProfilesLoading(false);
    }
  };

  // ---- Global weights handlers ----
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
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
      }
      invalidateSeoWeightsCache();
      toast({ title: 'Saved', description: 'Global SEO weights updated.' });
      await fetchWeights();
    } catch (error) {
      console.error('Error saving weights:', error);
      toast({ title: 'Error', description: 'Failed to save SEO weights.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => { setEditedWeights({}); setEditedBase(null); };

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
      invalidateSeoWeightsCache();
      toast({ title: 'Reset', description: 'All weights restored to defaults.' });
      await fetchWeights();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reset weights.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ---- Profile handlers ----
  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;
    try {
      setSavingProfile(true);
      const { data: profile, error } = await supabase
        .from('seo_weight_profiles')
        .insert({ name: newProfileName.trim(), base_score: baseScore, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;

      // Copy current global weights as profile items
      const currentWeights = weights.length > 0
        ? Object.fromEntries(weights.map(w => [w.factor_key, getWeight(w)]))
        : DEFAULT_WEIGHTS;

      const items = Object.entries(currentWeights).map(([factor_key, weight]) => ({
        profile_id: profile.id,
        factor_key,
        weight,
      }));

      const { error: itemsError } = await supabase
        .from('seo_weight_profile_items')
        .insert(items);

      if (itemsError) throw itemsError;

      toast({ title: 'Profile Created', description: `"${newProfileName}" created with current weights.` });
      setNewProfileName('');
      setCreateDialogOpen(false);
      await fetchProfiles();
      setSelectedProfileId(profile.id);
    } catch (error) {
      console.error('Error creating profile:', error);
      toast({ title: 'Error', description: 'Failed to create profile.', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    if (profile.assignedClients.length > 0) {
      if (!window.confirm(`This profile is assigned to ${profile.assignedClients.length} client(s). They will revert to global weights. Continue?`)) return;
    } else {
      if (!window.confirm(`Delete profile "${profile.name}"?`)) return;
    }
    try {
      // Unassign clients first
      if (profile.assignedClients.length > 0) {
        await supabase
          .from('clients')
          .update({ seo_weight_profile_id: null } as any)
          .eq('seo_weight_profile_id', profileId);
      }
      const { error } = await supabase
        .from('seo_weight_profiles')
        .delete()
        .eq('id', profileId);
      if (error) throw error;
      invalidateSeoWeightsCache();
      toast({ title: 'Deleted', description: `Profile "${profile.name}" deleted.` });
      if (selectedProfileId === profileId) setSelectedProfileId(null);
      await fetchProfiles();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete profile.', variant: 'destructive' });
    }
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  const getProfileWeight = (factorKey: string) => {
    if (profileEdits[factorKey] !== undefined) return profileEdits[factorKey];
    return selectedProfile?.items[factorKey] ?? DEFAULT_WEIGHTS[factorKey] ?? 5;
  };

  const getProfileBase = () => profileBaseEdit ?? selectedProfile?.base_score ?? 45;
  const profileTotalWeight = Object.keys(FACTOR_LABELS).reduce((sum, k) => sum + getProfileWeight(k), 0);
  const hasProfileChanges = Object.keys(profileEdits).length > 0 || profileBaseEdit !== null || (selectedProfile && profileNameEdit !== '' && profileNameEdit !== selectedProfile.name);

  const handleSelectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    setProfileEdits({});
    setProfileBaseEdit(null);
    const p = profiles.find(pr => pr.id === profileId);
    setProfileNameEdit(p?.name || '');
  };

  const handleSaveProfile = async () => {
    if (!selectedProfile) return;
    try {
      setSavingProfile(true);

      // Update name/base_score
      const updates: any = { updated_at: new Date().toISOString() };
      if (profileNameEdit && profileNameEdit !== selectedProfile.name) updates.name = profileNameEdit;
      if (profileBaseEdit !== null) updates.base_score = profileBaseEdit;

      if (Object.keys(updates).length > 1) {
        const { error } = await supabase
          .from('seo_weight_profiles')
          .update(updates)
          .eq('id', selectedProfile.id);
        if (error) throw error;
      }

      // Update changed items
      for (const [factorKey, weight] of Object.entries(profileEdits)) {
        const { error } = await supabase
          .from('seo_weight_profile_items')
          .update({ weight })
          .eq('profile_id', selectedProfile.id)
          .eq('factor_key', factorKey);
        if (error) throw error;
      }

      invalidateSeoWeightsCache();
      toast({ title: 'Profile Saved', description: `"${profileNameEdit || selectedProfile.name}" updated.` });
      setProfileEdits({});
      setProfileBaseEdit(null);
      await fetchProfiles();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save profile.', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  // ---- Assign dialog ----
  const openAssignDialog = async (profileId: string) => {
    setAssignProfileId(profileId);
    setAssignDialogOpen(true);
    setClientsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, seo_weight_profile_id')
        .order('name');
      if (error) throw error;
      setAllClients(data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load clients.', variant: 'destructive' });
    } finally {
      setClientsLoading(false);
    }
  };

  const handleToggleClientProfile = async (clientId: string, currentProfileId: string | null) => {
    if (!assignProfileId) return;
    const newProfileId = currentProfileId === assignProfileId ? null : assignProfileId;
    try {
      const { error } = await supabase
        .from('clients')
        .update({ seo_weight_profile_id: newProfileId } as any)
        .eq('id', clientId);
      if (error) throw error;
      invalidateSeoWeightsCache();
      setAllClients(prev => prev.map(c => c.id === clientId ? { ...c, seo_weight_profile_id: newProfileId } : c));
      await fetchProfiles();
    } catch {
      toast({ title: 'Error', description: 'Failed to update client.', variant: 'destructive' });
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
    <div className="space-y-8">
      {/* ============ GLOBAL WEIGHTS ============ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Global SEO Weights</h3>
            <p className="text-sm text-muted-foreground">
              Default weights used for all clients without a custom profile.
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
              Save
            </Button>
          </div>
        </div>

        <Card className="mb-4">
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

        <Card className="mt-4">
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

      <Separator />

      {/* ============ CLIENT PROFILES ============ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Client-Specific Profiles</h3>
            <p className="text-sm text-muted-foreground">
              Create named weight profiles and assign them to specific clients. Clients without a profile use global weights.
            </p>
          </div>
          <Button size="sm" onClick={() => { setNewProfileName(''); setCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> New Profile
          </Button>
        </div>

        {profilesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : profiles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No custom profiles yet. Create one to assign different SEO weights to specific clients.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
            {profiles.map(profile => (
              <Card
                key={profile.id}
                className={`cursor-pointer transition-all ${selectedProfileId === profile.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                onClick={() => handleSelectProfile(profile.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="truncate">{profile.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); openAssignDialog(profile.id); }}
                        title="Assign to clients"
                      >
                        <Users className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id); }}
                        title="Delete profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Base: {profile.base_score}% · Factors: {Object.values(profile.items).reduce((s, v) => s + v, 0)} pts</div>
                    {profile.assignedClients.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {profile.assignedClients.map(c => (
                          <Badge key={c.id} variant="secondary" className="text-xs">{c.name}</Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground/60">No clients assigned</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Selected profile editor */}
        {selectedProfile && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h4 className="text-md font-semibold">Editing: </h4>
                <Input
                  value={profileNameEdit}
                  onChange={(e) => setProfileNameEdit(e.target.value)}
                  className="w-64 font-medium"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setProfileEdits({}); setProfileBaseEdit(null); setProfileNameEdit(selectedProfile.name); }}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Discard
                </Button>
                <Button size="sm" onClick={handleSaveProfile} disabled={!hasProfileChanges || savingProfile}>
                  {savingProfile ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Save Profile
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Profile Base Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Label className="text-sm text-muted-foreground w-48">Minimum score for valid listings</Label>
                  <Input
                    type="number"
                    min={0}
                    max={80}
                    className="w-20 text-center"
                    value={getProfileBase()}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v) && v >= 0 && v <= 80) setProfileBaseEdit(v);
                    }}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {CATEGORY_ORDER.map(cat => {
                const factorsInCat = Object.entries(FACTOR_LABELS).filter(([, v]) => v.category === cat);
                if (factorsInCat.length === 0) return null;
                const catTotal = factorsInCat.reduce((sum, [k]) => sum + getProfileWeight(k), 0);
                return (
                  <Card key={cat}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center justify-between">
                        {cat}
                        <Badge variant="secondary" className="text-xs">{catTotal} pts</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {factorsInCat.map(([factorKey, { label }]) => {
                        const val = getProfileWeight(factorKey);
                        const isEdited = profileEdits[factorKey] !== undefined;
                        return (
                          <div key={factorKey} className="flex items-center justify-between gap-2">
                            <Label className="text-sm flex-1">{label}</Label>
                            <Input
                              type="number"
                              min={0}
                              max={20}
                              className={`w-16 text-center text-sm ${isEdited ? 'border-primary ring-1 ring-primary/30' : ''}`}
                              value={val}
                              onChange={(e) => {
                                const num = parseInt(e.target.value);
                                if (!isNaN(num) && num >= 0 && num <= 20) {
                                  setProfileEdits(prev => ({ ...prev, [factorKey]: num }));
                                }
                              }}
                            />
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total weighted points</span>
                  <span className="font-medium">{profileTotalWeight} pts</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Score formula</span>
                  <span className="font-mono text-xs">
                    {getProfileBase()}% + (earned / {profileTotalWeight}) × {100 - getProfileBase()}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create Profile Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create SEO Weight Profile</DialogTitle>
            <DialogDescription>
              The new profile will start with a copy of the current global weights.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Profile Name</Label>
              <Input
                placeholder="e.g. EV Charging, Retail Stores..."
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateProfile} disabled={!newProfileName.trim() || savingProfile}>
                {savingProfile ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign to Clients Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Profile to Clients</DialogTitle>
            <DialogDescription>
              Toggle clients to use the "{profiles.find(p => p.id === assignProfileId)?.name}" profile instead of global weights.
            </DialogDescription>
          </DialogHeader>
          {clientsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-1">
              {allClients.map(client => {
                const isAssigned = client.seo_weight_profile_id === assignProfileId;
                const hasOtherProfile = client.seo_weight_profile_id && client.seo_weight_profile_id !== assignProfileId;
                const otherProfileName = hasOtherProfile ? profiles.find(p => p.id === client.seo_weight_profile_id)?.name : null;
                return (
                  <div
                    key={client.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isAssigned ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                    onClick={() => handleToggleClientProfile(client.id, client.seo_weight_profile_id)}
                  >
                    <div>
                      <div className="text-sm font-medium">{client.name}</div>
                      {hasOtherProfile && (
                        <div className="text-xs text-muted-foreground">Currently using: {otherProfileName || 'other profile'}</div>
                      )}
                    </div>
                    <Badge variant={isAssigned ? 'default' : 'outline'} className="text-xs">
                      {isAssigned ? 'Assigned' : 'Global'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeoWeightsPanel;
