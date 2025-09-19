/**
 * LLM Rubric Framework
 * Comprehensive evaluation framework for LLM performance in SOC contexts
 * 
 * This framework provides:
 * - Standardized evaluation criteria for LLM outputs
 * - SOC-specific rubric categories and scoring
 * - Integration with existing evaluation services
 * - Automated rubric application and scoring
 * - Performance benchmarking and comparison
 */

import { Logger } from '../data-ingestion/utils/logger';

// Core Rubric Types
export interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1, total should equal 1
  maxScore: number;
  category: RubricCategory;
  subCriteria?: RubricSubCriteria[];
}

export interface RubricSubCriteria {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1, relative to parent criteria
  maxScore: number;
  evaluationMethod: 'binary' | 'scale' | 'checklist' | 'llm_evaluation';
  evaluationPrompt?: string;
  expectedElements?: string[];
}

export type RubricCategory = 
  | 'accuracy' 
  | 'relevance' 
  | 'completeness' 
  | 'clarity' 
  | 'security_appropriateness'
  | 'actionability'
  | 'consistency'
  | 'timeliness';

export interface RubricScore {
  criteriaId: string;
  subCriteriaId?: string;
  score: number;
  maxScore: number;
  normalizedScore: number; // 0-1
  feedback: string;
  evidence: string[];
  confidence: number;
  timestamp: Date;
}

export interface RubricEvaluation {
  id: string;
  inputId: string;
  inputType: 'threat_analysis' | 'incident_response' | 'risk_assessment' | 'correlation_analysis' | 'general_query';
  rubricVersion: string;
  overallScore: number;
  categoryScores: Record<RubricCategory, number>;
  criteriaScores: RubricScore[];
  totalPossibleScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  evaluator: 'human' | 'llm' | 'automated';
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface RubricConfig {
  version: string;
  name: string;
  description: string;
  criteria: RubricCriteria[];
  gradeThresholds: {
    A: number; // 0.9+
    B: number; // 0.8-0.89
    C: number; // 0.7-0.79
    D: number; // 0.6-0.69
    F: number; // 0-0.59
  };
  enableLLMEvaluation: boolean;
  enableHumanReview: boolean;
  enableAutomatedScoring: boolean;
  llmModel: string;
  evaluationTimeoutMs: number;
  retryAttempts: number;
}

export class LLMRubricFramework {
  private logger: Logger;
  private config: RubricConfig;
  private defaultRubric: RubricCriteria[];

  constructor(config?: Partial<RubricConfig>) {
    this.logger = new Logger('LLMRubricFramework');
    this.config = {
      version: '1.0.0',
      name: 'SOC LLM Evaluation Rubric',
      description: 'Comprehensive rubric for evaluating LLM performance in security operations',
      criteria: [],
      gradeThresholds: {
        A: 0.9,
        B: 0.8,
        C: 0.7,
        D: 0.6,
        F: 0.0,
      },
      enableLLMEvaluation: true,
      enableHumanReview: false,
      enableAutomatedScoring: true,
      llmModel: 'gpt-4o-mini',
      evaluationTimeoutMs: 30000,
      retryAttempts: 3,
    };

    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initializeDefaultRubric();
  }

