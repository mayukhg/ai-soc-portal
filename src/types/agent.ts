/**
 * Agent-Based Architecture Types and Interfaces
 * 
 * This file defines the core types and interfaces used throughout the agent-based
 * SOC Nexus implementation. It provides type safety and structure for agent
 * communication, state management, and system operations.
 */

// Agent identification and metadata
export interface AgentIdentity {
  id: string;
  name: string;
  type: AgentType;
  version: string;
  capabilities: AgentCapability[];
  status: AgentStatus;
  lastHeartbeat: Date;
}

// Supported agent types
export enum AgentType {
  ORCHESTRATOR = 'orchestrator',
  THREAT_DETECTION = 'threat_detection',
  INCIDENT_ANALYSIS = 'incident_analysis',
  RESPONSE_PLANNING = 'response_planning',
  INTELLIGENCE_GATHERING = 'intelligence_gathering',
  COMMUNICATION = 'communication',
  MONITORING = 'monitoring'
}

// Agent capabilities define what actions an agent can perform
export interface AgentCapability {
  name: string;
  description: string;
  parameters: Record<string, any>;
  returnType: string;
}

// Agent status tracking
export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BUSY = 'busy',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

// Message passing between agents
export interface AgentMessage {
  id: string;
  timestamp: Date;
  sender: string;
  recipient: string;
  type: MessageType;
  payload: any;
  priority: MessagePriority;
  context?: MessageContext;
  metadata?: Record<string, any>;
}

export enum MessageType {
  REQUEST = 'request',
  RESPONSE = 'response',
  NOTIFICATION = 'notification',
  ERROR = 'error',
  HEARTBEAT = 'heartbeat'
}

export enum MessagePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface MessageContext {
  sessionId: string;
  userId: string;
  incidentId?: string;
  workflowId?: string;
  correlationId?: string;
}

// Agent state management
export interface AgentState {
  identity: AgentIdentity;
  currentTask?: AgentTask;
  messageQueue: AgentMessage[];
  performance: AgentPerformance;
  configuration: AgentConfiguration;
}

export interface AgentTask {
  id: string;
  type: string;
  description: string;
  parameters: Record<string, any>;
  status: TaskStatus;
  startTime: Date;
  estimatedDuration?: number;
  progress?: number;
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface AgentPerformance {
  responseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
  lastMetricsUpdate: Date;
}

export interface AgentConfiguration {
  maxConcurrentTasks: number;
  messageTimeout: number;
  retryAttempts: number;
  logLevel: LogLevel;
  features: Record<string, boolean>;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Threat and incident related types
export interface ThreatData {
  id: string;
  type: ThreatType;
  severity: ThreatSeverity;
  source: string;
  timestamp: Date;
  indicators: ThreatIndicator[];
  description: string;
  confidence: number;
}

export enum ThreatType {
  MALWARE = 'malware',
  PHISHING = 'phishing',
  DDoS = 'ddos',
  DATA_BREACH = 'data_breach',
  INSIDER_THREAT = 'insider_threat',
  APT = 'apt',
  RANSOMWARE = 'ransomware'
}

export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ThreatIndicator {
  type: string;
  value: string;
  confidence: number;
  source: string;
}

export interface IncidentData {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: ThreatSeverity;
  affectedSystems: string[];
  timeline: IncidentEvent[];
  analysis?: IncidentAnalysis;
  response?: IncidentResponse;
  createdAt: Date;
  updatedAt: Date;
}

export enum IncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export interface IncidentEvent {
  timestamp: Date;
  type: string;
  description: string;
  agent: string;
  data?: Record<string, any>;
}

export interface IncidentAnalysis {
  rootCause?: string;
  impact: string;
  affectedData?: string[];
  timeline: Date[];
  recommendations: string[];
}

export interface IncidentResponse {
  actions: ResponseAction[];
  status: ResponseStatus;
  assignedTeam?: string[];
  estimatedResolution?: Date;
}

export interface ResponseAction {
  id: string;
  description: string;
  status: ActionStatus;
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
}

export enum ResponseStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum ActionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// System-wide state management
export interface SystemState {
  agents: Map<string, AgentState>;
  incidents: Map<string, IncidentData>;
  threats: Map<string, ThreatData>;
  workflows: Map<string, WorkflowData>;
  systemHealth: SystemHealth;
  configuration: SystemConfiguration;
}

export interface WorkflowData {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  currentStep?: number;
  context: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agent: string;
  action: string;
  parameters: Record<string, any>;
  status: StepStatus;
  dependencies?: string[];
  timeout?: number;
}

export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export interface SystemHealth {
  overall: HealthStatus;
  agents: Map<string, HealthStatus>;
  services: Map<string, HealthStatus>;
  lastCheck: Date;
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export interface SystemConfiguration {
  maxAgents: number;
  messageTimeout: number;
  heartbeatInterval: number;
  logRetention: number;
  backupInterval: number;
  securitySettings: SecuritySettings;
}

export interface SecuritySettings {
  encryptionEnabled: boolean;
  authenticationRequired: boolean;
  auditLogging: boolean;
  rateLimiting: boolean;
  maxRetries: number;
}

// Utility types for common operations
export type AgentCallback = (message: AgentMessage) => void | Promise<void>;
export type TaskHandler = (task: AgentTask) => Promise<any>;
export type MessageHandler = (message: AgentMessage) => Promise<AgentMessage | void>;

// Event system types
export interface AgentEvent {
  type: string;
  source: string;
  timestamp: Date;
  data: any;
  correlationId?: string;
}

export type EventHandler = (event: AgentEvent) => void | Promise<void>;

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId: string;
}

// Configuration types
export interface AgentConfig {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  enabled: boolean;
  settings: Record<string, any>;
  dependencies?: string[];
}

export interface SystemConfig {
  agents: AgentConfig[];
  workflows: Record<string, any>;
  security: SecuritySettings;
  monitoring: Record<string, any>;
  integrations: Record<string, any>;
}
