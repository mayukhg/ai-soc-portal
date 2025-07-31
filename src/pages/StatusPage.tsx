import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { healthCheckService, ServiceStatus } from '@/services/healthCheck';

export function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [overallStatus, setOverallStatus] = useState<'operational' | 'degraded' | 'down'>('operational');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    // Fetch real-time service status
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const services = await healthCheckService.getServiceStatus();
        const overallStatus = await healthCheckService.getOverallStatus();
        
        setServices(services);
        setOverallStatus(overallStatus);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch service status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'down':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const services = await healthCheckService.getServiceStatus();
      const overallStatus = await healthCheckService.getOverallStatus();
      
      setServices(services);
      setOverallStatus(overallStatus);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">SOC Nexus Status</h1>
          <p className="text-muted-foreground mb-4">
            Real-time status of all SOC Nexus services
          </p>
          
          {/* Overall Status */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white ${getStatusColor(overallStatus)}`}>
              {getStatusIcon(overallStatus)}
              <span className="capitalize font-medium">{overallStatus}</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Last Updated */}
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        {/* Status Alert */}
        {overallStatus !== 'operational' && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {overallStatus === 'down' 
                ? 'Some services are currently experiencing issues. Our team is working to resolve this.'
                : 'Some services are experiencing degraded performance. We are monitoring the situation.'
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Services Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceStatusCard key={service.name} service={service} />
          ))}
        </div>

        {/* Additional Information */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>Current system metrics and performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Response Time</span>
                <span className="font-medium">
                  {Math.round(services.reduce((acc, s) => acc + s.responseTime, 0) / services.length)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overall Uptime</span>
                <span className="font-medium">99.9%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Services</span>
                <span className="font-medium">{services.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Incidents</CardTitle>
              <CardDescription>Latest service incidents and resolutions</CardDescription>
            </CardHeader>
            <CardContent>
              {services.filter(s => s.lastIncident).length > 0 ? (
                <div className="space-y-3">
                  {services
                    .filter(s => s.lastIncident)
                    .slice(0, 3)
                    .map((service) => (
                      <div key={service.name} className="flex justify-between items-center">
                        <span className="text-sm">{service.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {service.lastIncident?.toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent incidents</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contact Information */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Need help? Contact our support team
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" size="sm">
              Email Support
            </Button>
            <Button variant="outline" size="sm">
              View Documentation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ServiceStatusCardProps {
  service: ServiceStatus;
}

function ServiceStatusCard({ service }: ServiceStatusCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-5 w-5" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5" />;
      case 'down':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  return (
    <Card className={`border-2 ${getStatusColor(service.status)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg capitalize">{service.name}</CardTitle>
          {getStatusIcon(service.status)}
        </div>
        <CardDescription>
          Response time: {service.responseTime}ms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="secondary" className="capitalize">
              {service.status}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Uptime</span>
            <span className="text-sm font-medium">{service.uptime}%</span>
          </div>
          {service.lastIncident && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Incident</span>
              <span className="text-sm text-muted-foreground">
                {service.lastIncident.toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 