  /**
   * Initialize the default SOC-specific rubric
   */
  private initializeDefaultRubric(): void {
    this.defaultRubric = [
      // Accuracy Criteria
      {
        id: 'accuracy_factual',
        name: 'Factual Accuracy',
        description: 'The response contains factually correct information without errors',
        weight: 0.15,
        maxScore: 10,
        category: 'accuracy',
        subCriteria: [
          {
            id: 'accuracy_factual_verification',
            name: 'Fact Verification',
            description: 'All facts and claims are verifiable and accurate',
            weight: 0.6,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate the factual accuracy of this response on a scale of 0-10. Check for any incorrect information, false claims, or misleading statements.',
          },
          {
            id: 'accuracy_factual_consistency',
            name: 'Internal Consistency',
            description: 'The response is internally consistent without contradictions',
            weight: 0.4,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate the internal consistency of this response on a scale of 0-10. Check for any contradictory statements or conflicting information.',
          },
        ],
      },
      {
        id: 'accuracy_technical',
        name: 'Technical Accuracy',
        description: 'Technical information is correct and follows security best practices',
        weight: 0.15,
        maxScore: 10,
        category: 'accuracy',
        subCriteria: [
          {
            id: 'accuracy_technical_standards',
            name: 'Security Standards Compliance',
            description: 'Follows established security frameworks and standards',
            weight: 0.5,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate how well this response follows security standards and best practices on a scale of 0-10.',
            expectedElements: ['NIST', 'ISO 27001', 'CIS Controls', 'OWASP', 'MITRE ATT&CK'],
          },
          {
            id: 'accuracy_technical_terminology',
            name: 'Technical Terminology',
            description: 'Uses correct technical terminology and concepts',
            weight: 0.5,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate the technical accuracy of terminology and concepts used in this response on a scale of 0-10.',
          },
        ],
      },

      // Relevance Criteria
      {
        id: 'relevance_contextual',
        name: 'Contextual Relevance',
        description: 'The response directly addresses the specific question or context',
        weight: 0.12,
        maxScore: 10,
        category: 'relevance',
        subCriteria: [
          {
            id: 'relevance_contextual_directness',
            name: 'Direct Answer',
            description: 'Directly answers the question without unnecessary tangents',
            weight: 0.6,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate how directly this response answers the question on a scale of 0-10.',
          },
          {
            id: 'relevance_contextual_soc_focus',
            name: 'SOC Focus',
            description: 'Maintains focus on security operations center context',
            weight: 0.4,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate how well this response maintains focus on SOC operations and security context on a scale of 0-10.',
          },
        ],
      },
      {
        id: 'relevance_urgency',
        name: 'Urgency Appropriateness',
        description: 'Response appropriately addresses the urgency level of the situation',
        weight: 0.08,
        maxScore: 10,
        category: 'relevance',
        subCriteria: [
          {
            id: 'relevance_urgency_severity',
            name: 'Severity Matching',
            description: 'Response urgency matches the severity of the security situation',
            weight: 1.0,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate how well the urgency and tone of this response matches the severity of the security situation on a scale of 0-10.',
          },
        ],
      },

      // Completeness Criteria
      {
        id: 'completeness_coverage',
        name: 'Coverage Completeness',
        description: 'Covers all necessary aspects of the question or task',
        weight: 0.12,
        maxScore: 10,
        category: 'completeness',
        subCriteria: [
          {
            id: 'completeness_coverage_aspects',
            name: 'Aspect Coverage',
            description: 'Addresses all relevant aspects of the security question',
            weight: 0.7,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate how completely this response covers all relevant aspects of the security question on a scale of 0-10.',
          },
          {
            id: 'completeness_coverage_depth',
            name: 'Depth of Analysis',
            description: 'Provides sufficient depth of analysis for the context',
            weight: 0.3,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate the depth of analysis provided in this response on a scale of 0-10.',
          },
        ],
      },
      {
        id: 'completeness_evidence',
        name: 'Evidence and Support',
        description: 'Provides appropriate evidence and supporting information',
        weight: 0.08,
        maxScore: 10,
        category: 'completeness',
        subCriteria: [
          {
            id: 'completeness_evidence_sources',
            name: 'Source Attribution',
            description: 'Provides appropriate source attribution and evidence',
            weight: 0.6,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate how well this response provides evidence and source attribution on a scale of 0-10.',
          },
          {
            id: 'completeness_evidence_relevance',
            name: 'Evidence Relevance',
            description: 'Evidence directly supports the conclusions drawn',
            weight: 0.4,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate how relevant and supportive the evidence is to the conclusions in this response on a scale of 0-10.',
          },
        ],
      },

      // Clarity Criteria
      {
        id: 'clarity_communication',
        name: 'Communication Clarity',
        description: 'Response is clear, well-structured, and easy to understand',
        weight: 0.10,
        maxScore: 10,
        category: 'clarity',
        subCriteria: [
          {
            id: 'clarity_communication_structure',
            name: 'Structure and Organization',
            description: 'Response is well-structured and logically organized',
            weight: 0.4,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate the structure and organization of this response on a scale of 0-10.',
          },
          {
            id: 'clarity_communication_language',
            name: 'Language Clarity',
            description: 'Uses clear, concise language appropriate for the audience',
            weight: 0.6,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate the clarity and appropriateness of language used in this response on a scale of 0-10.',
          },
        ],
      },

      // Security Appropriateness Criteria
      {
        id: 'security_appropriateness_practices',
        name: 'Security Best Practices',
        description: 'Follows security best practices and guidelines',
        weight: 0.15,
        maxScore: 10,
        category: 'security_appropriateness',
        subCriteria: [
          {
            id: 'security_appropriateness_practices_standards',
            name: 'Standards Compliance',
            description: 'Adheres to security standards and frameworks',
            weight: 0.5,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate how well this response adheres to security standards and best practices on a scale of 0-10.',
          },
          {
            id: 'security_appropriateness_practices_risk',
            name: 'Risk Awareness',
            description: 'Demonstrates appropriate risk awareness and mitigation',
            weight: 0.5,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate the risk awareness and mitigation approach in this response on a scale of 0-10.',
          },
        ],
      },
      {
        id: 'security_appropriateness_context',
        name: 'Security Context Appropriateness',
        description: 'Response is appropriate for the security context and audience',
        weight: 0.10,
        maxScore: 10,
        category: 'security_appropriateness',
        subCriteria: [
          {
            id: 'security_appropriateness_context_audience',
            name: 'Audience Appropriateness',
            description: 'Response is appropriate for the intended security audience',
            weight: 0.6,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate how appropriate this response is for security professionals on a scale of 0-10.',
          },
          {
            id: 'security_appropriateness_context_sensitivity',
            name: 'Sensitivity Handling',
            description: 'Handles sensitive security information appropriately',
            weight: 0.4,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate how appropriately this response handles sensitive security information on a scale of 0-10.',
          },
        ],
      },

      // Actionability Criteria
      {
        id: 'actionability_guidance',
        name: 'Actionable Guidance',
        description: 'Provides clear, actionable guidance for security operations',
        weight: 0.12,
        maxScore: 10,
        category: 'actionability',
        subCriteria: [
          {
            id: 'actionability_guidance_steps',
            name: 'Clear Action Steps',
            description: 'Provides clear, step-by-step actionable guidance',
            weight: 0.6,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate how clear and actionable the guidance provided in this response is on a scale of 0-10.',
          },
          {
            id: 'actionability_guidance_priority',
            name: 'Priority and Urgency',
            description: 'Clearly indicates priority and urgency of actions',
            weight: 0.4,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate how well this response indicates priority and urgency of actions on a scale of 0-10.',
          },
        ],
      },
      {
        id: 'actionability_implementation',
        name: 'Implementation Feasibility',
        description: 'Guidance is practical and implementable in real SOC environments',
        weight: 0.08,
        maxScore: 10,
        category: 'actionability',
        subCriteria: [
          {
            id: 'actionability_implementation_practicality',
            name: 'Practical Implementation',
            description: 'Guidance is practical and feasible to implement',
            weight: 1.0,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate how practical and feasible the implementation guidance is in this response on a scale of 0-10.',
          },
        ],
      },

      // Consistency Criteria
      {
        id: 'consistency_internal',
        name: 'Internal Consistency',
        description: 'Response is internally consistent throughout',
        weight: 0.05,
        maxScore: 10,
        category: 'consistency',
        subCriteria: [
          {
            id: 'consistency_internal_coherence',
            name: 'Logical Coherence',
            description: 'Response maintains logical coherence throughout',
            weight: 1.0,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate the logical coherence and internal consistency of this response on a scale of 0-10.',
          },
        ],
      },

      // Timeliness Criteria
      {
        id: 'timeliness_responsiveness',
        name: 'Response Timeliness',
        description: 'Response is timely and appropriate for the urgency level',
        weight: 0.05,
        maxScore: 10,
        category: 'timeliness',
        subCriteria: [
          {
            id: 'timeliness_responsiveness_urgency',
            name: 'Urgency Appropriateness',
            description: 'Response timing matches the urgency of the situation',
            weight: 1.0,
            maxScore: 10,
            evaluationMethod: 'llm_evaluation',
            evaluationPrompt: 'Rate how well the response timing matches the urgency of the security situation on a scale of 0-10.',
          },
        ],
      },
    ];

    this.config.criteria = this.defaultRubric;
    this.logger.info('Default SOC LLM rubric initialized', {
      criteriaCount: this.defaultRubric.length,
      categories: [...new Set(this.defaultRubric.map(c => c.category))],
    });
  }

