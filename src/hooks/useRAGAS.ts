/**
 * React Hook for RAGAS Integration
 * Provides easy access to RAGAS evaluation capabilities
 * 
 * This hook enables:
 * - Automated RAG evaluation
 * - SOC-specific evaluation scenarios
 * - Performance monitoring and analytics
 * - Batch evaluation processing
 * - Results export and analysis
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  RAGASService, 
  RAGASConfig, 
  SOCRAGASDataset, 
  RAGASEvaluationResult,
  RAGASMetrics 
} from '../lib/ragas/ragas-service';

export interface UseRAGASReturn {
  // Service state
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Datasets
  datasets: SOCRAGASDataset[];
  
  // Evaluation results
  evaluationResults: RAGASEvaluationResult[];
  latestResults: RAGASEvaluationResult[];
  averageScores: RAGASMetrics;
  
  // Service actions
  evaluateDataset: (dataset: SOCRAGASDataset) => Promise<RAGASEvaluationResult>;
  evaluateBatch: (datasets: SOCRAGASDataset[]) => Promise<RAGASEvaluationResult[]>;
  addDataset: (dataset: SOCRAGASDataset) => void;
  
  // Analytics and reporting
  getServiceStatus: () => any;
  exportResults: (format: 'json' | 'csv') => string;
  
  // Configuration
  updateConfig: (config: Partial<RAGASConfig>) => void;
  getConfig: () => RAGASConfig;
}

export const useRAGAS = (initialConfig?: Partial<RAGASConfig>): UseRAGASReturn => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<SOCRAGASDataset[]>([]);
  const [evaluationResults, setEvaluationResults] = useState<RAGASEvaluationResult[]>([]);
  
  const ragasServiceRef = useRef<RAGASService | null>(null);

  // Initialize RAGAS service
  useEffect(() => {
    const initializeService = async () => {
      try {
        // Default configuration
        const defaultConfig: RAGASConfig = {
          enableFaithfulness: true,
          enableAnswerRelevancy: true,
          enableContextPrecision: true,
          enableContextRecall: true,
          enableAnswerCorrectness: true,
          enableContextUtilization: true,
          enableAnswerCompleteness: true,
          enableAnswerConsistency: true,
          batchSize: 5, // Smaller batch size for frontend
          timeoutMs: 15000,
          retryAttempts: 2,
          enableDetailedFeedback: true,
          enableRecommendations: true,
        };

        const config = { ...defaultConfig, ...initialConfig };
        
        ragasServiceRef.current = new RAGASService(config);
        setIsEnabled(true);
        
        // Load initial datasets
        const initialDatasets = ragasServiceRef.current.getDatasets();
        setDatasets(initialDatasets);
        
        // Load existing evaluation results
        const existingResults = ragasServiceRef.current.getEvaluationResults();
        setEvaluationResults(existingResults);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize RAGAS service');
        setIsEnabled(false);
      }
    };

    initializeService();
  }, [initialConfig]);

  // Evaluate single dataset
  const evaluateDataset = useCallback(async (dataset: SOCRAGASDataset): Promise<RAGASEvaluationResult> => {
    if (!ragasServiceRef.current) {
      throw new Error('RAGAS service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await ragasServiceRef.current.evaluateDataset(dataset);
      
      // Update evaluation results
      const updatedResults = ragasServiceRef.current.getEvaluationResults();
      setEvaluationResults(updatedResults);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Dataset evaluation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Evaluate batch of datasets
  const evaluateBatch = useCallback(async (datasets: SOCRAGASDataset[]): Promise<RAGASEvaluationResult[]> => {
    if (!ragasServiceRef.current) {
      throw new Error('RAGAS service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await ragasServiceRef.current.evaluateBatch(datasets);
      
      // Update evaluation results
      const updatedResults = ragasServiceRef.current.getEvaluationResults();
      setEvaluationResults(updatedResults);
      
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch evaluation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add new dataset
  const addDataset = useCallback((dataset: SOCRAGASDataset) => {
    if (!ragasServiceRef.current) {
      setError('RAGAS service not initialized');
      return;
    }

    try {
      ragasServiceRef.current.addDataset(dataset);
      
      // Update datasets
      const updatedDatasets = ragasServiceRef.current.getDatasets();
      setDatasets(updatedDatasets);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add dataset';
      setError(errorMessage);
    }
  }, []);

  // Get service status
  const getServiceStatus = useCallback(() => {
    if (!ragasServiceRef.current) {
      return null;
    }

    return ragasServiceRef.current.getServiceStatus();
  }, []);

  // Export results
  const exportResults = useCallback((format: 'json' | 'csv'): string => {
    if (!ragasServiceRef.current) {
      throw new Error('RAGAS service not initialized');
    }

    try {
      return ragasServiceRef.current.exportResults(format);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export results';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Update configuration
  const updateConfig = useCallback((config: Partial<RAGASConfig>) => {
    if (!ragasServiceRef.current) {
      setError('RAGAS service not initialized');
      return;
    }

    try {
      ragasServiceRef.current.updateConfig(config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update configuration';
      setError(errorMessage);
    }
  }, []);

  // Get configuration
  const getConfig = useCallback(() => {
    if (!ragasServiceRef.current) {
      return null;
    }

    return ragasServiceRef.current.getConfig();
  }, []);

  // Get latest results
  const latestResults = evaluationResults.length > 0 
    ? [...evaluationResults].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10)
    : [];

  // Get average scores
  const averageScores = ragasServiceRef.current?.getAverageScores() || {
    faithfulness: 0,
    answerRelevancy: 0,
    contextPrecision: 0,
    contextRecall: 0,
    answerCorrectness: 0,
    contextUtilization: 0,
    answerCompleteness: 0,
    answerConsistency: 0,
  };

  return {
    // Service state
    isEnabled,
    isLoading,
    error,
    
    // Datasets
    datasets,
    
    // Evaluation results
    evaluationResults,
    latestResults,
    averageScores,
    
    // Service actions
    evaluateDataset,
    evaluateBatch,
    addDataset,
    
    // Analytics and reporting
    getServiceStatus,
    exportResults,
    
    // Configuration
    updateConfig,
    getConfig,
  };
};
