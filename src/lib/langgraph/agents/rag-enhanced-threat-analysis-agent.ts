/**
 * RAG-Enhanced Threat Analysis Agent
 * Analyzes security threats using Retrieval-Augmented Generation (RAG) with LangChain
 * 
 * This agent combines:
 * - Vector search for relevant threat intelligence
 * - Historical incident retrieval
 * - Knowledge base augmentation
 * - AI-powered threat analysis
 */

import { SOCState, ThreatAnalysis, Threat } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';

export class RAGEnhancedThreatAnalysisAgent {
  private llm: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  private vectorStore: PineconeStore | null = null;
  private promptTemplate: PromptTemplate;
  private pineconeClient: Pinecone;

  constructor() {
    // Initialize OpenAI LLM for threat analysis
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 2000,
    });

    // Initialize OpenAI embeddings for vector operations
    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize Pinecone client for vector search
    this.pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });

    // Initialize vector store (will be set up in initializeVectorStore)
    this.initializeVectorStore();

    // Enhanced prompt template with RAG context
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
      "mitigation": ["action1", "action2"],
      "evidence_sources": ["current_alerts", "historical_incidents", "threat_intelligence"],
      "similar_incidents": ["incident_1", "incident_2"]
    }}
  ],
  "threat_level": "high",
  "attack_vectors": ["vector1", "vector2"],
  "threat_actors": ["actor1", "actor2"],
  "mitigation_strategies": ["strategy1", "strategy2"],
  "confidence": 0.8,
  "reasoning_chain": ["step1", "step2", "step3"],
  "knowledge_base_utilization": {{
    "threat_intelligence_used": 3,
    "historical_incidents_referenced": 2,
    "attack_patterns_identified": 1,
    "mitigation_strategies_applied": 2
  }}
}}

