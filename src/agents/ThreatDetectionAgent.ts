/**
 * Threat Detection Agent
 * 
 * The Threat Detection Agent is responsible for identifying, analyzing, and
 * classifying security threats. It uses various detection methods including
 * pattern matching, anomaly detection, and threat intelligence correlation.
 */

import { BaseAgent } from './BaseAgent';
import { 
  AgentType, 
  AgentCapability, 
  AgentMessage, 
  MessageType, 
  MessagePriority,
  AgentTask,
  TaskStatus,
  ThreatData,
  ThreatType,
  ThreatSeverity,
  ThreatIndicator,
  LogLevel
} from '../types/agent';
import { sampleDataService, SecurityEvent } from '../services/sampleDataService';

interface DetectionRule {
  id: string;
  name: string;
  description: string;
  pattern: string | RegExp;
  severity: ThreatSeverity;
  type: ThreatType;
  enabled: boolean;
  confidence: number;
}

interface AnomalyThreshold {
  metric: string;
  threshold: number;
  window: number; // Time window in seconds
  severity: ThreatSeverity;
}

export class ThreatDetectionAgent extends BaseAgent {
  private detectionRules: Map<string, DetectionRule>;
  private anomalyThresholds: Map<string, AnomalyThreshold>;
  private threatHistory: ThreatData[];
  private detectionStats: {
    totalDetections: number;
    falsePositives: number;
    truePositives: number;
    lastUpdated: Date;
  };

  constructor() {
    const capabilities: AgentCapability[] = [
      {
        name: 'detect_threats',
        description: 'Analyze data for security threats',
        parameters: { data: 'object', source: 'string' },
        returnType: 'array'
      },
      {
        name: 'analyze_patterns',
        description: 'Identify patterns in security events',
        parameters: { events: 'array', timeWindow: 'number' },
        returnType: 'object'
      },
      {
        name: 'correlate_events',
        description: 'Correlate multiple security events',
        parameters: { events: 'array', correlationType: 'string' },
        returnType: 'object'
      },
      {
        name: 'assess_threat_level',
        description: 'Assess the overall threat level',
        parameters: { indicators: 'array', context: 'object' },
        returnType: 'object'
      }
    ];

    super('threat_detection', 'Threat Detection Agent', AgentType.THREAT_DETECTION, capabilities);

    this.detectionRules = new Map();
    this.anomalyThresholds = new Map();
    this.threatHistory = [];
    this.detectionStats = {
      totalDetections: 0,
      falsePositives: 0,
      truePositives: 0,
      lastUpdated: new Date()
    };

    this.initializeDetectionRules();
    this.initializeAnomalyThresholds();
    this.registerThreatDetectionHandlers();
  }

  /**
   * Detect threats in the provided data
   */
  public async detectThreats(data: any, source: string): Promise<ThreatData[]> {
    this.log(LogLevel.INFO, `Analyzing data from source: ${source}`);
    
    const threats: ThreatData[] = [];
    const startTime = Date.now();

    try {
      // If no data provided, use sample data
      let eventsToAnalyze: SecurityEvent[];
      if (!data || Object.keys(data).length === 0) {
        eventsToAnalyze = sampleDataService.getSecurityEvents();
        this.log(LogLevel.INFO, `Using sample data: ${eventsToAnalyze.length} events`);
      } else {
        eventsToAnalyze = Array.isArray(data) ? data : [data];
      }

      // Apply detection rules
      const ruleBasedThreats = await this.applyDetectionRules(eventsToAnalyze, source);
      threats.push(...ruleBasedThreats);

      // Perform anomaly detection
      const anomalyThreats = await this.detectAnomalies(eventsToAnalyze, source);
      threats.push(...anomalyThreats);

      // Correlate events
      const correlatedThreats = await this.correlateEvents(threats, eventsToAnalyze);
      threats.push(...correlatedThreats);

      // Update detection statistics
      this.updateDetectionStats(threats.length, startTime);

      // Store threats in history
      this.threatHistory.push(...threats);

      this.log(LogLevel.INFO, `Detected ${threats.length} threats from ${source}`);
      return threats;
    } catch (error) {
      this.log(LogLevel.ERROR, `Error detecting threats: ${error}`);
      throw error;
    }
  }

