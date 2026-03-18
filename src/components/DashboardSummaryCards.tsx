import { Card, CardContent } from '@/components/ui/card';
import { MapPin, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
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

const DashboardSummaryCards = ({ total, active, needAttention, avgSeoScore }: DashboardSummaryCardsProps) => {
  const showSeo = avgSeoScore !== undefined && avgSeoScore !== null;
  const cols = showSeo ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3';

  return (
    <div className={`grid ${cols} gap-3 sm:gap-4 mb-6`}>
      <Card className="shadow-card">
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">Total</p>
            <p className="text-xl sm:text-2xl font-bold">{total}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-card">
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">Active</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{active}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-card">
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">Attention</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{needAttention}</p>
          </div>
        </CardContent>
      </Card>
      {showSeo && (
        <Card className="shadow-card">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <SeoScoreCircle score={avgSeoScore} band={seoBand(avgSeoScore)} size="sm" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Avg SEO Health</p>
              <p className="text-xl sm:text-2xl font-bold">{avgSeoScore}%</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardSummaryCards;
