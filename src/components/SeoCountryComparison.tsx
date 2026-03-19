import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Globe, ArrowUpDown, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { calculateSeoScore, SEO_THRESHOLD } from '@/lib/seoScoring';
import { SeoScoreBadge } from '@/components/SeoScoreCard';
import type { Business } from '@/types/business';
import type { SeoScoreResult, SeoCategoryScore } from '@/lib/seoScoring';

interface SeoCountryComparisonProps {
  businesses: Business[];
}

interface CountryStats {
  country: string;
  count: number;
  averageScore: number;
  band: 'green' | 'yellow' | 'red';
  distribution: { green: number; yellow: number; red: number };
  belowThreshold: number;
  categories: { name: string; avgPercentage: number }[];
  topMissingFields: { field: string; percentage: number }[];
}

type SortKey = 'country' | 'count' | 'averageScore' | 'belowThreshold';

function computeCountryStats(businesses: Business[]): CountryStats[] {
  const grouped: Record<string, { businesses: Business[]; results: SeoScoreResult[] }> = {};

  businesses.forEach(b => {
    const country = b.country?.trim() || 'Unknown';
    if (!grouped[country]) grouped[country] = { businesses: [], results: [] };
    grouped[country].businesses.push(b);
    grouped[country].results.push(calculateSeoScore(b));
  });

  return Object.entries(grouped).map(([country, { businesses: biz, results }]) => {
    const avgScore = Math.round(results.reduce((s, r) => s + r.overallScore, 0) / results.length);
    const distribution = { green: 0, yellow: 0, red: 0 };
    results.forEach(r => distribution[r.band]++);
    const belowThreshold = results.filter(r => r.overallScore < SEO_THRESHOLD).length;

    // Average category percentages
    const catMap: Record<string, number[]> = {};
    results.forEach(r => {
      r.categories.forEach(c => {
        if (!catMap[c.name]) catMap[c.name] = [];
        catMap[c.name].push(c.percentage);
      });
    });
    const categories = Object.entries(catMap).map(([name, vals]) => ({
      name,
      avgPercentage: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }));

    // Top missing fields
    const fieldCounts: Record<string, number> = {};
    results.forEach(r => r.suggestions.forEach(s => {
      fieldCounts[s.field] = (fieldCounts[s.field] || 0) + 1;
    }));
    const topMissingFields = Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([field, count]) => ({ field, percentage: Math.round((count / biz.length) * 100) }));

    return {
      country,
      count: biz.length,
      averageScore: avgScore,
      band: (avgScore >= 80 ? 'green' : avgScore >= 50 ? 'yellow' : 'red') as 'green' | 'yellow' | 'red',
      distribution,
      belowThreshold,
      categories,
      topMissingFields,
    };
  });
}

export default function SeoCountryComparison({ businesses }: SeoCountryComparisonProps) {
  const [sortKey, setSortKey] = useState<SortKey>('averageScore');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  const countryStats = useMemo(() => computeCountryStats(businesses), [businesses]);

  const sorted = useMemo(() => {
    const copy = [...countryStats];
    copy.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'country') diff = a.country.localeCompare(b.country);
      else if (sortKey === 'count') diff = a.count - b.count;
      else if (sortKey === 'averageScore') diff = a.averageScore - b.averageScore;
      else if (sortKey === 'belowThreshold') diff = a.belowThreshold - b.belowThreshold;
      return sortAsc ? diff : -diff;
    });
    return copy;
  }, [countryStats, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'country'); }
  };

  if (countryStats.length <= 1) return null;

  const SortButton = ({ label, col }: { label: string; col: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
      onClick={() => handleSort(col)}
    >
      {label}
      {sortKey === col ? (
        sortAsc ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
      ) : (
        <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />
      )}
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          Country & Market Comparison
          <Badge variant="secondary" className="ml-2 text-[10px]">{countryStats.length} markets</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortButton label="Country" col="country" /></TableHead>
              <TableHead className="text-right"><SortButton label="Locations" col="count" /></TableHead>
              <TableHead className="text-right"><SortButton label="Avg Score" col="averageScore" /></TableHead>
              <TableHead>Distribution</TableHead>
              <TableHead className="text-right"><SortButton label="Below Threshold" col="belowThreshold" /></TableHead>
              <TableHead>Top Missing</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(stat => (
              <>
                <TableRow
                  key={stat.country}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedCountry(expandedCountry === stat.country ? null : stat.country)}
                >
                  <TableCell className="font-medium">{stat.country}</TableCell>
                  <TableCell className="text-right">{stat.count}</TableCell>
                  <TableCell className="text-right">
                    <SeoScoreBadge score={stat.averageScore} band={stat.band} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 min-w-[120px]">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs">{stat.distribution.green}</span>
                      <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-xs">{stat.distribution.yellow}</span>
                      <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                      <span className="text-xs">{stat.distribution.red}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {stat.belowThreshold > 0 ? (
                      <span className="text-destructive font-medium">{stat.belowThreshold}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {stat.topMissingFields.slice(0, 2).map(f => (
                        <Badge key={f.field} variant="outline" className="text-[10px]">
                          {f.field} ({f.percentage}%)
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {expandedCountry === stat.country ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </TableCell>
                </TableRow>
                {expandedCountry === stat.country && (
                  <TableRow key={`${stat.country}-detail`}>
                    <TableCell colSpan={7} className="bg-muted/30 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Category Breakdown */}
                        <div>
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                            Category Breakdown
                          </h4>
                          <div className="space-y-2">
                            {stat.categories.map(cat => (
                              <div key={cat.name} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">{cat.name}</span>
                                  <span className="font-medium">{cat.avgPercentage}%</span>
                                </div>
                                <Progress
                                  value={cat.avgPercentage}
                                  className="h-1.5"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* All Missing Fields */}
                        <div>
                          <h4 className="text-sm font-medium mb-3">Top Missing Fields</h4>
                          <div className="space-y-1.5">
                            {stat.topMissingFields.map(f => (
                              <div key={f.field} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{f.field}</span>
                                <Badge variant="outline" className="text-[10px]">{f.percentage}%</Badge>
                              </div>
                            ))}
                            {stat.topMissingFields.length === 0 && (
                              <p className="text-xs text-muted-foreground">All fields covered!</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
