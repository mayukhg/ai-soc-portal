/**
 * Guardrail Service
 * Comprehensive content filtering and audit logging service
 * 
 * This service provides:
 * - Content filtering for toxicity, bias, PII, and sensitive information
 * - Comprehensive audit logging of all filtered content
 * - Real-time content analysis and blocking
 * - Integration with audit service for compliance
 * - Customizable filtering rules and thresholds
 */

import { Logger } from '../data-ingestion/utils/logger';
import { AuditService, FilteredContent, AuditSeverity } from './audit-service';

export interface GuardrailConfig {
  enableToxicityFilter: boolean;
  enableBiasFilter: boolean;
  enablePIIFilter: boolean;
  enableSensitiveFilter: boolean;
  enableMaliciousFilter: boolean;
  enableInappropriateFilter: boolean;
  toxicityThreshold: number;
  biasThreshold: number;
  piiThreshold: number;
  sensitiveThreshold: number;
  maliciousThreshold: number;
  inappropriateThreshold: number;
  actionOnViolation: 'block' | 'filter' | 'sanitize' | 'warn';
  enableAuditLogging: boolean;
  enableRealTimeAnalysis: boolean;
  customRules: CustomRule[];
}

export interface CustomRule {
  id: string;
  name: string;
  description: string;
  pattern: string | RegExp;
  action: 'block' | 'filter' | 'sanitize' | 'warn';
  severity: AuditSeverity;
  enabled: boolean;
  category: string;
}

export interface ContentAnalysisResult {
  originalContent: string;
  filteredContent: string;
  violations: ContentViolation[];
  action: 'block' | 'filter' | 'sanitize' | 'allow';
  confidence: number;
  processingTimeMs: number;
}

export interface ContentViolation {
  type: 'toxicity' | 'bias' | 'pii' | 'sensitive' | 'malicious' | 'inappropriate' | 'custom';
  severity: AuditSeverity;
  confidence: number;
  originalText: string;
  filteredText: string;
  reason: string;
  ruleId?: string;
  position: { start: number; end: number };
}

export interface GuardrailStats {
  totalProcessed: number;
  violationsDetected: number;
  blockedContent: number;
  filteredContent: number;
  sanitizedContent: number;
  violationTypes: Record<string, number>;
  averageProcessingTime: number;
  lastProcessed: Date;
}

export class GuardrailService {
  private logger: Logger;
  private config: GuardrailConfig;
  private auditService?: AuditService;
  private stats: GuardrailStats;
  private customRules: Map<string, CustomRule>;

  constructor(config?: Partial<GuardrailConfig>, auditService?: AuditService) {
    this.logger = new Logger('GuardrailService');
    this.config = {
      enableToxicityFilter: true,
      enableBiasFilter: true,
      enablePIIFilter: true,
      enableSensitiveFilter: true,
      enableMaliciousFilter: true,
      enableInappropriateFilter: true,
      toxicityThreshold: 0.7,
      biasThreshold: 0.6,
      piiThreshold: 0.8,
      sensitiveThreshold: 0.7,
      maliciousThreshold: 0.9,
      inappropriateThreshold: 0.6,
      actionOnViolation: 'filter',
      enableAuditLogging: true,
      enableRealTimeAnalysis: true,
      customRules: [],
    };
    this.auditService = auditService;
    this.stats = {
      totalProcessed: 0,
      violationsDetected: 0,
      blockedContent: 0,
      filteredContent: 0,
      sanitizedContent: 0,
      violationTypes: {},
      averageProcessingTime: 0,
      lastProcessed: new Date(),
    };
    this.customRules = new Map();

    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initializeCustomRules();
  }

