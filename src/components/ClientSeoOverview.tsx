import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, TrendingUp, BarChart3, Target } from 'lucide-react';
import { calculateSeoScore, calculateClientSeoStats, SEO_THRESHOLD } from '@/lib/seoScoring';
import { SeoScoreCircle, SeoScoreBadge } from '@/components/SeoScoreCard';
import SeoScoreCard from '@/components/SeoScoreCard';
import type { Business } from '@/types/business';

interface ClientSeoOverviewProps {
  businesses: Business[];
  onEditBusiness?: (business: Business) => void;
}

export default function ClientSeoOverview({ businesses, onEditBusiness }: ClientSeoOverviewProps) {
  const stats = useMemo(() => calculateClientSeoStats(businesses), [businesses]);
  const averageBand = stats.averageScore >= 80 ? 'green' as const : stats.averageScore >= 50 ? 'yellow' as const : 'red' as const;

  const belowThreshold = useMemo(() => 
    stats.lowestScoring.filter(l => l.score < SEO_THRESHOLD),
    [stats.lowestScoring]
  );

  // Get the full SeoScoreResult for the lowest scoring location for detailed view
  const worstLocation = useMemo(() => {
    if (stats.lowestScoring.length === 0) return null;
    const worst = stats.lowestScoring[0];
    return { business: worst.business, result: calculateSeoScore(worst.business) };
  }, [stats.lowestScoring]);

  if (businesses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No locations to analyze</p>
        </CardContent>
      </Card>
    );
  }

  const total = businesses.length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center">
            <SeoScoreCircle score={stats.averageScore} band={averageBand} size="lg" />
            <p className="mt-3 text-sm font-medium">Average SEO Score</p>
            <p className="text-xs text-muted-foreground">{total} location{total !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Good (80+)
              </span>
              <span className="font-medium">{stats.distribution.green}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                Fair (50-79)
              </span>
              <span className="font-medium">{stats.distribution.yellow}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                Poor (&lt;50)
              </span>
              <span className="font-medium">{stats.distribution.red}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              Below Threshold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{belowThreshold.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              locations below {SEO_THRESHOLD}% threshold
            </p>
            {belowThreshold.length > 0 && (
              <p className="text-xs text-destructive mt-2">
                {Math.round((belowThreshold.length / total) * 100)}% of portfolio needs improvement
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Top Missing Fields
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.commonMissingFields.slice(0, 3).map(({ field, percentage }) => (
                <div key={field} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate mr-2">{field}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{percentage}%</Badge>
                </div>
              ))}
              {stats.commonMissingFields.length === 0 && (
                <p className="text-xs text-muted-foreground">All fields covered!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lowest Scoring Locations Table */}
      {stats.lowestScoring.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Lowest Scoring Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Store Code</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.lowestScoring.map(({ business, score, band }) => (
                  <TableRow key={business.id}>
                    <TableCell className="font-medium">{business.businessName || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{business.storeCode}</TableCell>
                    <TableCell className="text-muted-foreground">{business.city || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{business.country || '—'}</TableCell>
                    <TableCell className="text-right">
                      <SeoScoreBadge score={score} band={band} />
                    </TableCell>
                    <TableCell>
                      {onEditBusiness && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => onEditBusiness(business)}
                          className="text-xs"
                        >
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detailed view of worst location */}
      {worstLocation && worstLocation.result.overallScore < SEO_THRESHOLD && (
        <SeoScoreCard 
          result={worstLocation.result} 
          businessName={worstLocation.business.businessName} 
        />
      )}
    </div>
  );
}
