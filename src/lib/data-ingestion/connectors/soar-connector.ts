/**
 * SOAR Connector
 * Connects to various SOAR platforms (Phantom, XSOAR, etc.) for data ingestion
 */

import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/logger';

export interface SOARConfig {
  type: 'phantom' | 'xsoar' | 'splunk-soar' | 'swimlane';
  host: string;
  port: number;
  username: string;
  password: string;
  apiKey?: string;
  ssl: boolean;
  timeout: number;
  retryAttempts: number;
}

export interface SOARIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  created_at: Date;
  updated_at: Date;
  assigned_to?: string;
  tags: string[];
  playbooks: string[];
  raw_data: any;
  metadata: Record<string, any>;
}

export interface SOARPlaybook {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  started_at: Date;
  completed_at?: Date;
  execution_time?: number;
  steps: SOARPlaybookStep[];
  raw_data: any;
}

export interface SOARPlaybookStep {
  id: string;
  name: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: Date;
  completed_at?: Date;
  output?: any;
  error?: string;
}

export interface SOARQuery {
  timeRange: string;
  status?: string[];
  severity?: string[];
  limit: number;
  filters?: Record<string, any>;
}

export class SOARConnector {
  private config: SOARConfig;
  private client: AxiosInstance;
  private logger: Logger;

  constructor(config: SOARConfig) {
    this.config = config;
    this.logger = new Logger('SOARConnector');
    this.client = this.createClient();
  }

  private createClient(): AxiosInstance {
    const protocol = this.config.ssl ? 'https' : 'http';
    const baseURL = `${protocol}://${this.config.host}:${this.config.port}`;

    const client = axios.create({
      baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SOC-Portal-SOAR-Connector/1.0',
      },
    });

    // Add authentication
    if (this.config.apiKey) {
      client.defaults.headers.common['Authorization'] = `Bearer ${this.config.apiKey}`;
    } else {
      client.defaults.auth = {
        username: this.config.username,
        password: this.config.password,
      };
    }

