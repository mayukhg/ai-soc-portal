/**
 * RAGAS Service
 * Comprehensive RAG (Retrieval-Augmented Generation) evaluation service
 * 
 * This service provides:
 * - Automated evaluation of RAG systems
 * - Multiple evaluation metrics (faithfulness, answer relevancy, context precision, etc.)
 * - SOC-specific evaluation scenarios
 * - Integration with existing evaluation framework
 * - Performance benchmarking and comparison
 */

import { Logger } from '../data-ingestion/utils/logger';

// RAGAS Evaluation Metrics
export interface RAGASMetrics {
  faithfulness: number;           // How factually accurate the answer is
  answerRelevancy: number;       // How relevant the answer is to the question
  contextPrecision: number;      // How precise the retrieved context is
  contextRecall: number;         // How well the context covers the answer
  answerCorrectness: number;     // Overall correctness of the answer
  contextUtilization: number;    // How well the context was utilized
  answerCompleteness: number;    // How complete the answer is
  answerConsistency: number;     // How consistent the answer is with context
}

export interface RAGASDataset {
  id: string;
  question: string;
  groundTruth: string;
  context: string[];
  answer: string;
  metadata?: Record<string, any>;
}

export interface RAGASEvaluationResult {
  datasetId: string;
  metrics: RAGASMetrics;
  overallScore: number;
  feedback: string;
  recommendations: string[];
  timestamp: Date;
}

export interface RAGASConfig {
  enableFaithfulness: boolean;
  enableAnswerRelevancy: boolean;
  enableContextPrecision: boolean;
  enableContextRecall: boolean;
  enableAnswerCorrectness: boolean;
  enableContextUtilization: boolean;
  enableAnswerCompleteness: boolean;
  enableAnswerConsistency: boolean;
  batchSize: number;
  timeoutMs: number;
  retryAttempts: number;
  enableDetailedFeedback: boolean;
  enableRecommendations: boolean;
}

export interface SOCRAGASDataset extends RAGASDataset {
  socContext: {
    alertType?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    threatCategory?: string;
    incidentType?: string;
    workflowPhase?: string;
    userRole?: string;
  };
}

export class RAGASService {
  private logger: Logger;
  private config: RAGASConfig;
  private datasets: SOCRAGASDataset[];
  private evaluationResults: RAGASEvaluationResult[];

  constructor(config?: Partial<RAGASConfig>) {
    this.logger = new Logger('RAGASService');
    this.config = {
      enableFaithfulness: true,
      enableAnswerRelevancy: true,
      enableContextPrecision: true,
      enableContextRecall: true,
      enableAnswerCorrectness: true,
      enableContextUtilization: true,
      enableAnswerCompleteness: true,
      enableAnswerConsistency: true,
      batchSize: 10,
      timeoutMs: 30000,
      retryAttempts: 3,
      enableDetailedFeedback: true,
      enableRecommendations: true,
    };
    this.datasets = [];
    this.evaluationResults = [];

    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initializeSOCDatasets();
  }

