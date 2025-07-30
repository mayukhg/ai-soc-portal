import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Download, FileText, AlertTriangle, Clock, User, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSemanticSearch } from '@/hooks/useSemanticSearch';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  assignee: string;
  createdAt: string;
  lastUpdate: string;
  alertCount: number;
  description: string;
  tags: string[];
}

const mockIncidents: Incident[] = [
  {
    id: 'INC-2024-001',
    title: 'Advanced Persistent Threat Campaign',
    severity: 'critical',
    status: 'investigating',
    assignee: 'Dr. Emma Thompson',
    createdAt: '2024-01-15',
    lastUpdate: '2 hours ago',
    alertCount: 15,
    description: 'Coordinated attack campaign with multiple attack vectors including spear phishing, lateral movement, and data exfiltration attempts.',
    tags: ['apt', 'lateral-movement', 'data-exfiltration', 'coordinated-attack']
  },
  {
    id: 'INC-2024-002',
    title: 'Ransomware Detection and Response',
    severity: 'critical',
    status: 'resolved',
    assignee: 'Sarah Chen',
    createdAt: '2024-01-14',
    lastUpdate: '1 day ago',
    alertCount: 8,
    description: 'Ransomware deployment attempt blocked by EDR. All affected systems isolated and cleaned.',
    tags: ['ransomware', 'malware', 'edr-detection', 'containment']
  },
  {
    id: 'INC-2024-003',
    title: 'Credential Stuffing Attack',
    severity: 'high',
    status: 'resolved',
    assignee: 'Mike Wilson',
    createdAt: '2024-01-13',
    lastUpdate: '2 days ago',
    alertCount: 23,
    description: 'Large-scale credential stuffing attack against user login portal. Account lockouts triggered, threat blocked.',
    tags: ['credential-stuffing', 'brute-force', 'authentication', 'blocked']
  },
  {
    id: 'INC-2024-004',
    title: 'Suspicious Network Traffic Analysis',
    severity: 'medium',
    status: 'investigating',
    assignee: 'John Doe',
    createdAt: '2024-01-12',
    lastUpdate: '3 hours ago',
    alertCount: 5,
    description: 'Unusual outbound network traffic patterns detected. Investigating potential data exfiltration.',
    tags: ['network-anomaly', 'data-exfiltration', 'traffic-analysis']
  }
];

export function IncidentManagement() {
  const [incidents] = useState<Incident[]>(mockIncidents);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  
  const { 
    isSearching, 
    searchResults, 
    performSemanticSearch, 
    clearResults 
  } = useSemanticSearch();

  // Handle search term changes for semantic search
  useEffect(() => {
    if (isSemanticMode && searchTerm.trim()) {
      const debounceTimer = setTimeout(() => {
        performSemanticSearch(searchTerm);
      }, 500);
      return () => clearTimeout(debounceTimer);
    } else if (isSemanticMode && !searchTerm.trim()) {
      clearResults();
    }
  }, [searchTerm, isSemanticMode, performSemanticSearch, clearResults]);

  // Convert search results to incident format for display
  const semanticIncidents = searchResults.map(result => ({
    id: result.id,
    title: result.title,
    severity: result.severity as 'critical' | 'high' | 'medium' | 'low',
    status: result.status as 'open' | 'investigating' | 'resolved' | 'closed',
    assignee: result.assignee || 'Unassigned',
    createdAt: new Date(result.created_at).toLocaleDateString(),
    lastUpdate: new Date(result.updated_at).toLocaleDateString(),
    alertCount: result.alert_count,
    description: result.description || '',
    tags: result.tags || [],
    similarity: result.similarity
  }));

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  });

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return 'bg-info text-primary-foreground';
      case 'investigating': return 'bg-warning text-primary-foreground';
      case 'resolved': return 'bg-success text-primary-foreground';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getIncidentStats = () => {
    const stats = {
      total: incidents.length,
      open: incidents.filter(i => i.status === 'open').length,
      investigating: incidents.filter(i => i.status === 'investigating').length,
      critical: incidents.filter(i => i.severity === 'critical').length,
      avgResolutionTime: '4.2 hours'
    };
    return stats;
  };

  const stats = getIncidentStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Incident Management</h2>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Create Incident
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Incidents</p>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-primary opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-info">{stats.open}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-info opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Investigating</p>
                <p className="text-2xl font-bold text-warning">{stats.investigating}</p>
              </div>
              <Search className="h-8 w-8 text-warning opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-critical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-critical">{stats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-critical opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Resolution</p>
                <p className="text-2xl font-bold text-accent">{stats.avgResolutionTime}</p>
              </div>
              <Clock className="h-8 w-8 text-accent opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Semantic Search Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Switch
                  id="semantic-mode"
                  checked={isSemanticMode}
                  onCheckedChange={setIsSemanticMode}
                />
                <Label htmlFor="semantic-mode" className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>AI Semantic Search</span>
                </Label>
                {isSemanticMode && isSearching && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
              </div>
              {isSemanticMode && searchResults.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {searchResults.length} semantic matches
                </Badge>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isSemanticMode ? "Describe what you're looking for..." : "Search incidents, descriptions, tags..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={isSearching}
                />
              </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

              <Button variant="outline" disabled={isSemanticMode}>
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidents List */}
      <div className="grid gap-4">
        {(isSemanticMode ? semanticIncidents : filteredIncidents).map((incident, index) => (
          <Card 
            key={incident.id}
            className={`transition-all duration-300 hover:shadow-lg border-l-4 ${getSeverityColor(incident.severity)} animate-slide-in cursor-pointer`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-lg">{incident.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {incident.id}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Created {incident.createdAt}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Updated {incident.lastUpdate}
                    </span>
                    <span className="flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {incident.alertCount} alerts
                    </span>
                  </div>
                </div>
                
                 <div className="flex items-center space-x-2">
                   {isSemanticMode && 'similarity' in incident && (
                     <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                       {Math.round((incident as any).similarity * 100)}% match
                     </Badge>
                   )}
                   <Badge className={getSeverityBadge(incident.severity)}>
                     {incident.severity.toUpperCase()}
                   </Badge>
                   <Badge className={getStatusBadge(incident.status)}>
                     {incident.status.toUpperCase()}
                   </Badge>
                 </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-foreground">{incident.description}</p>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {incident.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Assigned to:</span>
                  <span className="font-medium">{incident.assignee}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="secondary" size="sm">
                    Update Status
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(isSemanticMode ? semanticIncidents : filteredIncidents).length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {isSemanticMode && searchTerm ? 
                "No semantic matches found. Try rephrasing your search." : 
                "No incidents found matching your criteria."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}