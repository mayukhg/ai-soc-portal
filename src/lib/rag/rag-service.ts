/**
 * RAG Service
 * Comprehensive Retrieval-Augmented Generation service for SOC operations
 * 
 * This service provides:
 * - Knowledge base management
 * - Document ingestion and processing
 * - Vector search and retrieval
 * - Context augmentation for AI agents
 * - Integration with LangChain workflows
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from '@langchain/core/documents';
import { Logger } from '../data-ingestion/utils/logger';

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

export interface RAGSearchResult {
  document: RAGDocument;
  similarity: number;
  relevanceScore: number;
}

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

export class RAGService {
  private logger: Logger;
  private config: RAGConfig;
  private embeddings: OpenAIEmbeddings;
  private vectorStore: PineconeStore | null = null;
  private pineconeClient: Pinecone;
  private cache: Map<string, { results: RAGSearchResult[]; timestamp: number }> = new Map();

  constructor(config: RAGConfig) {
    this.logger = new Logger('RAGService');
    this.config = config;

    // Initialize OpenAI embeddings
    this.embeddings = new OpenAIEmbeddings({
      modelName: config.embeddingModel,
      openAIApiKey: config.openaiApiKey,
    });

    // Initialize Pinecone client
    this.pineconeClient = new Pinecone({
      apiKey: config.pineconeApiKey,
    });

    this.initializeVectorStore();
  }

  /**
   * Initialize Pinecone vector store
   */
  private async initializeVectorStore(): Promise<void> {
    try {
      const pineconeIndex = this.pineconeClient.index(this.config.pineconeIndexName);

      this.vectorStore = new PineconeStore(this.embeddings, {
        pineconeIndex: pineconeIndex,
        namespace: 'soc-knowledge-base',
      });

      this.logger.info('Vector store initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize vector store', { error });
      this.vectorStore = null;
    }
  }

  /**
   * Ingest documents into the knowledge base
   */
  async ingestDocuments(documents: RAGDocument[]): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    try {
      // Convert RAG documents to LangChain documents
      const langchainDocuments = documents.map(doc => new Document({
        pageContent: doc.content,
        metadata: {
          id: doc.id,
          ...doc.metadata,
        },
      }));

      // Add documents to vector store
      await this.vectorStore.addDocuments(langchainDocuments);
      
      this.logger.info(`Ingested ${documents.length} documents into knowledge base`);
    } catch (error) {
      this.logger.error('Error ingesting documents', { error });
      throw error;
    }
  }

  /**
   * Search for relevant documents using semantic similarity
   */
  async searchDocuments(
    query: string,
    options: {
      type?: string;
      maxResults?: number;
      similarityThreshold?: number;
      useCache?: boolean;
    } = {}
  ): Promise<RAGSearchResult[]> {
    const {
      type,
      maxResults = this.config.maxRetrievalResults,
      similarityThreshold = this.config.similarityThreshold,
      useCache = this.config.enableCaching,
    } = options;

    // Check cache first
    if (useCache) {
      const cacheKey = `${query}:${type}:${maxResults}:${similarityThreshold}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && this.isCacheValid(cached.timestamp)) {
        this.logger.info('Returning cached search results');
        return cached.results;
      }
    }

    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    try {
      // Perform vector search
      const searchResults = await this.vectorStore.similaritySearchWithScore(
        query,
        maxResults
      );

      // Filter by similarity threshold and type
      const filteredResults = searchResults
        .filter(([_, score]) => score >= similarityThreshold)
        .map(([doc, score]) => ({
          document: {
            id: doc.metadata.id || '',
            content: doc.pageContent,
            metadata: doc.metadata,
          } as RAGDocument,
          similarity: score,
          relevanceScore: this.calculateRelevanceScore(doc, query),
        }))
        .filter(result => !type || result.document.metadata.type === type);

      // Cache results if enabled
      if (useCache) {
        const cacheKey = `${query}:${type}:${maxResults}:${similarityThreshold}`;
        this.cache.set(cacheKey, {
          results: filteredResults,
          timestamp: Date.now(),
        });
      }

      this.logger.info(`Found ${filteredResults.length} relevant documents for query: ${query}`);
      return filteredResults;
    } catch (error) {
      this.logger.error('Error searching documents', { error });
      throw error;
    }
  }

  /**
   * Retrieve context for AI agents based on current security data
   */
  async retrieveContextForAnalysis(
    securityData: {
      alerts?: any[];
      threatIntelligence?: any[];
      entities?: any[];
      incidents?: any[];
    }
  ): Promise<{
    threatIntelligence: RAGSearchResult[];
    similarIncidents: RAGSearchResult[];
    attackPatterns: RAGSearchResult[];
    mitigationStrategies: RAGSearchResult[];
    playbooks: RAGSearchResult[];
  }> {
    // Generate search queries from security data
    const queries = this.generateSearchQueries(securityData);
    
    const results = {
      threatIntelligence: [] as RAGSearchResult[],
      similarIncidents: [] as RAGSearchResult[],
      attackPatterns: [] as RAGSearchResult[],
      mitigationStrategies: [] as RAGSearchResult[],
      playbooks: [] as RAGSearchResult[],
    };

    // Search for each type of document
    for (const query of queries) {
      try {
        const searchResults = await this.searchDocuments(query, {
          maxResults: 5,
          similarityThreshold: 0.7,
        });

        // Categorize results
        searchResults.forEach(result => {
          const type = result.document.metadata.type;
          switch (type) {
            case 'threat_intelligence':
              results.threatIntelligence.push(result);
              break;
            case 'incident':
              results.similarIncidents.push(result);
              break;
            case 'attack_pattern':
              results.attackPatterns.push(result);
              break;
            case 'mitigation':
              results.mitigationStrategies.push(result);
              break;
            case 'playbook':
              results.playbooks.push(result);
              break;
          }
        });
      } catch (error) {
        this.logger.warn('Error searching for context', { query, error });
      }
    }

    return results;
  }

  /**
   * Generate search queries from security data
   */
  private generateSearchQueries(securityData: any): string[] {
    const queries: string[] = [];

    // Extract queries from alerts
    if (securityData.alerts?.length > 0) {
      securityData.alerts.forEach((alert: any) => {
        queries.push(`${alert.type} ${alert.description}`);
        queries.push(`security alert ${alert.severity} ${alert.source}`);
      });
    }

    // Extract queries from threat intelligence
    if (securityData.threatIntelligence?.length > 0) {
      securityData.threatIntelligence.forEach((ti: any) => {
        queries.push(`threat intelligence ${ti.indicator} ${ti.type}`);
        queries.push(`${ti.threat_level} threat ${ti.description}`);
      });
    }

    // Extract queries from entities
    if (securityData.entities?.length > 0) {
      securityData.entities.forEach((entity: any) => {
        queries.push(`entity ${entity.type} ${entity.name}`);
      });
    }

    // Extract queries from incidents
    if (securityData.incidents?.length > 0) {
      securityData.incidents.forEach((incident: any) => {
        queries.push(`incident ${incident.title} ${incident.severity}`);
        queries.push(`security incident ${incident.description}`);
      });
    }

    return queries;
  }

  /**
   * Calculate relevance score for a document
   */
  private calculateRelevanceScore(doc: Document, query: string): number {
    const content = doc.pageContent.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Simple relevance scoring based on keyword matches
    const queryWords = queryLower.split(' ');
    const matches = queryWords.filter(word => content.includes(word)).length;
    
    return matches / queryWords.length;
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    const expirationMs = this.config.cacheExpirationHours * 60 * 60 * 1000;
    return Date.now() - timestamp < expirationMs;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Cache cleared');
  }

  /**
   * Update document in knowledge base
   */
  async updateDocument(documentId: string, updatedDocument: RAGDocument): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    try {
      // Delete old document
      await this.vectorStore.delete({ ids: [documentId] });
      
      // Add updated document
      const langchainDocument = new Document({
        pageContent: updatedDocument.content,
        metadata: {
          id: updatedDocument.id,
          ...updatedDocument.metadata,
        },
      });

      await this.vectorStore.addDocuments([langchainDocument]);
      
      this.logger.info(`Updated document ${documentId} in knowledge base`);
    } catch (error) {
      this.logger.error('Error updating document', { documentId, error });
      throw error;
    }
  }

  /**
   * Delete document from knowledge base
   */
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    try {
      await this.vectorStore.delete({ ids: [documentId] });
      this.logger.info(`Deleted document ${documentId} from knowledge base`);
    } catch (error) {
      this.logger.error('Error deleting document', { documentId, error });
      throw error;
    }
  }

  /**
   * Get knowledge base statistics
   */
  async getKnowledgeBaseStats(): Promise<{
    totalDocuments: number;
    documentsByType: Record<string, number>;
    lastUpdated: string;
  }> {
    // This would require additional Pinecone API calls to get index statistics
    // For now, return basic information
    return {
      totalDocuments: this.cache.size,
      documentsByType: {},
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Initialize knowledge base with default SOC documents
   */
  async initializeDefaultKnowledgeBase(): Promise<void> {
    const defaultDocuments: RAGDocument[] = [
      {
        id: 'default-malware-response',
        content: 'Malware Incident Response: 1. Isolate affected systems immediately 2. Preserve system state for forensic analysis 3. Notify incident response team 4. Begin containment procedures 5. Document all actions taken',
        metadata: {
          type: 'playbook',
          source: 'default',
          timestamp: new Date().toISOString(),
          severity: 'high',
          tags: ['malware', 'incident-response', 'containment'],
          category: 'incident-response',
        },
      },
      {
        id: 'default-phishing-indicators',
        content: 'Common Phishing Indicators: Suspicious email attachments, urgent requests for sensitive information, mismatched sender domains, suspicious links, poor grammar and spelling, requests for immediate action',
        metadata: {
          type: 'threat_intelligence',
          source: 'default',
          timestamp: new Date().toISOString(),
          severity: 'medium',
          tags: ['phishing', 'email-security', 'indicators'],
          category: 'threat-detection',
        },
      },
      {
        id: 'default-lateral-movement',
        content: 'Lateral Movement Attack Pattern: Attackers move through network after initial compromise, using legitimate credentials and tools, targeting high-value systems, maintaining persistence, evading detection',
        metadata: {
          type: 'attack_pattern',
          source: 'default',
          timestamp: new Date().toISOString(),
          severity: 'high',
          tags: ['lateral-movement', 'attack-pattern', 'persistence'],
          category: 'attack-tactics',
        },
      },
    ];

    await this.ingestDocuments(defaultDocuments);
    this.logger.info('Initialized default knowledge base');
  }
}
