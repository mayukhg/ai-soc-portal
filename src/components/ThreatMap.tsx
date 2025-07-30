import { useState } from 'react';
import { Globe, MapPin, Activity, Shield, Zap, Eye, Filter, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThreatCorrelationGraph } from './ThreatCorrelationGraph';
import { useThreatIntelligence } from '@/hooks/useThreatIntelligence';

interface ThreatLocation {
  country: string;
  count: number;
  types: string[];
  latestActivity: string;
  indicators: any[];
}

export function ThreatMap() {
  const { threatIntel, loading, error, getThreatsByCountry } = useThreatIntelligence();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  const threatLocations = getThreatsByCountry();
  
  const filteredThreats = threatIntel.filter(threat => {
    const typeMatch = selectedType === 'all' || threat.indicator_type === selectedType;
    const countryMatch = selectedCountry === 'all' || threat.country_code === selectedCountry;
    return typeMatch && countryMatch;
  });

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-critical text-critical-foreground';
    if (confidence >= 70) return 'bg-high text-high-foreground';
    if (confidence >= 50) return 'bg-medium text-medium-foreground';
    return 'bg-low text-low-foreground';
  };

  const getSeverityFromConfidence = (confidence: number): 'critical' | 'high' | 'medium' | 'low' => {
    if (confidence >= 90) return 'critical';
    if (confidence >= 70) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      return `${Math.floor(diffInHours / 24)} days ago`;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ip': return <Globe className="h-4 w-4" />;
      case 'domain': return <Activity className="h-4 w-4" />;
      case 'url': return <Eye className="h-4 w-4" />;
      case 'hash': return <Shield className="h-4 w-4" />;
      case 'email': return <MapPin className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Threat Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Threat Map</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading threat intelligence: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Global Threat Intelligence</h2>
          <p className="text-muted-foreground">Real-time threat indicators and geographical distribution</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="animate-pulse-glow">
            <Activity className="h-3 w-3 mr-1" />
            {threatIntel.length} Active Indicators
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Feed
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ip">IP Address</SelectItem>
            <SelectItem value="domain">Domain</SelectItem>
            <SelectItem value="url">URL</SelectItem>
            <SelectItem value="hash">File Hash</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {Array.from(new Set(threatIntel.map(t => t.country_code).filter(Boolean))).map(country => (
              <SelectItem key={country} value={country!}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Threat Origins</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {threatLocations.slice(0, 8).map((location, index) => (
              <div 
                key={location.country}
                className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <span className="text-xs font-bold">{location.country}</span>
                  </div>
                  <div>
                    <div className="font-medium">{location.country}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimeAgo(location.latestActivity)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="font-bold text-sm">{location.count}</div>
                    <div className="text-xs text-muted-foreground">indicators</div>
                  </div>
                  <Badge className={getConfidenceColor(85)} variant="outline">
                    {getSeverityFromConfidence(85).toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Threat Intelligence Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Latest Indicators</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {filteredThreats.slice(0, 10).map((threat, index) => (
              <div 
                key={threat.id}
                className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    {getTypeIcon(threat.indicator_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{threat.indicator_value}</div>
                    <div className="text-xs text-muted-foreground">
                      {threat.threat_type} • {threat.source}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Confidence</div>
                    <div className="font-bold text-sm">{threat.confidence_score}%</div>
                  </div>
                  <Badge className={getConfidenceColor(threat.confidence_score)} variant="outline">
                    {getSeverityFromConfidence(threat.confidence_score).toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Threat Correlation Graph */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Threat Correlation Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ThreatCorrelationGraph />
        </CardContent>
      </Card>

      {filteredThreats.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No threat indicators found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}