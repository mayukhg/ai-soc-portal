# LangChain Implementation Documentation

## 🎯 Overview

This document provides comprehensive documentation of LangChain implementation in the AI-First SOC Portal. LangChain serves as the foundational framework for AI model integration, prompt management, and chain operations within the security operations center.

## 📦 Dependencies & Installation

### Frontend Dependencies (`package.json`)

```json
{
  "dependencies": {
    "langchain": "^0.3.7",
    "@langchain/community": "^0.3.15",
    "@langchain/core": "^0.3.21",
    "@langchain/openai": "^0.3.15",
    "@langchain/pinecone": "^0.1.0"
  }
}
```

### Backend Dependencies (`backend/requirements.txt`)

```txt
langchain
langchain-openai
langchain-community
langchain-pinecone
```

## 🏗️ Architecture Overview

### Core Components

1. **AI Agents**: Specialized agents using LangChain for different security analysis tasks
2. **Model Integration**: OpenAI GPT-4o-mini integration via LangChain
3. **Prompt Management**: Structured prompt templates using LangChain's PromptTemplate
4. **Vector Operations**: Pinecone integration for semantic search and embeddings
5. **Observability**: LangSmith integration for tracing and monitoring

### File Structure

```
src/lib/langgraph/agents/
├── threat-analysis-agent.ts      # LangChain-powered threat analysis
├── risk-assessment-agent.ts      # LangChain-powered risk assessment
├── correlation-agent.ts          # LangChain-powered event correlation
├── decision-making-agent.ts      # LangChain-powered decision making
├── response-generation-agent.ts  # LangChain-powered response generation
└── action-execution-agent.ts     # LangChain-powered action execution

src/lib/langsmith/
└── langsmith-service.ts          # LangChain operation tracing
```

## 🔧 Implementation Details

### 1. Model Integration

#### OpenAI GPT-4o-mini Integration

All AI agents use LangChain's `ChatOpenAI` class for consistent model integration:

```typescript
import { ChatOpenAI } from '@langchain/openai';

export class ThreatAnalysisAgent {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.1,        // Low temperature for consistent security analysis
      maxTokens: 2000,         // Sufficient tokens for detailed analysis
    });
  }
}
```

**Configuration Rationale:**
- **Model**: GPT-4o-mini for cost-effective, high-quality security analysis
- **Temperature**: 0.1 for deterministic, consistent security assessments
- **Max Tokens**: 2000 for comprehensive analysis without excessive costs

### 2. Prompt Management

#### Structured Prompt Templates

LangChain's `PromptTemplate` is used across all agents for consistent prompt management:

```typescript
import { PromptTemplate } from '@langchain/core/prompts';

export class ThreatAnalysisAgent {
  private promptTemplate: PromptTemplate;

  constructor() {
    this.promptTemplate = PromptTemplate.fromTemplate(`
You are a cybersecurity threat analysis expert. Analyze the following security data and identify potential threats.

Context Data:
- Alerts: {alerts}
- Threat Intelligence: {threat_intelligence}
- Entities: {entities}
- Incidents: {incidents}

Analysis Requirements:
1. Identify all potential threats and attack vectors
2. Determine threat severity levels
3. Identify threat actors if possible
4. Suggest mitigation strategies
5. Provide confidence scores for each assessment

Please provide a comprehensive threat analysis in JSON format with the following structure:
{{
  "threats_identified": [
    {{
      "id": "threat_1",
      "type": "malware",
      "severity": "high",
      "description": "Description of the threat",
      "indicators": ["indicator1", "indicator2"],
      "attack_phase": "execution",
      "confidence": 0.85,
      "mitigation": ["action1", "action2"]
    }}
  ],
  "threat_level": "high",
  "attack_vectors": ["vector1", "vector2"],
  "threat_actors": ["actor1", "actor2"],
  "mitigation_strategies": ["strategy1", "strategy2"],
  "confidence": 0.8,
  "reasoning_chain": ["step1", "step2", "step3"]
}}

Current Phase: {current_phase}
Request Type: {request_type}
    `);
  }
}
```

**Prompt Design Principles:**
- **Role Definition**: Clear expert persona for each agent
- **Context Injection**: Dynamic data injection via template variables
- **Structured Output**: JSON format for consistent data parsing
- **Requirements Specification**: Clear analysis requirements
- **Confidence Scoring**: Built-in uncertainty quantification

### 3. Agent Implementations

#### Threat Analysis Agent (`src/lib/langgraph/agents/threat-analysis-agent.ts`)

**Purpose**: Analyzes security threats and attack vectors using AI reasoning

**LangChain Usage**:
- `ChatOpenAI` for model integration
- `PromptTemplate` for structured prompts
- Chain execution for threat analysis workflow