  /**
   * Initialize SOC-specific evaluation datasets
   * Creates realistic test cases for security operations center scenarios
   */
  private initializeSOCDatasets(): void {
    this.datasets = [
      {
        id: 'soc_threat_analysis_001',
        question: 'What type of threat is indicated by this network traffic pattern: multiple failed SSH login attempts from IP 192.168.1.100 to server 10.0.0.50?',
        groundTruth: 'This indicates a brute force attack attempting to gain unauthorized access to the SSH service on the target server.',
        context: [
          'SSH brute force attacks involve automated attempts to guess SSH credentials',
          'Multiple failed login attempts from the same IP address are a common indicator',
          'Such attacks can lead to unauthorized system access if successful',
          'IP 192.168.1.100 appears to be scanning for vulnerable SSH services'
        ],
        answer: 'This is a brute force attack targeting SSH services.',
        socContext: {
          alertType: 'network_security',
          severity: 'high',
          threatCategory: 'brute_force',
          incidentType: 'unauthorized_access_attempt',
          workflowPhase: 'threat_analysis',
          userRole: 'security_analyst'
        }
      },
      {
        id: 'soc_incident_response_001',
        question: 'A user reports receiving a suspicious email with a malicious attachment. What should be the immediate response steps?',
        groundTruth: 'Immediate response: 1) Isolate the affected system 2) Block the sender domain 3) Scan for malware 4) Notify the security team 5) Preserve evidence for analysis',
        context: [
          'Phishing emails with malicious attachments are common attack vectors',
          'Immediate isolation prevents lateral movement and data exfiltration',
          'Blocking sender domains prevents further attacks from the same source',
          'Malware scanning helps identify if the system is compromised',
          'Evidence preservation is crucial for forensic analysis'
        ],
        answer: 'The immediate response should include isolating the system, blocking the sender, scanning for malware, and notifying the security team.',
        socContext: {
          alertType: 'email_security',
          severity: 'medium',
          threatCategory: 'phishing',
          incidentType: 'malware_delivery',
          workflowPhase: 'incident_response',
          userRole: 'incident_responder'
        }
      },
      {
        id: 'soc_vulnerability_assessment_001',
        question: 'CVE-2023-1234 is a critical vulnerability in Apache HTTP Server. What is the risk assessment and recommended actions?',
        groundTruth: 'CVE-2023-1234 is a critical remote code execution vulnerability with CVSS score 9.8. Immediate patching is required, and affected systems should be prioritized for updates.',
        context: [
          'CVE-2023-1234 affects Apache HTTP Server versions 2.4.0 to 2.4.55',
          'The vulnerability allows remote code execution without authentication',
          'CVSS score of 9.8 indicates critical severity',
          'Exploitation is possible and has been observed in the wild',
          'Patches are available in Apache HTTP Server 2.4.56 and later'
        ],
        answer: 'This is a critical vulnerability requiring immediate patching. The CVSS score is 9.8, indicating severe risk.',
        socContext: {
          alertType: 'vulnerability_management',
          severity: 'critical',
          threatCategory: 'remote_code_execution',
          incidentType: 'vulnerability_disclosure',
          workflowPhase: 'risk_assessment',
          userRole: 'vulnerability_manager'
        }
      },
      {
        id: 'soc_correlation_analysis_001',
        question: 'Multiple alerts show unusual network activity from internal IPs to external domains. What correlation analysis should be performed?',
        groundTruth: 'Correlation analysis should examine: 1) Common destination domains/IPs 2) Timing patterns 3) Data exfiltration indicators 4) User account associations 5) Network flow analysis to identify potential data breach or insider threat.',
        context: [
          'Internal IPs communicating with external domains can indicate data exfiltration',
          'Correlation analysis helps identify patterns across multiple alerts',
          'Timing analysis can reveal coordinated attack activities',
          'User account associations help identify potential insider threats',
          'Network flow analysis provides insights into data movement patterns'
        ],
        answer: 'Correlation analysis should focus on identifying patterns in destination domains, timing, and potential data exfiltration indicators.',
        socContext: {
          alertType: 'network_monitoring',
          severity: 'high',
          threatCategory: 'data_exfiltration',
          incidentType: 'suspicious_network_activity',
          workflowPhase: 'correlation_analysis',
          userRole: 'security_analyst'
        }
      },
      {
        id: 'soc_threat_hunting_001',
        question: 'What indicators should be used to hunt for advanced persistent threat (APT) activity in the network?',
        groundTruth: 'APT hunting indicators include: 1) Unusual network communications to known APT infrastructure 2) Suspicious file execution patterns 3) Privilege escalation attempts 4) Data staging activities 5) Command and control communications 6) Lateral movement patterns.',
        context: [
          'APTs use sophisticated techniques to maintain persistence',
          'Network communications to known malicious infrastructure are key indicators',
          'Privilege escalation is common in APT attack chains',
          'Data staging activities precede exfiltration attempts',
          'Command and control communications enable remote control',
          'Lateral movement allows APTs to access critical systems'
        ],
        answer: 'APT hunting should focus on unusual network communications, privilege escalation, and lateral movement patterns.',
        socContext: {
          alertType: 'threat_hunting',
          severity: 'critical',
          threatCategory: 'apt',
          incidentType: 'advanced_threat',
          workflowPhase: 'threat_hunting',
          userRole: 'threat_hunter'
        }
      }
    ];

    this.logger.info('SOC RAGAS datasets initialized', {
      datasetCount: this.datasets.length,
      categories: [...new Set(this.datasets.map(d => d.socContext.threatCategory))],
    });
  }

