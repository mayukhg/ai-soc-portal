import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Download, FileText, AlertTriangle, Clock, User, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSemanticSearch } from '@/hooks/useSemanticSearch';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { downloadCsv, fetchIncidentDetail, type IncidentDetail } from '@/lib/backendApi';
import { useToast } from '@/hooks/use-toast';
import { trackHotjarEvent } from '@/lib/hotjar';

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
export function IncidentManagement({
  focusIncidentId,
  onIncidentsChanged,
}: {
  focusIncidentId?: string | null;
  onIncidentsChanged?: () => void;
}) {
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string | null }[]>([]);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    severity: 'medium',
    status: 'open',
    assignee: '',
    tags: '',
  });
  const [assignTarget, setAssignTarget] = useState<Incident | null>(null);
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
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
  const loadIncidents = () => {
    return supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        setIncidents(data.map((row) => ({
          id: row.id,
          title: row.title,
          severity: row.severity as Incident['severity'],
          status: row.status as Incident['status'],
          assignee: row.assignee || 'Unassigned',
          createdAt: new Date(row.created_at).toLocaleDateString(),
          lastUpdate: new Date(row.updated_at).toLocaleDateString(),
          alertCount: row.alert_count ?? 0,
          description: row.description || '',
          tags: row.tags || [],
        })));
      });
  };

  useEffect(() => {
    loadIncidents();
    supabase
      .from('profiles')
      .select('user_id, full_name')
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        if (data) setProfiles(data);
      });
  }, []);

  const openDetail = (incidentId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    fetchIncidentDetail(incidentId)
      .then((loaded) => {
        setDetail(loaded);
        trackHotjarEvent('incident_opened');
      })
      .catch((err) => {
        toast({
          title: 'Could not load incident',
          description: err instanceof Error ? err.message : 'Request failed',
          variant: 'destructive',
        });
        setDetailOpen(false);
      })
      .finally(() => setDetailLoading(false));
  };

  useEffect(() => {
    if (focusIncidentId) openDetail(focusIncidentId);
  }, [focusIncidentId]);

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

  const exportIncidents = async () => {
    try {
      setExporting(true);
      await downloadCsv('/api/incidents/export', 'incidents.csv');
    } catch (err) {
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Could not export incidents',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const createIncident = async () => {
    if (!draft.title.trim()) return;
    setCreating(true);
    const tags = draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    const { error } = await supabase.from('incidents').insert([{
      title: draft.title.trim(),
      description: draft.description.trim(),
      severity: draft.severity,
      status: draft.status,
      assignee: draft.assignee || null,
      tags,
      alert_count: 0,
    }]);
    setCreating(false);
    if (error) {
      toast({ title: 'Could not create incident', description: error.message, variant: 'destructive' });
      return;
    }
    setNewOpen(false);
    setDraft({ title: '', description: '', severity: 'medium', status: 'open', assignee: '', tags: '' });
    await loadIncidents();
    onIncidentsChanged?.();
  };

  const assignIncident = async (fullName: string) => {
    if (!assignTarget) return;
    const { error } = await supabase
      .from('incidents')
      .update({ assignee: fullName })
      .eq('id', assignTarget.id);
    if (error) {
      toast({ title: 'Assign failed', description: error.message, variant: 'destructive' });
      return;
    }
    setAssignTarget(null);
    await loadIncidents();
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
          <Button variant="outline" onClick={exportIncidents} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
          <Button onClick={() => setNewOpen(true)}>
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
                  data-hj-suppress=""
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
              <Button
                variant="outline"
                disabled={isSemanticMode && !searchTerm && statusFilter === 'all' && severityFilter === 'all'}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSeverityFilter('all');
                  clearResults();
                }}
              >
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
                  <Button variant="outline" size="sm" onClick={() => openDetail(incident.id)}>
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setAssignTarget(incident)}>
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

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
            <Textarea
              placeholder="Description"
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select value={draft.severity} onValueChange={(severity) => setDraft({ ...draft, severity })}>
                <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={draft.status} onValueChange={(status) => setDraft({ ...draft, status })}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={draft.assignee || 'unassigned'} onValueChange={(assignee) => setDraft({ ...draft, assignee: assignee === 'unassigned' ? '' : assignee })}>
              <SelectTrigger><SelectValue placeholder="Assignee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.user_id} value={profile.full_name || profile.user_id}>
                    {profile.full_name || profile.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Tags, comma separated"
              value={draft.tags}
              onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={createIncident} disabled={creating || !draft.title.trim()}>
              {creating ? 'Saving...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignTarget !== null} onOpenChange={(open) => !open && setAssignTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {assignTarget?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {profiles.map((profile) => (
              <Button
                key={profile.user_id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => assignIncident(profile.full_name || 'Unassigned')}
              >
                {profile.full_name || profile.user_id}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open && detail) trackHotjarEvent('incident_closed');
          setDetailOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.incident.title || 'Incident'}</DialogTitle>
          </DialogHeader>
          {detailLoading && <p className="text-sm text-muted-foreground">Loading incident...</p>}
          {detail && (
            <div className="space-y-4 max-h-[60vh] overflow-auto" data-hj-suppress="">
              <p className="text-sm">{detail.incident.description}</p>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span>{detail.incident.severity}</span>
                <span>{detail.incident.status}</span>
                <span>{detail.incident.assignee || 'Unassigned'}</span>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Related alerts</h4>
                {detail.alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No alerts are linked to this incident.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {detail.alerts.map((alert) => (
                      <li key={alert.id}>{alert.severity.toUpperCase()} · {alert.title} · {alert.status}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Comments</h4>
                {detail.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {detail.comments.map((comment) => (
                      <li key={comment.id}>
                        <span className="font-medium">{comment.profile?.full_name || 'Analyst'}: </span>
                        {comment.content}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}