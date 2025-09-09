import { useState, useEffect } from 'react';
import { Search, Target, Zap, Brain, AlertTriangle, Shield, Clock, TrendingUp, Filter, Play, Pause, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ThreatHuntingQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  category: 'apt' | 'malware' | 'lateral_movement' | 'data_exfiltration' | 'persistence' | 'evasion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  last_run: string;
  results_count: number;
  status: 'active' | 'paused' | 'completed' | 'failed';
}

interface HuntingResult {
  id: string;
  query_id: string;
  timestamp: string;
  source: string;
  event_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  indicators: string[];
  context: any;
}

export function SOCL3ThreatHunting() {
  const [queries, setQueries] = useState<ThreatHuntingQuery[]>([]);
  const [results, setResults] = useState<HuntingResult[]>([]);
  const [isHunting, setIsHunting] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  // Sample data - in real implementation, this would come from API
  useEffect(() => {
    const sampleQueries: ThreatHuntingQuery[] = [
      {
        id: '1',
        name: 'APT29 Cozy Bear Activity',
        description: 'Hunt for APT29 indicators and TTPs',
        query: 'process_name:cmd.exe AND command_line:*powershell* AND network_connections:*',
        category: 'apt',
        severity: 'critical',
        last_run: '2024-01-15T10:30:00Z',
        results_count: 12,
        status: 'active'
      },
      {
        id: '2',
        name: 'Lateral Movement via RDP',
        description: 'Detect lateral movement attempts using RDP',
        query: 'event_type:rdp AND failed_attempts > 5 AND source_ip:internal',
        category: 'lateral_movement',
        severity: 'high',
        last_run: '2024-01-15T09:15:00Z',
        results_count: 8,
        status: 'active'
      },
      {
        id: '3',
        name: 'Data Exfiltration Patterns',
        description: 'Identify potential data exfiltration activities',
        query: 'data_transfer > 100MB AND destination_ip:external AND time_window:1h',
        category: 'data_exfiltration',
        severity: 'high',
        last_run: '2024-01-15T08:45:00Z',
        results_count: 3,
        status: 'completed'
      },
      {
        id: '4',
        name: 'Malware Persistence Mechanisms',
        description: 'Hunt for malware persistence techniques',
        query: 'registry_modifications:run_key AND file_creation:system32 AND process_name:suspicious',
        category: 'persistence',
        severity: 'medium',
        last_run: '2024-01-15T07:20:00Z',
        results_count: 15,
        status: 'active'
      }
    ];

    const sampleResults: HuntingResult[] = [
      {
        id: '1',
        query_id: '1',
        timestamp: '2024-01-15T10:35:00Z',
        source: 'EDR-001',
        event_type: 'Process Execution',
        description: 'Suspicious PowerShell execution with encoded commands',
        severity: 'critical',
        confidence: 0.95,
        indicators: ['powershell', 'encoded_command', 'suspicious_domain'],
        context: {
          process_name: 'powershell.exe',
          command_line: 'powershell -enc <encoded_command>',
          source_ip: '192.168.1.100',
          destination_ip: '185.220.101.182'
        }
      },
      {
        id: '2',
        query_id: '2',
        timestamp: '2024-01-15T10:20:00Z',
        source: 'SIEM-001',
        event_type: 'Authentication Failure',
        description: 'Multiple failed RDP attempts from internal IP',
        severity: 'high',
        confidence: 0.88,
        indicators: ['rdp_failure', 'brute_force', 'internal_source'],
        context: {
          source_ip: '192.168.1.50',
          destination_ip: '192.168.1.100',
          failure_count: 12,
          time_window: '5 minutes'
        }
      }
    ];

    setQueries(sampleQueries);
    setResults(sampleResults);
  }, []);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      'apt': <Target className="h-4 w-4" />,
      'malware': <AlertTriangle className="h-4 w-4" />,
      'lateral_movement': <Zap className="h-4 w-4" />,
      'data_exfiltration': <TrendingUp className="h-4 w-4" />,
      'persistence': <Shield className="h-4 w-4" />,
      'evasion': <Brain className="h-4 w-4" />
    };
    return icons[category] || <Search className="h-4 w-4" />;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const filteredQueries = queries.filter(query => {
    const matchesSearch = query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         query.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || query.category === filterCategory;
    const matchesSeverity = filterSeverity === 'all' || query.severity === filterSeverity;
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const filteredResults = results.filter(result => {
    const query = queries.find(q => q.id === result.query_id);
    if (!query) return false;
    const matchesSearch = result.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || query.category === filterCategory;
    const matchesSeverity = filterSeverity === 'all' || result.severity === filterSeverity;
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const startHunting = () => {
    setIsHunting(true);
    // Simulate hunting process
    setTimeout(() => {
      setIsHunting(false);
    }, 3000);
  };

  const stopHunting = () => {
    setIsHunting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">SOC L3 Threat Hunting</h2>
          <p className="text-muted-foreground">Advanced threat hunting with AI-powered query generation and analysis</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="animate-pulse-glow">
            <Brain className="h-3 w-3 mr-1" />
            AI Enhanced
          </Badge>
          {isHunting ? (
            <Button variant="destructive" onClick={stopHunting}>
              <Pause className="h-4 w-4 mr-2" />
              Stop Hunting
            </Button>
          ) : (
            <Button onClick={startHunting}>
              <Play className="h-4 w-4 mr-2" />
              Start Hunting
            </Button>
          )}
        </div>
      </div>

      {isHunting && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
              <div>
                <div className="font-semibold text-orange-800">Threat Hunting in Progress</div>
                <div className="text-sm text-orange-600">Running {queries.filter(q => q.status === 'active').length} active queries...</div>
              </div>
              <Progress value={75} className="flex-1" />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="queries" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="queries">Hunting Queries</TabsTrigger>
          <TabsTrigger value="results">Hunting Results</TabsTrigger>
        </TabsList>

        <TabsContent value="queries" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search hunting queries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="apt">APT</SelectItem>
                <SelectItem value="malware">Malware</SelectItem>
                <SelectItem value="lateral_movement">Lateral Movement</SelectItem>
                <SelectItem value="data_exfiltration">Data Exfiltration</SelectItem>
                <SelectItem value="persistence">Persistence</SelectItem>
                <SelectItem value="evasion">Evasion</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-48">
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
          </div>

          <div className="grid gap-4">
            {filteredQueries.map((query) => (
              <Card key={query.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getCategoryIcon(query.category)}
                      <div>
                        <CardTitle className="text-lg">{query.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{query.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getSeverityColor(query.severity)}>
                        {query.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {query.results_count} results
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="text-sm font-mono text-muted-foreground">Query:</div>
                      <div className="text-sm font-mono">{query.query}</div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>Last run: {new Date(query.last_run).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Filter className="h-4 w-4" />
                          <span>Category: {query.category.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Play className="h-4 w-4 mr-1" />
                          Run
                        </Button>
                        <Button variant="outline" size="sm">
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search hunting results..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-48">
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
          </div>

          <div className="grid gap-4">
            {filteredResults.map((result) => {
              const query = queries.find(q => q.id === result.query_id);
              return (
                <Card key={result.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {query && getCategoryIcon(query.category)}
                        <div>
                          <CardTitle className="text-lg">{result.event_type}</CardTitle>
                          <p className="text-sm text-muted-foreground">{result.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(result.severity)}>
                          {result.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {Math.round(result.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-semibold text-muted-foreground">Source:</div>
                          <div>{result.source}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-muted-foreground">Timestamp:</div>
                          <div>{new Date(result.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-muted-foreground mb-2">Indicators:</div>
                        <div className="flex flex-wrap gap-2">
                          {result.indicators.map((indicator, index) => (
                            <Badge key={index} variant="secondary">
                              {indicator}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Query: {query?.name || 'Unknown'}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            Investigate
                          </Button>
                          <Button variant="outline" size="sm">
                            Add to Case
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