  /**
   * Analyze patterns in security events
   */
  public async analyzePatterns(events: any[], timeWindow: number): Promise<any> {
    this.log(LogLevel.INFO, `Analyzing patterns in ${events.length} events over ${timeWindow}s`);
    
    const patterns: any = {
      frequency: {},
      sequences: [],
      correlations: [],
      anomalies: []
    };

    try {
      // Analyze event frequency
      patterns.frequency = this.analyzeEventFrequency(events, timeWindow);

      // Detect event sequences
      patterns.sequences = this.detectEventSequences(events);

      // Find correlations
      patterns.correlations = this.findEventCorrelations(events);

      // Identify anomalies
      patterns.anomalies = this.identifyAnomalies(events);

      return patterns;
    } catch (error) {
      this.log(LogLevel.ERROR, `Error analyzing patterns: ${error}`);
      throw error;
    }
  }

  /**
   * Correlate multiple security events
   */
  public async correlateEvents(events: any[], correlationType: string): Promise<any> {
    this.log(LogLevel.INFO, `Correlating ${events.length} events using ${correlationType}`);
    
    const correlation: any = {
      type: correlationType,
      timestamp: new Date(),
      events: events,
      patterns: [],
      threats: []
    };

    try {
      switch (correlationType) {
        case 'temporal':
          correlation.patterns = this.temporalCorrelation(events);
          break;
        case 'spatial':
          correlation.patterns = this.spatialCorrelation(events);
          break;
        case 'behavioral':
          correlation.patterns = this.behavioralCorrelation(events);
          break;
        case 'threat_intelligence':
          correlation.patterns = await this.threatIntelligenceCorrelation(events);
          break;
        default:
          throw new Error(`Unknown correlation type: ${correlationType}`);
      }

      // Generate threats from correlations
      correlation.threats = this.generateThreatsFromCorrelations(correlation.patterns);

      return correlation;
    } catch (error) {
      this.log(LogLevel.ERROR, `Error correlating events: ${error}`);
      throw error;
    }
  }

  /**
   * Assess the overall threat level
   */
  public async assessThreatLevel(indicators: ThreatIndicator[], context: any): Promise<any> {
    this.log(LogLevel.INFO, `Assessing threat level with ${indicators.length} indicators`);
    
    const assessment: any = {
      timestamp: new Date(),
      indicators: indicators,
      context: context,
      overallLevel: ThreatSeverity.LOW,
      confidence: 0,
      factors: [],
      recommendations: []
    };

    try {
      // Calculate threat score
      const threatScore = this.calculateThreatScore(indicators);
      assessment.overallLevel = this.mapScoreToSeverity(threatScore);

      // Assess confidence
      assessment.confidence = this.calculateConfidence(indicators);

      // Identify contributing factors
      assessment.factors = this.identifyThreatFactors(indicators, context);

      // Generate recommendations
      assessment.recommendations = this.generateRecommendations(assessment);

      return assessment;
    } catch (error) {
      this.log(LogLevel.ERROR, `Error assessing threat level: ${error}`);
      throw error;
    }
  }

  /**
   * Add a new detection rule
   */
  public addDetectionRule(rule: DetectionRule): void {
    this.detectionRules.set(rule.id, rule);
    this.log(LogLevel.INFO, `Added detection rule: ${rule.name}`);
  }

  /**
   * Update an existing detection rule
   */
  public updateDetectionRule(ruleId: string, updates: Partial<DetectionRule>): void {
    const rule = this.detectionRules.get(ruleId);
    if (rule) {
      this.detectionRules.set(ruleId, { ...rule, ...updates });
      this.log(LogLevel.INFO, `Updated detection rule: ${ruleId}`);
    }
  }

  /**
   * Get detection statistics
   */
  public getDetectionStats(): any {
    return {
      ...this.detectionStats,
      accuracy: this.calculateAccuracy(),
      rules: this.detectionRules.size,
      thresholds: this.anomalyThresholds.size,
      history: this.threatHistory.length
    };
  }

  /**
   * Apply detection rules to data
   */
  private async applyDetectionRules(data: any, source: string): Promise<ThreatData[]> {
    const threats: ThreatData[] = [];

    for (const [ruleId, rule] of this.detectionRules) {
      if (!rule.enabled) continue;

      try {
        const matches = this.matchRule(rule, data);
        if (matches.length > 0) {
          const threat: ThreatData = {
            id: this.generateId(),
            type: rule.type,
            severity: rule.severity,
            source: source,
            timestamp: new Date(),
            indicators: matches.map(match => ({
              type: 'pattern_match',
              value: match,
              confidence: rule.confidence,
              source: rule.name
            })),
            description: `${rule.description} - ${matches.length} matches found`,
            confidence: rule.confidence
          };

          threats.push(threat);
        }
      } catch (error) {
        this.log(LogLevel.ERROR, `Error applying rule ${ruleId}: ${error}`);
      }
    }

    return threats;
  }

