# AI SOC Nexus - Component Reference Guide

## Table of Contents

1. [Overview](#overview)
2. [Core Dashboard Components](#core-dashboard-components)
3. [Alert Management Components](#alert-management-components)
4. [AI-Powered Components](#ai-powered-components)
5. [Collaboration Components](#collaboration-components)
6. [Visualization Components](#visualization-components)
7. [UI Foundation Components](#ui-foundation-components)
8. [Component Composition Patterns](#component-composition-patterns)
9. [Styling and Theming](#styling-and-theming)
10. [Performance Considerations](#performance-considerations)

---

## Overview

AI SOC Nexus uses a modular component architecture built with React, TypeScript, and shadcn/ui. All components follow consistent patterns for props, state management, and error handling.

### Design Principles
- **Composition over inheritance** - Components are designed to be composed together
- **Single responsibility** - Each component has a clear, focused purpose
- **Consistent API patterns** - Similar props and callback patterns across components
- **Accessibility first** - All components support keyboard navigation and screen readers
- **Responsive design** - Components adapt to different screen sizes

---

## Core Dashboard Components

### SOCDashboard

The main orchestrating component that provides layout and navigation.

```typescript
interface SOCDashboardProps {}

export function SOCDashboard(): JSX.Element
```

**Features:**
- Multi-view state management
- Real-time alert counters
- Responsive navigation
- User profile integration
- Mobile-optimized layout

**Usage:**
```typescript
import { SOCDashboard } from '@/components/SOCDashboard';

function App() {
  return <SOCDashboard />;
}
```

**View States:**
- `alerts` - Alert feed view
- `metrics` - KPI metrics dashboard
- `threats` - Threat intelligence map
- `ai` - AI assistant chat
- `collaboration` - Team collaboration panel
- `incidents` - Incident management
- `reports` - Report generation

**Styling Classes:**
```css
.soc-dashboard {
  @apply min-h-screen bg-background;
}

.soc-header {
  @apply border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50;
}

.soc-navigation {
  @apply flex items-center space-x-6 px-6 py-4;
}
```

---

## Alert Management Components

### AlertFeed

Displays and manages security alerts with real-time filtering and updates.

```typescript
interface AlertFeedProps {
  filters?: AlertFilters;
  onAlertSelect?: (alert: Alert) => void;
  compact?: boolean;
}

interface AlertFilters {
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'all';
  status?: AlertStatus[];
  assignee?: string;
  dateRange?: { start: Date; end: Date };
}
```

**Features:**
- Real-time alert streaming
- Severity-based filtering
- Status management workflow
- Assignment and escalation
- Bulk operations support

**Usage Example:**
```typescript
import { AlertFeed } from '@/components/AlertFeed';

function SecurityDashboard() {
  const handleAlertSelect = (alert: Alert) => {
    console.log('Selected alert:', alert.id);
  };

  return (
    <AlertFeed 
      filters={{ severity: 'critical' }}
      onAlertSelect={handleAlertSelect}
      compact={false}
    />
  );
}
```

**Alert Status Workflow:**
1. `open` → `acknowledged` → `investigating` → `resolved`
2. `open` → `false_positive` (for false positives)

**Severity Color Mapping:**
```css
.alert-critical { @apply text-critical border-critical; }
.alert-high { @apply text-high border-high; }
.alert-medium { @apply text-medium border-medium; }
.alert-low { @apply text-low border-low; }
```

### AlertCard

Individual alert display component with interactive controls.

```typescript
interface AlertCardProps {
  alert: Alert;
  onStatusChange: (alertId: string, status: AlertStatus) => void;
  onAssign: (alertId: string, assignee: string) => void;
  compact?: boolean;
  showActions?: boolean;
}
```

**Usage:**
```typescript
<AlertCard
  alert={alert}
  onStatusChange={handleStatusChange}
  onAssign={handleAssign}
  compact={false}
  showActions={true}
/>
```

---

## AI-Powered Components

### AIAssistant

Interactive AI chat interface for security analysis and assistance.

```typescript
interface AIAssistantProps {
  contextType?: 'general' | 'incident' | 'alert' | 'threat_hunting';
  contextId?: string;
  suggestions?: string[];
  onAnalysisResult?: (result: AnalysisResult) => void;
}

interface AnalysisResult {
  type: 'threat_assessment' | 'investigation_steps' | 'ioc_extraction' | 'report_generation';
  content: string;
  confidence: number;
  recommendations: string[];
}
```

**Features:**
- Context-aware responses
- Conversation history
- Predefined suggestion prompts
- Analysis result extraction
- Session management

**Usage Example:**
```typescript
import { AIAssistant } from '@/components/AIAssistant';

function IncidentAnalysis({ incidentId }: { incidentId: string }) {
  const handleAnalysisResult = (result: AnalysisResult) => {
    if (result.type === 'threat_assessment') {
      // Handle threat assessment results
    }
  };

  const customSuggestions = [
    'Analyze this incident for lateral movement',
    'Extract IOCs from the incident data',
    'Generate investigation checklist'
  ];

  return (
    <AIAssistant
      contextType="incident"
      contextId={incidentId}
      suggestions={customSuggestions}
      onAnalysisResult={handleAnalysisResult}
    />
  );
}
```

**Predefined Suggestions:**
- Security analysis prompts
- Investigation workflows
- Threat hunting queries
- Report generation templates

### SemanticSearchBox

Vector-based search interface with similarity matching.

```typescript
interface SemanticSearchBoxProps {
  placeholder?: string;
  threshold?: number;
  maxResults?: number;
  onResults: (results: SemanticSearchResult[]) => void;
  filters?: SearchFilters;
}

interface SearchFilters {
  severity?: string[];
  dateRange?: { start: Date; end: Date };
  tags?: string[];
}
```

**Features:**
- Real-time search suggestions
- Configurable similarity thresholds
- Result filtering and sorting
- Search history
- Query optimization hints

**Usage:**
```typescript
<SemanticSearchBox
  placeholder="Search for similar incidents..."
  threshold={0.7}
  maxResults={10}
  onResults={handleSearchResults}
  filters={{
    severity: ['critical', 'high'],
    dateRange: { start: lastWeek, end: today }
  }}
/>
```

---

## Collaboration Components

### CollaborationPanel

Multi-tier analyst collaboration interface with real-time commenting.

```typescript
interface CollaborationPanelProps {
  targetId: string;
  targetType: 'incident' | 'alert';
  allowedCommentTypes?: CommentType[];
  enableRealTime?: boolean;
  onEscalation?: (comment: Comment) => void;
}

type CommentType = 'note' | 'escalation' | 'resolution' | 'question';
```

**Features:**
- Real-time commenting system
- Role-based comment types
- Internal/external visibility
- Escalation workflows
- Activity timeline

**Usage Example:**
```typescript
import { CollaborationPanel } from '@/components/CollaborationPanel';

function IncidentWorkspace({ incidentId }: { incidentId: string }) {
  const handleEscalation = (comment: Comment) => {
    // Handle escalation notification
    notifyManagement(comment);
  };

  return (
    <CollaborationPanel
      targetId={incidentId}
      targetType="incident"
      allowedCommentTypes={['note', 'escalation', 'question']}
      enableRealTime={true}
      onEscalation={handleEscalation}
    />
  );
}
```

### CommentThread

Individual comment thread component with nested replies.

```typescript
interface CommentThreadProps {
  comments: Comment[];
  onReply: (parentId: string, content: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  allowNesting?: boolean;
  maxDepth?: number;
}
```

**Comment Hierarchy:**
- Top-level comments
- Threaded replies (up to 3 levels deep)
- Mention system (@username)
- Rich text formatting support

---

## Visualization Components

### ThreatMap

Interactive world map showing global threat intelligence.

```typescript
interface ThreatMapProps {
  threats: ThreatIntelligence[];
  onCountrySelect?: (country: string, threats: ThreatIntelligence[]) => void;
  onThreatSelect?: (threat: ThreatIntelligence) => void;
  filters?: ThreatMapFilters;
  height?: number;
}

interface ThreatMapFilters {
  threatTypes?: string[];
  confidenceMin?: number;
  timeRange?: { start: Date; end: Date };
}
```

**Features:**
- Interactive geographic visualization
- Threat density clustering
- Real-time threat updates
- Confidence score heatmaps
- Country-level aggregation

**Usage:**
```typescript
<ThreatMap
  threats={threatData}
  onCountrySelect={handleCountrySelect}
  filters={{
    threatTypes: ['malware', 'botnet'],
    confidenceMin: 70
  }}
  height={600}
/>
```

### ThreatCorrelationGraph

Node-link graph for visualizing threat relationships.

```typescript
interface ThreatCorrelationGraphProps {
  nodes: ThreatNode[];
  edges: ThreatEdge[];
  onNodeSelect?: (node: ThreatNode) => void;
  layout?: 'force' | 'hierarchical' | 'circular';
  interactive?: boolean;
}

interface ThreatNode {
  id: string;
  type: 'ip' | 'domain' | 'hash' | 'incident';
  label: string;
  size: number;
  color: string;
  metadata: any;
}

interface ThreatEdge {
  source: string;
  target: string;
  weight: number;
  type: 'related' | 'communicates' | 'downloads' | 'executes';
}
```

**Graph Layouts:**
- **Force-directed** - Natural clustering and separation
- **Hierarchical** - Layered threat progression
- **Circular** - Radial threat distribution

### KPIMetrics

Performance metrics dashboard with real-time calculations.

```typescript
interface KPIMetricsProps {
  metrics: KPIMetric[];
  layout?: 'grid' | 'list' | 'compact';
  onMetricClick?: (metric: KPIMetric) => void;
  refreshInterval?: number;
  showTrends?: boolean;
}
```

**Metric Categories:**
- **Response Times** - MTTD, MTTR, MTBF
- **Quality Metrics** - False positive rate, accuracy
- **Volume Metrics** - Alert volume, incident count
- **Efficiency Metrics** - Resolution rate, escalation rate

**Usage:**
```typescript
<KPIMetrics
  metrics={metricsData}
  layout="grid"
  refreshInterval={30000}
  showTrends={true}
  onMetricClick={showMetricDetails}
/>
```

---

## UI Foundation Components

### DataTable

Reusable data table with sorting, filtering, and pagination.

```typescript
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowSelect?: (row: T) => void;
  selectable?: boolean;
  pagination?: PaginationConfig;
  sorting?: SortingConfig;
  filtering?: FilteringConfig;
}
```

**Features:**
- Column sorting and filtering
- Row selection (single/multiple)
- Virtual scrolling for large datasets
- Export functionality
- Responsive column hiding

### StatusBadge

Consistent status indicator component.

```typescript
interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'outline' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}
```

**Status Mappings:**
```typescript
const statusConfig = {
  open: { color: 'blue', icon: 'circle' },
  investigating: { color: 'yellow', icon: 'search' },
  resolved: { color: 'green', icon: 'check' },
  escalated: { color: 'red', icon: 'arrow-up' }
};
```

### TimestampDisplay

Consistent timestamp formatting with relative time.

```typescript
interface TimestampDisplayProps {
  timestamp: string | Date;
  format?: 'relative' | 'absolute' | 'both';
  precision?: 'second' | 'minute' | 'hour';
  timezone?: string;
}
```

**Usage:**
```typescript
<TimestampDisplay
  timestamp={alert.created_at}
  format="both"
  precision="minute"
/>
// Output: "2 hours ago (Jan 15, 2024 10:30 AM)"
```

---

## Component Composition Patterns

### Provider Pattern

Components use React Context for shared state and functionality.

```typescript
// Authentication Provider
<AuthProvider>
  <ToastProvider>
    <ThemeProvider>
      <SOCDashboard />
    </ThemeProvider>
  </ToastProvider>
</AuthProvider>
```

### Compound Components

Complex components expose sub-components for flexible composition.

```typescript
// Alert management composition
<AlertFeed>
  <AlertFeed.Header>
    <AlertFeed.Filters />
    <AlertFeed.Search />
  </AlertFeed.Header>
  <AlertFeed.List>
    <AlertFeed.Item />
  </AlertFeed.List>
  <AlertFeed.Footer>
    <AlertFeed.Pagination />
  </AlertFeed.Footer>
</AlertFeed>
```

### Render Props

Components that provide flexible rendering patterns.

```typescript
<DataFetcher url="/api/alerts">
  {({ data, loading, error }) => (
    <>
      {loading && <Spinner />}
      {error && <ErrorMessage error={error} />}
      {data && <AlertList alerts={data} />}
    </>
  )}
</DataFetcher>
```

---

## Styling and Theming

### CSS Variables

Design system built on CSS custom properties.

```css
:root {
  /* Base colors */
  --background: 220 15% 8%;
  --foreground: 210 20% 95%;
  --primary: 200 100% 45%;
  --accent: 190 80% 50%;
  
  /* Severity colors */
  --critical: 0 85% 60%;
  --high: 25 90% 55%;
  --medium: 45 90% 55%;
  --low: 120 50% 50%;
  
  /* Semantic colors */
  --success: 120 60% 50%;
  --warning: 45 90% 55%;
  --error: 0 75% 55%;
}
```

### Component Variants

Using `class-variance-authority` for consistent component variants.

```typescript
const alertVariants = cva(
  "rounded-lg border p-4 transition-colors",
  {
    variants: {
      severity: {
        critical: "border-critical bg-critical/10",
        high: "border-high bg-high/10",
        medium: "border-medium bg-medium/10",
        low: "border-low bg-low/10"
      },
      size: {
        sm: "p-2 text-sm",
        md: "p-4 text-base",
        lg: "p-6 text-lg"
      }
    }
  }
);
```

### Responsive Design

Components use Tailwind's responsive prefixes for adaptive layouts.

```css
.alert-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4;
}

.dashboard-layout {
  @apply flex flex-col lg:flex-row min-h-screen;
}
```

---

## Performance Considerations

### Memoization

Critical components use React.memo and useMemo for optimization.

```typescript
const AlertCard = React.memo(({ alert, onStatusChange }: AlertCardProps) => {
  const severityColor = useMemo(() => 
    getSeverityColor(alert.severity), 
    [alert.severity]
  );

  const handleStatusChange = useCallback((status: AlertStatus) => {
    onStatusChange(alert.id, status);
  }, [alert.id, onStatusChange]);

  return (
    <Card className={severityColor}>
      {/* Alert content */}
    </Card>
  );
});
```

### Virtual Scrolling

Large lists use virtual scrolling for performance.

```typescript
import { FixedSizeList as List } from 'react-window';

function AlertList({ alerts }: { alerts: Alert[] }) {
  const Row = ({ index, style }: { index: number; style: any }) => (
    <div style={style}>
      <AlertCard alert={alerts[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={alerts.length}
      itemSize={120}
    >
      {Row}
    </List>
  );
}
```

### Code Splitting

Components are lazy-loaded to reduce initial bundle size.

```typescript
const ThreatMap = lazy(() => import('@/components/ThreatMap'));
const ReportGenerator = lazy(() => import('@/components/ReportGenerator'));

function Dashboard() {
  return (
    <Suspense fallback={<Spinner />}>
      {activeView === 'threats' && <ThreatMap />}
      {activeView === 'reports' && <ReportGenerator />}
    </Suspense>
  );
}
```

### State Management

Complex state uses Zustand for performance and simplicity.

```typescript
interface AlertStore {
  alerts: Alert[];
  filters: AlertFilters;
  setAlerts: (alerts: Alert[]) => void;
  updateAlert: (id: string, updates: Partial<Alert>) => void;
  setFilters: (filters: AlertFilters) => void;
}

const useAlertStore = create<AlertStore>((set) => ({
  alerts: [],
  filters: { severity: 'all' },
  setAlerts: (alerts) => set({ alerts }),
  updateAlert: (id, updates) => set((state) => ({
    alerts: state.alerts.map(alert => 
      alert.id === id ? { ...alert, ...updates } : alert
    )
  })),
  setFilters: (filters) => set({ filters })
}));
```

---

This component reference provides detailed information about all major components in the AI SOC Nexus platform. Each component is designed to be reusable, composable, and follows consistent patterns for props and state management.