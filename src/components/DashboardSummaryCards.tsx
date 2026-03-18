import { Card, CardContent } from '@/components/ui/card';
import { MapPin, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { SeoScoreCircle } from '@/components/SeoScoreCard';

interface DashboardSummaryCardsProps {
  total: number;
  active: number;
  needAttention: number;
  avgSeoScore?: number | null;
}

function seoBand(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

function getHealthPercentage(active: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((active / total) * 100);
}

const DashboardSummaryCards = ({ total, active, needAttention, avgSeoScore }: DashboardSummaryCardsProps) => {
  const showSeo = avgSeoScore !== undefined && avgSeoScore !== null;
  const cols = showSeo ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3';
  const healthPct = getHealthPercentage(active, total);

  return (
    <div className={`grid ${cols} gap-4 mb-6`}>
      {/* Total Locations */}
      <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-card to-muted/30">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Locations</p>
            <p className="text-3xl font-bold tracking-tight">{total}</p>
          </div>
        </CardContent>
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
      </Card>

      {/* Active */}
      <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-card to-emerald-50/30 dark:to-emerald-950/10">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/20">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{active}</p>
              <span className="text-xs text-muted-foreground">{healthPct}%</span>
            </div>
            {/* Mini progress bar */}
            <div className="mt-1.5 h-1 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${healthPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Need Attention */}
      <Card className={`relative overflow-hidden border-0 shadow-md ${needAttention > 0 ? 'bg-gradient-to-br from-card to-amber-50/30 dark:to-amber-950/10 ring-1 ring-amber-200/50 dark:ring-amber-800/30' : 'bg-gradient-to-br from-card to-muted/30'}`}>
        <CardContent className="p-5 flex items-center gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ring-1 ${needAttention > 0 ? 'bg-amber-500/10 ring-amber-500/20' : 'bg-muted ring-border'}`}>
            <AlertTriangle className={`h-6 w-6 ${needAttention > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Need Attention</p>
            <p className={`text-3xl font-bold tracking-tight ${needAttention > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>{needAttention}</p>
          </div>
          {needAttention > 0 && (
            <div className="absolute top-2 right-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Score */}
      {showSeo && (
        <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-card to-muted/30">
          <CardContent className="p-5 flex items-center gap-4">
            <SeoScoreCircle score={avgSeoScore} band={seoBand(avgSeoScore)} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg SEO Health</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-bold tracking-tight">{avgSeoScore}%</p>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardSummaryCards;
