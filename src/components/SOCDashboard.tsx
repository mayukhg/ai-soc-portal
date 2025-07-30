import { useState } from 'react';
import { AlertTriangle, Shield, Users, BarChart3, Bell, Search, Filter, MessageSquare, FileText, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertFeed } from './AlertFeed';
import { KPIMetrics } from './KPIMetrics';
import { ThreatMap } from './ThreatMap';
import { AIAssistant } from './AIAssistant';
import { CollaborationPanel } from './CollaborationPanel';
import { IncidentManagement } from './IncidentManagement';
import { ReportGenerator } from './ReportGenerator';

export function SOCDashboard() {
  const [activeView, setActiveView] = useState('alerts');
  const [alertCount] = useState({
    critical: 3,
    high: 12,
    medium: 45,
    low: 18,
    total: 78
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                SoC-AI Portal
              </h1>
            </div>
            <Badge variant="secondary" className="animate-pulse-glow">
              Real-time
            </Badge>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search alerts, IOCs, incidents..." 
                className="pl-10 w-80"
              />
            </div>
            
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {alertCount.critical > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-critical rounded-full animate-pulse-glow" />
              )}
            </Button>

            <div className="flex items-center space-x-2 pl-4 border-l border-border">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                <Users className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="text-sm">
                <div className="font-medium">Analyst T1</div>
                <div className="text-muted-foreground">John Doe</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-card border-r border-border min-h-[calc(100vh-5rem)]">
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
                4
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
        <main className="flex-1 p-6">
          <div className="animate-fade-in">
            {activeView === 'alerts' && <AlertFeed />}
            {activeView === 'incidents' && <IncidentManagement />}
            {activeView === 'ai-assistant' && <AIAssistant />}
            {activeView === 'collaboration' && <CollaborationPanel />}
            {activeView === 'metrics' && <KPIMetrics />}
            {activeView === 'threats' && <ThreatMap />}
            {activeView === 'reports' && <ReportGenerator />}
          </div>
        </main>
      </div>
    </div>
  );
}