  private initializeCustomRules(): void {
    // Initialize default custom rules
    const defaultRules: CustomRule[] = [
      {
        id: 'soc_confidential',
        name: 'SOC Confidential Information',
        description: 'Blocks references to confidential SOC operations',
        pattern: /(confidential|classified|top.?secret|restricted)/gi,
        action: 'block',
        severity: 'high',
        enabled: true,
        category: 'soc_security',
      },
      {
        id: 'internal_ip',
        name: 'Internal IP Addresses',
        description: 'Filters internal IP addresses from responses',
        pattern: /\b(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)\d{1,3}\.\d{1,3}\b/g,
        action: 'sanitize',
        severity: 'medium',
        enabled: true,
        category: 'network_security',
      },
      {
        id: 'password_pattern',
        name: 'Password Patterns',
        description: 'Blocks password-like content',
        pattern: /(password|passwd|pwd)\s*[:=]\s*\S+/gi,
        action: 'block',
        severity: 'critical',
        enabled: true,
        category: 'credential_security',
      },
      {
        id: 'api_key_pattern',
        name: 'API Key Patterns',
        description: 'Blocks API key patterns',
        pattern: /(api[_-]?key|access[_-]?token|secret[_-]?key)\s*[:=]\s*\S+/gi,
        action: 'block',
        severity: 'critical',
        enabled: true,
        category: 'credential_security',
      },
    ];

    defaultRules.forEach(rule => {
      this.customRules.set(rule.id, rule);
    });

    this.logger.info('Guardrail service initialized', {
      enabledFilters: {
        toxicity: this.config.enableToxicityFilter,
        bias: this.config.enableBiasFilter,
        pii: this.config.enablePIIFilter,
        sensitive: this.config.enableSensitiveFilter,
        malicious: this.config.enableMaliciousFilter,
        inappropriate: this.config.enableInappropriateFilter,
      },
      customRules: this.customRules.size,
      actionOnViolation: this.config.actionOnViolation,
    });
  }

  /**
   * Analyze and filter content with comprehensive audit logging
   */
  async analyzeContent(
    content: string,
    context?: {
      userId?: string;
      sessionId?: string;
      requestId?: string;
      workflowId?: string;
      contentType?: string;
      source?: string;
    }
  ): Promise<ContentAnalysisResult> {
    const startTime = Date.now();
    this.logger.debug('Analyzing content', {
      contentLength: content.length,
      context,
    });

    try {
      const violations: ContentViolation[] = [];
      let filteredContent = content;
      let action: 'block' | 'filter' | 'sanitize' | 'allow' = 'allow';
      let maxSeverity: AuditSeverity = 'low';

      // Check toxicity
      if (this.config.enableToxicityFilter) {
        const toxicityViolations = await this.checkToxicity(content);
        violations.push(...toxicityViolations);
      }

      // Check bias
      if (this.config.enableBiasFilter) {
        const biasViolations = await this.checkBias(content);
        violations.push(...biasViolations);
      }

      // Check PII
      if (this.config.enablePIIFilter) {
        const piiViolations = await this.checkPII(content);
        violations.push(...piiViolations);
      }

      // Check sensitive information
      if (this.config.enableSensitiveFilter) {
        const sensitiveViolations = await this.checkSensitive(content);
        violations.push(...sensitiveViolations);
      }

      // Check malicious content
      if (this.config.enableMaliciousFilter) {
        const maliciousViolations = await this.checkMalicious(content);
        violations.push(...maliciousViolations);
      }

      // Check inappropriate content
      if (this.config.enableInappropriateFilter) {
        const inappropriateViolations = await this.checkInappropriate(content);
        violations.push(...inappropriateViolations);
      }

      // Check custom rules
      const customViolations = await this.checkCustomRules(content);
      violations.push(...customViolations);

      // Determine action based on violations
      if (violations.length > 0) {
        maxSeverity = this.getMaxSeverity(violations);
        action = this.determineAction(violations);
        filteredContent = await this.applyFiltering(content, violations, action);
      }

      const processingTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(violations);

      const result: ContentAnalysisResult = {
        originalContent: content,
        filteredContent,
        violations,
        action,
        confidence,
        processingTimeMs: processingTime,
      };

      // Update statistics
      this.updateStats(result);

      // Log audit event if violations detected
      if (violations.length > 0 && this.config.enableAuditLogging && this.auditService) {
        await this.logAuditEvent(result, context);
      }

      this.logger.info('Content analysis completed', {
        violations: violations.length,
        action,
        maxSeverity,
        confidence,
        processingTime,
      });

      return result;

    } catch (error) {
      this.logger.error('Content analysis failed', { error });
      throw error;
    }
  }

