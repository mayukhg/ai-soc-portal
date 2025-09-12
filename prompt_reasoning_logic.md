# Prompt/Reasoning Logic Implementation

## 🧠 **Prompt/Reasoning Logic Implementation**

### **1. Multi-Agent Prompt Architecture**

The system implements a sophisticated **multi-agent prompt architecture** using LangGraph, where each agent has specialized prompts for different reasoning tasks:

#### **🔍 Threat Analysis Agent**
```typescript
// Specialized prompt for threat analysis
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
`);
```

#### **🎯 Decision Making Agent**
```typescript
// Specialized prompt for decision making
this.promptTemplate = PromptTemplate.fromTemplate(`
You are a cybersecurity decision-making expert. Make intelligent decisions based on analysis results.

Decision Requirements:
1. Classify threats by type, severity, and attack phase
2. Prioritize risks based on impact and likelihood
3. Determine appropriate response strategy
4. Allocate resources efficiently
5. Decide on escalation requirements
6. Provide confidence scores for each decision
`);
```

### **2. Structured Reasoning Patterns**

#### **📋 Structured Output Format**
Each agent uses **structured JSON output** with predefined schemas:

```typescript
// Example: Threat Analysis Output Structure
{
  "threats_identified": [
    {
      "id": "threat_1",
      "type": "malware",
      "severity": "high",
      "description": "Description of the threat",
      "indicators": ["indicator1", "indicator2"],
      "attack_phase": "execution",
      "confidence": 0.85,
      "mitigation": ["action1", "action2"]
    }
  ],
  "threat_level": "high",
  "attack_vectors": ["vector1", "vector2"],
  "threat_actors": ["actor1", "actor2"],
  "mitigation_strategies": ["strategy1", "strategy2"],
  "confidence": 0.8,
  "reasoning_chain": ["step1", "step2", "step3"]
}
```

#### **🔗 Reasoning Chain Tracking**
The system tracks **reasoning chains** for explainability:

```typescript
// Each agent maintains reasoning chains
reasoning_chains: {
  ...state.reasoning_chains,
  threat_analysis: analysisResult.reasoning_chain,
}
```

### **3. Context-Aware Prompt Engineering**

#### **📊 Dynamic Context Injection**
Prompts dynamically inject relevant context based on the current state:

```typescript
// Context data preparation
const contextData = {
  alerts: JSON.stringify(state.alerts, null, 2),
  threat_intelligence: JSON.stringify(state.threat_intelligence, null, 2),
  entities: JSON.stringify(state.entities, null, 2),
  incidents: JSON.stringify(state.incidents, null, 2),
  current_phase: state.current_phase,
  request_type: state.request_type,
};
```

#### **🎛️ Temperature and Token Control**
Different agents use optimized LLM parameters:

```typescript
// Threat Analysis: Low temperature for consistency
this.llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.1,  // Low temperature for consistent analysis
  maxTokens: 2000,
});

// Response Generation: Higher temperature for creativity
this.llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.3,  // Higher temperature for natural language
  maxTokens: 3000,
});
```

### **4. Multi-Phase Reasoning Pipeline**

#### **🔄 Sequential Reasoning Flow**
The system implements a **sequential reasoning pipeline**:

```typescript
// From ai_reasoning_pseudocode.md
class AIReasoningPipeline:
    async def process_reasoning_request(self, contextualized_data, request_type="analysis"):
        # Phase 1: Context Analysis
        context_analysis = await self.analyze_context(contextualized_data)
        
        # Phase 2: Reasoning Processing
        reasoning_results = await self.perform_reasoning(context_analysis, request_type)
        
        # Phase 3: Decision Making
        decisions = await self.make_decisions(reasoning_results)
        
        # Phase 4: Response Generation
        responses = await self.generate_responses(decisions, request_type)
        
        # Phase 5: Action Execution (if applicable)
        if request_type in ["automated_response", "playbook_execution"]:
            execution_results = await self.execute_actions(responses)