  /**
   * Detect anomalies in data
   */
  private async detectAnomalies(data: any, source: string): Promise<ThreatData[]> {
    const threats: ThreatData[] = [];

    for (const [metric, threshold] of this.anomalyThresholds) {
      try {
        const value = this.extractMetricValue(data, metric);
        if (value > threshold.threshold) {
          const threat: ThreatData = {
            id: this.generateId(),
            type: ThreatType.APT, // Advanced Persistent Threat
            severity: threshold.severity,
            source: source,
            timestamp: new Date(),
            indicators: [{
              type: 'anomaly',
              value: `${metric}: ${value} > ${threshold.threshold}`,
              confidence: 0.8,
              source: 'anomaly_detection'
            }],
            description: `Anomaly detected in ${metric}: ${value} exceeds threshold ${threshold.threshold}`,
            confidence: 0.8
          };

          threats.push(threat);
        }
      } catch (error) {
        this.log(LogLevel.ERROR, `Error detecting anomaly for ${metric}: ${error}`);
      }
    }

    return threats;
  }

  /**
   * Match a rule against data
   */
  private matchRule(rule: DetectionRule, data: any): string[] {
    const matches: string[] = [];
    const dataString = JSON.stringify(data);

    if (typeof rule.pattern === 'string') {
      if (dataString.includes(rule.pattern)) {
        matches.push(rule.pattern);
      }
    } else if (rule.pattern instanceof RegExp) {
      const regexMatches = dataString.match(rule.pattern);
      if (regexMatches) {
        matches.push(...regexMatches);
      }
    }

    return matches;
  }