  /**
   * Check for toxicity in content
   */
  private async checkToxicity(content: string): Promise<ContentViolation[]> {
    const violations: ContentViolation[] = [];
    
    // Simple toxicity detection (in production, would use ML models)
    const toxicPatterns = [
      { pattern: /\b(hate|hatred|hateful)\b/gi, reason: 'Hate speech detected' },
      { pattern: /\b(violence|violent|aggressive)\b/gi, reason: 'Violent content detected' },
      { pattern: /\b(threat|threaten|threatening)\b/gi, reason: 'Threatening language detected' },
      { pattern: /\b(abuse|abusive|harassment)\b/gi, reason: 'Abusive language detected' },
    ];

    for (const { pattern, reason } of toxicPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        const confidence = Math.min(0.9, matches.length * 0.2);
        if (confidence >= this.config.toxicityThreshold) {
          violations.push({
            type: 'toxicity',
            severity: confidence > 0.8 ? 'high' : 'medium',
            confidence,
            originalText: matches.join(' '),
            filteredText: '[FILTERED]',
            reason,
            position: { start: 0, end: content.length },
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check for bias in content
   */
  private async checkBias(content: string): Promise<ContentViolation[]> {
    const violations: ContentViolation[] = [];
    
    // Simple bias detection patterns
    const biasPatterns = [
      { pattern: /\b(all|every|none|never)\s+(men|women|people|users)\b/gi, reason: 'Generalization bias detected' },
      { pattern: /\b(always|never)\s+(good|bad|right|wrong)\b/gi, reason: 'Absolute bias detected' },
      { pattern: /\b(obviously|clearly|undoubtedly)\b/gi, reason: 'Presumption bias detected' },
    ];

    for (const { pattern, reason } of biasPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        const confidence = Math.min(0.8, matches.length * 0.15);
        if (confidence >= this.config.biasThreshold) {
          violations.push({
            type: 'bias',
            severity: 'medium',
            confidence,
            originalText: matches.join(' '),
            filteredText: '[BIAS FILTERED]',
            reason,
            position: { start: 0, end: content.length },
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check for PII in content
   */
  private async checkPII(content: string): Promise<ContentViolation[]> {
    const violations: ContentViolation[] = [];
    
    // PII detection patterns
    const piiPatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, reason: 'SSN pattern detected' },
      { pattern: /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, reason: 'Credit card pattern detected' },
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, reason: 'Email address detected' },
      { pattern: /\b\d{3}-\d{3}-\d{4}\b/g, reason: 'Phone number pattern detected' },
    ];

    for (const { pattern, reason } of piiPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        const confidence = Math.min(0.95, matches.length * 0.3);
        if (confidence >= this.config.piiThreshold) {
          violations.push({
            type: 'pii',
            severity: 'high',
            confidence,
            originalText: matches.join(' '),
            filteredText: '[PII FILTERED]',
            reason,
            position: { start: 0, end: content.length },
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check for sensitive information
   */
  private async checkSensitive(content: string): Promise<ContentViolation[]> {
    const violations: ContentViolation[] = [];
    
    // Sensitive information patterns
    const sensitivePatterns = [
      { pattern: /\b(password|passwd|pwd)\s*[:=]\s*\S+/gi, reason: 'Password reference detected' },
      { pattern: /\b(api[_-]?key|access[_-]?token|secret[_-]?key)\s*[:=]\s*\S+/gi, reason: 'API key pattern detected' },
      { pattern: /\b(confidential|classified|top.?secret|restricted)\b/gi, reason: 'Confidential information detected' },
    ];

    for (const { pattern, reason } of sensitivePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        const confidence = Math.min(0.9, matches.length * 0.25);
        if (confidence >= this.config.sensitiveThreshold) {
          violations.push({
            type: 'sensitive',
            severity: 'high',
            confidence,
            originalText: matches.join(' '),
            filteredText: '[SENSITIVE FILTERED]',
            reason,
            position: { start: 0, end: content.length },
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check for malicious content
   */
  private async checkMalicious(content: string): Promise<ContentViolation[]> {
    const violations: ContentViolation[] = [];
    
    // Malicious content patterns
    const maliciousPatterns = [
      { pattern: /<script[^>]*>.*?<\/script>/gi, reason: 'Script injection detected' },
      { pattern: /javascript:/gi, reason: 'JavaScript injection detected' },
      { pattern: /on\w+\s*=/gi, reason: 'Event handler injection detected' },
      { pattern: /eval\s*\(/gi, reason: 'Code execution attempt detected' },
    ];

    for (const { pattern, reason } of maliciousPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        const confidence = Math.min(0.95, matches.length * 0.4);
        if (confidence >= this.config.maliciousThreshold) {
          violations.push({
            type: 'malicious',
            severity: 'critical',
            confidence,
            originalText: matches.join(' '),
            filteredText: '[MALICIOUS CONTENT BLOCKED]',
            reason,
            position: { start: 0, end: content.length },
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check for inappropriate content
   */
  private async checkInappropriate(content: string): Promise<ContentViolation[]> {
    const violations: ContentViolation[] = [];
    
    // Inappropriate content patterns
    const inappropriatePatterns = [
      { pattern: /\b(explicit|adult|nsfw)\b/gi, reason: 'Explicit content detected' },
      { pattern: /\b(drug|illegal|substance)\b/gi, reason: 'Illegal substance reference detected' },
      { pattern: /\b(gambling|casino|betting)\b/gi, reason: 'Gambling content detected' },
    ];

    for (const { pattern, reason } of inappropriatePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        const confidence = Math.min(0.8, matches.length * 0.2);
        if (confidence >= this.config.inappropriateThreshold) {
          violations.push({
            type: 'inappropriate',
            severity: 'medium',
            confidence,
            originalText: matches.join(' '),
            filteredText: '[INAPPROPRIATE FILTERED]',
            reason,
            position: { start: 0, end: content.length },
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check custom rules
   */
  private async checkCustomRules(content: string): Promise<ContentViolation[]> {
    const violations: ContentViolation[] = [];
    
    for (const rule of this.customRules.values()) {
      if (!rule.enabled) continue;
      
      const matches = content.match(rule.pattern);
      if (matches) {
        violations.push({
          type: 'custom',
          severity: rule.severity,
          confidence: 0.9,
          originalText: matches.join(' '),
          filteredText: `[${rule.name.toUpperCase()} FILTERED]`,
          reason: rule.description,
          ruleId: rule.id,
          position: { start: 0, end: content.length },
        });
      }
    }

    return violations;
  }

  /**
   * Apply filtering based on violations and action
   */
  private async applyFiltering(
    content: string,
    violations: ContentViolation[],
    action: 'block' | 'filter' | 'sanitize' | 'allow'
  ): Promise<string> {
    switch (action) {
      case 'block':
        return '[CONTENT BLOCKED DUE TO POLICY VIOLATIONS]';
      
      case 'filter':
        let filteredContent = content;
        for (const violation of violations) {
          filteredContent = filteredContent.replace(violation.originalText, violation.filteredText);
        }
        return filteredContent;
      
      case 'sanitize':
        let sanitizedContent = content;
        for (const violation of violations) {
          sanitizedContent = sanitizedContent.replace(violation.originalText, '[SANITIZED]');
        }
        return sanitizedContent;
      
      case 'allow':
      default:
        return content;
    }
  }

  /**
   * Determine action based on violations
   */
  private determineAction(violations: ContentViolation[]): 'block' | 'filter' | 'sanitize' | 'allow' {
    const maxSeverity = this.getMaxSeverity(violations);
    
    if (maxSeverity === 'critical') return 'block';
    if (maxSeverity === 'high') return this.config.actionOnViolation === 'block' ? 'block' : 'filter';
    if (maxSeverity === 'medium') return 'filter';
    if (maxSeverity === 'low') return 'sanitize';
    
    return 'allow';
  }

  /**
   * Get maximum severity from violations
   */
  private getMaxSeverity(violations: ContentViolation[]): AuditSeverity {
    if (violations.length === 0) return 'low';
    
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const maxScore = Math.max(...violations.map(v => severityScores[v.severity]));
    
    return Object.keys(severityScores).find(key => 
      severityScores[key as AuditSeverity] === maxScore
    ) as AuditSeverity;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(violations: ContentViolation[]): number {
    if (violations.length === 0) return 1.0;
    
    const avgConfidence = violations.reduce((sum, v) => sum + v.confidence, 0) / violations.length;
    return Math.min(1.0, avgConfidence);
  }

  /**
   * Update statistics
   */
  private updateStats(result: ContentAnalysisResult): void {
    this.stats.totalProcessed++;
    this.stats.lastProcessed = new Date();
    
    if (result.violations.length > 0) {
      this.stats.violationsDetected++;
      
      switch (result.action) {
        case 'block':
          this.stats.blockedContent++;
          break;
        case 'filter':
          this.stats.filteredContent++;
          break;
        case 'sanitize':
          this.stats.sanitizedContent++;
          break;
      }
      
      // Update violation types
      result.violations.forEach(violation => {
        this.stats.violationTypes[violation.type] = (this.stats.violationTypes[violation.type] || 0) + 1;
      });
    }
    
    // Update average processing time
    const totalTime = this.stats.averageProcessingTime * (this.stats.totalProcessed - 1) + result.processingTimeMs;
    this.stats.averageProcessingTime = totalTime / this.stats.totalProcessed;
  }

  /**
   * Log audit event for violations
   */
  private async logAuditEvent(
    result: ContentAnalysisResult,
    context?: {
      userId?: string;
      sessionId?: string;
      requestId?: string;
      workflowId?: string;
      contentType?: string;
      source?: string;
    }
  ): Promise<void> {
    if (!this.auditService) return;

    const filteredContent: FilteredContent[] = result.violations.map(violation => ({
      filterId: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filterType: violation.type as any,
      originalText: violation.originalText,
      filteredText: violation.filteredText,
      filterReason: violation.reason,
      confidenceScore: violation.confidence,
      severity: violation.severity,
      timestamp: new Date(),
    }));

    await this.auditService.logGuardrailAction({
      originalContent: result.originalContent,
      filteredContent,
      userId: context?.userId,
      sessionId: context?.sessionId,
      requestId: context?.requestId,
      workflowId: context?.workflowId,
      guardrailType: 'content_filter',
      action: result.action,
      result: result.action === 'allow' ? 'success' : 'blocked',
      metadata: {
        contentType: context?.contentType,
        source: context?.source,
        violations: result.violations.length,
        confidence: result.confidence,
        processingTime: result.processingTimeMs,
      },
    });
  }

  /**
   * Add custom rule
   */
  addCustomRule(rule: CustomRule): void {
    this.customRules.set(rule.id, rule);
    this.logger.info('Custom rule added', { ruleId: rule.id, ruleName: rule.name });
  }

  /**
   * Remove custom rule
   */
  removeCustomRule(ruleId: string): boolean {
    const removed = this.customRules.delete(ruleId);
    if (removed) {
      this.logger.info('Custom rule removed', { ruleId });
    }
    return removed;
  }

  /**
   * Update custom rule
   */
  updateCustomRule(ruleId: string, updates: Partial<CustomRule>): boolean {
    const rule = this.customRules.get(ruleId);
    if (!rule) return false;
    
    const updatedRule = { ...rule, ...updates };
    this.customRules.set(ruleId, updatedRule);
    this.logger.info('Custom rule updated', { ruleId, updates });
    return true;
  }

  /**
   * Get custom rules
   */
  getCustomRules(): CustomRule[] {
    return Array.from(this.customRules.values());
  }

  /**
   * Get statistics
   */
  getStats(): GuardrailStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      violationsDetected: 0,
      blockedContent: 0,
      filteredContent: 0,
      sanitizedContent: 0,
      violationTypes: {},
      averageProcessingTime: 0,
      lastProcessed: new Date(),
    };
    this.logger.info('Statistics reset');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GuardrailConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Guardrail configuration updated', { config });
  }

  /**
   * Get configuration
   */
  getConfig(): GuardrailConfig {
    return { ...this.config };
  }

  /**
   * Get service status
   */
  getServiceStatus(): {
    isEnabled: boolean;
    totalRules: number;
    customRules: number;
    stats: GuardrailStats;
  } {
    return {
      isEnabled: true,
      totalRules: 6 + this.customRules.size, // 6 built-in filters + custom rules
      customRules: this.customRules.size,
      stats: this.getStats(),
    };
  }
}