    // Add retry interceptor
    client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status >= 500 && this.config.retryAttempts > 0) {
          this.config.retryAttempts--;
          await this.delay(1000);
          return client.request(error.config);
        }
        return Promise.reject(error);
      }
    );

    return client;
  }

  async fetchIncidents(query: SOARQuery): Promise<SOARIncident[]> {
    try {
      this.logger.info(`Fetching incidents from ${this.config.type} SOAR`, { query });

      let incidents: SOARIncident[] = [];

      switch (this.config.type) {
        case 'phantom':
          incidents = await this.fetchPhantomIncidents(query);
          break;
        case 'xsoar':
          incidents = await this.fetchXSOARIncidents(query);
          break;
        case 'splunk-soar':
          incidents = await this.fetchSplunkSOARIncidents(query);
          break;
        case 'swimlane':
          incidents = await this.fetchSwimlaneIncidents(query);
          break;
        default:
          throw new Error(`Unsupported SOAR type: ${this.config.type}`);
      }

      this.logger.info(`Successfully fetched ${incidents.length} incidents from ${this.config.type}`);
      return incidents;

    } catch (error) {
      this.logger.error(`Failed to fetch incidents from ${this.config.type}`, { error });
      throw error;
    }
  }

  async fetchPlaybookExecutions(query: SOARQuery): Promise<SOARPlaybook[]> {
    try {
      this.logger.info(`Fetching playbook executions from ${this.config.type} SOAR`, { query });

      let playbooks: SOARPlaybook[] = [];

      switch (this.config.type) {
        case 'phantom':
          playbooks = await this.fetchPhantomPlaybooks(query);
          break;
        case 'xsoar':
          playbooks = await this.fetchXSOARPlaybooks(query);
          break;
        case 'splunk-soar':
          playbooks = await this.fetchSplunkSOARPlaybooks(query);
          break;
        case 'swimlane':
          playbooks = await this.fetchSwimlanePlaybooks(query);
          break;
        default:
          throw new Error(`Unsupported SOAR type: ${this.config.type}`);
      }

      this.logger.info(`Successfully fetched ${playbooks.length} playbook executions from ${this.config.type}`);
      return playbooks;

    } catch (error) {
      this.logger.error(`Failed to fetch playbook executions from ${this.config.type}`, { error });
      throw error;
    }
  }

  private async fetchPhantomIncidents(query: SOARQuery): Promise<SOARIncident[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.get('/rest/container', {
      params: {
        page_size: query.limit,
        sort: '-create_time',
        create_time__gte: timeRange.earliest,
        create_time__lte: timeRange.latest,
        ...query.filters,
      },
    });

    return this.parsePhantomIncidents(response.data.data);
  }

  private async fetchXSOARIncidents(query: SOARQuery): Promise<SOARIncident[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.post('/incidents/search', {
      query: {
        page: 0,
        size: query.limit,
        sort: [{ field: 'created', asc: false }],
        filter: {
          and: [
            {
              field: 'created',
              operator: 'gte',
              value: timeRange.earliest,
            },
            {
              field: 'created',
              operator: 'lte',
              value: timeRange.latest,
            },
            ...(query.status ? [{
              field: 'status',
              operator: 'in',
              value: query.status,
            }] : []),
            ...(query.severity ? [{
              field: 'severity',
              operator: 'in',
              value: query.severity,
            }] : []),
          ],
        },
      },
    });

    return this.parseXSOARIncidents(response.data.data);
  }

  private async fetchSplunkSOARIncidents(query: SOARQuery): Promise<SOARIncident[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.get('/incidents', {
      params: {
        limit: query.limit,
        sort: '-created_time',
        created_time__gte: timeRange.earliest,
        created_time__lte: timeRange.latest,
        ...query.filters,
      },
    });

    return this.parseSplunkSOARIncidents(response.data.data);
  }

  private async fetchSwimlaneIncidents(query: SOARQuery): Promise<SOARIncident[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.get('/api/v1/case', {
      params: {
        limit: query.limit,
        sort: '-created',
        created__gte: timeRange.earliest,
        created__lte: timeRange.latest,
        ...query.filters,
      },
    });

    return this.parseSwimlaneIncidents(response.data.data);
  }

  private async fetchPhantomPlaybooks(query: SOARQuery): Promise<SOARPlaybook[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.get('/rest/playbook_run', {
      params: {
        page_size: query.limit,
        sort: '-start_time',
        start_time__gte: timeRange.earliest,
        start_time__lte: timeRange.latest,
        ...query.filters,
      },
    });

    return this.parsePhantomPlaybooks(response.data.data);
  }

  private async fetchXSOARPlaybooks(query: SOARQuery): Promise<SOARPlaybook[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.post('/playbook/search', {
      query: {
        page: 0,
        size: query.limit,
        sort: [{ field: 'startTime', asc: false }],
        filter: {
          and: [
            {
              field: 'startTime',
              operator: 'gte',
              value: timeRange.earliest,
            },
            {
              field: 'startTime',
              operator: 'lte',
              value: timeRange.latest,
            },
          ],
        },
      },
    });

    return this.parseXSOARPlaybooks(response.data.data);
  }

  private async fetchSplunkSOARPlaybooks(query: SOARQuery): Promise<SOARPlaybook[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.get('/playbook_runs', {
      params: {
        limit: query.limit,
        sort: '-start_time',
        start_time__gte: timeRange.earliest,
        start_time__lte: timeRange.latest,
        ...query.filters,
      },
    });

    return this.parseSplunkSOARPlaybooks(response.data.data);
  }

  private async fetchSwimlanePlaybooks(query: SOARQuery): Promise<SOARPlaybook[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.get('/api/v1/playbook_run', {
      params: {
        limit: query.limit,
        sort: '-start_time',
        start_time__gte: timeRange.earliest,
        start_time__lte: timeRange.latest,
        ...query.filters,
      },
    });

    return this.parseSwimlanePlaybooks(response.data.data);
  }

  private parseTimeRange(timeRange: string): { earliest: string; latest: string } {
    const now = new Date();
    let earliest: Date;

    switch (timeRange) {
      case 'last_hour':
        earliest = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'last_24_hours':
        earliest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last_7_days':
        earliest = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        earliest = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        earliest = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24 hours
    }

    return {
      earliest: earliest.toISOString(),
      latest: now.toISOString(),
    };
  }

  private parsePhantomIncidents(data: any[]): SOARIncident[] {
    return data.map((incident: any) => ({
      id: incident.id?.toString() || `phantom_${Date.now()}_${Math.random()}`,
      title: incident.name || 'Untitled Incident',
      description: incident.description || '',
      severity: this.mapPhantomSeverity(incident.severity),
      status: this.mapPhantomStatus(incident.status),
      created_at: new Date(incident.create_time),
      updated_at: new Date(incident.update_time),
      assigned_to: incident.owner_name,
      tags: incident.tags || [],
      playbooks: incident.playbook_names || [],
      raw_data: incident,
      metadata: {
        label: incident.label,
        owner: incident.owner,
        owner_name: incident.owner_name,
        container_type: incident.container_type,
      },
    }));
  }

  private parseXSOARIncidents(data: any[]): SOARIncident[] {
    return data.map((incident: any) => ({
      id: incident.id?.toString() || `xsoar_${Date.now()}_${Math.random()}`,
      title: incident.name || 'Untitled Incident',
      description: incident.description || '',
      severity: this.mapXSOARSeverity(incident.severity),
      status: this.mapXSOARStatus(incident.status),
      created_at: new Date(incident.created),
      updated_at: new Date(incident.modified),
      assigned_to: incident.owner,
      tags: incident.labels || [],
      playbooks: incident.playbook_names || [],
      raw_data: incident,
      metadata: {
        type: incident.type,
        source_brand: incident.source_brand,
        source_instance: incident.source_instance,
        custom_fields: incident.custom_fields,
      },
    }));
  }

  private parseSplunkSOARIncidents(data: any[]): SOARIncident[] {
    return data.map((incident: any) => ({
      id: incident.id?.toString() || `splunk_soar_${Date.now()}_${Math.random()}`,
      title: incident.name || 'Untitled Incident',
      description: incident.description || '',
      severity: this.mapSplunkSOARSeverity(incident.severity),
      status: this.mapSplunkSOARStatus(incident.status),
      created_at: new Date(incident.created_time),
      updated_at: new Date(incident.updated_time),
      assigned_to: incident.owner,
      tags: incident.tags || [],
      playbooks: incident.playbook_names || [],
      raw_data: incident,
      metadata: {
        type: incident.type,
        source: incident.source,
        owner: incident.owner,
      },
    }));
  }

  private parseSwimlaneIncidents(data: any[]): SOARIncident[] {
    return data.map((incident: any) => ({
      id: incident.id?.toString() || `swimlane_${Date.now()}_${Math.random()}`,
      title: incident.name || 'Untitled Incident',
      description: incident.description || '',
      severity: this.mapSwimlaneSeverity(incident.severity),
      status: this.mapSwimlaneStatus(incident.status),
      created_at: new Date(incident.created),
      updated_at: new Date(incident.updated),
      assigned_to: incident.assignee,
      tags: incident.tags || [],
      playbooks: incident.playbook_names || [],
      raw_data: incident,
      metadata: {
        type: incident.type,
        source: incident.source,
        assignee: incident.assignee,
      },
    }));
  }

  private parsePhantomPlaybooks(data: any[]): SOARPlaybook[] {
    return data.map((playbook: any) => ({
      id: playbook.id?.toString() || `phantom_pb_${Date.now()}_${Math.random()}`,
      name: playbook.name || 'Untitled Playbook',
      description: playbook.description || '',
      status: this.mapPhantomPlaybookStatus(playbook.status),
      started_at: new Date(playbook.start_time),
      completed_at: playbook.end_time ? new Date(playbook.end_time) : undefined,
      execution_time: playbook.end_time ? 
        new Date(playbook.end_time).getTime() - new Date(playbook.start_time).getTime() : undefined,
      steps: this.parsePhantomPlaybookSteps(playbook.steps || []),
      raw_data: playbook,
    }));
  }

  private parseXSOARPlaybooks(data: any[]): SOARPlaybook[] {
    return data.map((playbook: any) => ({
      id: playbook.id?.toString() || `xsoar_pb_${Date.now()}_${Math.random()}`,
      name: playbook.name || 'Untitled Playbook',
      description: playbook.description || '',
      status: this.mapXSOARPlaybookStatus(playbook.status),
      started_at: new Date(playbook.startTime),
      completed_at: playbook.endTime ? new Date(playbook.endTime) : undefined,
      execution_time: playbook.endTime ? 
        new Date(playbook.endTime).getTime() - new Date(playbook.startTime).getTime() : undefined,
      steps: this.parseXSOARPlaybookSteps(playbook.steps || []),
      raw_data: playbook,
    }));
  }

  private parseSplunkSOARPlaybooks(data: any[]): SOARPlaybook[] {
    return data.map((playbook: any) => ({
      id: playbook.id?.toString() || `splunk_soar_pb_${Date.now()}_${Math.random()}`,
      name: playbook.name || 'Untitled Playbook',
      description: playbook.description || '',
      status: this.mapSplunkSOARPlaybookStatus(playbook.status),
      started_at: new Date(playbook.start_time),
      completed_at: playbook.end_time ? new Date(playbook.end_time) : undefined,
      execution_time: playbook.end_time ? 
        new Date(playbook.end_time).getTime() - new Date(playbook.start_time).getTime() : undefined,
      steps: this.parseSplunkSOARPlaybookSteps(playbook.steps || []),
      raw_data: playbook,
    }));
  }

  private parseSwimlanePlaybooks(data: any[]): SOARPlaybook[] {
    return data.map((playbook: any) => ({
      id: playbook.id?.toString() || `swimlane_pb_${Date.now()}_${Math.random()}`,
      name: playbook.name || 'Untitled Playbook',
      description: playbook.description || '',
      status: this.mapSwimlanePlaybookStatus(playbook.status),
      started_at: new Date(playbook.start_time),
      completed_at: playbook.end_time ? new Date(playbook.end_time) : undefined,
      execution_time: playbook.end_time ? 
        new Date(playbook.end_time).getTime() - new Date(playbook.start_time).getTime() : undefined,
      steps: this.parseSwimlanePlaybookSteps(playbook.steps || []),
      raw_data: playbook,
    }));
  }

  private parsePhantomPlaybookSteps(steps: any[]): SOARPlaybookStep[] {
    return steps.map((step: any) => ({
      id: step.id?.toString() || `phantom_step_${Date.now()}_${Math.random()}`,
      name: step.name || 'Untitled Step',
      action: step.action || 'unknown',
      status: this.mapPhantomStepStatus(step.status),
      started_at: step.start_time ? new Date(step.start_time) : undefined,
      completed_at: step.end_time ? new Date(step.end_time) : undefined,
      output: step.output,
      error: step.error,
    }));
  }

  private parseXSOARPlaybookSteps(steps: any[]): SOARPlaybookStep[] {
    return steps.map((step: any) => ({
      id: step.id?.toString() || `xsoar_step_${Date.now()}_${Math.random()}`,
      name: step.name || 'Untitled Step',
      action: step.action || 'unknown',
      status: this.mapXSOARStepStatus(step.status),
      started_at: step.startTime ? new Date(step.startTime) : undefined,
      completed_at: step.endTime ? new Date(step.endTime) : undefined,
      output: step.output,
      error: step.error,
    }));
  }

  private parseSplunkSOARPlaybookSteps(steps: any[]): SOARPlaybookStep[] {
    return steps.map((step: any) => ({
      id: step.id?.toString() || `splunk_soar_step_${Date.now()}_${Math.random()}`,
      name: step.name || 'Untitled Step',
      action: step.action || 'unknown',
      status: this.mapSplunkSOARStepStatus(step.status),
      started_at: step.start_time ? new Date(step.start_time) : undefined,
      completed_at: step.end_time ? new Date(step.end_time) : undefined,
      output: step.output,
      error: step.error,
    }));
  }

  private parseSwimlanePlaybookSteps(steps: any[]): SOARPlaybookStep[] {
    return steps.map((step: any) => ({
      id: step.id?.toString() || `swimlane_step_${Date.now()}_${Math.random()}`,
      name: step.name || 'Untitled Step',
      action: step.action || 'unknown',
      status: this.mapSwimlaneStepStatus(step.status),
      started_at: step.start_time ? new Date(step.start_time) : undefined,
      completed_at: step.end_time ? new Date(step.end_time) : undefined,
      output: step.output,
      error: step.error,
    }));
  }

  // Severity mapping methods
  private mapPhantomSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical',
      '1': 'low',
      '2': 'medium',
      '3': 'high',
      '4': 'critical',
    };
    return severityMap[severity?.toString().toLowerCase()] || 'medium';
  }

  private mapXSOARSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      '1': 'low',
      '2': 'medium',
      '3': 'high',
      '4': 'critical',
    };
    return severityMap[severity?.toString()] || 'medium';
  }

  private mapSplunkSOARSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical',
    };
    return severityMap[severity?.toString().toLowerCase()] || 'medium';
  }

  private mapSwimlaneSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical',
    };
    return severityMap[severity?.toString().toLowerCase()] || 'medium';
  }

  // Status mapping methods
  private mapPhantomStatus(status: any): 'new' | 'in_progress' | 'resolved' | 'closed' {
    const statusMap: Record<string, 'new' | 'in_progress' | 'resolved' | 'closed'> = {
      'new': 'new',
      'open': 'new',
      'active': 'in_progress',
      'resolved': 'resolved',
      'closed': 'closed',
    };
    return statusMap[status?.toString().toLowerCase()] || 'new';
  }

  private mapXSOARStatus(status: any): 'new' | 'in_progress' | 'resolved' | 'closed' {
    const statusMap: Record<string, 'new' | 'in_progress' | 'resolved' | 'closed'> = {
      '0': 'new',
      '1': 'in_progress',
      '2': 'resolved',
      '3': 'closed',
    };
    return statusMap[status?.toString()] || 'new';
  }

  private mapSplunkSOARStatus(status: any): 'new' | 'in_progress' | 'resolved' | 'closed' {
    const statusMap: Record<string, 'new' | 'in_progress' | 'resolved' | 'closed'> = {
      'new': 'new',
      'open': 'new',
      'active': 'in_progress',
      'resolved': 'resolved',
      'closed': 'closed',
    };
    return statusMap[status?.toString().toLowerCase()] || 'new';
  }

  private mapSwimlaneStatus(status: any): 'new' | 'in_progress' | 'resolved' | 'closed' {
    const statusMap: Record<string, 'new' | 'in_progress' | 'resolved' | 'closed'> = {
      'new': 'new',
      'open': 'new',
      'active': 'in_progress',
      'resolved': 'resolved',
      'closed': 'closed',
    };
    return statusMap[status?.toString().toLowerCase()] || 'new';
  }

  // Playbook status mapping methods
  private mapPhantomPlaybookStatus(status: any): 'running' | 'completed' | 'failed' | 'paused' {
    const statusMap: Record<string, 'running' | 'completed' | 'failed' | 'paused'> = {
      'running': 'running',
      'completed': 'completed',
      'failed': 'failed',
      'paused': 'paused',
    };
    return statusMap[status?.toString().toLowerCase()] || 'completed';
  }

  private mapXSOARPlaybookStatus(status: any): 'running' | 'completed' | 'failed' | 'paused' {
    const statusMap: Record<string, 'running' | 'completed' | 'failed' | 'paused'> = {
      'running': 'running',
      'completed': 'completed',
      'failed': 'failed',
      'paused': 'paused',
    };
    return statusMap[status?.toString().toLowerCase()] || 'completed';
  }

  private mapSplunkSOARPlaybookStatus(status: any): 'running' | 'completed' | 'failed' | 'paused' {
    const statusMap: Record<string, 'running' | 'completed' | 'failed' | 'paused'> = {
      'running': 'running',
      'completed': 'completed',
      'failed': 'failed',
      'paused': 'paused',
    };
    return statusMap[status?.toString().toLowerCase()] || 'completed';
  }

  private mapSwimlanePlaybookStatus(status: any): 'running' | 'completed' | 'failed' | 'paused' {
    const statusMap: Record<string, 'running' | 'completed' | 'failed' | 'paused'> = {
      'running': 'running',
      'completed': 'completed',
      'failed': 'failed',
      'paused': 'paused',
    };
    return statusMap[status?.toString().toLowerCase()] || 'completed';
  }

  // Step status mapping methods
  private mapPhantomStepStatus(status: any): 'pending' | 'running' | 'completed' | 'failed' {
    const statusMap: Record<string, 'pending' | 'running' | 'completed' | 'failed'> = {
      'pending': 'pending',
      'running': 'running',
      'completed': 'completed',
      'failed': 'failed',
    };
    return statusMap[status?.toString().toLowerCase()] || 'pending';
  }

  private mapXSOARStepStatus(status: any): 'pending' | 'running' | 'completed' | 'failed' {
    const statusMap: Record<string, 'pending' | 'running' | 'completed' | 'failed'> = {
      'pending': 'pending',
      'running': 'running',
      'completed': 'completed',
      'failed': 'failed',
    };
    return statusMap[status?.toString().toLowerCase()] || 'pending';
  }

  private mapSplunkSOARStepStatus(status: any): 'pending' | 'running' | 'completed' | 'failed' {
    const statusMap: Record<string, 'pending' | 'running' | 'completed' | 'failed'> = {
      'pending': 'pending',
      'running': 'running',
      'completed': 'completed',
      'failed': 'failed',
    };
    return statusMap[status?.toString().toLowerCase()] || 'pending';
  }

  private mapSwimlaneStepStatus(status: any): 'pending' | 'running' | 'completed' | 'failed' {
    const statusMap: Record<string, 'pending' | 'running' | 'completed' | 'failed'> = {
      'pending': 'pending',
      'running': 'running',
      'completed': 'completed',
      'failed': 'failed',
    };
    return statusMap[status?.toString().toLowerCase()] || 'pending';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/rest/version');
      return response.status === 200;
    } catch (error) {
      this.logger.error('SOAR connection test failed', { error });
      return false;
    }
  }
}
