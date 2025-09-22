# RAG Implementation Documentation

## 🎯 Overview

This document provides comprehensive documentation of the Retrieval-Augmented Generation (RAG) implementation in the AI-First SOC Portal. RAG enhances AI agents with contextual knowledge retrieval, enabling more accurate and informed security analysis through access to historical incidents, threat intelligence, and mitigation strategies.

## 📦 Dependencies & Installation

### Frontend Dependencies (`package.json`)

```json
{
  "dependencies": {
    "@langchain/openai": "^0.3.15",
    "@langchain/pinecone": "^0.1.0",
    "@langchain/core": "^0.3.21",
    "@pinecone-database/pinecone": "^3.0.0",
    "langchain": "^0.3.7"
  }
}
```

### Backend Dependencies (`backend/requirements.txt`)

```txt
pinecone-client
openai
langchain
langchain-openai
langchain-pinecone
```

## 🏗️ Architecture Overview

### Core Components

1. **RAG Service**: Core service for knowledge base management and retrieval
2. **RAG-Enhanced Agents**: LangChain agents with retrieval capabilities
3. **Vector Store**: Pinecone integration for semantic search
4. **Knowledge Base**: Document storage and management
5. **React Integration**: Frontend components and hooks

### File Structure

```
src/lib/rag/
├── rag-service.ts                    # Core RAG service implementation

src/lib/langgraph/agents/
├── rag-enhanced-threat-analysis-agent.ts  # RAG-powered threat analysis

src/hooks/
├── useRAG.ts                        # React hook for RAG operations

src/components/
├── RAGDashboard.tsx                  # RAG management dashboard

backend/lambda/
├── semantic_search.py               # Existing semantic search (enhanced)

backend/scripts/
├── ingest_to_pinecone.py           # Document ingestion script
```

## 🔧 Implementation Details

### 1. RAG Service (`src/lib/rag/rag-service.ts`)

The core RAG service provides comprehensive knowledge base management and retrieval capabilities.

#### Key Features:

- **Document Ingestion**: Add documents to knowledge base with metadata
- **Semantic Search**: Vector-based similarity search
- **Context Retrieval**: Retrieve relevant context for AI agents
- **Knowledge Base Management**: Update, delete, and manage documents
- **Caching**: Performance optimization with intelligent caching

#### Configuration:

```typescript
export interface RAGConfig {
  pineconeApiKey: string;
  pineconeEnvironment: string;
  pineconeIndexName: string;
  openaiApiKey: string;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  maxRetrievalResults: number;
  similarityThreshold: number;
  enableCaching: boolean;
  cacheExpirationHours: number;
}
```

#### Document Structure:

```typescript
export interface RAGDocument {
  id: string;
  content: string;
  metadata: {
    type: 'threat_intelligence' | 'incident' | 'attack_pattern' | 'mitigation' | 'playbook' | 'knowledge_base';
    source: string;
    timestamp: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    category?: string;
    confidence?: number;
    [key: string]: any;
  };
}
```

### 2. RAG-Enhanced Threat Analysis Agent

#### Purpose
Enhanced threat analysis using retrieval-augmented generation to provide context-aware security analysis.

#### Key Features:

- **Context Retrieval**: Automatically retrieves relevant threat intelligence and historical incidents
- **Knowledge Base Integration**: Leverages comprehensive security knowledge base
- **Evidence-Based Analysis**: Provides analysis with supporting evidence from knowledge base
- **Confidence Scoring**: Enhanced confidence based on available evidence

#### Implementation:

```typescript
export class RAGEnhancedThreatAnalysisAgent {
  private llm: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  private vectorStore: PineconeStore | null = null;
  private promptTemplate: PromptTemplate;

  constructor() {
    // Initialize OpenAI LLM
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 2000,
    });

    // Initialize embeddings
    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
    });

    // Initialize vector store
    this.initializeVectorStore();
  }

  async analyze(state: SOCState): Promise<Partial<SOCState>> {
    // 1. Generate search query from security data
    const searchQuery = this.generateSearchQuery(state);
    
    // 2. Retrieve relevant context
    const retrievedContext = await this.retrieveRelevantContext(searchQuery);
    
    // 3. Generate analysis with retrieved context
    const analysisResult = await this.generateAnalysis(state, retrievedContext);
    
    return analysisResult;
  }
}
```