Current Phase: {current_phase}
Request Type: {request_type}
    `);
  }

  /**
   * Initialize Pinecone vector store for RAG operations
   */
  private async initializeVectorStore(): Promise<void> {
    try {
      const pineconeIndex = this.pineconeClient.index(
        process.env.PINECONE_INDEX_NAME || 'soc-threat-intelligence'
      );

      this.vectorStore = new PineconeStore(this.embeddings, {
        pineconeIndex: pineconeIndex,
        namespace: 'threat-analysis',
      });

      console.log('✅ RAG-Enhanced Threat Analysis Agent: Vector store initialized');
    } catch (error) {
      console.error('❌ Failed to initialize vector store:', error);
      this.vectorStore = null;
    }
  }

  /**
   * Retrieve relevant context from knowledge base using vector search
   */
  private async retrieveRelevantContext(query: string): Promise<{
    threatIntelligence: string[];
    similarIncidents: string[];
    attackPatterns: string[];
    mitigationStrategies: string[];
  }> {
    if (!this.vectorStore) {
      console.warn('⚠️ Vector store not available, skipping retrieval');
      return {
        threatIntelligence: [],
        similarIncidents: [],
        attackPatterns: [],
        mitigationStrategies: [],
      };
    }

    try {
      // Perform vector search for relevant documents
      const searchResults = await this.vectorStore.similaritySearch(query, 10);

      // Categorize results based on metadata or content
      const threatIntelligence: string[] = [];
      const similarIncidents: string[] = [];
      const attackPatterns: string[] = [];
      const mitigationStrategies: string[] = [];

      searchResults.forEach((doc) => {
        const content = doc.pageContent;
        const metadata = doc.metadata;

        // Categorize based on metadata type or content analysis
        if (metadata.type === 'threat_intelligence' || content.includes('threat intelligence')) {
          threatIntelligence.push(content);
        } else if (metadata.type === 'incident' || content.includes('incident')) {
          similarIncidents.push(content);
        } else if (metadata.type === 'attack_pattern' || content.includes('attack pattern')) {
          attackPatterns.push(content);
        } else if (metadata.type === 'mitigation' || content.includes('mitigation')) {
          mitigationStrategies.push(content);
        }
      });

      console.log(`📚 Retrieved context: ${threatIntelligence.length} TI, ${similarIncidents.length} incidents, ${attackPatterns.length} patterns, ${mitigationStrategies.length} mitigations`);

      return {
        threatIntelligence,
        similarIncidents,
        attackPatterns,
        mitigationStrategies,
      };
    } catch (error) {
      console.error('❌ Error retrieving context:', error);
      return {
        threatIntelligence: [],
        similarIncidents: [],
        attackPatterns: [],
        mitigationStrategies: [],
      };
    }
  }

  /**
   * Generate search query from current security data for context retrieval
   */
  private generateSearchQuery(state: SOCState): string {
    const queryParts: string[] = [];

    // Extract key terms from alerts
    if (state.alerts && state.alerts.length > 0) {
      const alertTypes = state.alerts.map(alert => alert.type).join(' ');
      const alertDescriptions = state.alerts.map(alert => alert.description).join(' ');
      queryParts.push(`security alerts: ${alertTypes} ${alertDescriptions}`);
    }

    // Extract key terms from threat intelligence
    if (state.threat_intelligence && state.threat_intelligence.length > 0) {
      const indicators = state.threat_intelligence.map(ti => ti.indicator).join(' ');
      const descriptions = state.threat_intelligence.map(ti => ti.description).join(' ');
      queryParts.push(`threat intelligence: ${indicators} ${descriptions}`);
    }

    // Extract key terms from entities
    if (state.entities && state.entities.length > 0) {
      const entityTypes = state.entities.map(entity => entity.type).join(' ');
      queryParts.push(`entities: ${entityTypes}`);
    }

    // Extract key terms from incidents
    if (state.incidents && state.incidents.length > 0) {
      const incidentTitles = state.incidents.map(incident => incident.title).join(' ');
      queryParts.push(`incidents: ${incidentTitles}`);
    }

    return queryParts.join(' ');
  }

  /**
   * Analyze threats using RAG-enhanced approach
   */
  async analyze(state: SOCState): Promise<Partial<SOCState>> {
    try {
      console.log('🔍 RAG-Enhanced Threat Analysis Agent: Starting analysis...');
      
      const startTime = Date.now();
      
      // Generate search query from current security data
      const searchQuery = this.generateSearchQuery(state);
      console.log(`🔍 Search query: ${searchQuery}`);

      // Retrieve relevant context from knowledge base
      const retrievedContext = await this.retrieveRelevantContext(searchQuery);

      // Prepare context data for LLM
      const contextData = {
        alerts: JSON.stringify(state.alerts, null, 2),
        threat_intelligence: JSON.stringify(state.threat_intelligence, null, 2),
        entities: JSON.stringify(state.entities, null, 2),
        incidents: JSON.stringify(state.incidents, null, 2),
        retrieved_threat_intelligence: JSON.stringify(retrievedContext.threatIntelligence, null, 2),
        similar_incidents: JSON.stringify(retrievedContext.similarIncidents, null, 2),
        attack_patterns: JSON.stringify(retrievedContext.attackPatterns, null, 2),
        mitigation_strategies: JSON.stringify(retrievedContext.mitigationStrategies, null, 2),
        current_phase: state.current_phase,
        request_type: state.request_type,
      };

      // Generate analysis using LLM with retrieved context
      const prompt = await this.promptTemplate.format(contextData);
      const response = await this.llm.invoke(prompt);
      
      // Parse the response
      const analysisResult = this.parseThreatAnalysis(response.content as string);
      
      const duration = Date.now() - startTime;
      console.log(`🔍 RAG-Enhanced Threat Analysis Agent: Completed in ${duration}ms`);
      
      return {
        ...analysisResult,
        current_phase: 'risk_assessment',
        phase_durations: {
          ...state.phase_durations,
          threat_analysis: duration,
        },
        confidence_scores: {
          ...state.confidence_scores,
          threat_analysis: analysisResult.threat_analysis?.confidence || 0,
        },
        // Add RAG-specific metadata
        rag_metadata: {
          search_query: searchQuery,
          retrieved_documents: {
            threat_intelligence_count: retrievedContext.threatIntelligence.length,
            similar_incidents_count: retrievedContext.similarIncidents.length,
            attack_patterns_count: retrievedContext.attackPatterns.length,
            mitigation_strategies_count: retrievedContext.mitigationStrategies.length,
          },
          retrieval_timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ RAG-Enhanced Threat Analysis Agent Error:', error);
      return {
        errors: [...(state.errors || []), `RAG-Enhanced Threat Analysis Error: ${error}`],
        current_phase: 'error',
      };
    }
  }

  /**
   * Parse LLM response into structured threat analysis
   */
  private parseThreatAnalysis(response: string): Partial<SOCState> {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysisData = JSON.parse(jsonMatch[0]);
      
      return {
        threat_analysis: {
          threats_identified: analysisData.threats_identified || [],
          threat_level: analysisData.threat_level || 'medium',
          attack_vectors: analysisData.attack_vectors || [],
          threat_actors: analysisData.threat_actors || [],
          mitigation_strategies: analysisData.mitigation_strategies || [],
          confidence: analysisData.confidence || 0,
          reasoning_chain: analysisData.reasoning_chain || [],
          knowledge_base_utilization: analysisData.knowledge_base_utilization || {},
        } as ThreatAnalysis,
      };
    } catch (error) {
      console.error('❌ Error parsing threat analysis response:', error);
      return {
        errors: [`Threat Analysis Parsing Error: ${error}`],
      };
    }
  }

  /**
   * Add new documents to the knowledge base for future retrieval
   */
  async addToKnowledgeBase(
    documents: Array<{
      content: string;
      metadata: {
        type: 'threat_intelligence' | 'incident' | 'attack_pattern' | 'mitigation';
        source: string;
        timestamp: string;
        [key: string]: any;
      };
    }>
  ): Promise<void> {
    if (!this.vectorStore) {
      console.warn('⚠️ Vector store not available, cannot add documents');
      return;
    }

    try {
      await this.vectorStore.addDocuments(documents);
      console.log(`📚 Added ${documents.length} documents to knowledge base`);
    } catch (error) {
      console.error('❌ Error adding documents to knowledge base:', error);
    }
  }

  /**
   * Update existing documents in the knowledge base
   */
  async updateKnowledgeBase(
    documentIds: string[],
    updatedDocuments: Array<{
      content: string;
      metadata: {
        type: 'threat_intelligence' | 'incident' | 'attack_pattern' | 'mitigation';
        source: string;
        timestamp: string;
        [key: string]: any;
      };
    }>
  ): Promise<void> {
    if (!this.vectorStore) {
      console.warn('⚠️ Vector store not available, cannot update documents');
      return;
    }

    try {
      // Delete old documents
      await this.vectorStore.delete({ ids: documentIds });
      
      // Add updated documents
      await this.vectorStore.addDocuments(updatedDocuments);
      
      console.log(`📚 Updated ${documentIds.length} documents in knowledge base`);
    } catch (error) {
      console.error('❌ Error updating knowledge base:', error);
    }
  }
}