**Key Features**:
- Threat identification and classification
- Attack vector analysis
- Threat actor attribution
- Mitigation strategy suggestions
- Confidence scoring

#### Risk Assessment Agent (`src/lib/langgraph/agents/risk-assessment-agent.ts`)

**Purpose**: Evaluates risk levels and potential impact using AI reasoning

**LangChain Usage**:
- `ChatOpenAI` for model integration
- `PromptTemplate` for risk assessment prompts
- Chain execution for risk evaluation workflow

**Key Features**:
- Overall risk score calculation (0-100)
- Individual risk factor identification
- Impact assessment (confidentiality, integrity, availability)
- Likelihood evaluation
- Risk mitigation recommendations

#### Correlation Agent (`src/lib/langgraph/agents/correlation-agent.ts`)

**Purpose**: Finds relationships and patterns between security events using AI reasoning

**LangChain Usage**:
- `ChatOpenAI` for model integration
- `PromptTemplate` for correlation analysis prompts
- Chain execution for pattern recognition workflow

**Key Features**:
- Temporal correlation detection
- Spatial correlation identification
- Behavioral pattern recognition
- Attribution correlation analysis
- Confidence scoring for correlations

#### Decision Making Agent (`src/lib/langgraph/agents/decision-making-agent.ts`)

**Purpose**: Makes intelligent decisions based on analysis results using AI reasoning

**LangChain Usage**:
- `ChatOpenAI` for model integration
- `PromptTemplate` for decision-making prompts
- Chain execution for decision workflow

**Key Features**:
- Threat classification and prioritization
- Response strategy determination
- Resource allocation decisions
- Escalation requirements assessment
- Decision confidence scoring

#### Response Generation Agent (`src/lib/langgraph/agents/response-generation-agent.ts`)

**Purpose**: Generates natural language responses, reports, and recommendations using AI

**LangChain Usage**:
- `ChatOpenAI` for model integration
- `PromptTemplate` for response generation prompts
- Chain execution for content generation workflow

**Key Features**:
- Natural language analysis summaries
- Executive report generation
- Alert notification creation
- Actionable recommendation provision
- Playbook suggestions

#### Action Execution Agent (`src/lib/langgraph/agents/action-execution-agent.ts`)

**Purpose**: Executes automated security actions based on decisions using AI reasoning

**LangChain Usage**:
- `ChatOpenAI` for model integration
- `PromptTemplate` for action execution prompts
- Chain execution for action workflow

**Key Features**:
- Automated action execution
- Action validation and verification
- Execution status tracking
- Error handling and recovery
- Performance monitoring

### 4. Vector Operations & Pinecone Integration

#### Pinecone Integration (`@langchain/pinecone`)

```typescript
// Vector database integration for semantic search
import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';

// Embedding generation for threat intelligence
const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-ada-002',
});

// Pinecone vector store for semantic search
const vectorStore = new PineconeStore(embeddings, {
  pineconeIndex: pineconeIndex,
  namespace: 'threat-intelligence',
});
```

**Use Cases**:
- Threat intelligence semantic search
- Security knowledge base retrieval
- Similar incident identification
- Context-aware analysis enhancement

### 5. Observability & Monitoring

#### LangSmith Integration (`src/lib/langsmith/langsmith-service.ts`)

LangChain operations are comprehensively traced and monitored:

```typescript
import { Client } from 'langsmith';

export class LangSmithService {
  private client: Client;

  constructor(config: LangSmithConfig) {
    this.client = new Client({
      apiKey: config.apiKey,
      projectName: config.projectName,
    });
  }

  // Trace LangChain operations
  async traceLangChainOperation(
    operation: string,
    input: any,
    output: any,
    metadata: TraceMetadata
  ): Promise<void> {
    await this.client.createRun({
      name: operation,
      runType: 'chain',
      inputs: input,
      outputs: output,
      metadata: metadata,
    });
  }
}
```

**Monitoring Capabilities**:
- Complete operation tracing
- Performance metrics collection
- Error tracking and debugging
- Custom metrics and evaluations
- Cost tracking and optimization

## 🔄 Workflow Integration

### LangGraph Integration

LangChain agents are orchestrated through LangGraph workflows:

```typescript
// SOC Workflow orchestration
export class SOCWorkflow {
  private threatAnalysisAgent: ThreatAnalysisAgent;
  private riskAssessmentAgent: RiskAssessmentAgent;
  // ... other agents

  constructor() {
    this.threatAnalysisAgent = new ThreatAnalysisAgent();
    this.riskAssessmentAgent = new RiskAssessmentAgent();
    // ... initialize other agents
  }

  async executeWorkflow(state: SOCState): Promise<SOCState> {
    // Execute LangChain-powered agents in sequence
    const threatAnalysis = await this.threatAnalysisAgent.analyze(state);
    const riskAssessment = await this.riskAssessmentAgent.assess(state);
    // ... continue workflow
  }
}
```