  /**
   * Extract metric value from data
   */
  private extractMetricValue(data: any, metric: string): number {
    const keys = metric.split('.');
    let value = data;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return 0;
      }
    }

    return typeof value === 'number' ? value : 0;
  }

  /**
   * Analyze event frequency
   */
  private analyzeEventFrequency(events: any[], timeWindow: number): any {
    const frequency: any = {};
    
    events.forEach(event => {
      const type = event.type || 'unknown';
      frequency[type] = (frequency[type] || 0) + 1;
    });

    return frequency;
  }

  /**
   * Detect event sequences
   */
  private detectEventSequences(events: any[]): any[] {
    const sequences: any[] = [];
    
    // Simple sequence detection (can be enhanced with more sophisticated algorithms)
    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i];
      const next = events[i + 1];
      
      if (current.type && next.type) {
        sequences.push({
          sequence: [current.type, next.type],
          timestamp: current.timestamp,
          confidence: 0.7
        });
      }
    }

    return sequences;
  }

  /**
   * Find event correlations
   */
  private findEventCorrelations(events: any[]): any[] {
    const correlations: any[] = [];
    
    // Simple correlation detection
    const eventTypes = events.map(e => e.type).filter(Boolean);
    const uniqueTypes = [...new Set(eventTypes)];
    
    uniqueTypes.forEach(type1 => {
      uniqueTypes.forEach(type2 => {
        if (type1 !== type2) {
          const count1 = eventTypes.filter(t => t === type1).length;
          const count2 = eventTypes.filter(t => t === type2).length;
          
          if (count1 > 0 && count2 > 0) {
            correlations.push({
              types: [type1, type2],
              correlation: Math.min(count1, count2) / Math.max(count1, count2),
              confidence: 0.6
            });
          }
        }
      });
    });

    return correlations;
  }

  /**
   * Identify anomalies in events
   */
  private identifyAnomalies(events: any[]): any[] {
    const anomalies: any[] = [];
    
    // Simple anomaly detection based on event frequency
    const frequency = this.analyzeEventFrequency(events, 0);
    const avgFrequency = Object.values(frequency).reduce((a: any, b: any) => a + b, 0) / Object.keys(frequency).length;
    
    Object.entries(frequency).forEach(([type, count]) => {
      if ((count as number) > avgFrequency * 2) {
        anomalies.push({
          type: 'frequency_anomaly',
          eventType: type,
          count: count,
          threshold: avgFrequency * 2,
          confidence: 0.7
        });
      }
    });

    return anomalies;
  }

  /**
   * Temporal correlation
   */
  private temporalCorrelation(events: any[]): any[] {
    return events
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((event, index) => ({
        event,
        temporalPosition: index,
        timeFromStart: new Date(event.timestamp).getTime() - new Date(events[0].timestamp).getTime()
      }));
  }

  /**
   * Spatial correlation
   */
  private spatialCorrelation(events: any[]): any[] {
    return events
      .filter(event => event.location || event.source)
      .map(event => ({
        event,
        location: event.location || event.source,
        spatialGroup: this.groupByLocation(events, event.location || event.source)
      }));
  }

  /**
   * Behavioral correlation
   */
  private behavioralCorrelation(events: any[]): any[] {
    return events
      .filter(event => event.user || event.session)
      .map(event => ({
        event,
        user: event.user,
        session: event.session,
        behaviorPattern: this.identifyBehaviorPattern(events, event.user || event.session)
      }));
  }

  /**
   * Threat intelligence correlation
   */
  private async threatIntelligenceCorrelation(events: any[]): Promise<any[]> {
    // This would typically involve external threat intelligence APIs
    return events.map(event => ({
      event,
      threatIntel: {
        iocMatches: [],
        reputation: 'unknown',
        confidence: 0.5
      }
    }));
  }

  /**
   * Generate threats from correlations
   */
  private generateThreatsFromCorrelations(patterns: any[]): ThreatData[] {
    const threats: ThreatData[] = [];
    
    patterns.forEach(pattern => {
      if (pattern.correlation && pattern.correlation > 0.8) {
        threats.push({
          id: this.generateId(),
          type: ThreatType.APT,
          severity: ThreatSeverity.MEDIUM,
          source: 'correlation_analysis',
          timestamp: new Date(),
          indicators: [{
            type: 'correlation',
            value: `Correlation between ${pattern.types?.join(' and ') || 'events'}`,
            confidence: pattern.confidence || 0.7,
            source: 'pattern_analysis'
          }],
          description: `High correlation detected in security events`,
          confidence: pattern.confidence || 0.7
        });
      }
    });

    return threats;
  }

  /**
   * Calculate threat score
   */
  private calculateThreatScore(indicators: ThreatIndicator[]): number {
    return indicators.reduce((score, indicator) => {
      return score + (indicator.confidence * 10);
    }, 0) / indicators.length;
  }

  /**
   * Map score to severity
   */
  private mapScoreToSeverity(score: number): ThreatSeverity {
    if (score >= 8) return ThreatSeverity.CRITICAL;
    if (score >= 6) return ThreatSeverity.HIGH;
    if (score >= 4) return ThreatSeverity.MEDIUM;
    return ThreatSeverity.LOW;
  }

  /**
   * Calculate confidence
   */
  private calculateConfidence(indicators: ThreatIndicator[]): number {
    return indicators.reduce((sum, indicator) => sum + indicator.confidence, 0) / indicators.length;
  }

  /**
   * Identify threat factors
   */
  private identifyThreatFactors(indicators: ThreatIndicator[], context: any): string[] {
    const factors: string[] = [];
    
    indicators.forEach(indicator => {
      if (indicator.confidence > 0.7) {
        factors.push(`High confidence ${indicator.type} indicator`);
      }
    });

    if (context.source) {
      factors.push(`Suspicious source: ${context.source}`);
    }

    return factors;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(assessment: any): string[] {
    const recommendations: string[] = [];
    
    if (assessment.overallLevel === ThreatSeverity.CRITICAL) {
      recommendations.push('Immediate incident response required');
      recommendations.push('Activate emergency procedures');
    } else if (assessment.overallLevel === ThreatSeverity.HIGH) {
      recommendations.push('Enhanced monitoring recommended');
      recommendations.push('Review security controls');
    } else if (assessment.overallLevel === ThreatSeverity.MEDIUM) {
      recommendations.push('Continue monitoring');
      recommendations.push('Update threat intelligence');
    }

    return recommendations;
  }

  /**
   * Update detection statistics
   */
  private updateDetectionStats(count: number, startTime: number): void {
    this.detectionStats.totalDetections += count;
    this.detectionStats.lastUpdated = new Date();
  }

  /**
   * Calculate detection accuracy
   */
  private calculateAccuracy(): number {
    const total = this.detectionStats.truePositives + this.detectionStats.falsePositives;
    return total > 0 ? this.detectionStats.truePositives / total : 0;
  }

  /**
   * Group events by location
   */
  private groupByLocation(events: any[], location: string): any[] {
    return events.filter(event => event.location === location || event.source === location);
  }

  /**
   * Identify behavior pattern
   */
  private identifyBehaviorPattern(events: any[], identifier: string): string {
    const userEvents = events.filter(event => event.user === identifier || event.session === identifier);
    const eventTypes = userEvents.map(e => e.type);
    
    if (eventTypes.length > 10) return 'high_activity';
    if (eventTypes.length > 5) return 'moderate_activity';
    return 'low_activity';
  }

  /**
   * Initialize detection rules
   */
  private initializeDetectionRules(): void {
    const defaultRules: DetectionRule[] = [
      {
        id: 'failed_login_attempts',
        name: 'Failed Login Attempts',
        description: 'Detect multiple failed login attempts',
        pattern: /failed.*login/i,
        severity: ThreatSeverity.MEDIUM,
        type: ThreatType.INSIDER_THREAT,
        enabled: true,
        confidence: 0.7
      },
      {
        id: 'suspicious_file_access',
        name: 'Suspicious File Access',
        description: 'Detect unusual file access patterns',
        pattern: /access.*denied|unauthorized.*access/i,
        severity: ThreatSeverity.HIGH,
        type: ThreatType.DATA_BREACH,
        enabled: true,
        confidence: 0.8
      },
      {
        id: 'network_scanning',
        name: 'Network Scanning',
        description: 'Detect network scanning activities',
        pattern: /port.*scan|network.*probe/i,
        severity: ThreatSeverity.HIGH,
        type: ThreatType.APT,
        enabled: true,
        confidence: 0.9
      }
    ];

    defaultRules.forEach(rule => this.detectionRules.set(rule.id, rule));
  }

  /**
   * Initialize anomaly thresholds
   */
  private initializeAnomalyThresholds(): void {
    const defaultThresholds: AnomalyThreshold[] = [
      {
        metric: 'events_per_minute',
        threshold: 100,
        window: 60,
        severity: ThreatSeverity.HIGH
      },
      {
        metric: 'failed_attempts',
        threshold: 10,
        window: 300,
        severity: ThreatSeverity.MEDIUM
      },
      {
        metric: 'unique_ips',
        threshold: 50,
        window: 3600,
        severity: ThreatSeverity.HIGH
      }
    ];

    defaultThresholds.forEach(threshold => 
      this.anomalyThresholds.set(threshold.metric, threshold)
    );
  }

  /**
   * Register threat detection handlers
   */
  private registerThreatDetectionHandlers(): void {
    // Message handlers
    this.registerMessageHandler('detect_threats', async (message) => {
      const { data, source } = message.payload;
      return await this.detectThreats(data, source);
    });

    this.registerMessageHandler('analyze_patterns', async (message) => {
      const { events, timeWindow } = message.payload;
      return await this.analyzePatterns(events, timeWindow);
    });

    this.registerMessageHandler('correlate_events', async (message) => {
      const { events, correlationType } = message.payload;
      return await this.correlateEvents(events, correlationType);
    });

    this.registerMessageHandler('assess_threat_level', async (message) => {
      const { indicators, context } = message.payload;
      return await this.assessThreatLevel(indicators, context);
    });

    // Task handlers
    this.registerTaskHandler('threat_analysis', async (task) => {
      const { data, source, analysisType } = task.parameters;
      
      switch (analysisType) {
        case 'detection':
          return await this.detectThreats(data, source);
        case 'pattern':
          return await this.analyzePatterns(data, task.parameters.timeWindow || 3600);
        case 'correlation':
          return await this.correlateEvents(data, task.parameters.correlationType || 'temporal');
        case 'assessment':
          return await this.assessThreatLevel(data, task.parameters.context || {});
        default:
          throw new Error(`Unknown analysis type: ${analysisType}`);
      }
    });
  }

  /**
   * Agent startup logic
   */
  protected async onStart(): Promise<void> {
    this.log(LogLevel.INFO, 'Initializing threat detection agent');
    
    // Load threat intelligence feeds (if available)
    // Initialize machine learning models
    // Start continuous monitoring
    
    this.log(LogLevel.INFO, 'Threat detection agent initialized');
  }

  /**
   * Agent shutdown logic
   */
  protected async onStop(): Promise<void> {
    this.log(LogLevel.INFO, 'Shutting down threat detection agent');
    
    // Save detection statistics
    // Clean up resources
    // Stop monitoring processes
    
    this.log(LogLevel.INFO, 'Threat detection agent shutdown complete');
  }
}
