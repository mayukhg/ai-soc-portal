# AI SOC Nexus - Backend API Reference

## Table of Contents

1. [Overview](#overview)
2. [Lambda Functions](#lambda-functions)
3. [Database API](#database-api)
4. [External Integrations](#external-integrations)
5. [Data Ingestion Pipeline](#data-ingestion-pipeline)
6. [Authentication & Security](#authentication--security)
7. [Error Handling](#error-handling)
8. [Performance & Monitoring](#performance--monitoring)
9. [Deployment & Configuration](#deployment--configuration)
10. [API Examples](#api-examples)

---

## Overview

The AI SOC Nexus backend is built on AWS serverless architecture using:

- **AWS Lambda** - Serverless compute for API endpoints
- **API Gateway** - RESTful API routing and management
- **Aurora Serverless** - PostgreSQL database with auto-scaling
- **ElastiCache (Redis)** - Caching layer for performance
- **Pinecone** - Vector database for semantic search
- **OpenAI API** - Text embeddings and AI assistance

### Architecture Principles

- **Serverless-first** - Pay-per-use scaling
- **Event-driven** - Asynchronous processing where possible
- **Caching strategy** - Redis for frequent queries
- **Security by design** - IAM roles and VPC isolation
- **Observability** - CloudWatch logging and metrics

---

## Lambda Functions

### Semantic Search Function

**File:** `backend/lambda/semantic_search.py`
**Endpoint:** `POST /semantic-search`
**Runtime:** Python 3.9

**Purpose:** Performs vector-based semantic search across incidents using OpenAI embeddings and Pinecone.

#### Request Format

```json
{
  "query": "string",
  "matchThreshold": 0.7,
  "matchCount": 10,
  "filters": {
    "severity": ["critical", "high"],
    "dateRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "tags": ["malware", "lateral_movement"]
  }
}
```

#### Response Format

```json
{
  "success": true,
  "results": [
    {
      "id": "incident-123",
      "title": "Malicious PowerShell Execution",
      "description": "Detected suspicious PowerShell commands targeting domain controllers",
      "severity": "high",
      "status": "investigating",
      "assignee": "analyst1",
      "alert_count": 5,
      "tags": ["powershell", "malware", "privilege_escalation"],
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T11:00:00Z",
      "similarity": 0.89
    }
  ],
  "count": 1,
  "processing_time": 0.245,
  "query_embedding_cached": true,
  "metadata": {
    "pinecone_query_time": 0.12,
    "aurora_query_time": 0.08,
    "redis_cache_hits": 1
  }
}
```

#### Function Implementation

```python
import os
import json
import openai
import pinecone
import redis
import psycopg2
from typing import List, Dict, Optional

def lambda_handler(event, context):
    """
    Semantic search handler with caching and error handling
    """
    try:
        # Parse request
        body = json.loads(event.get('body', '{}'))
        query = body.get('query', '')
        threshold = body.get('matchThreshold', 0.7)
        count = body.get('matchCount', 10)
        filters = body.get('filters', {})
        
        # Validate inputs
        if not query.strip():
            return error_response("Query cannot be empty", 400)
        
        if not (0.1 <= threshold <= 1.0):
            return error_response("Threshold must be between 0.1 and 1.0", 400)
            
        # Get or generate embedding
        embedding = get_cached_embedding(query)
        if not embedding:
            embedding = generate_embedding(query)
            cache_embedding(query, embedding)
        
        # Search Pinecone
        pinecone_results = search_pinecone(embedding, threshold, count)
        
        # Fetch metadata from Aurora
        incidents = fetch_incident_metadata(pinecone_results, filters)
        
        # Format response
        return success_response({
            'results': incidents,
            'count': len(incidents),
            'processing_time': time.time() - start_time,
            'query_embedding_cached': bool(cached_embedding)
        })
        
    except Exception as e:
        logger.error(f"Semantic search error: {str(e)}")
        return error_response("Internal server error", 500)

def get_cached_embedding(query: str) -> Optional[List[float]]:
    """Get embedding from Redis cache"""
    cache_key = f"embedding:{hash(query)}"
    cached = redis_client.get(cache_key)
    return json.loads(cached) if cached else None

def generate_embedding(text: str) -> List[float]:
    """Generate embedding using OpenAI API"""
    response = openai.Embedding.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response['data'][0]['embedding']

def search_pinecone(embedding: List[float], threshold: float, count: int) -> List[Dict]:
    """Search Pinecone for similar vectors"""
    results = pinecone_index.query(
        vector=embedding,
        top_k=count,
        include_metadata=True,
        filter={"score": {"$gte": threshold}}
    )
    return results['matches']

def fetch_incident_metadata(pinecone_results: List[Dict], filters: Dict) -> List[Dict]:
    """Fetch incident details from Aurora with filtering"""
    incident_ids = [match['id'] for match in pinecone_results]
    
    query = """
        SELECT id, title, description, severity, status, assignee, 
               alert_count, tags, created_at, updated_at
        FROM incidents 
        WHERE id = ANY(%s)
    """
    
    # Apply filters
    conditions = []
    params = [incident_ids]
    
    if filters.get('severity'):
        conditions.append("severity = ANY(%s)")
        params.append(filters['severity'])
    
    if filters.get('dateRange'):
        conditions.append("created_at BETWEEN %s AND %s")
        params.extend([filters['dateRange']['start'], filters['dateRange']['end']])
    
    if conditions:
        query += " AND " + " AND ".join(conditions)
    
    query += " ORDER BY created_at DESC"
    
    with get_aurora_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            incidents = cur.fetchall()
    
    # Merge with similarity scores
    return merge_with_similarity(incidents, pinecone_results)
```

#### Environment Variables

```bash
OPENAI_API_KEY=sk-...                    # OpenAI API key
PINECONE_API_KEY=...                     # Pinecone API key
PINECONE_ENV=us-west1-gcp                # Pinecone environment
PINECONE_INDEX=soc-incidents             # Pinecone index name
REDIS_HOST=....cache.amazonaws.com       # Redis endpoint
REDIS_PORT=6379                          # Redis port
REDIS_PASSWORD=...                       # Redis password
AURORA_HOST=....cluster-....amazonaws.com # Aurora endpoint
AURORA_DB=soc_ai                         # Database name
AURORA_USER=socadmin                     # Database username
AURORA_PASSWORD=...                      # Database password
AURORA_PORT=5432                         # Database port
```

### AI Assistant Function

**File:** `supabase/functions/ai-assistant/index.ts`
**Endpoint:** `POST /ai-assistant`
**Runtime:** Deno/TypeScript

**Purpose:** Provides AI-powered security analysis and assistance using OpenAI GPT-4.

#### Request Format

```json
{
  "message": "Analyze this PowerShell alert for potential threats",
  "sessionId": "session-123",
  "contextType": "alert",
  "contextId": "alert-456",
  "userId": "user-789"
}
```

#### Response Format

```json
{
  "success": true,
  "message": "This PowerShell alert shows characteristics of...",
  "sessionId": "session-123",
  "analysisType": "threat_assessment",
  "confidence": 0.85,
  "recommendations": [
    "Investigate the source system for additional artifacts",
    "Check for lateral movement indicators",
    "Review recent user activity on affected systems"
  ],
  "iocs": [
    {
      "type": "hash",
      "value": "a1b2c3d4e5f6...",
      "description": "Suspicious PowerShell script hash"
    }
  ]
}
```

#### Function Implementation

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.3.0'

interface AIRequest {
  message: string
  sessionId: string
  contextType?: 'general' | 'incident' | 'alert' | 'threat_hunting'
  contextId?: string
  userId: string
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { message, sessionId, contextType, contextId, userId }: AIRequest = await req.json()

    // Validate request
    if (!message?.trim()) {
      return jsonResponse({ success: false, error: 'Message is required' }, 400)
    }

    // Get context if provided
    const context = await getContext(contextType, contextId)
    
    // Build system prompt
    const systemPrompt = buildSystemPrompt(contextType, context)
    
    // Get conversation history
    const history = await getConversationHistory(userId, sessionId)
    
    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ]

    // Call OpenAI
    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages,
      max_tokens: 1000,
      temperature: 0.3
    })

    const aiResponse = completion.data.choices[0].message?.content || ''

    // Store interaction
    await storeInteraction(userId, sessionId, message, aiResponse, contextType, contextId)

    // Extract structured information
    const analysis = extractAnalysis(aiResponse)

    return jsonResponse({
      success: true,
      message: aiResponse,
      sessionId,
      ...analysis
    })

  } catch (error) {
    console.error('AI Assistant error:', error)
    return jsonResponse({ 
      success: false, 
      error: 'Internal server error' 
    }, 500)
  }
})

function buildSystemPrompt(contextType?: string, context?: any): string {
  const basePrompt = `You are a cybersecurity expert assistant. 
  Provide accurate, actionable analysis and recommendations. 
  Always consider MITRE ATT&CK framework when relevant.`

  const contextPrompts = {
    incident: `Focus on incident analysis, containment, and remediation strategies.`,
    alert: `Analyze the alert for false positives, severity assessment, and next steps.`,
    threat_hunting: `Provide threat hunting guidance, IOC suggestions, and detection strategies.`
  }

  let prompt = basePrompt
  if (contextType && contextPrompts[contextType]) {
    prompt += '\n\n' + contextPrompts[contextType]
  }

  if (context) {
    prompt += `\n\nContext: ${JSON.stringify(context)}`
  }

  return prompt
}

async function getContext(contextType?: string, contextId?: string) {
  if (!contextType || !contextId) return null

  const tables = {
    incident: 'incidents',
    alert: 'alerts',
    threat_hunting: 'threat_intelligence'
  }

  const table = tables[contextType]
  if (!table) return null

  const { data } = await supabase
    .from(table)
    .select('*')
    .eq('id', contextId)
    .single()

  return data
}

function extractAnalysis(response: string) {
  // Extract structured information from AI response
  const analysis = {
    analysisType: 'general',
    confidence: 0.5,
    recommendations: [],
    iocs: []
  }

  // Simple extraction logic (could be enhanced with NLP)
  if (response.includes('threat') || response.includes('malicious')) {
    analysis.analysisType = 'threat_assessment'
    analysis.confidence = 0.8
  }

  // Extract IOCs using regex patterns
  const hashPattern = /\b[a-fA-F0-9]{32,64}\b/g
  const ipPattern = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g
  
  const hashes = response.match(hashPattern) || []
  const ips = response.match(ipPattern) || []

  analysis.iocs = [
    ...hashes.map(hash => ({ type: 'hash', value: hash })),
    ...ips.map(ip => ({ type: 'ip', value: ip }))
  ]

  return analysis
}
```

### KPI Calculation Function

**File:** `supabase/functions/calculate-kpis/index.ts`
**Endpoint:** `POST /calculate-kpis`
**Runtime:** Deno/TypeScript

**Purpose:** Calculates SOC performance metrics and KPIs.

#### Request Format

```json
{
  "timeRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "metrics": ["mttd", "mttr", "false_positive_rate", "resolution_rate"]
}
```

#### Response Format

```json
{
  "success": true,
  "metrics": [
    {
      "metric_name": "Mean Time to Detection",
      "metric_category": "response_time",
      "current_value": 2.5,
      "previous_value": 3.1,
      "target_value": 2.0,
      "unit": "hours",
      "trend": "down",
      "improvement": 19.4
    }
  ],
  "calculation_time": "2024-01-15T10:30:00Z"
}
```

#### KPI Calculations

```typescript
interface KPIMetric {
  name: string
  category: string
  query: string
  unit: string
  target?: number
}

const KPI_DEFINITIONS: KPIMetric[] = [
  {
    name: 'Mean Time to Detection',
    category: 'response_time',
    query: `
      SELECT AVG(EXTRACT(EPOCH FROM (first_acknowledged - created_at))/3600) as value
      FROM alerts 
      WHERE created_at BETWEEN $1 AND $2 
      AND status != 'false_positive'
    `,
    unit: 'hours',
    target: 2.0
  },
  {
    name: 'Mean Time to Response',
    category: 'response_time',
    query: `
      SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as value
      FROM alerts 
      WHERE resolved_at IS NOT NULL 
      AND created_at BETWEEN $1 AND $2
    `,
    unit: 'hours',
    target: 24.0
  },
  {
    name: 'False Positive Rate',
    category: 'quality',
    query: `
      SELECT 
        COUNT(CASE WHEN status = 'false_positive' THEN 1 END) * 100.0 / COUNT(*) as value
      FROM alerts 
      WHERE created_at BETWEEN $1 AND $2
    `,
    unit: 'percentage',
    target: 5.0
  },
  {
    name: 'Alert Resolution Rate',
    category: 'efficiency',
    query: `
      SELECT 
        COUNT(CASE WHEN status IN ('resolved', 'false_positive') THEN 1 END) * 100.0 / COUNT(*) as value
      FROM alerts 
      WHERE created_at BETWEEN $1 AND $2
    `,
    unit: 'percentage',
    target: 95.0
  }
]

async function calculateKPIs(timeRange: TimeRange): Promise<KPIResult[]> {
  const results: KPIResult[] = []
  
  for (const kpi of KPI_DEFINITIONS) {
    try {
      // Calculate current period
      const current = await executeKPIQuery(kpi.query, timeRange)
      
      // Calculate previous period for trend analysis
      const previousRange = getPreviousPeriod(timeRange)
      const previous = await executeKPIQuery(kpi.query, previousRange)
      
      // Calculate trend
      const trend = calculateTrend(current, previous)
      
      results.push({
        metric_name: kpi.name,
        metric_category: kpi.category,
        current_value: current,
        previous_value: previous,
        target_value: kpi.target,
        unit: kpi.unit,
        trend: trend.direction,
        improvement: trend.percentage
      })
      
    } catch (error) {
      console.error(`Error calculating KPI ${kpi.name}:`, error)
    }
  }
  
  return results
}

async function executeKPIQuery(query: string, timeRange: TimeRange): Promise<number> {
  const { data, error } = await supabase.rpc('execute_kpi_query', {
    query_text: query,
    start_time: timeRange.start,
    end_time: timeRange.end
  })
  
  if (error) throw error
  return data[0]?.value || 0
}

function calculateTrend(current: number, previous: number) {
  if (previous === 0) return { direction: 'stable', percentage: 0 }
  
  const change = ((current - previous) / previous) * 100
  
  return {
    direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
    percentage: Math.abs(change)
  }
}
```

---

## Database API

### Core Tables and Operations

#### Alerts Table

**Schema:**
```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity alert_severity NOT NULL,
  status alert_status NOT NULL DEFAULT 'open',
  source TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  source_ip INET,
  destination_ip INET,
  affected_systems TEXT[],
  indicators TEXT[],
  assigned_to UUID REFERENCES profiles(user_id),
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  first_acknowledged TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_alerts_assigned_to ON alerts(assigned_to);
CREATE INDEX idx_alerts_source_ip ON alerts USING GIST(source_ip inet_ops);
```

**Common Operations:**

```sql
-- Get alerts with filtering and pagination
SELECT a.*, p.username as assignee_name
FROM alerts a
LEFT JOIN profiles p ON a.assigned_to = p.user_id
WHERE ($1::text IS NULL OR severity = $1::alert_severity)
  AND ($2::text IS NULL OR status = $2::alert_status)
  AND ($3::uuid IS NULL OR assigned_to = $3::uuid)
  AND created_at >= $4::timestamp
ORDER BY 
  CASE WHEN severity = 'critical' THEN 1
       WHEN severity = 'high' THEN 2
       WHEN severity = 'medium' THEN 3
       WHEN severity = 'low' THEN 4
  END,
  created_at DESC
LIMIT $5 OFFSET $6;

-- Update alert status with audit trail
UPDATE alerts 
SET 
  status = $2::alert_status,
  assigned_to = $3::uuid,
  resolved_at = CASE WHEN $2::alert_status IN ('resolved', 'false_positive') 
                     THEN NOW() 
                     ELSE NULL END,
  first_acknowledged = CASE WHEN $2::alert_status != 'open' AND first_acknowledged IS NULL
                            THEN NOW()
                            ELSE first_acknowledged END,
  updated_at = NOW()
WHERE id = $1::uuid
RETURNING *;

-- Bulk status update
UPDATE alerts 
SET status = $2::alert_status, updated_at = NOW()
WHERE id = ANY($1::uuid[])
RETURNING id, status, updated_at;
```

#### Incidents Table

**Schema:**
```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity incident_severity NOT NULL,
  status incident_status NOT NULL DEFAULT 'open',
  assignee UUID REFERENCES profiles(user_id),
  alert_count INTEGER DEFAULT 0,
  tags TEXT[],
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Trigger to update alert_count
CREATE OR REPLACE FUNCTION update_incident_alert_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE incidents 
  SET alert_count = (
    SELECT COUNT(*) 
    FROM alert_incident_mapping 
    WHERE incident_id = COALESCE(NEW.incident_id, OLD.incident_id)
  )
  WHERE id = COALESCE(NEW.incident_id, OLD.incident_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

#### Threat Intelligence Table

**Schema:**
```sql
CREATE TABLE threat_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_type indicator_type NOT NULL,
  indicator_value TEXT NOT NULL,
  threat_type TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  tags TEXT[],
  country_code CHAR(2),
  latitude NUMERIC(8,6),
  longitude NUMERIC(9,6),
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Geospatial index for location queries
CREATE INDEX idx_threat_intel_location ON threat_intelligence USING GIST(
  point(longitude, latitude)
);

-- Text search index
CREATE INDEX idx_threat_intel_fts ON threat_intelligence USING GIN(
  to_tsvector('english', indicator_value || ' ' || threat_type)
);
```

### Row Level Security (RLS)

**Alert Access Control:**
```sql
-- Analysts can view all alerts
CREATE POLICY "analysts_can_view_alerts" ON alerts
  FOR SELECT TO authenticated
  USING (true);

-- Users can update alerts assigned to them or unassigned
CREATE POLICY "users_can_update_assigned_alerts" ON alerts
  FOR UPDATE TO authenticated
  USING (
    assigned_to IS NULL OR 
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('analyst_tier3', 'manager', 'admin')
    )
  );

-- Only senior analysts can delete alerts
CREATE POLICY "senior_analysts_can_delete_alerts" ON alerts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('analyst_tier3', 'admin')
    )
  );
```

---

## External Integrations

### OpenAI API Integration

**Text Embeddings:**
```python
class OpenAIEmbeddingService:
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
        self.model = "text-embedding-3-small"
        self.max_tokens = 8191
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text with retry logic"""
        text = self.truncate_text(text, self.max_tokens)
        
        for attempt in range(3):
            try:
                response = await self.client.embeddings.create(
                    input=text,
                    model=self.model
                )
                return response.data[0].embedding
                
            except openai.RateLimitError:
                await asyncio.sleep(2 ** attempt)
            except openai.APIError as e:
                if attempt == 2:
                    raise e
                await asyncio.sleep(1)
    
    def truncate_text(self, text: str, max_tokens: int) -> str:
        """Truncate text to fit within token limits"""
        # Approximate token count (1 token ≈ 4 characters)
        if len(text) <= max_tokens * 4:
            return text
        return text[:max_tokens * 4]
```

**Chat Completions:**
```python
class OpenAIChatService:
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
        self.model = "gpt-4"
    
    async def chat_completion(
        self, 
        messages: List[Dict], 
        temperature: float = 0.3,
        max_tokens: int = 1000
    ) -> str:
        """Generate chat completion with security context"""
        
        # Add security-focused system message
        security_prompt = {
            "role": "system",
            "content": """You are a cybersecurity expert assistant. 
            Always provide accurate, actionable security analysis.
            When analyzing threats, consider:
            - MITRE ATT&CK framework tactics and techniques
            - Indicators of Compromise (IOCs)
            - Recommended containment and remediation steps
            - False positive likelihood
            Format responses clearly with structured recommendations."""
        }
        
        full_messages = [security_prompt] + messages
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content
```

### Pinecone Vector Database

**Index Management:**
```python
class PineconeService:
    def __init__(self, api_key: str, environment: str, index_name: str):
        pinecone.init(api_key=api_key, environment=environment)
        self.index = pinecone.Index(index_name)
        self.dimension = 1536  # OpenAI embedding dimension
    
    async def upsert_vectors(self, vectors: List[Tuple[str, List[float], Dict]]):
        """Upsert vectors with metadata"""
        batch_size = 100
        
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i:i + batch_size]
            
            upsert_data = [
                {
                    "id": vector_id,
                    "values": embedding,
                    "metadata": metadata
                }
                for vector_id, embedding, metadata in batch
            ]
            
            self.index.upsert(vectors=upsert_data)
    
    async def query_similar(
        self, 
        embedding: List[float], 
        top_k: int = 10,
        score_threshold: float = 0.7,
        filter_dict: Optional[Dict] = None
    ) -> List[Dict]:
        """Query for similar vectors"""
        
        response = self.index.query(
            vector=embedding,
            top_k=top_k,
            include_metadata=True,
            include_values=False,
            filter=filter_dict
        )
        
        # Filter by score threshold
        results = [
            match for match in response.matches 
            if match.score >= score_threshold
        ]
        
        return results
    
    async def delete_vectors(self, ids: List[str]):
        """Delete vectors by IDs"""
        self.index.delete(ids=ids)
```

### Redis Caching Layer

**Caching Strategy:**
```python
class RedisCacheService:
    def __init__(self, host: str, port: int, password: str, db: int = 0):
        self.client = redis.Redis(
            host=host,
            port=port,
            password=password,
            db=db,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5
        )
        self.default_ttl = 3600  # 1 hour
    
    async def get_embedding(self, text_hash: str) -> Optional[List[float]]:
        """Get cached embedding"""
        key = f"embedding:{text_hash}"
        cached = self.client.get(key)
        return json.loads(cached) if cached else None
    
    async def set_embedding(self, text_hash: str, embedding: List[float], ttl: int = None):
        """Cache embedding"""
        key = f"embedding:{text_hash}"
        self.client.setex(
            key, 
            ttl or self.default_ttl, 
            json.dumps(embedding)
        )
    
    async def get_search_results(self, query_hash: str) -> Optional[List[Dict]]:
        """Get cached search results"""
        key = f"search:{query_hash}"
        cached = self.client.get(key)
        return json.loads(cached) if cached else None
    
    async def set_search_results(
        self, 
        query_hash: str, 
        results: List[Dict], 
        ttl: int = 300  # 5 minutes
    ):
        """Cache search results"""
        key = f"search:{query_hash}"
        self.client.setex(key, ttl, json.dumps(results))
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate keys matching pattern"""
        keys = self.client.keys(pattern)
        if keys:
            self.client.delete(*keys)
```

---

## Data Ingestion Pipeline

### Incident Data Ingestion

**File:** `backend/scripts/ingest_to_pinecone.py`

```python
import asyncio
import logging
from typing import List, Dict, Tuple
import psycopg2
import openai
import pinecone
from dataclasses import dataclass

@dataclass
class IncidentData:
    id: str
    title: str
    description: str
    severity: str
    tags: List[str]
    created_at: str

class IncidentIngestionPipeline:
    def __init__(self, config: Dict):
        self.config = config
        self.openai_service = OpenAIEmbeddingService(config['openai_api_key'])
        self.pinecone_service = PineconeService(
            config['pinecone_api_key'],
            config['pinecone_env'],
            config['pinecone_index']
        )
        self.batch_size = 50
        
    async def run_full_ingestion(self):
        """Run complete data ingestion pipeline"""
        logger.info("Starting full incident ingestion")
        
        # Fetch all incidents from Aurora
        incidents = await self.fetch_incidents()
        logger.info(f"Found {len(incidents)} incidents to process")
        
        # Process in batches
        for i in range(0, len(incidents), self.batch_size):
            batch = incidents[i:i + self.batch_size]
            await self.process_batch(batch)
            logger.info(f"Processed batch {i//self.batch_size + 1}")
        
        logger.info("Full ingestion completed")
    
    async def fetch_incidents(self) -> List[IncidentData]:
        """Fetch incidents from Aurora database"""
        query = """
            SELECT id, title, description, severity, tags, created_at
            FROM incidents
            WHERE embedding IS NULL OR updated_at > last_embedding_update
            ORDER BY created_at DESC
        """
        
        conn = psycopg2.connect(**self.config['aurora'])
        try:
            with conn.cursor() as cur:
                cur.execute(query)
                rows = cur.fetchall()
                
                return [
                    IncidentData(
                        id=row[0],
                        title=row[1],
                        description=row[2] or '',
                        severity=row[3],
                        tags=row[4] or [],
                        created_at=row[5].isoformat()
                    )
                    for row in rows
                ]
        finally:
            conn.close()
    
    async def process_batch(self, incidents: List[IncidentData]):
        """Process a batch of incidents"""
        tasks = []
        
        for incident in incidents:
            task = self.process_incident(incident)
            tasks.append(task)
        
        # Process incidents concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter successful results
        vectors = []
        for incident, result in zip(incidents, results):
            if isinstance(result, Exception):
                logger.error(f"Failed to process incident {incident.id}: {result}")
            else:
                vectors.append(result)
        
        # Upsert to Pinecone
        if vectors:
            await self.pinecone_service.upsert_vectors(vectors)
            await self.update_embedding_status([v[0] for v in vectors])
    
    async def process_incident(self, incident: IncidentData) -> Tuple[str, List[float], Dict]:
        """Process single incident and generate embedding"""
        # Combine text fields for embedding
        text = f"{incident.title}\n{incident.description}"
        
        # Generate embedding
        embedding = await self.openai_service.generate_embedding(text)
        
        # Prepare metadata
        metadata = {
            "title": incident.title,
            "severity": incident.severity,
            "tags": incident.tags,
            "created_at": incident.created_at
        }
        
        return incident.id, embedding, metadata
    
    async def update_embedding_status(self, incident_ids: List[str]):
        """Update embedding status in Aurora"""
        query = """
            UPDATE incidents 
            SET last_embedding_update = NOW()
            WHERE id = ANY(%s)
        """
        
        conn = psycopg2.connect(**self.config['aurora'])
        try:
            with conn.cursor() as cur:
                cur.execute(query, (incident_ids,))
                conn.commit()
        finally:
            conn.close()

# Usage
async def main():
    config = {
        'openai_api_key': os.getenv('OPENAI_API_KEY'),
        'pinecone_api_key': os.getenv('PINECONE_API_KEY'),
        'pinecone_env': os.getenv('PINECONE_ENV'),
        'pinecone_index': os.getenv('PINECONE_INDEX'),
        'aurora': {
            'host': os.getenv('AURORA_HOST'),
            'database': os.getenv('AURORA_DB'),
            'user': os.getenv('AURORA_USER'),
            'password': os.getenv('AURORA_PASSWORD'),
            'port': int(os.getenv('AURORA_PORT', 5432))
        }
    }
    
    pipeline = IncidentIngestionPipeline(config)
    await pipeline.run_full_ingestion()

if __name__ == "__main__":
    asyncio.run(main())
```

### Real-time Data Streaming

**Aurora Database Triggers:**
```sql
-- Trigger function for real-time embedding updates
CREATE OR REPLACE FUNCTION notify_embedding_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify Lambda function of new/updated incident
  PERFORM pg_notify(
    'incident_update',
    json_build_object(
      'id', NEW.id,
      'action', TG_OP,
      'title', NEW.title,
      'description', NEW.description
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to incidents table
CREATE TRIGGER incident_embedding_trigger
  AFTER INSERT OR UPDATE OF title, description ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION notify_embedding_update();
```

---

## Authentication & Security

### JWT Token Validation

```python
import jwt
from functools import wraps
from typing import Dict, Optional

class AuthenticationService:
    def __init__(self, jwt_secret: str, supabase_url: str):
        self.jwt_secret = jwt_secret
        self.supabase_url = supabase_url
    
    def validate_jwt(self, token: str) -> Optional[Dict]:
        """Validate Supabase JWT token"""
        try:
            # Decode JWT token
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=['HS256'],
                audience='authenticated'
            )
            
            # Verify issuer
            if payload.get('iss') != self.supabase_url:
                return None
            
            # Check expiration
            import time
            if payload.get('exp', 0) < time.time():
                return None
            
            return {
                'user_id': payload.get('sub'),
                'email': payload.get('email'),
                'role': payload.get('user_metadata', {}).get('role'),
                'aud': payload.get('aud')
            }
            
        except jwt.InvalidTokenError:
            return None

def require_auth(auth_service: AuthenticationService):
    """Decorator for protecting Lambda functions"""
    def decorator(func):
        @wraps(func)
        def wrapper(event, context):
            # Extract Authorization header
            headers = event.get('headers', {})
            auth_header = headers.get('Authorization', '')
            
            if not auth_header.startswith('Bearer '):
                return {
                    'statusCode': 401,
                    'body': json.dumps({'error': 'Missing or invalid authorization header'})
                }
            
            token = auth_header[7:]  # Remove 'Bearer '
            user = auth_service.validate_jwt(token)
            
            if not user:
                return {
                    'statusCode': 401,
                    'body': json.dumps({'error': 'Invalid or expired token'})
                }
            
            # Add user context to event
            event['user'] = user
            
            return func(event, context)
        
        return wrapper
    return decorator
```

### Role-Based Access Control

```python
from enum import Enum
from typing import List, Set

class UserRole(Enum):
    ANALYST_TIER1 = "analyst_tier1"
    ANALYST_TIER2 = "analyst_tier2"
    ANALYST_TIER3 = "analyst_tier3"
    MANAGER = "manager"
    ADMIN = "admin"

class Permission(Enum):
    VIEW_ALERTS = "view_alerts"
    UPDATE_ALERTS = "update_alerts"
    DELETE_ALERTS = "delete_alerts"
    VIEW_INCIDENTS = "view_incidents"
    CREATE_INCIDENTS = "create_incidents"
    UPDATE_INCIDENTS = "update_incidents"
    DELETE_INCIDENTS = "delete_incidents"
    VIEW_THREAT_INTEL = "view_threat_intel"
    MANAGE_THREAT_INTEL = "manage_threat_intel"
    GENERATE_REPORTS = "generate_reports"
    ADMIN_FUNCTIONS = "admin_functions"

# Role permission mapping
ROLE_PERMISSIONS: Dict[UserRole, Set[Permission]] = {
    UserRole.ANALYST_TIER1: {
        Permission.VIEW_ALERTS,
        Permission.UPDATE_ALERTS,
        Permission.VIEW_INCIDENTS,
        Permission.VIEW_THREAT_INTEL
    },
    UserRole.ANALYST_TIER2: {
        Permission.VIEW_ALERTS,
        Permission.UPDATE_ALERTS,
        Permission.VIEW_INCIDENTS,
        Permission.CREATE_INCIDENTS,
        Permission.UPDATE_INCIDENTS,
        Permission.VIEW_THREAT_INTEL,
        Permission.MANAGE_THREAT_INTEL
    },
    UserRole.ANALYST_TIER3: {
        Permission.VIEW_ALERTS,
        Permission.UPDATE_ALERTS,
        Permission.DELETE_ALERTS,
        Permission.VIEW_INCIDENTS,
        Permission.CREATE_INCIDENTS,
        Permission.UPDATE_INCIDENTS,
        Permission.DELETE_INCIDENTS,
        Permission.VIEW_THREAT_INTEL,
        Permission.MANAGE_THREAT_INTEL,
        Permission.GENERATE_REPORTS
    },
    UserRole.MANAGER: {
        Permission.VIEW_ALERTS,
        Permission.VIEW_INCIDENTS,
        Permission.VIEW_THREAT_INTEL,
        Permission.GENERATE_REPORTS
    },
    UserRole.ADMIN: {permission for permission in Permission}
}

def require_permission(permission: Permission):
    """Decorator for requiring specific permissions"""
    def decorator(func):
        @wraps(func)
        def wrapper(event, context):
            user = event.get('user')
            if not user:
                return error_response('Authentication required', 401)
            
            user_role = UserRole(user.get('role', 'analyst_tier1'))
            user_permissions = ROLE_PERMISSIONS.get(user_role, set())
            
            if permission not in user_permissions:
                return error_response('Insufficient permissions', 403)
            
            return func(event, context)
        
        return wrapper
    return decorator
```

---

## Error Handling

### Standardized Error Responses

```python
from enum import Enum
from typing import Dict, Any, Optional
import json
import traceback
import logging

class ErrorCode(Enum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"

class APIError(Exception):
    def __init__(
        self, 
        message: str, 
        code: ErrorCode, 
        status_code: int = 500,
        details: Optional[Dict] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)

def error_response(
    message: str, 
    status_code: int = 500, 
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    details: Optional[Dict] = None
) -> Dict[str, Any]:
    """Generate standardized error response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'success': False,
            'error': message,
            'code': code.value,
            'details': details or {},
            'timestamp': datetime.utcnow().isoformat()
        })
    }

def success_response(data: Any, status_code: int = 200) -> Dict[str, Any]:
    """Generate standardized success response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'success': True,
            'data': data,
            'timestamp': datetime.utcnow().isoformat()
        })
    }

def handle_exceptions(func):
    """Decorator for handling exceptions in Lambda functions"""
    @wraps(func)
    def wrapper(event, context):
        try:
            return func(event, context)
            
        except APIError as e:
            logger.error(f"API Error: {e.message}", extra={
                'error_code': e.code.value,
                'details': e.details,
                'event': event
            })
            return error_response(e.message, e.status_code, e.code, e.details)
            
        except openai.RateLimitError as e:
            logger.warning(f"OpenAI rate limit exceeded: {str(e)}")
            return error_response(
                "Rate limit exceeded. Please try again later.",
                429,
                ErrorCode.RATE_LIMIT_EXCEEDED
            )
            
        except psycopg2.Error as e:
            logger.error(f"Database error: {str(e)}", extra={'event': event})
            return error_response(
                "Database operation failed",
                500,
                ErrorCode.DATABASE_ERROR
            )
            
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}", extra={
                'traceback': traceback.format_exc(),
                'event': event
            })
            return error_response(
                "Internal server error",
                500,
                ErrorCode.INTERNAL_SERVER_ERROR
            )
    
    return wrapper
```

### Validation Utilities

```python
from pydantic import BaseModel, validator, ValidationError
from typing import Optional, List, Dict, Any
import re

class SemanticSearchRequest(BaseModel):
    query: str
    matchThreshold: Optional[float] = 0.7
    matchCount: Optional[int] = 10
    filters: Optional[Dict[str, Any]] = {}
    
    @validator('query')
    def query_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Query cannot be empty')
        if len(v) > 1000:
            raise ValueError('Query too long (max 1000 characters)')
        return v.strip()
    
    @validator('matchThreshold')
    def valid_threshold(cls, v):
        if v is not None and not (0.1 <= v <= 1.0):
            raise ValueError('Threshold must be between 0.1 and 1.0')
        return v
    
    @validator('matchCount')
    def valid_count(cls, v):
        if v is not None and not (1 <= v <= 100):
            raise ValueError('Match count must be between 1 and 100')
        return v

def validate_request(model_class):
    """Decorator for validating request data"""
    def decorator(func):
        @wraps(func)
        def wrapper(event, context):
            try:
                body = json.loads(event.get('body', '{}'))
                validated_data = model_class(**body)
                event['validated_data'] = validated_data
                return func(event, context)
                
            except json.JSONDecodeError:
                return error_response(
                    "Invalid JSON in request body",
                    400,
                    ErrorCode.VALIDATION_ERROR
                )
                
            except ValidationError as e:
                return error_response(
                    "Validation failed",
                    400,
                    ErrorCode.VALIDATION_ERROR,
                    {'validation_errors': e.errors()}
                )
        
        return wrapper
    return decorator
```

---

## Performance & Monitoring

### CloudWatch Metrics

```python
import boto3
from datetime import datetime
from typing import Dict, Any

class MetricsService:
    def __init__(self, namespace: str = 'SOC-AI/Backend'):
        self.cloudwatch = boto3.client('cloudwatch')
        self.namespace = namespace
    
    def put_metric(
        self, 
        metric_name: str, 
        value: float, 
        unit: str = 'Count',
        dimensions: Optional[Dict[str, str]] = None
    ):
        """Put custom metric to CloudWatch"""
        metric_data = {
            'MetricName': metric_name,
            'Value': value,
            'Unit': unit,
            'Timestamp': datetime.utcnow()
        }
        
        if dimensions:
            metric_data['Dimensions'] = [
                {'Name': k, 'Value': v} for k, v in dimensions.items()
            ]
        
        self.cloudwatch.put_metric_data(
            Namespace=self.namespace,
            MetricData=[metric_data]
        )
    
    def put_timer_metric(self, metric_name: str, duration: float, dimensions: Optional[Dict] = None):
        """Put timing metric"""
        self.put_metric(metric_name, duration, 'Milliseconds', dimensions)
    
    def put_counter_metric(self, metric_name: str, count: int = 1, dimensions: Optional[Dict] = None):
        """Put counter metric"""
        self.put_metric(metric_name, count, 'Count', dimensions)

# Performance monitoring decorator
def monitor_performance(metrics_service: MetricsService):
    def decorator(func):
        @wraps(func)
        def wrapper(event, context):
            start_time = time.time()
            function_name = func.__name__
            
            try:
                result = func(event, context)
                
                # Record success metrics
                duration = (time.time() - start_time) * 1000
                metrics_service.put_timer_metric(
                    f'{function_name}_duration',
                    duration,
                    {'Status': 'Success'}
                )
                metrics_service.put_counter_metric(
                    f'{function_name}_invocations',
                    dimensions={'Status': 'Success'}
                )
                
                return result
                
            except Exception as e:
                # Record error metrics
                duration = (time.time() - start_time) * 1000
                metrics_service.put_timer_metric(
                    f'{function_name}_duration',
                    duration,
                    {'Status': 'Error'}
                )
                metrics_service.put_counter_metric(
                    f'{function_name}_errors',
                    dimensions={'ErrorType': type(e).__name__}
                )
                
                raise
        
        return wrapper
    return decorator
```

### Structured Logging

```python
import json
import logging
from typing import Dict, Any, Optional
import uuid

class StructuredLogger:
    def __init__(self, service_name: str, log_level: str = 'INFO'):
        self.service_name = service_name
        self.logger = logging.getLogger(service_name)
        self.logger.setLevel(getattr(logging, log_level.upper()))
        
        # JSON formatter
        handler = logging.StreamHandler()
        handler.setFormatter(self._json_formatter)
        self.logger.addHandler(handler)
    
    def _json_formatter(self, record):
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'service': self.service_name,
            'message': record.getMessage(),
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add extra fields
        if hasattr(record, 'extra'):
            log_data.update(record.extra)
        
        return json.dumps(log_data)
    
    def info(self, message: str, extra: Optional[Dict] = None):
        self.logger.info(message, extra={'extra': extra or {}})
    
    def warning(self, message: str, extra: Optional[Dict] = None):
        self.logger.warning(message, extra={'extra': extra or {}})
    
    def error(self, message: str, extra: Optional[Dict] = None):
        self.logger.error(message, extra={'extra': extra or {}})

# Request tracing
def add_trace_id(func):
    """Add trace ID to logs for request correlation"""
    @wraps(func)
    def wrapper(event, context):
        trace_id = str(uuid.uuid4())
        event['trace_id'] = trace_id
        
        # Add to all log records
        logging.getLogger().addFilter(
            lambda record: setattr(record, 'trace_id', trace_id) or True
        )
        
        return func(event, context)
    
    return wrapper
```

---

## API Examples

### Complete Semantic Search Example

```python
# semantic_search_example.py
import asyncio
import json
from semantic_search_lambda import lambda_handler

async def example_semantic_search():
    """Example of semantic search API usage"""
    
    # Example request event
    event = {
        'httpMethod': 'POST',
        'headers': {
            'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOi...',
            'Content-Type': 'application/json'
        },
        'body': json.dumps({
            'query': 'suspicious PowerShell execution with privilege escalation',
            'matchThreshold': 0.7,
            'matchCount': 5,
            'filters': {
                'severity': ['critical', 'high'],
                'dateRange': {
                    'start': '2024-01-01T00:00:00Z',
                    'end': '2024-01-31T23:59:59Z'
                }
            }
        })
    }
    
    # Mock context
    context = type('Context', (), {
        'aws_request_id': 'test-request-id',
        'function_name': 'semantic-search-test'
    })()
    
    # Call Lambda function
    response = lambda_handler(event, context)
    
    # Parse response
    result = json.loads(response['body'])
    
    print(f"Status Code: {response['statusCode']}")
    print(f"Found {result.get('count', 0)} matches")
    
    if result.get('success'):
        for incident in result['results']:
            print(f"\nIncident: {incident['title']}")
            print(f"Similarity: {incident['similarity']:.2%}")
            print(f"Severity: {incident['severity']}")
            print(f"Description: {incident['description'][:100]}...")

if __name__ == "__main__":
    asyncio.run(example_semantic_search())
```

### Batch Alert Processing

```python
# batch_alert_processing.py
import asyncio
import json
from typing import List, Dict

async def batch_process_alerts(alerts: List[Dict]) -> Dict:
    """Process multiple alerts efficiently"""
    
    results = {
        'processed': 0,
        'errors': 0,
        'embeddings_generated': 0,
        'incidents_created': 0
    }
    
    # Group alerts by severity for prioritized processing
    severity_groups = {
        'critical': [],
        'high': [],
        'medium': [],
        'low': []
    }
    
    for alert in alerts:
        severity = alert.get('severity', 'low')
        severity_groups[severity].append(alert)
    
    # Process in priority order
    for severity in ['critical', 'high', 'medium', 'low']:
        if severity_groups[severity]:
            await process_alert_group(severity_groups[severity], severity, results)
    
    return results

async def process_alert_group(alerts: List[Dict], severity: str, results: Dict):
    """Process a group of alerts with the same severity"""
    print(f"Processing {len(alerts)} {severity} alerts...")
    
    # Parallel processing for each alert
    tasks = []
    for alert in alerts:
        task = process_single_alert(alert, results)
        tasks.append(task)
    
    # Execute with concurrency limit
    semaphore = asyncio.Semaphore(10)  # Max 10 concurrent
    
    async def bounded_task(task):
        async with semaphore:
            return await task
    
    await asyncio.gather(*[bounded_task(task) for task in tasks])

async def process_single_alert(alert: Dict, results: Dict):
    """Process individual alert"""
    try:
        # Generate embedding for semantic search
        embedding = await generate_alert_embedding(alert)
        if embedding:
            results['embeddings_generated'] += 1
        
        # Check for similar incidents
        similar_incidents = await find_similar_incidents(embedding)
        
        if similar_incidents:
            # Add to existing incident
            await add_alert_to_incident(alert, similar_incidents[0])
        else:
            # Create new incident
            await create_incident_from_alert(alert)
            results['incidents_created'] += 1
        
        results['processed'] += 1
        
    except Exception as e:
        print(f"Error processing alert {alert.get('id')}: {str(e)}")
        results['errors'] += 1

# Usage example
alerts_data = [
    {
        'id': 'alert-001',
        'title': 'Suspicious PowerShell Activity',
        'severity': 'critical',
        'description': 'Detected encoded PowerShell command execution...'
    },
    {
        'id': 'alert-002', 
        'title': 'Failed Login Attempts',
        'severity': 'medium',
        'description': 'Multiple failed login attempts from external IP...'
    }
    # ... more alerts
]

results = asyncio.run(batch_process_alerts(alerts_data))
print(f"Batch processing complete: {results}")
```

This comprehensive backend API reference covers all aspects of the AI SOC Nexus backend architecture, from Lambda functions and database operations to external integrations and performance monitoring. The examples provided demonstrate real-world usage patterns and best practices for building scalable, secure SOC automation systems.