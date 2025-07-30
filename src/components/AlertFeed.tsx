import { useState } from 'react';
import { Clock, ExternalLink, MessageSquare, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAlerts } from '@/hooks/useAlerts';

interface Alert {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  created_at: string;
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
  assigned_to?: string;
  description?: string;
  alert_type: string;
  source_ip?: string;
  affected_systems?: string[];
  indicators?: string[];
}

export function AlertFeed() {
  const { alerts, loading, error, updateAlertStatus } = useAlerts();
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const filteredAlerts = alerts.filter(alert => 
    selectedSeverity === 'all' || alert.severity === selectedSeverity
  );

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
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Alert Feed</h2>
        <div className="flex items-center space-x-3">
          <Badge variant="outline">Live Updates</Badge>
          <Button variant="outline" size="sm">
            Export Feed
          </Button>
        </div>
      </div>

      {/* Severity Filter */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Filter by severity:</span>
        {['all', 'critical', 'high', 'medium', 'low'].map((severity) => (
          <Button
            key={severity}
            variant={selectedSeverity === severity ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSeverity(severity)}
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
            className={`transition-all duration-300 hover:shadow-lg border-l-4 ${getSeverityColor(alert.severity)} animate-slide-in`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(alert.status)}
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{alert.title}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {formatTimeAgo(alert.created_at)} • {alert.source}
                    </div>
                    {alert.assigned_to && (
                      <div className="text-sm text-muted-foreground">
                        Assigned to: {alert.assigned_to}
                      </div>
                    )}
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
                  <p className="text-sm text-foreground">{alert.description}</p>
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

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => updateAlertStatus(alert.id, 'acknowledged')}
                    disabled={alert.status === 'acknowledged'}
                  >
                    Acknowledge
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => updateAlertStatus(alert.id, 'investigating')}
                    disabled={alert.status === 'investigating'}
                  >
                    Investigate
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="ghost">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
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