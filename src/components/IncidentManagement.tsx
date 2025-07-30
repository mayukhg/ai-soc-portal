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

/**
 * Interface for incident data structure
 * Represents a security incident in the system
 */
interface Incident {
  id: string;                                    // Unique incident identifier
  title: string;                                 // Incident title/name
  severity: 'critical' | 'high' | 'medium' | 'low';  // Severity level
  status: 'open' | 'investigating' | 'resolved' | 'closed';  // Current status
  assignee: string;                              // Assigned analyst
  createdAt: string;                             // Creation date
  lastUpdate: string;                            // Last update date
  alertCount: number;                            // Number of associated alerts
  description: string;                           // Incident description
  tags: string[];                                // Associated tags
}

/**
 * Mock incident data for demonstration purposes
 * In production, this would come from the backend API
 */
const mockIncidents: Incident[] = [
  {
    id: 'INC-2024-001',
    title: 'Suspicious PowerShell Execution Detected',
    severity: 'high',
    status: 'investigating',
    assignee: 'John Smith',
    createdAt: '2024-01-15',
    lastUpdate: '2024-01-16',
    alertCount: 3,
    description: 'Multiple PowerShell scripts executed from unusual locations with suspicious parameters.',
    tags: ['powershell', 'malware', 'lateral-movement']
  },
  {
    id: 'INC-2024-002',
    title: 'Data Exfiltration Attempt',
    severity: 'critical',
    status: 'open',
    assignee: 'Sarah Johnson',
    createdAt: '2024-01-14',
    lastUpdate: '2024-01-15',
    alertCount: 5,
    description: 'Large data transfers detected to external IP addresses during off-hours.',
    tags: ['data-exfiltration', 'network-anomaly', 'traffic-analysis']
  }
];

/**
 * IncidentManagement Component
 * 
 * Provides a comprehensive interface for managing security incidents.
 * Features include:
 * - Incident listing and filtering
 * - Semantic search using AI
 * - Status and severity filtering
 * - Real-time search with debouncing
 * - Integration with backend semantic search API
 * 
 * @returns JSX component for incident management
 */
export function IncidentManagement() {
  // State management for incidents and UI
  const [incidents] = useState<Incident[]>(mockIncidents);  // Mock incident data
  const [searchTerm, setSearchTerm] = useState('');         // Search input value
  const [statusFilter, setStatusFilter] = useState('all');  // Status filter selection
  const [severityFilter, setSeverityFilter] = useState('all');  // Severity filter selection
  const [isSemanticMode, setIsSemanticMode] = useState(false);  // AI semantic search toggle
  
  // Semantic search hook for AI-powered incident search
  const { 
    isSearching, 
    searchResults, 
    performSemanticSearch, 
    clearResults 
  } = useSemanticSearch();

  /**
   * Handle search term changes for semantic search
   * Implements debouncing to avoid excessive API calls
   */
  useEffect(() => {
    if (isSemanticMode && searchTerm.trim()) {
      // Debounce search requests by 500ms
      const debounceTimer = setTimeout(() => {
        performSemanticSearch(searchTerm);
      }, 500);
      return () => clearTimeout(debounceTimer);
    } else if (isSemanticMode && !searchTerm.trim()) {
      clearResults();
    }
  }, [searchTerm, isSemanticMode, performSemanticSearch, clearResults]);

  /**
   * Convert semantic search results to incident format for display
   * Maps backend response format to frontend incident interface
   */
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

  /**
   * Filter incidents based on search term, status, and severity
   * Applies traditional text-based filtering when not in semantic mode
   */
  const filteredIncidents = incidents.filter(incident => {
    // Text search filtering
    const matchesSearch = !searchTerm || 
      incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    // Status filtering
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;

    // Severity filtering
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  /**
   * Get CSS classes for severity badge styling
   * Different severity levels have different color schemes
   * 
   * @param severity - Incident severity level
   * @returns CSS classes for severity badge
   */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Get CSS classes for status badge styling
   * Different status levels have different color schemes
   * 
   * @param status - Incident status
   * @returns CSS classes for status badge
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'investigating': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Incident Management</h2>
          <p className="text-muted-foreground">
            Monitor and manage security incidents across your infrastructure
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            New Incident
          </Button>
        </div>
      </div>

      {/* Filters Section */}
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

            {/* Search and Filter Controls */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
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
            
              {/* Status Filter */}
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

              {/* Severity Filter */}
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

              {/* Clear Filters Button */}
              <Button variant="outline" disabled={isSemanticMode}>
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
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
            className="hover:shadow-md transition-shadow cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Incident Header */}
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-lg">{incident.title}</h3>
                    <Badge className={`${getSeverityColor(incident.severity)}`}>
                      {incident.severity.toUpperCase()}
                    </Badge>
                    <Badge className={`${getStatusColor(incident.status)}`}>
                      {incident.status.toUpperCase()}
                    </Badge>
                    {isSemanticMode && 'similarity' in incident && (
                      <Badge variant="outline" className="text-xs">
                        {(incident as any).similarity?.toFixed(2) || 'N/A'} match
                      </Badge>
                    )}
                  </div>

                  {/* Incident Details */}
                  <p className="text-muted-foreground mb-3">{incident.description}</p>
                  
                  {/* Metadata Row */}
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{incident.assignee}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{incident.alertCount} alerts</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Created: {incident.createdAt}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>Updated: {incident.lastUpdate}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {incident.tags.length > 0 && (
                    <div className="flex items-center space-x-2 mt-3">
                      {incident.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    Assign
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
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