#### Enhanced Prompt Template:

```typescript
this.promptTemplate = PromptTemplate.fromTemplate(`
You are a cybersecurity threat analysis expert with access to comprehensive threat intelligence and historical incident data.

CURRENT SECURITY DATA:
- Alerts: {alerts}
- Threat Intelligence: {threat_intelligence}
- Entities: {entities}
- Incidents: {incidents}

RETRIEVED CONTEXT FROM KNOWLEDGE BASE:
- Relevant Threat Intelligence: {retrieved_threat_intelligence}
- Similar Historical Incidents: {similar_incidents}
- Related Attack Patterns: {attack_patterns}
- Mitigation Strategies: {mitigation_strategies}

ANALYSIS REQUIREMENTS:
1. Analyze current threats using both current data and retrieved context
2. Identify patterns from historical incidents
3. Leverage threat intelligence for enhanced analysis
4. Provide evidence-based threat assessments
5. Suggest proven mitigation strategies from knowledge base
6. Calculate confidence scores based on available evidence
`);
```

### 3. React Integration (`src/hooks/useRAG.ts`)

#### Purpose
React hook providing RAG operations for frontend components.

#### Key Features:

- **Document Search**: Semantic search with filtering options
- **Context Retrieval**: Retrieve context for AI agents
- **Knowledge Base Management**: Add, update, delete documents
- **Performance Monitoring**: Track search performance and accuracy
- **Error Handling**: Comprehensive error handling and user feedback

#### Usage:

```typescript
const {
  isInitialized,
  isLoading,
  error,
  searchResults,
  knowledgeBaseStats,
  searchDocuments,
  retrieveContextForAnalysis,
  ingestDocuments,
  updateDocument,
  deleteDocument,
} = useRAG({
  enableAutoRetrieval: true,
  defaultMaxResults: 10,
  defaultSimilarityThreshold: 0.7,
});

// Search documents
const results = await searchDocuments('malware incident response', {
  type: 'playbook',
  maxResults: 5,
  similarityThreshold: 0.8,
});

// Retrieve context for AI agents
const context = await retrieveContextForAnalysis({
  alerts: currentAlerts,
  threatIntelligence: currentTI,
  entities: currentEntities,
  incidents: currentIncidents,
});
```

### 4. RAG Dashboard (`src/components/RAGDashboard.tsx`)

#### Purpose
Comprehensive dashboard for managing RAG operations and knowledge base.

#### Key Features:

- **Search Interface**: Advanced search with filtering options
- **Document Management**: Add, edit, delete documents
- **Performance Analytics**: Monitor search performance and accuracy
- **Knowledge Base Stats**: View knowledge base statistics
- **Real-time Updates**: Live updates of search results and stats

#### Components:

1. **Search Tab**: Document search with advanced filtering
2. **Manage Tab**: Document management operations
3. **Analytics Tab**: Performance metrics and analytics

### 5. Vector Store Integration

#### Pinecone Configuration:

```typescript
// Initialize Pinecone client
this.pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Initialize vector store
const pineconeIndex = this.pineconeClient.index(
  process.env.PINECONE_INDEX_NAME || 'soc-knowledge-base'
);

this.vectorStore = new PineconeStore(this.embeddings, {
  pineconeIndex: pineconeIndex,
  namespace: 'soc-knowledge-base',
});
```

#### Embedding Generation:

```typescript
// OpenAI embeddings for vector operations
this.embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-3-small',
  openAIApiKey: process.env.OPENAI_API_KEY,
});
```

## 🔄 Workflow Integration

### 1. LangGraph Integration

RAG-enhanced agents integrate seamlessly with LangGraph workflows:

```typescript
// SOC Workflow with RAG integration
export class SOCWorkflow {
  private ragEnhancedThreatAnalysisAgent: RAGEnhancedThreatAnalysisAgent;
  private ragService: RAGService;

  constructor() {
    this.ragEnhancedThreatAnalysisAgent = new RAGEnhancedThreatAnalysisAgent();
    this.ragService = new RAGService(ragConfig);
  }

  async executeWorkflow(state: SOCState): Promise<SOCState> {
    // Execute RAG-enhanced threat analysis
    const threatAnalysis = await this.ragEnhancedThreatAnalysisAgent.analyze(state);
    
    // Continue with other agents...
    return updatedState;
  }
}
```

### 2. Service Layer Integration

```typescript
// LangGraph Service with RAG
export class LangGraphService {
  private ragService: RAGService;

  constructor() {
    this.ragService = new RAGService(ragConfig);
  }

  async analyzeThreats(data: AnalysisData): Promise<SOCState> {
    // Retrieve context using RAG
    const context = await this.ragService.retrieveContextForAnalysis({
      alerts: data.alerts,
      threatIntelligence: data.threatIntelligence,
      entities: data.entities,
      incidents: data.incidents,
    });

    // Execute workflow with enhanced context
    const result = await this.workflow.executeWorkflow(state);
    
    return result;
  }
}
```

## 🎯 Use Cases & Applications

### 1. Enhanced Threat Analysis
- **Input**: Current security alerts, threat intelligence, entities, incidents
- **RAG Process**: Retrieve relevant historical incidents and threat intelligence
- **Output**: Context-aware threat analysis with evidence-based assessments

### 2. Incident Response
- **Input**: New security incident
- **RAG Process**: Retrieve similar historical incidents and response playbooks
- **Output**: Proven response strategies and lessons learned

### 3. Risk Assessment
- **Input**: Current security posture
- **RAG Process**: Retrieve relevant risk factors and mitigation strategies
- **Output**: Comprehensive risk assessment with historical context

### 4. Threat Intelligence Correlation
- **Input**: New threat indicators
- **RAG Process**: Retrieve related threat intelligence and attack patterns
- **Output**: Correlated threat intelligence with context

### 5. Playbook Recommendations
- **Input**: Security incident type and severity
- **RAG Process**: Retrieve relevant playbooks and response procedures
- **Output**: Recommended playbooks with success metrics

## 📊 Performance & Optimization

### 1. Caching Strategy
- **Query Caching**: Cache search results for repeated queries
- **Embedding Caching**: Cache generated embeddings
- **Context Caching**: Cache retrieved context for similar scenarios

### 2. Vector Search Optimization
- **Similarity Threshold**: Configurable threshold for relevance filtering
- **Max Results**: Limit results to prevent information overload
- **Namespace Separation**: Organize documents by type and category

### 3. Performance Metrics
- **Search Latency**: Average time for document retrieval
- **Relevance Score**: Accuracy of retrieved documents
- **Cache Hit Rate**: Effectiveness of caching strategy
- **Knowledge Base Health**: Document freshness and coverage

## 🔒 Security Considerations

### 1. Data Privacy
- **Document Sanitization**: Remove sensitive information before ingestion
- **Access Control**: Implement proper access controls for knowledge base
- **Audit Logging**: Track all knowledge base operations

### 2. API Security
- **API Key Management**: Secure storage of API keys
- **Rate Limiting**: Implement rate limiting for API calls
- **Input Validation**: Validate all inputs to prevent injection attacks

### 3. Vector Store Security
- **Namespace Isolation**: Separate namespaces for different data types
- **Access Permissions**: Implement proper access controls
- **Data Encryption**: Encrypt sensitive documents

## 🚀 Future Enhancements

### Planned Improvements
1. **Multi-Model Support**: Integration with additional embedding models
2. **Advanced Retrieval**: Hybrid search combining semantic and keyword search
3. **Real-time Updates**: Live updates of knowledge base
4. **Performance Analytics**: Advanced analytics and insights
5. **Automated Ingestion**: Automated document ingestion from various sources

### Integration Opportunities
1. **External Knowledge Sources**: Integration with external threat intelligence feeds
2. **Document Processing**: Advanced document processing and chunking
3. **Multi-language Support**: Support for multiple languages
4. **Advanced Analytics**: Machine learning-based relevance scoring

## 📚 Configuration & Environment Variables