```

### **5. Confidence-Based Reasoning**

#### **📈 Confidence Scoring**
Each reasoning step includes confidence scoring:

```typescript
confidence_scores: {
  ...state.confidence_scores,
  threat_analysis: analysisResult.confidence,
  risk_prioritization: this.calculateRiskPrioritizationConfidence(decisionResult.risk_prioritization),
  response_strategy: decisionResult.response_strategy?.confidence || 0,
}
```

#### **🎯 Conditional Reasoning**
The system uses **conditional edges** for intelligent flow control:

```typescript
// Conditional reasoning based on confidence and context
private shouldContinueToRiskAssessment(state: SOCState): string {
  if (state.threat_analysis?.confidence > 0.7) {
    return 'risk_assessment';
  } else if (state.threat_analysis?.confidence > 0.4) {
    return 'correlation_analysis';
  } else {
    return 'end';
  }
}
```

### **6. Error Handling and Fallback Reasoning**

#### **🛡️ Robust Error Handling**
Each agent includes comprehensive error handling:

```typescript
try {
  // Generate analysis using LLM
  const prompt = await this.promptTemplate.format(contextData);
  const response = await this.llm.invoke(prompt);
  
  // Parse the response
  const analysisResult = this.parseAnalysisResponse(response.content as string);
  
  return {
    threat_analysis: analysisResult,
    current_phase: 'reasoning',
    // ... other state updates
  };
} catch (error) {
  console.error('❌ Threat Analysis Agent Error:', error);
  return {
    errors: [...(state.errors || []), `Threat Analysis Error: ${error}`],
    current_phase: 'error',
  };
}
```

#### **🔄 Fallback Reasoning**
When parsing fails, the system provides fallback responses:

```typescript
// Return default analysis if parsing fails
return {
  threats_identified: [],
  threat_level: 'low',
  attack_vectors: [],
  threat_actors: [],
  mitigation_strategies: [],
  confidence: 0.0,
  reasoning_chain: ['Failed to parse analysis response'],
};
```

### **7. Evaluation and Monitoring**

#### **📊 Reasoning Quality Assessment**
The evaluation harness measures reasoning quality:

```typescript
export interface HallucinationMetrics {
  hallucinationRate: number;
  factualErrors: number;
  contradictoryStatements: number;
  inventedFacts: number;
  totalStatements: number;
  hallucinationTypes: Record<string, number>;
  confidenceScores: number[];
  avgConfidenceScore: number;
}
```

#### **⏱️ Performance Monitoring**
The system tracks reasoning performance:

```typescript
phase_durations: {
  ...state.phase_durations,
  threat_analysis: duration,
  decision_making: duration,
  response_generation: duration,
}
```

## 🎯 **Key Features of the Prompt/Reasoning Implementation**

1. **🎭 Role-Based Prompts**: Each agent has specialized prompts for their domain expertise
2. **📋 Structured Output**: Consistent JSON schemas for reliable parsing
3. **🔗 Reasoning Chains**: Trackable reasoning steps for explainability
4. **📊 Confidence Scoring**: Quantitative confidence measures for each reasoning step
5. **🔄 Conditional Flow**: Intelligent routing based on reasoning results
6. **🛡️ Error Resilience**: Comprehensive error handling and fallback mechanisms
7. **📈 Performance Tracking**: Monitoring of reasoning speed and quality
8. **🎛️ Optimized Parameters**: Tailored LLM settings for different reasoning tasks

## 📁 **Implementation Files**

### **Core Agent Files**
- `src/lib/langgraph/agents/threat-analysis-agent.ts` - Threat analysis reasoning
- `src/lib/langgraph/agents/risk-assessment-agent.ts` - Risk assessment reasoning
- `src/lib/langgraph/agents/correlation-agent.ts` - Correlation analysis reasoning
- `src/lib/langgraph/agents/decision-making-agent.ts` - Decision making reasoning
- `src/lib/langgraph/agents/response-generation-agent.ts` - Response generation reasoning

### **Supporting Files**
- `src/lib/langgraph/types.ts` - Type definitions for reasoning state
- `src/lib/langgraph/soc-workflow.ts` - Workflow orchestration
- `src/lib/langgraph/langgraph-service.ts` - Service layer
- `src/lib/evaluation/evaluation-harness.ts` - Reasoning quality evaluation

### **Documentation Files**
- `ai_reasoning_pseudocode.md` - Original reasoning pipeline design
- `lang_graph_implementation.md` - LangGraph implementation details
- `prompt_reasoning_logic.md` - This file (prompt/reasoning documentation)

## 🚀 **Usage Examples**

### **Basic Threat Analysis**
```typescript
const workflow = new SOCWorkflow();
const result = await workflow.executeWorkflow({
  alerts: [/* security alerts */],
  threat_intelligence: [/* threat intel */],
  request_type: 'threat_analysis'
});
```

### **Custom Reasoning Chain**
```typescript
// The system automatically follows the reasoning chain:
// 1. Threat Analysis → 2. Risk Assessment → 3. Decision Making → 4. Response Generation
const analysisResult = await threatAnalysisAgent.analyze(state);
const riskResult = await riskAssessmentAgent.assess(state);
const decisionResult = await decisionMakingAgent.makeDecisions(state);
const responseResult = await responseGenerationAgent.generateResponses(state);
```

## 🔧 **Configuration**

### **LLM Configuration**
```typescript
// Different agents use different configurations
const threatAnalysisConfig = {
  modelName: 'gpt-4o-mini',
  temperature: 0.1,  // Low for consistency
  maxTokens: 2000
};

const responseGenerationConfig = {
  modelName: 'gpt-4o-mini',
  temperature: 0.3,  // Higher for creativity
  maxTokens: 3000
};
```

### **Evaluation Configuration**
```typescript
const evaluationConfig = {
  enableAccuracyTesting: true,
  enableLatencyTesting: true,
  enableHallucinationDetection: true,
  testDatasetSize: 1000,
  maxConcurrentTests: 10,
  timeoutMs: 30000,
  retryAttempts: 3
};
```

This implementation provides a **robust, explainable, and scalable** reasoning system that can handle complex cybersecurity analysis tasks while maintaining high quality and reliability.