  /**
   * Run comprehensive RAGAS evaluation on a dataset
   * Evaluates all enabled metrics and provides detailed feedback
   */
  async evaluateDataset(dataset: SOCRAGASDataset): Promise<RAGASEvaluationResult> {
    this.logger.info('Starting RAGAS evaluation', {
      datasetId: dataset.id,
      question: dataset.question.substring(0, 100) + '...',
    });

    const startTime = Date.now();
    const metrics: RAGASMetrics = {
      faithfulness: 0,
      answerRelevancy: 0,
      contextPrecision: 0,
      contextRecall: 0,
      answerCorrectness: 0,
      contextUtilization: 0,
      answerCompleteness: 0,
      answerConsistency: 0,
    };

    try {
      // Evaluate faithfulness - how factually accurate the answer is
      if (this.config.enableFaithfulness) {
        metrics.faithfulness = await this.evaluateFaithfulness(dataset);
      }

      // Evaluate answer relevancy - how relevant the answer is to the question
      if (this.config.enableAnswerRelevancy) {
        metrics.answerRelevancy = await this.evaluateAnswerRelevancy(dataset);
      }

      // Evaluate context precision - how precise the retrieved context is
      if (this.config.enableContextPrecision) {
        metrics.contextPrecision = await this.evaluateContextPrecision(dataset);
      }

      // Evaluate context recall - how well the context covers the answer
      if (this.config.enableContextRecall) {
        metrics.contextRecall = await this.evaluateContextRecall(dataset);
      }

      // Evaluate answer correctness - overall correctness of the answer
      if (this.config.enableAnswerCorrectness) {
        metrics.answerCorrectness = await this.evaluateAnswerCorrectness(dataset);
      }

      // Evaluate context utilization - how well the context was utilized
      if (this.config.enableContextUtilization) {
        metrics.contextUtilization = await this.evaluateContextUtilization(dataset);
      }

      // Evaluate answer completeness - how complete the answer is
      if (this.config.enableAnswerCompleteness) {
        metrics.answerCompleteness = await this.evaluateAnswerCompleteness(dataset);
      }

      // Evaluate answer consistency - how consistent the answer is with context
      if (this.config.enableAnswerConsistency) {
        metrics.answerConsistency = await this.evaluateAnswerConsistency(dataset);
      }

      // Calculate overall score
      const overallScore = this.calculateOverallScore(metrics);

      // Generate feedback and recommendations
      const feedback = this.generateFeedback(dataset, metrics);
      const recommendations = this.generateRecommendations(dataset, metrics);

      const result: RAGASEvaluationResult = {
        datasetId: dataset.id,
        metrics,
        overallScore,
        feedback,
        recommendations,
        timestamp: new Date(),
      };

      this.evaluationResults.push(result);

      this.logger.info('RAGAS evaluation completed', {
        datasetId: dataset.id,
        overallScore: overallScore.toFixed(2),
        evaluationTime: Date.now() - startTime,
      });

      return result;

    } catch (error) {
      this.logger.error('RAGAS evaluation failed', {
        datasetId: dataset.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Run batch evaluation on multiple datasets
   * Processes datasets in batches for efficiency
   */
  async evaluateBatch(datasets: SOCRAGASDataset[]): Promise<RAGASEvaluationResult[]> {
    this.logger.info('Starting batch RAGAS evaluation', {
      datasetCount: datasets.length,
      batchSize: this.config.batchSize,
    });

    const results: RAGASEvaluationResult[] = [];
    const batches = this.createBatches(datasets, this.config.batchSize);

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(dataset => this.evaluateDataset(dataset))
      );
      results.push(...batchResults);
    }

    this.logger.info('Batch RAGAS evaluation completed', {
      totalResults: results.length,
      averageScore: results.reduce((sum, r) => sum + r.overallScore, 0) / results.length,
    });

    return results;
  }

  /**
   * Evaluate faithfulness - how factually accurate the answer is
   * Checks if the answer contains factual errors or contradictions
   */
  private async evaluateFaithfulness(dataset: SOCRAGASDataset): Promise<number> {
    // Simulate faithfulness evaluation
    // In a real implementation, this would use an LLM to evaluate factual accuracy
    
    const answer = dataset.answer.toLowerCase();
    const groundTruth = dataset.groundTruth.toLowerCase();
    
    // Check for factual contradictions
    const contradictions = [
      ['high', 'low'],
      ['critical', 'minor'],
      ['immediate', 'delayed'],
      ['secure', 'vulnerable'],
      ['safe', 'dangerous'],
    ];

    let contradictionScore = 0;
    for (const [term1, term2] of contradictions) {
      if (answer.includes(term1) && groundTruth.includes(term2)) {
        contradictionScore += 0.2;
      }
    }

    // Check for factual accuracy based on SOC context
    let socAccuracyScore = 0;
    if (dataset.socContext.severity === 'critical' && answer.includes('critical')) {
      socAccuracyScore += 0.3;
    }
    if (dataset.socContext.threatCategory && answer.includes(dataset.socContext.threatCategory)) {
      socAccuracyScore += 0.3;
    }

    // Calculate faithfulness score
    const faithfulnessScore = Math.max(0, 1 - contradictionScore + socAccuracyScore);
    return Math.min(1, faithfulnessScore);
  }

  /**
   * Evaluate answer relevancy - how relevant the answer is to the question
   * Checks if the answer addresses the specific question asked
   */
  private async evaluateAnswerRelevancy(dataset: SOCRAGASDataset): Promise<number> {
    const question = dataset.question.toLowerCase();
    const answer = dataset.answer.toLowerCase();
    
    // Extract key terms from the question
    const questionTerms = this.extractKeyTerms(question);
    const answerTerms = this.extractKeyTerms(answer);
    
    // Calculate term overlap
    const commonTerms = questionTerms.filter(term => answerTerms.includes(term));
    const relevancyScore = commonTerms.length / Math.max(questionTerms.length, 1);
    
    // Check for SOC-specific relevancy
    let socRelevancyScore = 0;
    if (dataset.socContext.alertType && answer.includes(dataset.socContext.alertType)) {
      socRelevancyScore += 0.2;
    }
    if (dataset.socContext.workflowPhase && answer.includes(dataset.socContext.workflowPhase)) {
      socRelevancyScore += 0.2;
    }
    
    return Math.min(1, relevancyScore + socRelevancyScore);
  }

  /**
   * Evaluate context precision - how precise the retrieved context is
   * Checks if the context is directly relevant to answering the question
   */
  private async evaluateContextPrecision(dataset: SOCRAGASDataset): Promise<number> {
    const question = dataset.question.toLowerCase();
    const contexts = dataset.context.map(c => c.toLowerCase());
    
    let precisionScore = 0;
    let totalContexts = contexts.length;
    
    for (const context of contexts) {
      const contextTerms = this.extractKeyTerms(context);
      const questionTerms = this.extractKeyTerms(question);
      
      const relevantTerms = contextTerms.filter(term => questionTerms.includes(term));
      const contextPrecision = relevantTerms.length / Math.max(contextTerms.length, 1);
      precisionScore += contextPrecision;
    }
    
    return totalContexts > 0 ? precisionScore / totalContexts : 0;
  }

  /**
   * Evaluate context recall - how well the context covers the answer
   * Checks if the context provides sufficient information to answer the question
   */
  private async evaluateContextRecall(dataset: SOCRAGASDataset): Promise<number> {
    const groundTruth = dataset.groundTruth.toLowerCase();
    const contexts = dataset.context.map(c => c.toLowerCase());
    
    const groundTruthTerms = this.extractKeyTerms(groundTruth);
    let coveredTerms = 0;
    
    for (const term of groundTruthTerms) {
      const isCovered = contexts.some(context => context.includes(term));
      if (isCovered) coveredTerms++;
    }
    
    return groundTruthTerms.length > 0 ? coveredTerms / groundTruthTerms.length : 0;
  }

  /**
   * Evaluate answer correctness - overall correctness of the answer
   * Combines multiple factors to assess overall correctness
   */
  private async evaluateAnswerCorrectness(dataset: SOCRAGASDataset): Promise<number> {
    const faithfulness = await this.evaluateFaithfulness(dataset);
    const relevancy = await this.evaluateAnswerRelevancy(dataset);
    const completeness = await this.evaluateAnswerCompleteness(dataset);
    
    // Weighted combination of correctness factors
    return (faithfulness * 0.4 + relevancy * 0.3 + completeness * 0.3);
  }

  /**
   * Evaluate context utilization - how well the context was utilized
   * Checks if the answer effectively uses information from the context
   */
  private async evaluateContextUtilization(dataset: SOCRAGASDataset): Promise<number> {
    const answer = dataset.answer.toLowerCase();
    const contexts = dataset.context.map(c => c.toLowerCase());
    
    let utilizationScore = 0;
    let totalContexts = contexts.length;
    
    for (const context of contexts) {
      const contextTerms = this.extractKeyTerms(context);
      const answerTerms = this.extractKeyTerms(answer);
      
      const utilizedTerms = contextTerms.filter(term => answerTerms.includes(term));
      const contextUtilization = utilizedTerms.length / Math.max(contextTerms.length, 1);
      utilizationScore += contextUtilization;
    }
    
    return totalContexts > 0 ? utilizationScore / totalContexts : 0;
  }

  /**
   * Evaluate answer completeness - how complete the answer is
   * Checks if the answer covers all important aspects of the question
   */
  private async evaluateAnswerCompleteness(dataset: SOCRAGASDataset): Promise<number> {
    const groundTruth = dataset.groundTruth.toLowerCase();
    const answer = dataset.answer.toLowerCase();
    
    // Extract key concepts from ground truth
    const groundTruthConcepts = this.extractKeyConcepts(groundTruth);
    const answerConcepts = this.extractKeyConcepts(answer);
    
    // Calculate concept coverage
    const coveredConcepts = groundTruthConcepts.filter(concept => 
      answerConcepts.some(answerConcept => answerConcept.includes(concept) || concept.includes(answerConcept))
    );
    
    return groundTruthConcepts.length > 0 ? coveredConcepts.length / groundTruthConcepts.length : 0;
  }

  /**
   * Evaluate answer consistency - how consistent the answer is with context
   * Checks if the answer is consistent with the provided context
   */
  private async evaluateAnswerConsistency(dataset: SOCRAGASDataset): Promise<number> {
    const answer = dataset.answer.toLowerCase();
    const contexts = dataset.context.map(c => c.toLowerCase());
    
    let consistencyScore = 0;
    let totalContexts = contexts.length;
    
    for (const context of contexts) {
      // Check for consistency indicators
      const consistencyIndicators = [
        ['high', 'high'],
        ['critical', 'critical'],
        ['immediate', 'immediate'],
        ['secure', 'secure'],
        ['vulnerable', 'vulnerable'],
      ];
      
      let contextConsistency = 0;
      for (const [contextTerm, answerTerm] of consistencyIndicators) {
        if (context.includes(contextTerm) && answer.includes(answerTerm)) {
          contextConsistency += 0.2;
        }
      }
      
      consistencyScore += Math.min(1, contextConsistency);
    }
    
    return totalContexts > 0 ? consistencyScore / totalContexts : 0;
  }

  /**
   * Calculate overall score from individual metrics
   */
  private calculateOverallScore(metrics: RAGASMetrics): number {
    const enabledMetrics = [];
    
    if (this.config.enableFaithfulness) enabledMetrics.push(metrics.faithfulness);
    if (this.config.enableAnswerRelevancy) enabledMetrics.push(metrics.answerRelevancy);
    if (this.config.enableContextPrecision) enabledMetrics.push(metrics.contextPrecision);
    if (this.config.enableContextRecall) enabledMetrics.push(metrics.contextRecall);
    if (this.config.enableAnswerCorrectness) enabledMetrics.push(metrics.answerCorrectness);
    if (this.config.enableContextUtilization) enabledMetrics.push(metrics.contextUtilization);
    if (this.config.enableAnswerCompleteness) enabledMetrics.push(metrics.answerCompleteness);
    if (this.config.enableAnswerConsistency) enabledMetrics.push(metrics.answerConsistency);
    
    if (enabledMetrics.length === 0) return 0;
    
    return enabledMetrics.reduce((sum, score) => sum + score, 0) / enabledMetrics.length;
  }

  /**
   * Generate detailed feedback based on evaluation results
   */
  private generateFeedback(dataset: SOCRAGASDataset, metrics: RAGASMetrics): string {
    if (!this.config.enableDetailedFeedback) {
      return `Overall score: ${(this.calculateOverallScore(metrics) * 100).toFixed(1)}%`;
    }

    const feedback = [];
    const overallScore = this.calculateOverallScore(metrics);

    feedback.push(`Overall RAGAS Score: ${(overallScore * 100).toFixed(1)}%`);
    feedback.push('');

    if (metrics.faithfulness < 0.7) {
      feedback.push('⚠️ Faithfulness: The answer contains some factual inaccuracies or contradictions.');
    } else {
      feedback.push('✅ Faithfulness: The answer is factually accurate and consistent.');
    }

    if (metrics.answerRelevancy < 0.7) {
      feedback.push('⚠️ Answer Relevancy: The answer does not fully address the question asked.');
    } else {
      feedback.push('✅ Answer Relevancy: The answer directly addresses the question.');
    }

    if (metrics.contextPrecision < 0.7) {
      feedback.push('⚠️ Context Precision: The retrieved context contains some irrelevant information.');
    } else {
      feedback.push('✅ Context Precision: The retrieved context is highly relevant.');
    }

    if (metrics.contextRecall < 0.7) {
      feedback.push('⚠️ Context Recall: The context does not cover all necessary information.');
    } else {
      feedback.push('✅ Context Recall: The context provides comprehensive coverage.');
    }

    if (metrics.answerCompleteness < 0.7) {
      feedback.push('⚠️ Answer Completeness: The answer is missing some important details.');
    } else {
      feedback.push('✅ Answer Completeness: The answer covers all important aspects.');
    }

    return feedback.join('\n');
  }

  /**
   * Generate recommendations for improvement
   */
  private generateRecommendations(dataset: SOCRAGASDataset, metrics: RAGASMetrics): string[] {
    if (!this.config.enableRecommendations) {
      return [];
    }

    const recommendations = [];

    if (metrics.faithfulness < 0.7) {
      recommendations.push('Improve factual accuracy by cross-referencing with authoritative sources');
    }

    if (metrics.answerRelevancy < 0.7) {
      recommendations.push('Ensure answers directly address the specific question asked');
    }

    if (metrics.contextPrecision < 0.7) {
      recommendations.push('Improve context retrieval to focus on more relevant information');
    }

    if (metrics.contextRecall < 0.7) {
      recommendations.push('Expand context coverage to include all necessary information');
    }

    if (metrics.answerCompleteness < 0.7) {
      recommendations.push('Provide more comprehensive answers covering all important aspects');
    }

    if (metrics.contextUtilization < 0.7) {
      recommendations.push('Better utilize information from the provided context');
    }

    if (metrics.answerConsistency < 0.7) {
      recommendations.push('Ensure answers are consistent with the provided context');
    }

    // SOC-specific recommendations
    if (dataset.socContext.severity === 'critical' && metrics.answerCorrectness < 0.8) {
      recommendations.push('Critical severity incidents require higher accuracy - consider additional validation');
    }

    if (dataset.socContext.workflowPhase === 'incident_response' && metrics.answerCompleteness < 0.8) {
      recommendations.push('Incident response requires complete step-by-step guidance');
    }

    return recommendations;
  }

  /**
   * Extract key terms from text
   */
  private extractKeyTerms(text: string): string[] {
    // Simple keyword extraction (in real implementation, would use NLP libraries)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Remove common stop words
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return words.filter(word => !stopWords.includes(word));
  }

  /**
   * Extract key concepts from text
   */
  private extractKeyConcepts(text: string): string[] {
    // Extract multi-word concepts and important terms
    const concepts = [];
    
    // SOC-specific concepts
    const socConcepts = [
      'brute force attack',
      'phishing email',
      'malware detection',
      'vulnerability assessment',
      'incident response',
      'threat analysis',
      'risk assessment',
      'security monitoring',
      'data exfiltration',
      'lateral movement',
      'privilege escalation',
      'command and control',
    ];

    for (const concept of socConcepts) {
      if (text.includes(concept)) {
        concepts.push(concept);
      }
    }

    // Add single-word important terms
    const importantTerms = this.extractKeyTerms(text);
    concepts.push(...importantTerms);

    return [...new Set(concepts)]; // Remove duplicates
  }

  /**
   * Create batches for processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  // Public API methods

  /**
   * Add a new SOC dataset for evaluation
   */
  addDataset(dataset: SOCRAGASDataset): void {
    this.datasets.push(dataset);
    this.logger.info('SOC dataset added', { datasetId: dataset.id });
  }

  /**
   * Get all datasets
   */
  getDatasets(): SOCRAGASDataset[] {
    return [...this.datasets];
  }

  /**
   * Get evaluation results
   */
  getEvaluationResults(): RAGASEvaluationResult[] {
    return [...this.evaluationResults];
  }

  /**
   * Get latest evaluation results
   */
  getLatestResults(limit?: number): RAGASEvaluationResult[] {
    const results = [...this.evaluationResults].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    return limit ? results.slice(0, limit) : results;
  }

  /**
   * Get average scores across all evaluations
   */
  getAverageScores(): RAGASMetrics {
    if (this.evaluationResults.length === 0) {
      return {
        faithfulness: 0,
        answerRelevancy: 0,
        contextPrecision: 0,
        contextRecall: 0,
        answerCorrectness: 0,
        contextUtilization: 0,
        answerCompleteness: 0,
        answerConsistency: 0,
      };
    }

    const totals = this.evaluationResults.reduce((acc, result) => {
      acc.faithfulness += result.metrics.faithfulness;
      acc.answerRelevancy += result.metrics.answerRelevancy;
      acc.contextPrecision += result.metrics.contextPrecision;
      acc.contextRecall += result.metrics.contextRecall;
      acc.answerCorrectness += result.metrics.answerCorrectness;
      acc.contextUtilization += result.metrics.contextUtilization;
      acc.answerCompleteness += result.metrics.answerCompleteness;
      acc.answerConsistency += result.metrics.answerConsistency;
      return acc;
    }, {
      faithfulness: 0,
      answerRelevancy: 0,
      contextPrecision: 0,
      contextRecall: 0,
      answerCorrectness: 0,
      contextUtilization: 0,
      answerCompleteness: 0,
      answerConsistency: 0,
    });

    const count = this.evaluationResults.length;
    return {
      faithfulness: totals.faithfulness / count,
      answerRelevancy: totals.answerRelevancy / count,
      contextPrecision: totals.contextPrecision / count,
      contextRecall: totals.contextRecall / count,
      answerCorrectness: totals.answerCorrectness / count,
      contextUtilization: totals.contextUtilization / count,
      answerCompleteness: totals.answerCompleteness / count,
      answerConsistency: totals.answerConsistency / count,
    };
  }

  /**
   * Export evaluation results
   */
  exportResults(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.evaluationResults, null, 2);
    } else {
      // CSV format
      const headers = [
        'datasetId',
        'overallScore',
        'faithfulness',
        'answerRelevancy',
        'contextPrecision',
        'contextRecall',
        'answerCorrectness',
        'contextUtilization',
        'answerCompleteness',
        'answerConsistency',
        'timestamp',
      ];
      
      const rows = this.evaluationResults.map(result => [
        result.datasetId,
        result.overallScore.toString(),
        result.metrics.faithfulness.toString(),
        result.metrics.answerRelevancy.toString(),
        result.metrics.contextPrecision.toString(),
        result.metrics.contextRecall.toString(),
        result.metrics.answerCorrectness.toString(),
        result.metrics.contextUtilization.toString(),
        result.metrics.answerCompleteness.toString(),
        result.metrics.answerConsistency.toString(),
        result.timestamp.toISOString(),
      ]);
      
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RAGASConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('RAGAS configuration updated', { config });
  }

  /**
   * Get configuration
   */
  getConfig(): RAGASConfig {
    return { ...this.config };
  }

  /**
   * Get service status
   */
  getServiceStatus(): {
    isEnabled: boolean;
    datasetCount: number;
    evaluationCount: number;
    averageScore: number;
  } {
    const averageScore = this.evaluationResults.length > 0 
      ? this.evaluationResults.reduce((sum, r) => sum + r.overallScore, 0) / this.evaluationResults.length
      : 0;

    return {
      isEnabled: true,
      datasetCount: this.datasets.length,
      evaluationCount: this.evaluationResults.length,
      averageScore,
    };
  }
}
