/**
 * RAG Hook
 * React hook for Retrieval-Augmented Generation operations
 * 
 * Provides:
 * - Document search and retrieval
 * - Knowledge base management
 * - Context augmentation for AI agents
 * - Integration with SOC workflows
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { RAGService, RAGDocument, RAGSearchResult, RAGConfig } from '@/lib/rag/rag-service';
import { useToast } from '@/hooks/use-toast';

export interface UseRAGOptions {
  config?: Partial<RAGConfig>;
  enableAutoRetrieval?: boolean;
  defaultMaxResults?: number;
  defaultSimilarityThreshold?: number;
}

export interface UseRAGReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  searchResults: RAGSearchResult[];
  knowledgeBaseStats: {
    totalDocuments: number;
    documentsByType: Record<string, number>;
    lastUpdated: string;
  } | null;

  // Search operations
  searchDocuments: (
    query: string,
    options?: {
      type?: string;
      maxResults?: number;
      similarityThreshold?: number;
      useCache?: boolean;
    }
  ) => Promise<RAGSearchResult[]>;
  
  // Context retrieval for AI agents
  retrieveContextForAnalysis: (securityData: {
    alerts?: any[];
    threatIntelligence?: any[];
    entities?: any[];
    incidents?: any[];
  }) => Promise<{
    threatIntelligence: RAGSearchResult[];
    similarIncidents: RAGSearchResult[];
    attackPatterns: RAGSearchResult[];
    mitigationStrategies: RAGSearchResult[];
    playbooks: RAGSearchResult[];
  }>;

  // Knowledge base management
  ingestDocuments: (documents: RAGDocument[]) => Promise<void>;
  updateDocument: (documentId: string, document: RAGDocument) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  initializeDefaultKnowledgeBase: () => Promise<void>;

  // Utility operations
  clearCache: () => void;
  clearSearchResults: () => void;
  getConfig: () => RAGConfig | null;
}

export const useRAG = (options: UseRAGOptions = {}): UseRAGReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<RAGSearchResult[]>([]);
  const [knowledgeBaseStats, setKnowledgeBaseStats] = useState<{
    totalDocuments: number;
    documentsByType: Record<string, number>;
    lastUpdated: string;
  } | null>(null);

  const ragServiceRef = useRef<RAGService | null>(null);
  const { toast } = useToast();

  // Default configuration
  const defaultConfig: RAGConfig = {
    pineconeApiKey: process.env.REACT_APP_PINECONE_API_KEY || '',
    pineconeEnvironment: process.env.REACT_APP_PINECONE_ENVIRONMENT || '',
    pineconeIndexName: process.env.REACT_APP_PINECONE_INDEX_NAME || 'soc-knowledge-base',
    openaiApiKey: process.env.REACT_APP_OPENAI_API_KEY || '',
    embeddingModel: 'text-embedding-3-small',
    chunkSize: 1000,
    chunkOverlap: 200,
    maxRetrievalResults: options.defaultMaxResults || 10,
    similarityThreshold: options.defaultSimilarityThreshold || 0.7,
    enableCaching: true,
    cacheExpirationHours: 24,
  };

  // Initialize RAG service
  useEffect(() => {
    const initializeService = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const config = { ...defaultConfig, ...options.config };
        
        // Validate required configuration
        if (!config.pineconeApiKey || !config.openaiApiKey) {
          throw new Error('Missing required API keys for RAG service');
        }

        ragServiceRef.current = new RAGService(config);
        
        // Initialize default knowledge base if enabled
        if (options.enableAutoRetrieval) {
          await ragServiceRef.current.initializeDefaultKnowledgeBase();
        }

        // Get initial knowledge base stats
        const stats = await ragServiceRef.current.getKnowledgeBaseStats();
        setKnowledgeBaseStats(stats);

        setIsInitialized(true);
        
        toast({
          title: "RAG Service Initialized",
          description: "Knowledge base is ready for retrieval operations",
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize RAG service';
        setError(errorMessage);
        setIsInitialized(false);
        
        toast({
          title: "RAG Initialization Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeService();
  }, [options.config, options.enableAutoRetrieval]);

  // Search documents
  const searchDocuments = useCallback(async (
    query: string,
    searchOptions: {
      type?: string;
      maxResults?: number;
      similarityThreshold?: number;
      useCache?: boolean;
    } = {}
  ): Promise<RAGSearchResult[]> => {
    if (!ragServiceRef.current) {
      throw new Error('RAG service not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const results = await ragServiceRef.current.searchDocuments(query, searchOptions);
      setSearchResults(results);

      toast({
        title: "Search Complete",
        description: `Found ${results.length} relevant documents`,
      });

      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      
      toast({
        title: "Search Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Retrieve context for AI agents
  const retrieveContextForAnalysis = useCallback(async (securityData: {
    alerts?: any[];
    threatIntelligence?: any[];
    entities?: any[];
    incidents?: any[];
  }) => {
    if (!ragServiceRef.current) {
      throw new Error('RAG service not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const context = await ragServiceRef.current.retrieveContextForAnalysis(securityData);
      
      const totalRetrieved = 
        context.threatIntelligence.length +
        context.similarIncidents.length +
        context.attackPatterns.length +
        context.mitigationStrategies.length +
        context.playbooks.length;

      toast({
        title: "Context Retrieved",
        description: `Retrieved ${totalRetrieved} relevant documents for analysis`,
      });

      return context;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Context retrieval failed';
      setError(errorMessage);
      
      toast({
        title: "Context Retrieval Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Ingest documents
  const ingestDocuments = useCallback(async (documents: RAGDocument[]) => {
    if (!ragServiceRef.current) {
      throw new Error('RAG service not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      await ragServiceRef.current.ingestDocuments(documents);
      
      // Update knowledge base stats
      const stats = await ragServiceRef.current.getKnowledgeBaseStats();
      setKnowledgeBaseStats(stats);

      toast({
        title: "Documents Ingested",
        description: `Successfully added ${documents.length} documents to knowledge base`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Document ingestion failed';
      setError(errorMessage);
      
      toast({
        title: "Ingestion Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update document
  const updateDocument = useCallback(async (documentId: string, document: RAGDocument) => {
    if (!ragServiceRef.current) {
      throw new Error('RAG service not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      await ragServiceRef.current.updateDocument(documentId, document);
      
      // Update knowledge base stats
      const stats = await ragServiceRef.current.getKnowledgeBaseStats();
      setKnowledgeBaseStats(stats);

      toast({
        title: "Document Updated",
        description: `Successfully updated document ${documentId}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Document update failed';
      setError(errorMessage);
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete document
  const deleteDocument = useCallback(async (documentId: string) => {
    if (!ragServiceRef.current) {
      throw new Error('RAG service not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      await ragServiceRef.current.deleteDocument(documentId);
      
      // Update knowledge base stats
      const stats = await ragServiceRef.current.getKnowledgeBaseStats();
      setKnowledgeBaseStats(stats);

      toast({
        title: "Document Deleted",
        description: `Successfully deleted document ${documentId}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Document deletion failed';
      setError(errorMessage);
      
      toast({
        title: "Deletion Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize default knowledge base
  const initializeDefaultKnowledgeBase = useCallback(async () => {
    if (!ragServiceRef.current) {
      throw new Error('RAG service not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      await ragServiceRef.current.initializeDefaultKnowledgeBase();
      
      // Update knowledge base stats
      const stats = await ragServiceRef.current.getKnowledgeBaseStats();
      setKnowledgeBaseStats(stats);

      toast({
        title: "Default Knowledge Base Initialized",
        description: "Added default SOC documents to knowledge base",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Knowledge base initialization failed';
      setError(errorMessage);
      
      toast({
        title: "Initialization Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    if (ragServiceRef.current) {
      ragServiceRef.current.clearCache();
      toast({
        title: "Cache Cleared",
        description: "RAG service cache has been cleared",
      });
    }
  }, []);

  // Clear search results
  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  // Get configuration
  const getConfig = useCallback((): RAGConfig | null => {
    return ragServiceRef.current ? defaultConfig : null;
  }, []);

  return {
    // State
    isInitialized,
    isLoading,
    error,
    searchResults,
    knowledgeBaseStats,

    // Search operations
    searchDocuments,
    retrieveContextForAnalysis,

    // Knowledge base management
    ingestDocuments,
    updateDocument,
    deleteDocument,
    initializeDefaultKnowledgeBase,

    // Utility operations
    clearCache,
    clearSearchResults,
    getConfig,
  };
};
