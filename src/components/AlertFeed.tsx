import { useEffect, useRef, useState } from 'react';
import { Clock, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAlerts } from '@/hooks/useAlerts';
import { supabase } from '@/integrations/supabase/client';
import { downloadCsv } from '@/lib/backendApi';
import { useToast } from '@/hooks/use-toast';
import { trackHotjarEvent } from '@/lib/hotjar';
import { secondsSince, track } from '@/lib/tracking';

interface ProfileOption {
  user_id: string;
  full_name: string | null;
}

export function AlertFeed({ onAlertsChanged }: { onAlertsChanged?: () => void }) {
  const { alerts, loading, error, updateAlertStatus, refresh } = useAlerts();
  const { toast } = useToast();
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [exporting, setExporting] = useState(false);

  const filteredAlerts = alerts.filter(alert => 
    selectedSeverity === 'all' || alert.severity === selectedSeverity
  );

  useEffect(() => {
    supabase
      .from('profiles')
      .select('user_id, full_name')
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        if (data) setProfiles(data as ProfileOption[]);
      });
  }, []);

  const exportFeed = async () => {
    try {
      setExporting(true);
      await downloadCsv('/api/alerts/export', 'alerts.csv');
      track('report_exported', { report_type: 'alerts', format: 'csv' });
    } catch (err) {
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Could not export alerts',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const assignAlert = async (alertId: string, userId: string) => {
    const { error: assignError } = await supabase
      .from('alerts')
      .update({ assigned_to: userId })
      .eq('id', alertId);
    if (assignError) {
      toast({ title: 'Assign failed', description: assignError.message, variant: 'destructive' });
      return;
    }
    await refresh();
    onAlertsChanged?.();
  };

  const changeStatus = async (alertId: string, status: string) => {
    const alert = alerts.find((item) => item.id === alertId);
    await updateAlertStatus(alertId, status);
    if (alert && status === 'acknowledged') {
      track('alert_triaged', {
        alert_id: alert.id,
        triage_decision: 'acknowledged',
        time_to_triage_seconds: secondsSince(alert.created_at),
        severity: alert.severity,
      });
    }
    if (alert && status === 'investigating') {
      track('investigation_started', {
        investigation_id: alert.id,
        trigger_type: 'alert',
      });
    }
    onAlertsChanged?.();
  };

  const seenAlerts = useRef(new Set<string>());
  useEffect(() => {
    filteredAlerts.forEach((alert) => {
      if (seenAlerts.current.has(alert.id)) return;
      seenAlerts.current.add(alert.id);
      track('alert_viewed', {
        alert_id: alert.id,
        severity: alert.severity,
        alert_type: alert.alert_type,
        source_system: alert.source,
      });
    });
  }, [filteredAlerts]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-critical border-critical';
      case 'high': return 'text-high border-high';
      case 'medium': return 'text-medium border-medium';
      case 'low': return 'text-low border-low';
      default: return 'text-muted-foreground border-border';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-critical text-primary-foreground';
      case 'high': return 'bg-high text-primary-foreground';
      case 'medium': return 'bg-medium text-primary-foreground';
      case 'low': return 'bg-low text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle className="h-4 w-4" />;
      case 'investigating': return <Clock className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'acknowledged': return <User className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alert Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold md:text-3xl">Alert Feed</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">Live Updates</Badge>
          <Button variant="outline" size="sm" onClick={exportFeed} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export Feed'}
          </Button>
        </div>
      </div>

      {/* Severity Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Filter by severity:</span>
        {['all', 'critical', 'high', 'medium', 'low'].map((severity) => (
          <Button
            key={severity}
            variant={selectedSeverity === severity ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectedSeverity(severity);
              if (severity !== 'all') {
                trackHotjarEvent('severity_filtered');
                track('filter_applied', { filter_type: 'severity', filter_value: severity, view_context: 'alerts' });
              }
            }}
          >
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </Button>
        ))}
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-destructive">Error loading alerts: {error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {filteredAlerts.map((alert, index) => (
          <Card
            key={alert.id}
            data-alert-id={alert.id}
            className={`transition-all duration-300 hover:shadow-lg border-l-4 ${getSeverityColor(alert.severity)} animate-slide-in`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {getStatusIcon(alert.status)}
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="break-words text-lg">{alert.title}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {formatTimeAgo(alert.created_at)} • {alert.source}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Assigned to: {alert.assignee_name || 'Unassigned'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge className={getSeverityBadge(alert.severity)}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {alert.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-3">
                {alert.description && (
                  <p className="break-words text-sm text-foreground">{alert.description}</p>
                )}
                
                {alert.indicators && alert.indicators.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {alert.indicators.map((indicator, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {indicator}
                      </Badge>
                    ))}
                  </div>
                )}

                {alert.affected_systems && alert.affected_systems.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Affected systems: {alert.affected_systems.join(', ')}
                  </div>
                )}

                {alert.source_ip && (
                  <div className="text-xs text-muted-foreground">
                    Source IP: {alert.source_ip}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => changeStatus(alert.id, 'acknowledged')}
                    disabled={alert.status === 'acknowledged'}
                  >
                    Acknowledge
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => changeStatus(alert.id, 'investigating')}
                    disabled={alert.status === 'investigating'}
                  >
                    Investigate
                  </Button>
                  <Select onValueChange={(reason) => {
                    void updateAlertStatus(alert.id, 'investigating');
                    track('alert_escalated', { alert_id: alert.id, escalation_reason: reason });
                    onAlertsChanged?.();
                  }}>
                    <SelectTrigger aria-label="Escalate alert" className="h-8 w-32">
                      <SelectValue placeholder="Escalate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tier3">Tier 3</SelectItem>
                      <SelectItem value="incident">Incident</SelectItem>
                      <SelectItem value="threat_hunt">Threat hunt</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select onValueChange={(reason) => {
                    void updateAlertStatus(alert.id, 'false_positive');
                    track('alert_dismissed', { alert_id: alert.id, dismiss_reason: reason });
                    onAlertsChanged?.();
                  }}>
                    <SelectTrigger aria-label="Dismiss alert" className="h-8 w-32">
                      <SelectValue placeholder="Dismiss" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false_positive">False positive</SelectItem>
                      <SelectItem value="duplicate">Duplicate</SelectItem>
                      <SelectItem value="benign">Benign</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={alert.assigned_to || 'unassigned'}
                    onValueChange={(userId) => {
                      if (userId !== 'unassigned') assignAlert(alert.id, userId);
                    }}
                  >
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue placeholder="Assign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned" disabled>Assign</SelectItem>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.full_name || profile.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAlerts.length === 0 && !loading && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No alerts found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}