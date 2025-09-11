/**
 * LangGraph SOC State Types and Data Structures
 * Defines the state management for AI agent orchestration in the SOC Portal
 */

import { TypedDict } from 'langgraph';

// Base security data types
export interface Alert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  type: string;
  description: string;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  tags: string[];
  metadata: Record<string, any>;
}

export interface ThreatIntelligence {
  id: string;
  indicator: string;
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email';
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  source: string;
  first_seen: Date;
  last_seen: Date;
  tags: string[];
  description: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  created_at: Date;
  updated_at: Date;
  assigned_to: string;
  tags: string[];
  related_alerts: string[];
  timeline: IncidentEvent[];
}

export interface IncidentEvent {
  id: string;
  timestamp: Date;
  type: 'alert' | 'action' | 'note' | 'status_change';
  description: string;
  user: string;
  metadata: Record<string, any>;
}

export interface Entity {
  id: string;
  type: 'user' | 'host' | 'ip' | 'domain' | 'file' | 'process';
  name: string;
  attributes: Record<string, any>;
  risk_score: number;
  last_seen: Date;
  tags: string[];
}

// Analysis results from different agents
export interface ThreatAnalysis {
  threats_identified: Threat[];
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  attack_vectors: string[];
  threat_actors: string[];
  mitigation_strategies: string[];
  confidence: number;
  reasoning_chain: string[];
}

export interface Threat {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  indicators: string[];
  attack_phase: 'reconnaissance' | 'initial_access' | 'execution' | 'persistence' | 'privilege_escalation' | 'defense_evasion' | 'credential_access' | 'discovery' | 'lateral_movement' | 'collection' | 'command_and_control' | 'exfiltration' | 'impact';
  confidence: number;
  mitigation: string[];
}

export interface RiskAssessment {
  overall_risk_score: number;
  risk_factors: RiskFactor[];
  impact_assessment: ImpactAssessment;
  likelihood_assessment: LikelihoodAssessment;
  recommendations: string[];
  confidence: number;
}

export interface RiskFactor {
  factor: string;
  score: number;
  weight: number;
  description: string;
  mitigation: string[];
}

export interface ImpactAssessment {
  confidentiality: number;
  integrity: number;
  availability: number;
  overall_impact: number;
  business_impact: string;
}

export interface LikelihoodAssessment {
  threat_capability: number;
  threat_intent: number;
  vulnerability_exploitability: number;
  overall_likelihood: number;
  reasoning: string;
}

export interface CorrelationResult {
  correlation_id: string;
  correlated_events: string[];
  correlation_type: 'temporal' | 'spatial' | 'behavioral' | 'attribution';
  confidence: number;
  pattern: string;
  description: string;
  recommendations: string[];
}

export interface Prediction {
  prediction_type: 'threat' | 'incident' | 'vulnerability' | 'behavior';
  predicted_event: string;
  probability: number;
  timeframe: string;
  confidence: number;
  factors: string[];
  recommendations: string[];
}

// Decision making results
export interface ThreatClassification {
  threat_types: string[];
  severity_levels: string[];
  attack_phases: string[];
  threat_actors: string[];
  confidence: number;
}

export interface RiskPrioritization {
  high_priority_risks: RiskFactor[];
  medium_priority_risks: RiskFactor[];
  low_priority_risks: RiskFactor[];
  priority_scores: Record<string, number>;
  recommended_actions: string[];
}

export interface ResponseStrategy {
  strategy_type: 'contain' | 'investigate' | 'monitor' | 'escalate' | 'ignore';
  actions: ResponseAction[];
  timeline: string;
  resources_required: string[];
  success_criteria: string[];
  confidence: number;
}

export interface ResponseAction {
  action_id: string;
  action_type: 'automated' | 'manual' | 'semi_automated';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_duration: string;
  required_skills: string[];
  dependencies: string[];
}

export interface ResourceAllocation {
  human_resources: HumanResource[];
  technical_resources: TechnicalResource[];
  budget_impact: number;
  timeline: string;
  constraints: string[];
}

export interface HumanResource {
  role: string;
  skill_level: 'junior' | 'mid' | 'senior' | 'expert';
  availability: number;
  cost_per_hour: number;
  estimated_hours: number;
}

export interface TechnicalResource {
  resource_type: string;
  quantity: number;
  cost_per_unit: number;
  availability: number;
  specifications: string;
}

export interface EscalationDecision {
  should_escalate: boolean;
  escalation_level: 'team_lead' | 'manager' | 'director' | 'c_suite';
  escalation_reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  timeline: string;
  stakeholders: string[];
}

// Response generation results
export interface NaturalLanguageResponse {
  response_type: 'analysis' | 'recommendation' | 'explanation' | 'summary';
  content: string;
  tone: 'formal' | 'informal' | 'technical' | 'executive';
  audience: 'analyst' | 'manager' | 'executive' | 'technical';
  confidence: number;
}

export interface Report {
  report_id: string;
  title: string;
  type: 'incident' | 'threat' | 'risk' | 'compliance' | 'executive';
  content: string;
  format: 'pdf' | 'html' | 'markdown' | 'json';
  generated_at: Date;
  generated_by: string;
  recipients: string[];
  status: 'draft' | 'review' | 'approved' | 'published';
}

