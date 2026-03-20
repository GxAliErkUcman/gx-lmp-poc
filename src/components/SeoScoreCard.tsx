import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Eye, Info, Pencil, Image } from 'lucide-react';
import type { SeoScoreResult, SeoPriority } from '@/lib/seoScoring';

type SuggestionAction = 'edit' | 'gallery' | 'none';

// Map suggestion field names to their action type
const getFieldAction = (field: string): { action: SuggestionAction; label: string } => {
  switch (field) {
    case 'coverPhoto':
    case 'otherPhotos':
    case 'logoPhoto':
      return { action: 'gallery', label: 'Open Gallery' };
    case 'businessName':
    case 'primaryCategory':
    case 'additionalCategories':
    case 'fromTheBusiness':
    case 'addressLine1':
    case 'city':
    case 'postalCode':
    case 'latitude/longitude':
    case 'primaryPhone':
    case 'website':
    case 'socialMediaUrls':
    case 'openingHours':
    case 'specialHours':
    case 'customServices':
    case 'labels':
      return { action: 'edit', label: 'Fix now' };
    default:
      return { action: 'none', label: '' };
  }
};

interface SeoScoreCardProps {
  result: SeoScoreResult;
  businessName?: string;
  compact?: boolean;
  onFixAction?: (field: string, action: SuggestionAction) => void;
}

const bandColors = {
  green: 'text-emerald-600 dark:text-emerald-400',
  yellow: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
};

const bandBgColors = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
};

const priorityConfig: Record<SeoPriority, { icon: typeof AlertTriangle; label: string; className: string }> = {
  high: { icon: AlertTriangle, label: 'High Impact', className: 'text-red-600 dark:text-red-400' },
  medium: { icon: Info, label: 'Medium Impact', className: 'text-amber-600 dark:text-amber-400' },
  low: { icon: Eye, label: 'Low Impact', className: 'text-muted-foreground' },
};

export function SeoScoreBadge({ score, band }: { score: number; band: 'green' | 'yellow' | 'red' }) {
  return (
    <Badge 
      variant="outline" 
      className={`text-xs font-mono ${bandColors[band]} border-current`}
    >
      {score}%
    </Badge>
  );
}

export function SeoScoreCircle({ score, band, size = 'md' }: { score: number; band: 'green' | 'yellow' | 'red'; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-12 h-12 text-sm', md: 'w-20 h-20 text-xl', lg: 'w-28 h-28 text-3xl' };
  const strokeSizes = { sm: 3, md: 4, lg: 5 };
  const radius = { sm: 20, md: 34, lg: 48 };
  const viewBox = { sm: '0 0 48 48', md: '0 0 80 80', lg: '0 0 112 112' };
  const center = { sm: 24, md: 40, lg: 56 };
  
  const r = radius[size];
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const strokeColor = band === 'green' ? 'stroke-emerald-500' : band === 'yellow' ? 'stroke-amber-500' : 'stroke-red-500';

  return (
    <div className={`relative ${sizes[size]} flex items-center justify-center`}>
      <svg className="absolute inset-0 -rotate-90" viewBox={viewBox[size]}>
        <circle
          cx={center[size]} cy={center[size]} r={r}
          fill="none"
          strokeWidth={strokeSizes[size]}
          className="stroke-muted"
        />
        <circle
          cx={center[size]} cy={center[size]} r={r}
          fill="none"
          strokeWidth={strokeSizes[size]}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${strokeColor} transition-all duration-700`}
        />
      </svg>
      <span className={`font-bold ${bandColors[band]}`}>{score}</span>
    </div>
  );
}

export default function SeoScoreCard({ result, businessName, compact = false, onFixAction }: SeoScoreCardProps) {
  const [suggestionsOpen, setSuggestionsOpen] = useState(!compact);

  // Group suggestions by category
  const grouped = result.suggestions.reduce<Record<string, typeof result.suggestions>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <SeoScoreCircle score={result.overallScore} band={result.band} size="sm" />
        <div className="text-xs text-muted-foreground">
          {result.suggestions.length} suggestion{result.suggestions.length !== 1 ? 's' : ''}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {businessName ? `SEO Health — ${businessName}` : 'SEO Health Score'}
          </CardTitle>
          <SeoScoreCircle score={result.overallScore} band={result.band} size="md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category breakdown */}
        <div className="space-y-2">
          {result.categories.map(cat => (
            <div key={cat.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{cat.name}</span>
                <span className="font-medium">{cat.score}/{cat.maxScore}</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    cat.percentage >= 80 ? 'bg-emerald-500' : cat.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        {result.suggestions.length > 0 && (
          <Collapsible open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full hover:text-primary transition-colors">
              {suggestionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {result.suggestions.length} Suggestion{result.suggestions.length !== 1 ? 's' : ''} for Improvement
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-4">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{category}</h4>
                  <div className="space-y-2">
                    {items.map((suggestion, i) => {
                      const config = priorityConfig[suggestion.priority];
                      const Icon = config.icon;
                      const fieldAction = getFieldAction(suggestion.field);
                      return (
                        <div key={i} className="flex items-start gap-2 text-sm border rounded-lg p-2.5">
                          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.className}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{suggestion.message}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{suggestion.impact}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {onFixAction && fieldAction.action !== 'none' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 gap-1"
                                onClick={() => onFixAction(suggestion.field, fieldAction.action)}
                              >
                                {fieldAction.action === 'gallery' ? (
                                  <Image className="w-3 h-3" />
                                ) : (
                                  <Pencil className="w-3 h-3" />
                                )}
                                {fieldAction.label}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