### Required Environment Variables

```bash
# Pinecone Configuration
REACT_APP_PINECONE_API_KEY=your_pinecone_api_key
REACT_APP_PINECONE_ENVIRONMENT=your_pinecone_environment
REACT_APP_PINECONE_INDEX_NAME=soc-knowledge-base

# OpenAI Configuration
REACT_APP_OPENAI_API_KEY=your_openai_api_key

# RAG Configuration
REACT_APP_RAG_CHUNK_SIZE=1000
REACT_APP_RAG_CHUNK_OVERLAP=200
REACT_APP_RAG_MAX_RESULTS=10
REACT_APP_RAG_SIMILARITY_THRESHOLD=0.7
REACT_APP_RAG_CACHE_ENABLED=true
REACT_APP_RAG_CACHE_EXPIRATION_HOURS=24
```

### Default Knowledge Base

The system initializes with default SOC documents:

1. **Malware Incident Response Playbook**
2. **Phishing Indicators**
3. **Lateral Movement Attack Pattern**
4. **Common Mitigation Strategies**

## 🔧 Usage Examples

### 1. Basic Document Search

```typescript
const ragService = new RAGService(config);

// Search for malware-related documents
const results = await ragService.searchDocuments('malware incident response', {
  type: 'playbook',
  maxResults: 5,
  similarityThreshold: 0.8,
});
```

### 2. Context Retrieval for AI Agents

```typescript
// Retrieve context for threat analysis
const context = await ragService.retrieveContextForAnalysis({
  alerts: [
    { type: 'malware', severity: 'high', description: 'Suspicious executable detected' }
  ],
  threatIntelligence: [
    { indicator: 'malware_hash_123', type: 'hash', threat_level: 'high' }
  ],
  entities: [
    { type: 'host', name: 'workstation-01' }
  ],
  incidents: [
    { title: 'Malware Incident', severity: 'high' }
  ]
});
```

### 3. Document Management

```typescript
// Add new document to knowledge base
const document: RAGDocument = {
  id: 'new_playbook_001',
  content: 'Incident Response Procedure: 1. Contain 2. Investigate 3. Eradicate 4. Recover',
  metadata: {
    type: 'playbook',
    source: 'security_team',
    timestamp: new Date().toISOString(),
    severity: 'high',
    tags: ['incident-response', 'malware'],
  },
};

await ragService.ingestDocuments([document]);
```

### 4. React Component Integration

```typescript
function ThreatAnalysisComponent() {
  const { retrieveContextForAnalysis, isLoading } = useRAG();

  const handleAnalysis = async (securityData) => {
    const context = await retrieveContextForAnalysis(securityData);
    // Use context for enhanced analysis
  };

  return (
    <div>
      {/* Component implementation */}
    </div>
  );
}
```

## 📈 Monitoring & Analytics

### 1. Performance Metrics
- **Search Latency**: Time taken for document retrieval
- **Relevance Score**: Accuracy of retrieved documents
- **Cache Hit Rate**: Effectiveness of caching
- **Knowledge Base Coverage**: Document distribution by type

### 2. Usage Analytics
- **Search Patterns**: Most common search queries
- **Document Access**: Most accessed documents
- **Agent Utilization**: RAG usage by different agents
- **Performance Trends**: Performance over time

### 3. Health Monitoring
- **Knowledge Base Health**: Document freshness and coverage
- **Vector Store Status**: Pinecone index health
- **API Status**: OpenAI API availability and performance
- **Error Rates**: Failed operations and error patterns

## 📚 References & Resources

### RAG Documentation
- [LangChain RAG Documentation](https://python.langchain.com/docs/use_cases/question_answering/)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [OpenAI Embeddings Documentation](https://platform.openai.com/docs/guides/embeddings)

### Related Documentation
- `langchain_implementation.md` - LangChain implementation details
- `lang_graph_implementation.md` - LangGraph workflow orchestration
- `langsmith_usage.md` - LangSmith observability implementation

---

*This document provides comprehensive documentation of RAG implementation in the AI-First SOC Portal. For technical support or questions, refer to the LangChain documentation or contact the development team.*