export interface AlertNotification {
  alert_id: string;
  notification_type: 'email' | 'sms' | 'teams' | 'slack' | 'dashboard';
  recipients: string[];
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  sent_at: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
}

export interface Recommendation {
  recommendation_id: string;
  type: 'immediate' | 'short_term' | 'long_term' | 'strategic';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  rationale: string;
  implementation_steps: string[];
  estimated_effort: string;
  expected_benefit: string;
  dependencies: string[];
}

export interface PlaybookSuggestion {
  playbook_id: string;
  name: string;
  description: string;
  applicable_scenarios: string[];
  steps: PlaybookStep[];
  estimated_duration: string;
  required_skills: string[];
  success_criteria: string[];
  confidence: number;
}

export interface PlaybookStep {
  step_id: string;
  order: number;
  action: string;
  description: string;
  type: 'automated' | 'manual' | 'semi_automated';
  estimated_duration: string;
  required_tools: string[];
  expected_outcome: string;
}

// Action execution results
export interface ExecutionResult {
  execution_id: string;
  action_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: Date;
  completed_at?: Date;
  duration?: number;
  output: string;
  error?: string;
  metrics: ExecutionMetrics;
}

export interface ExecutionMetrics {
  success_rate: number;
  execution_time: number;
  resource_usage: Record<string, number>;
  error_count: number;
  retry_count: number;
}

// Learning and feedback
export interface LearningFeedback {
  feedback_id: string;
  type: 'positive' | 'negative' | 'neutral';
  source: 'human' | 'system' | 'automated';
  content: string;
  context: Record<string, any>;
  timestamp: Date;
  processed: boolean;
}

export interface ModelPerformance {
  model_name: string;
  metric_type: 'accuracy' | 'precision' | 'recall' | 'f1_score' | 'confidence';
  value: number;
  threshold: number;
  timestamp: Date;
  context: string;
}

// Main SOC State for LangGraph
export interface SOCState extends TypedDict {
  // Input data
  alerts: Alert[];
  threat_intelligence: ThreatIntelligence[];
  incidents: Incident[];
  entities: Entity[];
  
  // Context and analysis
  context_analysis: Record<string, any>;
  threat_analysis?: ThreatAnalysis;
  risk_assessment?: RiskAssessment;
  correlations?: CorrelationResult[];
  predictions?: Prediction[];
  
  // Decision making
  threat_classification?: ThreatClassification;
  risk_prioritization?: RiskPrioritization;
  response_strategy?: ResponseStrategy;
  resource_allocation?: ResourceAllocation;
  escalation_decision?: EscalationDecision;
  
  // Response generation
  natural_language_response?: NaturalLanguageResponse;
  report?: Report;
  alert_notifications?: AlertNotification[];
  recommendations?: Recommendation[];
  playbook_suggestions?: PlaybookSuggestion[];
  
  // Action execution
  execution_results?: ExecutionResult[];
  
  // Learning and feedback
  learning_feedback?: LearningFeedback[];
  model_performance?: ModelPerformance[];
  
  // Workflow control
  current_phase: 'context_analysis' | 'reasoning' | 'decision_making' | 'response_generation' | 'action_execution' | 'learning' | 'completed' | 'error';
  workflow_id: string;
  request_type: 'threat_analysis' | 'incident_investigation' | 'risk_assessment' | 'correlation_analysis' | 'prediction' | 'threat_hunting' | 'general_analysis' | 'automated_response' | 'playbook_execution';
  user_id: string;
  session_id: string;
  
  // Error handling
  errors: string[];
  warnings: string[];
  
  // Monitoring and validation
  confidence_scores: Record<string, number>;
  reasoning_chains: Record<string, string[]>;
  validation_results: Record<string, boolean>;
  
  // Human-in-the-loop
  human_input_required: boolean;
  human_input_prompt?: string;
  human_input_response?: string;
  human_input_timestamp?: Date;
  
  // Performance metrics
  start_time: Date;
  end_time?: Date;
  total_duration?: number;
  phase_durations: Record<string, number>;
}

// Agent configuration
export interface AgentConfig {
  agent_id: string;
  name: string;
  description: string;
  capabilities: string[];
  dependencies: string[];
  timeout: number;
  retry_count: number;
  priority: number;
  enabled: boolean;
}

// Workflow configuration
export interface WorkflowConfig {
  workflow_id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  agents: AgentConfig[];
  conditional_edges: ConditionalEdge[];
  human_in_loop_points: HumanInLoopPoint[];
  timeout: number;
  retry_policy: RetryPolicy;
}

export interface ConditionalEdge {
  from_agent: string;
  condition: string;
  to_agent: string;
  description: string;
}

export interface HumanInLoopPoint {
  agent_id: string;
  prompt: string;
  timeout: number;
  fallback_action: string;
  required_approval: boolean;
}

export interface RetryPolicy {
  max_retries: number;
  retry_delay: number;
  exponential_backoff: boolean;
  retry_conditions: string[];
}
