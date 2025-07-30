# AI SOC Nexus - Comprehensive API Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Frontend Components API](#frontend-components-api)
3. [React Hooks API](#react-hooks-api)
4. [Backend Lambda Functions](#backend-lambda-functions)
5. [Database Schema](#database-schema)
6. [Infrastructure & Deployment](#infrastructure--deployment)
7. [Usage Examples](#usage-examples)
8. [Authentication & Security](#authentication--security)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)

---

## Project Overview

AI SOC Nexus is a comprehensive Security Operations Center (SOC) platform built with modern technologies:

- **Frontend**: React + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **Backend**: AWS Lambda (Python) + Pinecone + Aurora Serverless + Redis
- **Authentication**: Supabase Auth
- **AI Integration**: OpenAI GPT-4 + Text Embeddings

The platform provides real-time security alert management, AI-powered threat analysis, semantic search capabilities, collaborative incident response, and automated reporting.

---

## Frontend Components API

### SOCDashboard

The main dashboard component that orchestrates all other components.

```typescript
import { SOCDashboard } from '@/components/SOCDashboard';

// Usage
<SOCDashboard />
```

**Features:**
- Multi-view navigation (alerts, metrics, threats, AI assistant, collaboration, incidents, reports)
- Real-time alert count display
- User profile integration
- Responsive design with mobile support

**Props:** None (uses context for authentication)

### AlertFeed

Displays and manages security alerts with real-time updates.

```typescript
import { AlertFeed } from '@/components/AlertFeed';

// Usage
<AlertFeed />
```

**Features:**
- Real-time alert display with severity filtering
- Status management (open, acknowledged, investigating, resolved, false positive)
- Assignment functionality
- Severity-based color coding
- Time-based sorting

**Key Methods:**
- `updateAlertStatus(alertId, status, assignedTo?)` - Update alert status
- Severity filtering: critical, high, medium, low, all

### AIAssistant

AI-powered chat interface for security analysis and assistance.

```typescript
import { AIAssistant } from '@/components/AIAssistant';

// Usage
<AIAssistant />
```

**Features:**
- Chat interface with message history
- Context-aware security analysis
- Predefined suggestions for common tasks
- Session management
- Real-time AI responses

**Suggestions Include:**
- "Analyze the latest PowerShell alert"
- "Generate threat intelligence report"
- "Check for lateral movement indicators"
- "Review recent failed logins"
- "Investigate suspicious network traffic"
- "Create incident response playbook"

### KPIMetrics

Performance metrics dashboard for SOC operations.

```typescript
import { KPIMetrics } from '@/components/KPIMetrics';

// Usage
<KPIMetrics />
```

**Features:**
- Real-time KPI calculation
- Trend analysis with visual indicators
- Performance targets tracking
- Historical data visualization

**Key Metrics:**
- Mean Time to Detection (MTTD)
- Mean Time to Response (MTTR)  
- False Positive Rate
- Alert Resolution Rate
- Escalation Rate

### ThreatMap

Global threat intelligence visualization.

```typescript
import { ThreatMap } from '@/components/ThreatMap';

// Usage
<ThreatMap />
```

**Features:**
- Interactive world map
- Geographic threat distribution
- Real-time threat indicator display
- Country-based threat aggregation
- Confidence scoring visualization

### CollaborationPanel

Multi-tier analyst collaboration interface.

```typescript
import { CollaborationPanel } from '@/components/CollaborationPanel';

// Usage
<CollaborationPanel targetId="incident-123" targetType="incident" />
```

**Props:**
- `targetId: string` - ID of incident or alert
- `targetType: 'incident' | 'alert'` - Type of target

**Features:**
- Real-time commenting system
- Comment types: note, escalation, resolution, question
- Internal/external comment visibility
- User activity tracking

### IncidentManagement

Comprehensive incident lifecycle management.

```typescript
import { IncidentManagement } from '@/components/IncidentManagement';

// Usage
<IncidentManagement />
```

**Features:**
- Incident creation and tracking
- Alert correlation and grouping
- Status workflow management
- Assignment and escalation
- Timeline tracking

### ReportGenerator

Automated report generation with AI assistance.

```typescript
import { ReportGenerator } from '@/components/ReportGenerator';

// Usage
<ReportGenerator />
```

**Features:**
- Template-based report creation
- AI-powered content generation
- Scheduled report delivery
- Multiple export formats
- Custom report templates

### ThreatCorrelationGraph

Advanced threat correlation visualization.

```typescript
import { ThreatCorrelationGraph } from '@/components/ThreatCorrelationGraph';

// Usage
<ThreatCorrelationGraph />
```

**Features:**
- Interactive node-link graph
- Threat relationship mapping
- Dynamic filtering and search
- Real-time correlation updates

---

## React Hooks API

### useAlerts

Manages security alerts with real-time updates.

```typescript
import { useAlerts } from '@/hooks/useAlerts';

const {
  alerts,              // Alert[] - Array of current alerts
  loading,             // boolean - Loading state
  error,               // string | null - Error message
  fetchAlerts,         // (filters?: any) => Promise<void>
  updateAlertStatus,   // (alertId: string, status: string, assignedTo?: string) => Promise<void>
  refresh              // () => Promise<void> - Refresh alerts
} = useAlerts();
```

**Alert Interface:**
```typescript
interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
  source: string;
  alert_type: string;
  source_ip?: string;
  destination_ip?: string;
  affected_systems?: string[];
  indicators?: string[];
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  metadata?: any;
}
```

**Usage Example:**
```typescript
const AlertComponent = () => {
  const { alerts, loading, updateAlertStatus } = useAlerts();

  const handleAcknowledge = async (alertId: string) => {
    await updateAlertStatus(alertId, 'acknowledged');
  };

  if (loading) return <div>Loading alerts...</div>;

  return (
    <div>
      {alerts.map(alert => (
        <div key={alert.id}>
          <h3>{alert.title}</h3>
          <span className={`severity-${alert.severity}`}>
            {alert.severity}
          </span>
          <button onClick={() => handleAcknowledge(alert.id)}>
            Acknowledge
          </button>
        </div>
      ))}
    </div>
  );
};
```

### useAIAssistant

Provides AI chat functionality with context awareness.

```typescript
import { useAIAssistant } from '@/hooks/useAIAssistant';

const {
  messages,     // AIMessage[] - Chat message history
  loading,      // boolean - AI response loading state
  error,        // string | null - Error message
  sendMessage,  // (message: string, contextType?: string, contextId?: string) => Promise<void>
  clearHistory, // () => void - Clear chat history
  refresh       // () => Promise<void> - Reload message history
} = useAIAssistant();
```

**AIMessage Interface:**
```typescript
interface AIMessage {
  id: string;
  user_id: string;
  session_id: string;
  message_type: 'user' | 'assistant';
  content: string;
  context_type?: 'general' | 'incident' | 'alert' | 'threat_hunting';
  context_id?: string;
  metadata?: any;
  created_at: string;
}
```

**Usage Example:**
```typescript
const ChatComponent = () => {
  const { messages, loading, sendMessage } = useAIAssistant();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    await sendMessage(input, 'incident', 'incident-123');
    setInput('');
  };

  return (
    <div>
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.message_type}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <input 
        value={input} 
        onChange={(e) => setInput(e.target.value)}
        disabled={loading}
      />
      <button onClick={handleSend} disabled={loading}>
        {loading ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
};
```

### useKPIMetrics

Manages performance metrics and KPI calculations.

```typescript
import { useKPIMetrics } from '@/hooks/useKPIMetrics';

const {
  metrics,          // KPIMetric[] - Array of performance metrics
  loading,          // boolean - Loading state
  error,            // string | null - Error message
  fetchKPIMetrics,  // () => Promise<void> - Fetch latest metrics
  calculateKPIs,    // () => Promise<void> - Trigger KPI recalculation
  refresh           // () => Promise<void> - Refresh metrics
} = useKPIMetrics();
```

**KPIMetric Interface:**
```typescript
interface KPIMetric {
  id: string;
  metric_name: string;
  metric_category: string;
  current_value: number;
  previous_value?: number;
  target_value?: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  period_start: string;
  period_end: string;
  calculated_at: string;
  metadata?: any;
}
```

### useSemanticSearch

Provides vector-based semantic search capabilities.

```typescript
import { useSemanticSearch } from '@/hooks/useSemanticSearch';

const {
  isSearching,           // boolean - Search in progress
  searchResults,         // SemanticSearchResult[] - Search results
  performSemanticSearch, // (query: string, threshold?: number, count?: number) => Promise<void>
  generateEmbedding,     // (incidentId: string, text: string) => Promise<boolean>
  clearResults           // () => void - Clear search results
} = useSemanticSearch();
```

**SemanticSearchResult Interface:**
```typescript
interface SemanticSearchResult {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  assignee: string;
  alert_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  similarity: number;    // Cosine similarity score (0-1)
}
```

**Usage Example:**
```typescript
const SearchComponent = () => {
  const { searchResults, isSearching, performSemanticSearch } = useSemanticSearch();
  const [query, setQuery] = useState('');

  const handleSearch = async () => {
    await performSemanticSearch(query, 0.7, 10);
  };

  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search incidents by description..."
      />
      <button onClick={handleSearch} disabled={isSearching}>
        {isSearching ? 'Searching...' : 'Search'}
      </button>
      
      <div className="results">
        {searchResults.map(result => (
          <div key={result.id} className="result-item">
            <h4>{result.title}</h4>
            <p>Similarity: {(result.similarity * 100).toFixed(1)}%</p>
            <p>{result.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### useThreatIntelligence

Manages threat intelligence data and indicators.

```typescript
import { useThreatIntelligence } from '@/hooks/useThreatIntelligence';

const {
  threatIntel,              // ThreatIntelligence[] - Threat indicators
  loading,                  // boolean - Loading state
  error,                    // string | null - Error message
  fetchThreatIntelligence,  // (filters?: any) => Promise<void>
  addThreatIndicator,       // (indicator: ThreatIndicator) => Promise<void>
  getThreatsByCountry,      // () => CountryThreatGroup[] - Group threats by country
  refresh                   // () => Promise<void> - Refresh threat data
} = useThreatIntelligence();
```

**ThreatIntelligence Interface:**
```typescript
interface ThreatIntelligence {
  id: string;
  indicator_value: string;
  indicator_type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'file';
  threat_type: string;
  confidence_score: number;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  source: string;
  first_seen: string;
  last_seen: string;
  is_active: boolean;
  tags?: string[];
  metadata?: any;
  created_at: string;
  updated_at: string;
}
```

### useCollaboration

Manages comments and collaboration features.

```typescript
import { useCollaboration } from '@/hooks/useCollaboration';

const {
  comments,      // Comment[] - Discussion comments
  loading,       // boolean - Loading state
  error,         // string | null - Error message
  addComment,    // (content: string, type: CommentType, isInternal: boolean) => Promise<void>
  updateComment, // (commentId: string, content: string) => Promise<void>
  deleteComment, // (commentId: string) => Promise<void>
  refresh        // () => Promise<void> - Refresh comments
} = useCollaboration(targetId, targetType);
```

**Comment Interface:**
```typescript
interface Comment {
  id: string;
  incident_id?: string;
  alert_id?: string;
  user_id: string;
  content: string;
  comment_type: 'note' | 'escalation' | 'resolution' | 'question';
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    username: string;
    full_name: string;
    role: string;
  };
}
```

---

## Backend Lambda Functions

### Semantic Search API

**Endpoint:** `POST /semantic-search`

**Function:** `backend/lambda/semantic_search.py`

**Purpose:** Performs vector-based semantic search across incidents using OpenAI embeddings and Pinecone.

**Request Body:**
```json
{
  "query": "suspicious PowerShell activity",
  "matchThreshold": 0.7,
  "matchCount": 10
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "incident-123",
      "title": "Malicious PowerShell Execution",
      "description": "Detected suspicious PowerShell commands...",
      "severity": "high",
      "status": "investigating",
      "assignee": "analyst1",
      "alert_count": 5,
      "tags": ["powershell", "malware"],
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T11:00:00Z",
      "similarity": 0.89
    }
  ],
  "count": 1,
  "query_embedding_cached": true
}
```

**Environment Variables:**
- `OPENAI_API_KEY` - OpenAI API key for embeddings
- `PINECONE_API_KEY` - Pinecone API key
- `PINECONE_ENV` - Pinecone environment
- `PINECONE_INDEX` - Pinecone index name
- `REDIS_HOST` - Redis endpoint for caching
- `AURORA_HOST` - Aurora database endpoint

**Features:**
- Redis caching for embeddings and results
- Configurable similarity thresholds
- Batch embedding generation
- Error handling and logging

---

## Database Schema

### Core Tables

#### alerts
Stores security alerts with real-time updates.

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open',
  source TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  source_ip INET,
  destination_ip INET,
  affected_systems TEXT[],
  indicators TEXT[],
  assigned_to UUID,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);
```

#### incidents
Incident management and correlation.

```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  assignee TEXT,
  alert_count INTEGER DEFAULT 0,
  tags TEXT[],
  embedding VECTOR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### threat_intelligence
Threat intelligence indicators and IOCs.

```sql
CREATE TABLE threat_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_type TEXT NOT NULL,
  indicator_value TEXT NOT NULL,
  threat_type TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence_score INTEGER,
  tags TEXT[],
  country_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### comments
Collaboration and discussion comments.

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  incident_id UUID,
  alert_id UUID,
  content TEXT NOT NULL,
  comment_type TEXT DEFAULT 'note',
  is_internal BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### kpi_metrics
Performance metrics tracking.

```sql
CREATE TABLE kpi_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL,
  current_value NUMERIC NOT NULL,
  previous_value NUMERIC,
  target_value NUMERIC,
  unit TEXT DEFAULT 'count',
  trend TEXT,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);
```

---

## Infrastructure & Deployment

### AWS CloudFormation Template

The infrastructure is defined in `backend/cloudformation.yaml` and includes:

**Resources:**
- VPC with public/private subnets
- Aurora Serverless (PostgreSQL)
- ElastiCache (Redis)
- AWS Lambda (Python)
- API Gateway
- IAM roles and security groups

**Parameters:**
```yaml
Parameters:
  OpenAIApiKey:
    Type: String
    Description: OpenAI API Key (for embeddings)
  PineconeApiKey:
    Type: String
    Description: Pinecone API Key
  PineconeEnv:
    Type: String
    Description: Pinecone Environment
  PineconeIndex:
    Type: String
    Description: Pinecone Index Name
  DBUsername:
    Type: String
    Description: Aurora DB Username
  DBPassword:
    Type: String
    NoEcho: true
    Description: Aurora DB Password
```

### Deployment Steps

1. **Deploy Infrastructure:**
```bash
aws cloudformation deploy \
  --template-file backend/cloudformation.yaml \
  --stack-name soc-ai-backend \
  --parameter-overrides \
    OpenAIApiKey="your-openai-key" \
    PineconeApiKey="your-pinecone-key" \
    PineconeEnv="us-west1-gcp" \
    PineconeIndex="soc-incidents" \
    DBUsername="socadmin" \
    DBPassword="SecurePassword123"
```

2. **Initialize Database:**
```bash
# Set environment variables
export AURORA_HOST="your-aurora-endpoint"
export AURORA_DB="soc_ai"
export AURORA_USER="socadmin"
export AURORA_PASSWORD="SecurePassword123"

# Run schema creation
psql -h $AURORA_HOST -U $AURORA_USER -d $AURORA_DB -f backend/scripts/aurora_schema.sql
```

3. **Ingest Data to Pinecone:**
```bash
# Set additional environment variables
export OPENAI_API_KEY="your-openai-key"
export PINECONE_API_KEY="your-pinecone-key"
export PINECONE_ENV="us-west1-gcp"
export PINECONE_INDEX="soc-incidents"

# Run data ingestion
python backend/scripts/ingest_to_pinecone.py
```

4. **Deploy Frontend:**
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy to your hosting platform
# (Vercel, Netlify, AWS S3 + CloudFront, etc.)
```

### Environment Configuration

**Frontend (.env):**
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
REACT_APP_SEMANTIC_SEARCH_API=https://your-api-gateway.execute-api.region.amazonaws.com/prod/semantic-search
```

**Backend (Lambda Environment Variables):**
```env
OPENAI_API_KEY=your-openai-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENV=us-west1-gcp
PINECONE_INDEX=soc-incidents
REDIS_HOST=your-redis-endpoint
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
AURORA_HOST=your-aurora-endpoint
AURORA_DB=soc_ai
AURORA_USER=socadmin
AURORA_PASSWORD=your-aurora-password
AURORA_PORT=5432
```

---

## Usage Examples

### Complete Alert Management Flow

```typescript
import React from 'react';
import { useAlerts } from '@/hooks/useAlerts';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useCollaboration } from '@/hooks/useCollaboration';

const AlertManagementExample = () => {
  const { alerts, updateAlertStatus } = useAlerts();
  const { sendMessage } = useAIAssistant();
  const criticalAlert = alerts.find(a => a.severity === 'critical');

  const handleInvestigate = async (alert: Alert) => {
    // 1. Update alert status
    await updateAlertStatus(alert.id, 'investigating');
    
    // 2. Get AI analysis
    await sendMessage(
      `Analyze this alert: ${alert.title}. ${alert.description}`, 
      'alert', 
      alert.id
    );
  };

  return (
    <div>
      {criticalAlert && (
        <div className="critical-alert">
          <h3>{criticalAlert.title}</h3>
          <p>{criticalAlert.description}</p>
          <button onClick={() => handleInvestigate(criticalAlert)}>
            Investigate with AI
          </button>
        </div>
      )}
    </div>
  );
};
```

### Semantic Search Integration

```typescript
import React, { useState } from 'react';
import { useSemanticSearch } from '@/hooks/useSemanticSearch';

const ThreatHuntingExample = () => {
  const { searchResults, performSemanticSearch, isSearching } = useSemanticSearch();
  const [huntQuery, setHuntQuery] = useState('');

  const threatHuntingQueries = [
    'lateral movement techniques',
    'privilege escalation attempts',
    'data exfiltration indicators',
    'persistence mechanisms',
    'command and control communications'
  ];

  const handleThreatHunt = async (query: string) => {
    setHuntQuery(query);
    await performSemanticSearch(query, 0.6, 20);
  };

  return (
    <div className="threat-hunting">
      <h2>Threat Hunting Dashboard</h2>
      
      <div className="quick-hunts">
        {threatHuntingQueries.map(query => (
          <button 
            key={query}
            onClick={() => handleThreatHunt(query)}
            disabled={isSearching}
          >
            Hunt: {query}
          </button>
        ))}
      </div>

      <div className="custom-hunt">
        <input 
          value={huntQuery}
          onChange={(e) => setHuntQuery(e.target.value)}
          placeholder="Enter custom threat hunting query..."
        />
        <button 
          onClick={() => handleThreatHunt(huntQuery)}
          disabled={isSearching || !huntQuery.trim()}
        >
          {isSearching ? 'Hunting...' : 'Hunt'}
        </button>
      </div>

      <div className="hunt-results">
        <h3>Hunt Results ({searchResults.length})</h3>
        {searchResults.map(result => (
          <div key={result.id} className="hunt-result">
            <h4>{result.title}</h4>
            <div className="similarity-score">
              Relevance: {(result.similarity * 100).toFixed(1)}%
            </div>
            <p>{result.description}</p>
            <div className="metadata">
              <span>Severity: {result.severity}</span>
              <span>Status: {result.status}</span>
              <span>Alerts: {result.alert_count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Collaborative Incident Response

```typescript
import React, { useState } from 'react';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useAuth } from '@/contexts/AuthContext';

const IncidentCollaborationExample = ({ incidentId }: { incidentId: string }) => {
  const { user } = useAuth();
  const { comments, addComment, loading } = useCollaboration(incidentId, 'incident');
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'note' | 'escalation' | 'resolution' | 'question'>('note');

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    await addComment(newComment, commentType, true);
    setNewComment('');
  };

  const esclatateIncident = async () => {
    await addComment(
      `Escalating incident ${incidentId} to Tier 2 due to severity and complexity. Requires advanced analysis.`,
      'escalation',
      false // External comment for visibility
    );
  };

  return (
    <div className="incident-collaboration">
      <h3>Incident Collaboration</h3>
      
      <div className="quick-actions">
        <button onClick={esclatateIncident}>
          Escalate to Tier 2
        </button>
      </div>

      <div className="comments-timeline">
        {comments.map(comment => (
          <div key={comment.id} className={`comment ${comment.comment_type}`}>
            <div className="comment-header">
              <span className="author">
                {comment.profile?.full_name || comment.profile?.username}
              </span>
              <span className="role">{comment.profile?.role}</span>
              <span className="timestamp">
                {new Date(comment.created_at).toLocaleString()}
              </span>
              {comment.is_internal && <span className="internal-badge">Internal</span>}
            </div>
            <div className="comment-content">
              {comment.content}
            </div>
          </div>
        ))}
      </div>

      <div className="add-comment">
        <select 
          value={commentType} 
          onChange={(e) => setCommentType(e.target.value as any)}
        >
          <option value="note">Note</option>
          <option value="question">Question</option>
          <option value="escalation">Escalation</option>
          <option value="resolution">Resolution</option>
        </select>
        
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add your comment..."
        />
        
        <button 
          onClick={handleAddComment}
          disabled={loading || !newComment.trim()}
        >
          {loading ? 'Adding...' : 'Add Comment'}
        </button>
      </div>
    </div>
  );
};
```

---

## Authentication & Security

### User Authentication

The platform uses Supabase Auth for user management with role-based access control.

**User Roles:**
- `analyst_tier1` - Basic alert handling and initial investigation
- `analyst_tier2` - Advanced investigation and incident response
- `analyst_tier3` - Senior analyst with full system access
- `manager` - Management oversight and reporting access
- `admin` - System administration and configuration

### Authentication Context

```typescript
import { useAuth } from '@/contexts/AuthContext';

const { 
  user,          // Current authenticated user
  userProfile,   // User profile with role information
  signIn,        // (email: string, password: string) => Promise<void>
  signUp,        // (email: string, password: string, metadata?: any) => Promise<void>
  signOut,       // () => Promise<void>
  loading        // Authentication loading state
} = useAuth();
```

### Row Level Security (RLS)

All database tables implement RLS policies for secure multi-tenant access:

```sql
-- Users can only view their own AI interactions
CREATE POLICY "Users can view their own AI interactions" 
ON ai_interactions FOR SELECT 
USING (auth.uid() = user_id);

-- Alert visibility for all authenticated users
CREATE POLICY "Users can view all alerts" 
ON alerts FOR SELECT 
USING (true);

-- Users can only update alerts assigned to them or unassigned
CREATE POLICY "Users can update assigned alerts" 
ON alerts FOR UPDATE 
USING (assigned_to IS NULL OR assigned_to = auth.uid());
```

### API Security

- JWT token validation in edge functions
- Environment variable protection for API keys
- HTTPS-only communication
- Input validation and sanitization
- Rate limiting on API endpoints

---

## Error Handling

### Frontend Error Handling

All hooks implement consistent error handling with toast notifications:

```typescript
const { toast } = useToast();

try {
  // API operation
} catch (err: any) {
  console.error('Operation failed:', err);
  toast({
    title: "Operation Failed",
    description: err.message,
    variant: "destructive",
  });
}
```

### Backend Error Responses

Lambda functions return consistent error responses:

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED` - User not authenticated
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions  
- `VALIDATION_ERROR` - Input validation failed
- `EXTERNAL_API_ERROR` - OpenAI/Pinecone API error
- `DATABASE_ERROR` - Database operation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests

---

## Best Practices

### Component Development

1. **Use TypeScript** for all components and interfaces
2. **Implement error boundaries** for graceful error handling
3. **Optimize renders** with React.memo for expensive components
4. **Use custom hooks** for reusable logic
5. **Follow naming conventions** (PascalCase for components, camelCase for functions)

### API Integration

1. **Handle loading states** in all async operations
2. **Implement retry logic** for transient failures
3. **Cache responses** when appropriate
4. **Validate inputs** before API calls
5. **Use environment variables** for configuration

### Security Considerations

1. **Never expose API keys** in frontend code
2. **Validate all inputs** on both frontend and backend
3. **Use HTTPS** for all communications
4. **Implement proper authentication** checks
5. **Follow principle of least privilege** for database access

### Performance Optimization

1. **Use semantic search judiciously** (it's computationally expensive)
2. **Implement pagination** for large datasets
3. **Cache embeddings** in Redis
4. **Optimize database queries** with proper indexing
5. **Use connection pooling** for database connections

### Monitoring and Observability

1. **Log all errors** with contextual information
2. **Monitor API response times** and error rates
3. **Track user interactions** for analytics
4. **Set up alerts** for critical system failures
5. **Use structured logging** for better searchability

---

This comprehensive documentation covers all public APIs, components, and usage patterns in the AI SOC Nexus platform. For additional support or contributions, please refer to the project repository and architecture documentation.