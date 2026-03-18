import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, RotateCcw, AlertTriangle, CheckCircle, Loader2, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface EdgeFunctionLog {
  id: string;
  function_name: string;
  status: string;
  request_body: any;
  response_body: any;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
  retried_at: string | null;
  retry_of: string | null;
}

const EdgeFunctionLogsPanel = () => {
  const [logs, setLogs] = useState<EdgeFunctionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [functionFilter, setFunctionFilter] = useState<string>('all');
  const [retrying, setRetrying] = useState<string | null>(null);
  const [detailLog, setDetailLog] = useState<EdgeFunctionLog | null>(null);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('edge_function_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filter === 'errors') {
        query = query.eq('status', 'error');
      } else if (filter === 'success') {
        query = query.eq('status', 'success');
      }

      if (functionFilter !== 'all') {
        query = query.eq('function_name', functionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      const fetchedLogs = (data as EdgeFunctionLog[]) || [];
      setLogs(fetchedLogs);

      // Resolve client names for logs with client_id
      const clientIds = [...new Set(
        fetchedLogs
          .map(l => l.request_body?.client_id)
          .filter((id): id is string => !!id)
      )];
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name')
          .in('id', clientIds);
        if (clients) {
          const map: Record<string, string> = {};
          clients.forEach(c => { map[c.id] = c.name; });
          setClientNames(map);
        }
      }
    } catch (err: any) {
      toast({ title: 'Failed to load logs', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filter, functionFilter, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRetry = async (log: EdgeFunctionLog) => {
    if (!log.request_body) {
      toast({ title: 'Cannot retry', description: 'No request body stored for this execution', variant: 'destructive' });
      return;
    }

    setRetrying(log.id);
    try {
      const { data, error } = await supabase.functions.invoke(log.function_name, {
        body: log.request_body
      });

      if (error) throw error;

      // Mark original as retried
      await supabase
        .from('edge_function_logs')
        .update({ retried_at: new Date().toISOString() })
        .eq('id', log.id);

      toast({ title: 'Retry successful', description: `${log.function_name} re-executed successfully` });
      fetchLogs();
    } catch (err: any) {
      toast({ title: 'Retry failed', description: err.message, variant: 'destructive' });
    } finally {
      setRetrying(null);
    }
  };

  const errorCount = logs.filter(l => l.status === 'error' && !l.retried_at).length;
  const uniqueFunctions = [...new Set(logs.map(l => l.function_name))];

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { 
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Edge Function Logs</CardTitle>
              {errorCount > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errorCount} unresolved error{errorCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={functionFilter} onValueChange={setFunctionFilter}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="All Functions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Functions</SelectItem>
                  {uniqueFunctions.map(fn => (
                    <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="errors">Errors Only</SelectItem>
                  <SelectItem value="success">Success Only</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No logs found. Edge functions will start logging on next execution.
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Time</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[80px]">Duration</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow 
                      key={log.id} 
                      className={log.status === 'error' && !log.retried_at ? 'bg-destructive/5' : ''}
                    >
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {formatTime(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{log.function_name}</span>
                        {log.request_body?.client_id && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({String(log.request_body.client_id).substring(0, 8)}…)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.status === 'success' ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />OK
                          </Badge>
                        ) : log.status === 'error' ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />Fail
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />{log.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {formatDuration(log.duration_ms)}
                      </TableCell>
                      <TableCell>
                        {log.error_message ? (
                          <button
                            onClick={() => setDetailLog(log)}
                            className="text-xs text-destructive truncate max-w-[300px] block cursor-pointer hover:underline text-left"
                            title={log.error_message}
                          >
                            {log.error_message}
                          </button>
                        ) : log.retried_at ? (
                          <span className="text-xs text-muted-foreground italic">
                            Retried {formatTime(log.retried_at)}
                          </span>
                        ) : log.response_body?.businessCount !== undefined ? (
                          <span className="text-xs text-muted-foreground">
                            {log.response_body.businessCount} locations
                          </span>
                        ) : (
                          <button 
                            onClick={() => setDetailLog(log)}
                            className="text-xs text-muted-foreground hover:underline cursor-pointer"
                          >
                            View details
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.status === 'error' && !log.retried_at && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetry(log)}
                            disabled={retrying === log.id}
                            className="h-7 text-xs"
                          >
                            {retrying === log.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <RotateCcw className="h-3 w-3 mr-1" />
                            )}
                            Retry
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detailLog?.function_name} — {detailLog?.status === 'error' ? 'Error' : 'Execution'} Details
            </DialogTitle>
            <DialogDescription>
              {detailLog && formatTime(detailLog.created_at)} • Duration: {detailLog && formatDuration(detailLog.duration_ms)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {detailLog?.error_message && (
              <div>
                <h4 className="text-sm font-semibold text-destructive mb-1">Error Message</h4>
                <pre className="text-xs bg-destructive/10 p-3 rounded-md whitespace-pre-wrap break-all">
                  {detailLog.error_message}
                </pre>
              </div>
            )}
            {detailLog?.request_body && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Request Body</h4>
                <pre className="text-xs bg-muted p-3 rounded-md whitespace-pre-wrap break-all">
                  {JSON.stringify(detailLog.request_body, null, 2)}
                </pre>
              </div>
            )}
            {detailLog?.response_body && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Response Body</h4>
                <pre className="text-xs bg-muted p-3 rounded-md whitespace-pre-wrap break-all">
                  {JSON.stringify(detailLog.response_body, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EdgeFunctionLogsPanel;
