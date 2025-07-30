import { Globe, MapPin, Activity, Shield, Zap, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ThreatCorrelationGraph } from './ThreatCorrelationGraph';

interface ThreatLocation {
  country: string;
  attackCount: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  attackTypes: string[];
  lastActivity: string;
}

interface ThreatIntel {
  indicator: string;
  type: 'ip' | 'domain' | 'hash' | 'url';
  confidence: number;
  source: string;
  firstSeen: string;
  threatLevel: 'critical' | 'high' | 'medium' | 'low';
}

const threatLocations: ThreatLocation[] = [
  {
    country: 'Russia',
    attackCount: 45,
    severity: 'critical',
    attackTypes: ['APT', 'Ransomware', 'Credential Harvesting'],
    lastActivity: '2 minutes ago'
  },
  {
    country: 'China',
    attackCount: 32,
    severity: 'high',
    attackTypes: ['Data Exfiltration', 'Supply Chain'],
    lastActivity: '8 minutes ago'
  },
  {
    country: 'North Korea',
    attackCount: 18,
    severity: 'high',
    attackTypes: ['Cryptocurrency', 'Financial'],
    lastActivity: '15 minutes ago'
  },
  {
    country: 'Iran',
    attackCount: 12,
    severity: 'medium',
    attackTypes: ['Phishing', 'Social Engineering'],
    lastActivity: '23 minutes ago'
  }
];

const threatIntelligence: ThreatIntel[] = [
  {
    indicator: '192.168.1.100',
    type: 'ip',
    confidence: 95,
    source: 'CrowdStrike',
    firstSeen: '1 hour ago',
    threatLevel: 'critical'
  },
  {
    indicator: 'malicious-domain.evil',
    type: 'domain',
    confidence: 88,
    source: 'VirusTotal',
    firstSeen: '3 hours ago',
    threatLevel: 'high'
  },
  {
    indicator: 'a1b2c3d4e5f6...',
    type: 'hash',
    confidence: 92,
    source: 'Microsoft Defender',
    firstSeen: '5 hours ago',
    threatLevel: 'high'
  }
];

export function ThreatMap() {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-critical';
      case 'high': return 'text-high';
      case 'medium': return 'text-medium';
      case 'low': return 'text-low';
      default: return 'text-muted-foreground';
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ip': return <MapPin className="h-3 w-3" />;
      case 'domain': return <Globe className="h-3 w-3" />;
      case 'hash': return <Shield className="h-3 w-3" />;
      case 'url': return <Eye className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Global Threat Intelligence</h2>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="animate-pulse-glow">
            <Activity className="h-3 w-3 mr-1" />
            Live Feed
          </Badge>
          <Badge variant="secondary">Global Coverage</Badge>
        </div>
      </div>

      {/* Threat Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-critical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Threats</p>
                <p className="text-2xl font-bold text-critical">107</p>
              </div>
              <Zap className="h-8 w-8 text-critical opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Countries Affected</p>
                <p className="text-2xl font-bold text-warning">23</p>
              </div>
              <Globe className="h-8 w-8 text-warning opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">IOCs Detected</p>
                <p className="text-2xl font-bold text-primary">1,847</p>
              </div>
              <Eye className="h-8 w-8 text-primary opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Blocked Attacks</p>
                <p className="text-2xl font-bold text-accent">342</p>
              </div>
              <Shield className="h-8 w-8 text-accent opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geographic Threat Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-primary" />
              <span>Geographic Threat Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {threatLocations.map((location, index) => (
              <div 
                key={location.country}
                className="animate-fade-in border border-border/50 rounded-lg p-4 hover:border-border transition-colors"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`h-3 w-3 rounded-full ${
                      location.severity === 'critical' ? 'bg-critical animate-pulse-glow' :
                      location.severity === 'high' ? 'bg-high' :
                      location.severity === 'medium' ? 'bg-medium' : 'bg-low'
                    }`} />
                    <span className="font-medium">{location.country}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getSeverityBadge(location.severity)} variant="outline">
                      {location.attackCount} attacks
                    </Badge>
                    <span className="text-xs text-muted-foreground">{location.lastActivity}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-2">
                  {location.attackTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
                
                <Progress 
                  value={(location.attackCount / 50) * 100} 
                  className="h-1"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Latest Threat Intelligence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-primary" />
              <span>Latest Threat Intelligence</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {threatIntelligence.map((intel, index) => (
              <div 
                key={intel.indicator}
                className="animate-fade-in border border-border/50 rounded-lg p-4 hover:border-border transition-colors"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(intel.type)}
                    <span className="font-mono text-sm">{intel.indicator}</span>
                  </div>
                  <Badge className={getSeverityBadge(intel.threatLevel)}>
                    {intel.threatLevel.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-medium">{intel.confidence}%</span>
                  </div>
                  <Progress value={intel.confidence} className="h-1" />
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Source: {intel.source}</span>
                    <span>First seen: {intel.firstSeen}</span>
                  </div>
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
            <Activity className="h-5 w-5 text-primary" />
            <span>Threat Correlation Graph</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Interactive visualization showing relationships between threats, IPs, domains, and malware
          </p>
        </CardHeader>
        <CardContent>
          <ThreatCorrelationGraph />
        </CardContent>
      </Card>
    </div>
  );
}