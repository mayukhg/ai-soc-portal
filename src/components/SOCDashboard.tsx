import { useEffect, useState } from 'react';
import { AlertTriangle, Shield, BarChart3, Bell, Search, Filter, MessageSquare, FileText, Bot, LogOut, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { AlertFeed } from './AlertFeed';
import { KPIMetrics } from './KPIMetrics';
import { ThreatMap } from './ThreatMap';
import { AIAssistant } from './AIAssistant';
import { CollaborationPanel } from './CollaborationPanel';
import { IncidentManagement } from './IncidentManagement';
import { ReportGenerator } from './ReportGenerator';
import { fetchAlertCounts, searchRecords, type AlertCounts, type SearchHit } from '@/lib/backendApi';
import { DASHBOARD_SECTION_EVENTS, trackHotjarEvent, trackHotjarStateChange } from '@/lib/hotjar';

const emptyCounts: AlertCounts = {
  total: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  incidents: 0,
};

export function SOCDashboard() {
  const { user, userProfile, signOut } = useAuth();
  const [activeView, setActiveView] = useState('alerts');
  const [alertCount, setAlertCount] = useState<AlertCounts>(emptyCounts);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusIncidentId, setFocusIncidentId] = useState<string | null>(null);

  const refreshCounts = () => {
    fetchAlertCounts().then(setAlertCount).catch(() => setAlertCount(emptyCounts));
  };

  useEffect(() => {
    refreshCounts();
  }, []);

  useEffect(() => {
    const eventName = DASHBOARD_SECTION_EVENTS[activeView];
    if (eventName) trackHotjarEvent(eventName);
    trackHotjarStateChange(`/dashboard/${activeView}`);
  }, [activeView]);

  useEffect(() => {
    const query = searchTerm.trim();
    if (query.length < 2) {
      setSearchHits([]);
      return;
    }
    const timer = setTimeout(() => {
      searchRecords(query)
        .then((body) => {
          setSearchHits(body.results || []);
          setSearchOpen(true);
          trackHotjarEvent('search_used');
        })
        .catch(() => setSearchHits([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const openHit = (hit: SearchHit) => {
    setSearchOpen(false);
    setSearchTerm('');
    if (hit.kind === 'incident') {
      setFocusIncidentId(hit.id);
      setActiveView('incidents');
      return;
    }
    if (hit.kind === 'indicator') {
      setActiveView('threats');
      return;
    }
    setActiveView('alerts');
  };

  const handleSignOut = async () => {
    trackHotjarEvent('signed_out');
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex flex-wrap items-center gap-3 px-3 py-3 md:justify-between md:px-6 md:py-4">
          <div className="flex min-w-0 items-center gap-2 md:gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <Shield className="h-8 w-8 shrink-0 text-primary" />
              <h1 className="truncate text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent md:text-2xl">
                SoC-AI Portal
              </h1>
            </div>
            <Badge variant="secondary" className="animate-pulse-glow">
              Real-time
            </Badge>
          </div>

          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 md:w-auto md:flex-nowrap md:gap-4">
            <div className="relative w-full min-w-0 md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search alerts, IOCs, incidents..."
                className="w-full min-w-0 pl-10"
                data-hj-suppress=""
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => searchHits.length > 0 && setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              />
              {searchOpen && searchTerm.trim().length >= 2 && (
                <div className="absolute top-11 left-0 z-50 w-full rounded-md border bg-popover p-1 md:w-80" data-hj-suppress="">
                  {searchHits.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No matches</p>
                  ) : (
                    searchHits.map((hit) => (
                      <button
                        key={`${hit.kind}-${hit.id}`}
                        type="button"
                        className="flex w-full flex-col items-start rounded-sm px-3 py-2 text-left hover:bg-accent"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => openHit(hit)}
                      >
                        <span className="text-sm font-medium">{hit.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {hit.kind} · {hit.detail}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <Button variant="outline" size="icon" aria-label="Filter" title="Filter">
              <Filter className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="icon" className="relative" aria-label="Notifications" title="Notifications">
              <Bell className="h-4 w-4" />
              {alertCount.critical > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-critical rounded-full animate-pulse-glow" />
              )}
            </Button>

            <div className="flex shrink-0 items-center gap-2 md:border-l md:border-border md:pl-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="text-sm leading-tight">
                <div className="font-medium">
                  {userProfile?.role ? 
                    userProfile.role.replace('analyst_', 'Analyst T').replace('_', ' ').toUpperCase() : 
                    'Analyst'}
                </div>
                <div className="text-muted-foreground">
                  {userProfile?.full_name || user?.email?.split('@')[0] || 'User'}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex min-w-0 flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full min-w-0 border-b border-border bg-card md:w-64 md:shrink-0 md:border-b-0 md:border-r md:min-h-[calc(100vh-5rem)]">
          <nav className="p-4 space-y-2">
            <Button
              variant={activeView === 'alerts' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('alerts')}
            >
              <AlertTriangle className="mr-3 h-4 w-4" />
              Alert Feed
              <Badge variant="destructive" className="ml-auto">
                {alertCount.critical}
              </Badge>
            </Button>

            <Button
              variant={activeView === 'incidents' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('incidents')}
            >
              <FileText className="mr-3 h-4 w-4" />
              Incidents
              <Badge variant="outline" className="ml-auto">
                {alertCount.incidents}
              </Badge>
            </Button>

            <Button
              variant={activeView === 'ai-assistant' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('ai-assistant')}
            >
              <Bot className="mr-3 h-4 w-4" />
              AI Assistant
              <div className="ml-auto h-2 w-2 bg-success rounded-full animate-pulse-glow" />
            </Button>

            <Button
              variant={activeView === 'collaboration' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('collaboration')}
            >
              <MessageSquare className="mr-3 h-4 w-4" />
              Collaboration
            </Button>

            <div className="border-t border-border my-3"></div>

            <Button
              variant={activeView === 'metrics' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('metrics')}
            >
              <BarChart3 className="mr-3 h-4 w-4" />
              KPI Metrics
            </Button>

            <Button
              variant={activeView === 'threats' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('threats')}
            >
              <Shield className="mr-3 h-4 w-4" />
              Threat Map
            </Button>

            <Button
              variant={activeView === 'reports' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('reports')}
            >
              <FileText className="mr-3 h-4 w-4" />
              Reports
            </Button>
          </nav>

          {/* Quick Stats */}
          <div className="p-4 mt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Alerts</span>
                <Badge variant="outline">{alertCount.total}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-critical">Critical</span>
                <Badge variant="destructive">{alertCount.critical}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-high">High</span>
                <Badge className="bg-high text-primary-foreground">{alertCount.high}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-medium">Medium</span>
                <Badge className="bg-medium text-primary-foreground">{alertCount.medium}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-low">Low</span>
                <Badge className="bg-low text-primary-foreground">{alertCount.low}</Badge>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1 p-3 md:p-6">
          <div className="animate-fade-in">
            {activeView === 'alerts' && <AlertFeed onAlertsChanged={refreshCounts} />}
            {activeView === 'incidents' && (
              <IncidentManagement
                focusIncidentId={focusIncidentId}
                onIncidentsChanged={refreshCounts}
              />
            )}
            {activeView === 'ai-assistant' && <AIAssistant />}
            {activeView === 'collaboration' && <CollaborationPanel targetId="11111111-1111-4111-8111-111111111111" targetType="alert" title="Network alert discussion" />}
            {activeView === 'metrics' && <KPIMetrics />}
            {activeView === 'threats' && <ThreatMap />}
            {activeView === 'reports' && <ReportGenerator />}
          </div>
        </main>
      </div>
    </div>
  );
}