### Service Layer Integration

```typescript
// LangGraph Service integration
export class LangGraphService {
  private workflow: SOCWorkflow;
  private langSmithService?: LangSmithService;

  constructor(langSmithService?: LangSmithService) {
    this.workflow = new SOCWorkflow();
    this.langSmithService = langSmithService;
  }

  async analyzeThreats(data: AnalysisData): Promise<SOCState> {
    // Execute LangChain-powered workflow with tracing
    const result = await this.workflow.executeWorkflow(state);
    
    // Trace operation with LangSmith
    if (this.langSmithService) {
      await this.langSmithService.traceLangChainOperation(
        'threat_analysis',
        data,
        result,
        { userId: data.userId, sessionId: data.sessionId }
      );
    }
    
    return result;
  }
}
```

## 🎯 Use Cases & Applications

### 1. Threat Analysis
- **Input**: Security alerts, threat intelligence, entities, incidents
- **LangChain Process**: Structured prompt → GPT-4o-mini → JSON analysis
- **Output**: Comprehensive threat analysis with confidence scores

### 2. Risk Assessment
- **Input**: Threat analysis results, security data
- **LangChain Process**: Risk evaluation prompt → AI reasoning → Risk scores
- **Output**: Risk scores, factors, and mitigation recommendations

### 3. Event Correlation
- **Input**: Multiple security events and alerts
- **LangChain Process**: Correlation prompt → Pattern recognition → Relationships
- **Output**: Correlated events with confidence scores

### 4. Decision Making
- **Input**: Analysis results from multiple agents
- **LangChain Process**: Decision prompt → AI reasoning → Structured decisions
- **Output**: Classification, prioritization, and response strategies

### 5. Response Generation
- **Input**: Analysis results and decisions
- **LangChain Process**: Response prompt → Content generation → Structured output
- **Output**: Reports, notifications, and recommendations

### 6. Action Execution
- **Input**: Decisions and response strategies
- **LangChain Process**: Action prompt → Execution planning → Automated actions
- **Output**: Executed actions with status tracking

## 📊 Performance & Optimization

### Model Configuration
- **Temperature**: 0.1 for deterministic security analysis
- **Max Tokens**: 2000 for comprehensive analysis
- **Model**: GPT-4o-mini for cost-effective operations

### Prompt Optimization
- **Structured Templates**: Consistent prompt formatting
- **Context Injection**: Dynamic data integration
- **Output Formatting**: JSON for easy parsing
- **Role Definition**: Clear expert personas

### Monitoring & Observability
- **LangSmith Tracing**: Complete operation visibility
- **Performance Metrics**: Latency, token usage, costs
- **Error Tracking**: Comprehensive error monitoring
- **Custom Metrics**: SOC-specific performance indicators

## 🔒 Security Considerations

### Data Privacy
- **No PII in Prompts**: Sensitive data sanitization
- **Secure API Keys**: Environment variable management
- **Audit Logging**: Complete operation tracking

### Model Security
- **Prompt Injection Protection**: Input validation and sanitization
- **Output Validation**: Structured output verification
- **Confidence Scoring**: Uncertainty quantification

### Operational Security
- **Error Handling**: Graceful failure management
- **Rate Limiting**: API call management
- **Cost Controls**: Token usage monitoring

## 🚀 Future Enhancements

### Planned Improvements
1. **Multi-Model Support**: Integration with additional AI models
2. **Advanced Prompting**: Few-shot learning and chain-of-thought
3. **Custom Chains**: Specialized security analysis chains
4. **Performance Optimization**: Caching and optimization strategies
5. **Enhanced Monitoring**: Advanced analytics and insights

### Integration Opportunities
1. **Additional Vector Stores**: Chroma, Weaviate integration
2. **Tool Integration**: External security tool integration
3. **Workflow Enhancement**: Advanced workflow patterns
4. **Real-time Processing**: Streaming and real-time analysis

## 📚 References & Resources

### LangChain Documentation
- [LangChain Core Documentation](https://python.langchain.com/docs/get_started/introduction)
- [LangChain OpenAI Integration](https://python.langchain.com/docs/integrations/llms/openai)
- [LangChain Pinecone Integration](https://python.langchain.com/docs/integrations/vectorstores/pinecone)
- [LangChain Prompt Templates](https://python.langchain.com/docs/modules/model_io/prompts/)

### Related Documentation
- `lang_graph_implementation.md` - LangGraph workflow orchestration
- `langsmith_usage.md` - LangSmith observability implementation
- `techstack_usage.md` - Overall technology stack documentation

---

*This document provides comprehensive documentation of LangChain implementation in the AI-First SOC Portal. For technical support or questions, refer to the LangChain documentation or contact the development team.*