  /**
   * Evaluate an LLM response using the rubric
   */
  async evaluateResponse(
    response: string,
    context: {
      inputType: RubricEvaluation['inputType'];
      question?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<RubricEvaluation> {
    const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.logger.info('Starting LLM response evaluation', {
      evaluationId,
      inputType: context.inputType,
      responseLength: response.length,
    });

    const startTime = Date.now();
    const criteriaScores: RubricScore[] = [];
    const categoryScores: Record<RubricCategory, number> = {} as Record<RubricCategory, number>;

    try {
      // Evaluate each criteria
      for (const criteria of this.config.criteria) {
        const criteriaScore = await this.evaluateCriteria(criteria, response, context);
        criteriaScores.push(criteriaScore);

        // Update category scores
        if (!categoryScores[criteria.category]) {
          categoryScores[criteria.category] = 0;
        }
        categoryScores[criteria.category] += criteriaScore.normalizedScore * criteria.weight;
      }

      // Calculate overall score
      const totalPossibleScore = this.config.criteria.reduce((sum, c) => sum + c.maxScore * c.weight, 0);
      const totalActualScore = criteriaScores.reduce((sum, s) => sum + s.score * this.getCriteriaWeight(s.criteriaId), 0);
      const overallScore = totalActualScore / totalPossibleScore;

      // Determine grade
      const grade = this.determineGrade(overallScore);

      // Generate strengths, weaknesses, and recommendations
      const { strengths, weaknesses, recommendations } = this.generateFeedback(criteriaScores, categoryScores);

      const evaluation: RubricEvaluation = {
        id: evaluationId,
        inputId: context.metadata?.inputId || `input_${Date.now()}`,
        inputType: context.inputType,
        rubricVersion: this.config.version,
        overallScore,
        categoryScores,
        criteriaScores,
        totalPossibleScore,
        grade,
        strengths,
        weaknesses,
        recommendations,
        evaluator: this.config.enableLLMEvaluation ? 'llm' : 'automated',
        timestamp: new Date(),
        metadata: {
          ...context.metadata,
          evaluationTimeMs: Date.now() - startTime,
          responseLength: response.length,
        },
      };

      this.logger.info('LLM response evaluation completed', {
        evaluationId,
        overallScore: overallScore.toFixed(3),
        grade,
        evaluationTimeMs: Date.now() - startTime,
      });

      return evaluation;

    } catch (error) {
      this.logger.error('LLM response evaluation failed', {
        evaluationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Evaluate a specific criteria
   */
  private async evaluateCriteria(
    criteria: RubricCriteria,
    response: string,
    context: any
  ): Promise<RubricScore> {
    let totalScore = 0;
    let totalWeight = 0;
    const evidence: string[] = [];
    const feedback: string[] = [];

    if (criteria.subCriteria && criteria.subCriteria.length > 0) {
      // Evaluate sub-criteria
      for (const subCriteria of criteria.subCriteria) {
        const subScore = await this.evaluateSubCriteria(subCriteria, response, context);
        totalScore += subScore.score * subCriteria.weight;
        totalWeight += subCriteria.weight;
        evidence.push(...subScore.evidence);
        feedback.push(subScore.feedback);
      }
    } else {
      // Evaluate main criteria directly
      const score = await this.evaluateSubCriteria({
        id: criteria.id,
        name: criteria.name,
        description: criteria.description,
        weight: 1.0,
        maxScore: criteria.maxScore,
        evaluationMethod: 'llm_evaluation',
        evaluationPrompt: `Rate the ${criteria.name.toLowerCase()} of this response on a scale of 0-${criteria.maxScore}. ${criteria.description}`,
      }, response, context);
      
      totalScore = score.score;
      totalWeight = 1.0;
      evidence.push(...score.evidence);
      feedback.push(score.feedback);
    }

    const normalizedScore = totalWeight > 0 ? totalScore / (totalWeight * criteria.maxScore) : 0;

    return {
      criteriaId: criteria.id,
      score: totalScore,
      maxScore: criteria.maxScore,
      normalizedScore,
      feedback: feedback.join('; '),
      evidence,
      confidence: 0.8, // Would be calculated based on evaluation method
      timestamp: new Date(),
    };
  }

  /**
   * Evaluate a sub-criteria
   */
  private async evaluateSubCriteria(
    subCriteria: RubricSubCriteria,
    response: string,
    context: any
  ): Promise<RubricScore> {
    let score = 0;
    let feedback = '';
    const evidence: string[] = [];

    switch (subCriteria.evaluationMethod) {
      case 'binary':
        score = this.evaluateBinary(subCriteria, response, context);
        feedback = score > 0 ? 'Meets criteria' : 'Does not meet criteria';
        break;
      
      case 'scale':
        score = this.evaluateScale(subCriteria, response, context);
        feedback = `Score: ${score}/${subCriteria.maxScore}`;
        break;
      
      case 'checklist':
        const checklistResult = this.evaluateChecklist(subCriteria, response, context);
        score = checklistResult.score;
        feedback = checklistResult.feedback;
        evidence.push(...checklistResult.evidence);
        break;
      
      case 'llm_evaluation':
        const llmResult = await this.evaluateWithLLM(subCriteria, response, context);
        score = llmResult.score;
        feedback = llmResult.feedback;
        evidence.push(...llmResult.evidence);
        break;
    }

    return {
      criteriaId: subCriteria.id,
      score,
      maxScore: subCriteria.maxScore,
      normalizedScore: score / subCriteria.maxScore,
      feedback,
      evidence,
      confidence: 0.8,
      timestamp: new Date(),
    };
  }

  /**
   * Binary evaluation (pass/fail)
   */
  private evaluateBinary(subCriteria: RubricSubCriteria, response: string, context: any): number {
    // Simple keyword-based evaluation for demonstration
    if (subCriteria.expectedElements) {
      const foundElements = subCriteria.expectedElements.filter(element => 
        response.toLowerCase().includes(element.toLowerCase())
      );
      return foundElements.length > 0 ? subCriteria.maxScore : 0;
    }
    return response.length > 50 ? subCriteria.maxScore : 0; // Simple length check
  }

  /**
   * Scale evaluation (0 to maxScore)
   */
  private evaluateScale(subCriteria: RubricSubCriteria, response: string, context: any): number {
    // Simple length-based scoring for demonstration
    const responseLength = response.length;
    const maxLength = 1000; // Expected maximum response length
    return Math.min(subCriteria.maxScore, Math.floor((responseLength / maxLength) * subCriteria.maxScore));
  }

  /**
   * Checklist evaluation
   */
  private evaluateChecklist(
    subCriteria: RubricSubCriteria, 
    response: string, 
    context: any
  ): { score: number; feedback: string; evidence: string[] } {
    const evidence: string[] = [];
    let score = 0;

    if (subCriteria.expectedElements) {
      for (const element of subCriteria.expectedElements) {
        if (response.toLowerCase().includes(element.toLowerCase())) {
          score += subCriteria.maxScore / subCriteria.expectedElements.length;
          evidence.push(`Found: ${element}`);
        }
      }
    }

    const feedback = `Found ${evidence.length}/${subCriteria.expectedElements?.length || 1} expected elements`;
    return { score, feedback, evidence };
  }

  /**
   * LLM-based evaluation
   */
  private async evaluateWithLLM(
    subCriteria: RubricSubCriteria,
    response: string,
    context: any
  ): Promise<{ score: number; feedback: string; evidence: string[] }> {
    // This would integrate with actual LLM API calls
    // For now, we'll simulate the evaluation
    
    const prompt = `${subCriteria.evaluationPrompt}\n\nResponse to evaluate:\n${response}\n\nContext: ${JSON.stringify(context)}\n\nProvide a score from 0 to ${subCriteria.maxScore} and brief feedback.`;
    
    // Simulate LLM evaluation (replace with actual API call)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock evaluation result
    const score = Math.floor(Math.random() * (subCriteria.maxScore + 1));
    const feedback = `LLM evaluation: ${score}/${subCriteria.maxScore} - ${subCriteria.description}`;
    const evidence = [`LLM evaluation completed for ${subCriteria.name}`];

    return { score, feedback, evidence };
  }

  /**
   * Get criteria weight
   */
  private getCriteriaWeight(criteriaId: string): number {
    const criteria = this.config.criteria.find(c => c.id === criteriaId);
    return criteria?.weight || 0;
  }

  /**
   * Determine grade based on score
   */
  private determineGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= this.config.gradeThresholds.A) return 'A';
    if (score >= this.config.gradeThresholds.B) return 'B';
    if (score >= this.config.gradeThresholds.C) return 'C';
    if (score >= this.config.gradeThresholds.D) return 'D';
    return 'F';
  }

  /**
   * Generate feedback based on evaluation results
   */
  private generateFeedback(
    criteriaScores: RubricScore[],
    categoryScores: Record<RubricCategory, number>
  ): { strengths: string[]; weaknesses: string[]; recommendations: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    // Analyze category scores
    for (const [category, score] of Object.entries(categoryScores)) {
      if (score >= 0.8) {
        strengths.push(`Strong performance in ${category.replace('_', ' ')}`);
      } else if (score < 0.6) {
        weaknesses.push(`Needs improvement in ${category.replace('_', ' ')}`);
        recommendations.push(`Focus on improving ${category.replace('_', ' ')} skills`);
      }
    }

    // Analyze individual criteria scores
    const lowScores = criteriaScores.filter(s => s.normalizedScore < 0.6);
    for (const score of lowScores) {
      const criteria = this.config.criteria.find(c => c.id === score.criteriaId);
      if (criteria) {
        weaknesses.push(`Low score in ${criteria.name}: ${score.feedback}`);
        recommendations.push(`Improve ${criteria.name.toLowerCase()}: ${score.feedback}`);
      }
    }

    return { strengths, weaknesses, recommendations };
  }

  // Public API methods

  /**
   * Get current rubric configuration
   */
  getRubricConfig(): RubricConfig {
    return { ...this.config };
  }

  /**
   * Update rubric configuration
   */
  updateRubricConfig(config: Partial<RubricConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Rubric configuration updated', { config });
  }

  /**
   * Get criteria by category
   */
  getCriteriaByCategory(category: RubricCategory): RubricCriteria[] {
    return this.config.criteria.filter(c => c.category === category);
  }

  /**
   * Add custom criteria
   */
  addCriteria(criteria: RubricCriteria): void {
    this.config.criteria.push(criteria);
    this.logger.info('Custom criteria added', { criteriaId: criteria.id });
  }

  /**
   * Remove criteria
   */
  removeCriteria(criteriaId: string): boolean {
    const index = this.config.criteria.findIndex(c => c.id === criteriaId);
    if (index !== -1) {
      this.config.criteria.splice(index, 1);
      this.logger.info('Criteria removed', { criteriaId });
      return true;
    }
    return false;
  }

  /**
   * Export rubric configuration
   */
  exportRubric(format: 'json' | 'yaml'): string {
    if (format === 'json') {
      return JSON.stringify(this.config, null, 2);
    } else {
      // YAML export would be implemented here
      return JSON.stringify(this.config, null, 2);
    }
  }

  /**
   * Get rubric statistics
   */
  getRubricStats(): {
    totalCriteria: number;
    categoryCounts: Record<RubricCategory, number>;
    totalWeight: number;
    averageMaxScore: number;
  } {
    const categoryCounts = {} as Record<RubricCategory, number>;
    let totalWeight = 0;
    let totalMaxScore = 0;

    for (const criteria of this.config.criteria) {
      categoryCounts[criteria.category] = (categoryCounts[criteria.category] || 0) + 1;
      totalWeight += criteria.weight;
      totalMaxScore += criteria.maxScore;
    }

    return {
      totalCriteria: this.config.criteria.length,
      categoryCounts,
      totalWeight,
      averageMaxScore: this.config.criteria.length > 0 ? totalMaxScore / this.config.criteria.length : 0,
    };
  }
}

