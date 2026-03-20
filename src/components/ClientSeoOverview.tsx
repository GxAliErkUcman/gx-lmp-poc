import { useMemo, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, TrendingUp, BarChart3, Target, FileDown, Search } from 'lucide-react';
import SeoCountryComparison from '@/components/SeoCountryComparison';
import { calculateSeoScore, calculateClientSeoStats, SEO_THRESHOLD } from '@/lib/seoScoring';
import { SeoScoreCircle, SeoScoreBadge } from '@/components/SeoScoreCard';
import SeoScoreCard from '@/components/SeoScoreCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { Business } from '@/types/business';
import { useSeoWeights } from '@/hooks/use-seo-weights';
import LocationGalleryDialog from '@/components/LocationGalleryDialog';

interface ClientSeoOverviewProps {
  businesses: Business[];
  onEditBusiness?: (business: Business) => void;
  clientName?: string;
  clientId?: string;
  customPhotosEnabled?: boolean;
}

export default function ClientSeoOverview({ businesses, onEditBusiness, clientName, clientId, customPhotosEnabled = false }: ClientSeoOverviewProps) {
  const { weights, baseScore, loading: weightsLoading } = useSeoWeights(clientId);
  const stats = useMemo(() => calculateClientSeoStats(businesses, weights || undefined, baseScore), [businesses, weights, baseScore]);
  const averageBand = stats.averageScore >= 80 ? 'green' as const : stats.averageScore >= 50 ? 'yellow' as const : 'red' as const;
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [galleryBusiness, setGalleryBusiness] = useState<Business | null>(null);
  const belowThreshold = useMemo(() => 
    stats.lowestScoring.filter(l => l.score < SEO_THRESHOLD),
    [stats.lowestScoring]
  );

  // All scored businesses for the interactive selector
  const allScored = useMemo(() => 
    businesses.map(b => ({ business: b, result: calculateSeoScore(b, weights || undefined, baseScore) }))
      .sort((a, b) => a.result.overallScore - b.result.overallScore),
    [businesses, weights, baseScore]
  );

  // Selected location detail
  const selectedDetail = useMemo(() => {
    if (!selectedBusinessId) {
      // Default to worst location below threshold
      const worst = allScored.find(s => s.result.overallScore < SEO_THRESHOLD);
      return worst || allScored[0] || null;
    }
    return allScored.find(s => s.business.id === selectedBusinessId) || null;
  }, [selectedBusinessId, allScored]);

  const handleSelectLocation = (businessId: string) => {
    setSelectedBusinessId(businessId);
    // Scroll to detail card
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleFixAction = useCallback((field: string, action: string) => {
    if (!selectedDetail) return;
    const business = selectedDetail.business;
    
    if (action === 'gallery') {
      setGalleryBusiness(business);
    } else if (action === 'edit' && onEditBusiness) {
      onEditBusiness(business);
    }
  }, [selectedDetail, onEditBusiness]);

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows: string[][] = [['Store Code', 'Business Name', 'City', 'Country', 'SEO Score', 'Band', 'Missing Fields', 'Suggestions']];

    allScored.forEach(({ business, result }) => {
      const missingFields = result.suggestions.map(s => s.field).join('; ');
      const suggestions = result.suggestions.map(s => `[${s.priority}] ${s.message}`).join('; ');
      rows.push([
        business.storeCode || '',
        business.businessName || '',
        business.city || '',
        business.country || '',
        String(result.overallScore),
        result.band,
        missingFields,
        suggestions,
      ]);
    });

    const csv = rows.map(row => row.map(escape).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo-health-${clientName || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const locationRows = allScored.map(({ business, result }) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${business.businessName || '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${business.storeCode}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${business.city || '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${business.country || '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:${result.band === 'green' ? '#059669' : result.band === 'yellow' ? '#d97706' : '#dc2626'};">${result.overallScore}%</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${result.suggestions.slice(0, 3).map(s => s.message).join('; ') || 'No suggestions'}</td>
      </tr>
    `).join('');

    const missingFieldsHtml = stats.commonMissingFields.map(f => `<li>${f.field} — missing in ${f.percentage}% of locations</li>`).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SEO Health Report — ${clientName || 'Client'}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; color: #1a1a1a; }
          h1 { font-size: 24px; margin-bottom: 4px; }
          h2 { font-size: 18px; margin-top: 32px; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
          .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
          .stats { display: flex; gap: 24px; margin-bottom: 24px; }
          .stat-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; flex: 1; }
          .stat-value { font-size: 28px; font-weight: 700; }
          .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { text-align: left; padding: 8px; border-bottom: 2px solid #d1d5db; font-size: 12px; text-transform: uppercase; color: #6b7280; }
          .green { color: #059669; } .yellow { color: #d97706; } .red { color: #dc2626; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>SEO Health Report</h1>
        <p class="subtitle">${clientName || 'Client'} — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} — ${businesses.length} locations</p>

        <div class="stats">
          <div class="stat-box">
            <div class="stat-value ${averageBand}">${stats.averageScore}%</div>
            <div class="stat-label">Average Score</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${stats.distribution.green}</div>
            <div class="stat-label">Good (80+)</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${stats.distribution.yellow}</div>
            <div class="stat-label">Fair (50-79)</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${stats.distribution.red}</div>
            <div class="stat-label">Poor (&lt;50)</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${belowThreshold.length}</div>
            <div class="stat-label">Below ${SEO_THRESHOLD}% threshold</div>
          </div>
        </div>

        ${stats.commonMissingFields.length > 0 ? `
          <h2>Top Missing Fields</h2>
          <ul>${missingFieldsHtml}</ul>
        ` : ''}

        <h2>All Locations by Score</h2>
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Store Code</th>
              <th>City</th>
              <th>Country</th>
              <th style="text-align:right;">Score</th>
              <th>Top Suggestions</th>
            </tr>
          </thead>
          <tbody>${locationRows}</tbody>
        </table>

        <div class="footer">
          Jasoner SEO Health Report — Generated ${new Date().toLocaleString()} — Confidential
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

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
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">SEO Health Overview</h2>
          <p className="text-sm text-muted-foreground">{total} location{total !== 1 ? 's' : ''} analyzed</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <FileDown className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

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

      {/* Country & Market Comparison */}
      <SeoCountryComparison businesses={businesses} weights={weights || undefined} baseScore={baseScore} />

      {/* Lowest Scoring Locations Table — Interactive */}
      {stats.lowestScoring.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Lowest Scoring Locations
              <span className="text-xs font-normal text-muted-foreground ml-2">Click a row to view details</span>
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
                  <TableRow 
                    key={business.id} 
                    className={`cursor-pointer transition-colors ${
                      (selectedBusinessId || allScored.find(s => s.result.overallScore < SEO_THRESHOLD)?.business.id || allScored[0]?.business.id) === business.id 
                        ? 'bg-primary/5 border-l-2 border-l-primary' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSelectLocation(business.id)}
                  >
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
                          onClick={(e) => { e.stopPropagation(); onEditBusiness(business); }}
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

      {/* Location Search & Detail View */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            Location SEO Details
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, store code, or city..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-48 overflow-y-auto mt-2 border rounded-md">
            {allScored
              .filter(({ business }) => {
                if (!locationSearch) return true;
                const q = locationSearch.toLowerCase();
                return (
                  (business.businessName || '').toLowerCase().includes(q) ||
                  (business.storeCode || '').toLowerCase().includes(q) ||
                  (business.city || '').toLowerCase().includes(q)
                );
              })
              .map(({ business, result }) => (
                <button
                  key={business.id}
                  onClick={() => handleSelectLocation(business.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                    selectedBusinessId === business.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{business.businessName || '—'}</span>
                    <span className="text-xs text-muted-foreground">{business.storeCode} · {business.city || '—'}</span>
                  </div>
                  <SeoScoreBadge score={result.overallScore} band={result.band} />
                </button>
              ))}
          </div>
        </CardHeader>
        {selectedDetail && (
          <CardContent ref={detailRef}>
            <SeoScoreCard
              result={selectedDetail.result}
              businessName={selectedDetail.business.businessName}
              onFixAction={handleFixAction}
            />
          </CardContent>
        )}
      </Card>

      {galleryBusiness && (
        <LocationGalleryDialog
          open={!!galleryBusiness}
          onOpenChange={(open) => { if (!open) setGalleryBusiness(null); }}
          business={galleryBusiness}
          clientName={clientName || ''}
          customPhotosEnabled={customPhotosEnabled}
        />
      )}
    </div>
  );
}
