/**
 * EDR Connector
 * Connects to various EDR systems (CrowdStrike, SentinelOne, etc.) for data ingestion
 */

import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/logger';

export interface EDRConfig {
  type: 'crowdstrike' | 'sentinelone' | 'carbon-black' | 'microsoft-defender';
  host: string;
  port: number;
  clientId: string;
  clientSecret: string;
  apiKey?: string;
  ssl: boolean;
  timeout: number;
  retryAttempts: number;
}

export interface EDRDetection {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  threat_name: string;
  threat_type: string;
  description: string;
  hostname: string;
  username?: string;
  process_name?: string;
  file_path?: string;
  network_connections?: EDRNetworkConnection[];
  raw_data: any;
  metadata: Record<string, any>;
}

export interface EDRNetworkConnection {
  local_ip: string;
  local_port: number;
  remote_ip: string;
  remote_port: number;
  protocol: string;
  direction: 'inbound' | 'outbound';
}

export interface EDRTelemetry {
  id: string;
  timestamp: Date;
  event_type: 'process' | 'network' | 'file' | 'registry' | 'dns';
  hostname: string;
  username?: string;
  process_name?: string;
  command_line?: string;
  file_path?: string;
  network_data?: EDRNetworkConnection;
  raw_data: any;
}

export interface EDRQuery {
  timeRange: string;
  severity?: string[];
  status?: string[];
  limit: number;
  filters?: Record<string, any>;
}

export class EDRConnector {
  private config: EDRConfig;
  private client: AxiosInstance;
  private logger: Logger;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: EDRConfig) {
    this.config = config;
    this.logger = new Logger('EDRConnector');
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
        'User-Agent': 'SOC-Portal-EDR-Connector/1.0',
      },
    });

    // Add retry interceptor
    client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, refresh it
          await this.refreshAccessToken();
          return client.request(error.config);
        }
        
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

  async fetchDetections(query: EDRQuery): Promise<EDRDetection[]> {
    try {
      this.logger.info(`Fetching detections from ${this.config.type} EDR`, { query });

      // Ensure we have a valid access token
      await this.ensureValidToken();

      let detections: EDRDetection[] = [];

      switch (this.config.type) {
        case 'crowdstrike':
          detections = await this.fetchCrowdStrikeDetections(query);
          break;
        case 'sentinelone':
          detections = await this.fetchSentinelOneDetections(query);
          break;
        case 'carbon-black':
          detections = await this.fetchCarbonBlackDetections(query);
          break;
        case 'microsoft-defender':
          detections = await this.fetchMicrosoftDefenderDetections(query);
          break;
        default:
          throw new Error(`Unsupported EDR type: ${this.config.type}`);
      }

      this.logger.info(`Successfully fetched ${detections.length} detections from ${this.config.type}`);
      return detections;

    } catch (error) {
      this.logger.error(`Failed to fetch detections from ${this.config.type}`, { error });
      throw error;
    }
  }

  async fetchTelemetry(query: EDRQuery): Promise<EDRTelemetry[]> {
    try {
      this.logger.info(`Fetching telemetry from ${this.config.type} EDR`, { query });

      // Ensure we have a valid access token
      await this.ensureValidToken();

      let telemetry: EDRTelemetry[] = [];

      switch (this.config.type) {
        case 'crowdstrike':
          telemetry = await this.fetchCrowdStrikeTelemetry(query);
          break;
        case 'sentinelone':
          telemetry = await this.fetchSentinelOneTelemetry(query);
          break;
        case 'carbon-black':
          telemetry = await this.fetchCarbonBlackTelemetry(query);
          break;
        case 'microsoft-defender':
          telemetry = await this.fetchMicrosoftDefenderTelemetry(query);
          break;
        default:
          throw new Error(`Unsupported EDR type: ${this.config.type}`);
      }

      this.logger.info(`Successfully fetched ${telemetry.length} telemetry events from ${this.config.type}`);
      return telemetry;

    } catch (error) {
      this.logger.error(`Failed to fetch telemetry from ${this.config.type}`, { error });
      throw error;
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      await this.refreshAccessToken();
    }
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      let response;

      switch (this.config.type) {
        case 'crowdstrike':
          response = await this.client.post('/oauth2/token', {
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            grant_type: 'client_credentials',
          });
          break;
        case 'sentinelone':
          response = await this.client.post('/web/api/v2.1/users/login', {
            username: this.config.clientId,
            password: this.config.clientSecret,
          });
          break;
        case 'carbon-black':
          response = await this.client.post('/api/v1/auth/token', {
            username: this.config.clientId,
            password: this.config.clientSecret,
          });
          break;
        case 'microsoft-defender':
          response = await this.client.post('/oauth2/v2.0/token', {
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            scope: 'https://api.securitycenter.microsoft.com/.default',
            grant_type: 'client_credentials',
          });
          break;
        default:
          throw new Error(`Unsupported EDR type: ${this.config.type}`);
      }

      this.accessToken = response.data.access_token || response.data.token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000) - 60000); // 1 minute buffer

      // Update client headers
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;

    } catch (error) {
      this.logger.error('Failed to refresh access token', { error });
      throw error;
    }
  }

  private async fetchCrowdStrikeDetections(query: EDRQuery): Promise<EDRDetection[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.get('/detects/queries/detects/v1', {
      params: {
        limit: query.limit,
        sort: 'first_behavior',
        filter: `first_behavior:>='${timeRange.earliest}'+first_behavior:<='${timeRange.latest}'`,
        ...query.filters,
      },
    });

    const detectionIds = response.data.resources;
    
    if (detectionIds.length === 0) return [];

    // Fetch detailed detection data
    const detailsResponse = await this.client.get('/detects/entities/detects/v2', {
      params: {
        ids: detectionIds.join(','),
      },
    });

    return this.parseCrowdStrikeDetections(detailsResponse.data.resources);
  }

  private async fetchSentinelOneDetections(query: EDRQuery): Promise<EDRDetection[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.get('/web/api/v2.1/threats', {
      params: {
        limit: query.limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        createdAt__gte: timeRange.earliest,
        createdAt__lte: timeRange.latest,
        ...query.filters,
      },
    });

    return this.parseSentinelOneDetections(response.data.data);
  }

  private async fetchCarbonBlackDetections(query: EDRQuery): Promise<EDRDetection[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.get('/api/v1/alert', {
      params: {
        rows: query.limit,
        sort: 'created_time desc',
        created_time: `[${timeRange.earliest} TO ${timeRange.latest}]`,
        ...query.filters,
      },
    });

    return this.parseCarbonBlackDetections(response.data.results);
  }

  private async fetchMicrosoftDefenderDetections(query: EDRQuery): Promise<EDRDetection[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.get('/api/alerts', {
      params: {
        $top: query.limit,
        $orderby: 'createdDateTime desc',
        $filter: `createdDateTime ge ${timeRange.earliest} and createdDateTime le ${timeRange.latest}`,
        ...query.filters,
      },
    });

    return this.parseMicrosoftDefenderDetections(response.data.value);
  }

  private async fetchCrowdStrikeTelemetry(query: EDRQuery): Promise<EDRTelemetry[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.get('/fwmgr/queries/events/v1', {
      params: {
        limit: query.limit,
        sort: 'timestamp',
        filter: `timestamp:>='${timeRange.earliest}'+timestamp:<='${timeRange.latest}'`,
        ...query.filters,
      },
    });

    return this.parseCrowdStrikeTelemetry(response.data.resources);
  }

  private async fetchSentinelOneTelemetry(query: EDRQuery): Promise<EDRTelemetry[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.get('/web/api/v2.1/activities', {
      params: {
        limit: query.limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        createdAt__gte: timeRange.earliest,
        createdAt__lte: timeRange.latest,
        ...query.filters,
      },
    });

    return this.parseSentinelOneTelemetry(response.data.data);
  }

  private async fetchCarbonBlackTelemetry(query: EDRQuery): Promise<EDRTelemetry[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.get('/api/v1/process', {
      params: {
        rows: query.limit,
        sort: 'start desc',
        start: `[${timeRange.earliest} TO ${timeRange.latest}]`,
        ...query.filters,
      },
    });

    return this.parseCarbonBlackTelemetry(response.data.results);
  }

  private async fetchMicrosoftDefenderTelemetry(query: EDRQuery): Promise<EDRTelemetry[]> {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const response = await this.client.get('/api/machines/activities', {
      params: {
        $top: query.limit,
        $orderby: 'timestamp desc',
        $filter: `timestamp ge ${timeRange.earliest} and timestamp le ${timeRange.latest}`,
        ...query.filters,
      },
    });

    return this.parseMicrosoftDefenderTelemetry(response.data.value);
  }

  private parseTimeRange(timeRange: string): { earliest: string; latest: string } {
    const now = new Date();
    let earliest: Date;

    switch (timeRange) {
      case 'last_hour':
        earliest = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'last_6_hours':
        earliest = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case 'last_24_hours':
        earliest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last_7_days':
        earliest = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        earliest = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24 hours
    }

    return {
      earliest: earliest.toISOString(),
      latest: now.toISOString(),
    };
  }

  private parseCrowdStrikeDetections(data: any[]): EDRDetection[] {
    return data.map((detection: any) => ({
      id: detection.detect_id || `crowdstrike_${Date.now()}_${Math.random()}`,
      timestamp: new Date(detection.first_behavior),
      severity: this.mapCrowdStrikeSeverity(detection.max_severity),
      status: this.mapCrowdStrikeStatus(detection.status),
      threat_name: detection.threat_name || 'Unknown Threat',
      threat_type: detection.threat_type || 'unknown',
      description: detection.description || '',
      hostname: detection.device?.hostname || 'Unknown Host',
      username: detection.device?.user_name,
      process_name: detection.behaviors?.[0]?.process_name,
      file_path: detection.behaviors?.[0]?.file_path,
      network_connections: this.parseCrowdStrikeNetworkConnections(detection.behaviors),
      raw_data: detection,
      metadata: {
        device_id: detection.device?.device_id,
        platform: detection.device?.platform_name,
        os_version: detection.device?.os_version,
        behaviors: detection.behaviors?.length || 0,
      },
    }));
  }

  private parseSentinelOneDetections(data: any[]): EDRDetection[] {
    return data.map((detection: any) => ({
      id: detection.id?.toString() || `sentinelone_${Date.now()}_${Math.random()}`,
      timestamp: new Date(detection.createdAt),
      severity: this.mapSentinelOneSeverity(detection.confidenceLevel),
      status: this.mapSentinelOneStatus(detection.mitigationStatus),
      threat_name: detection.threatName || 'Unknown Threat',
      threat_type: detection.threatType || 'unknown',
      description: detection.description || '',
      hostname: detection.agentComputerName || 'Unknown Host',
      username: detection.agentUser,
      process_name: detection.processName,
      file_path: detection.filePath,
      network_connections: this.parseSentinelOneNetworkConnections(detection.networkConnections),
      raw_data: detection,
      metadata: {
        agent_id: detection.agentId,
        site_id: detection.siteId,
        group_id: detection.groupId,
        file_hash: detection.fileHash,
      },
    }));
  }

  private parseCarbonBlackDetections(data: any[]): EDRDetection[] {
    return data.map((detection: any) => ({
      id: detection.id?.toString() || `carbonblack_${Date.now()}_${Math.random()}`,
      timestamp: new Date(detection.created_time),
      severity: this.mapCarbonBlackSeverity(detection.severity),
      status: this.mapCarbonBlackStatus(detection.status),
      threat_name: detection.threat_name || 'Unknown Threat',
      threat_type: detection.threat_type || 'unknown',
      description: detection.description || '',
      hostname: detection.hostname || 'Unknown Host',
      username: detection.username,
      process_name: detection.process_name,
      file_path: detection.file_path,
      network_connections: this.parseCarbonBlackNetworkConnections(detection.network_connections),
      raw_data: detection,
      metadata: {
        sensor_id: detection.sensor_id,
        group: detection.group,
        segment: detection.segment,
      },
    }));
  }

  private parseMicrosoftDefenderDetections(data: any[]): EDRDetection[] {
    return data.map((detection: any) => ({
      id: detection.id || `microsoft_defender_${Date.now()}_${Math.random()}`,
      timestamp: new Date(detection.createdDateTime),
      severity: this.mapMicrosoftDefenderSeverity(detection.severity),
      status: this.mapMicrosoftDefenderStatus(detection.status),
      threat_name: detection.title || 'Unknown Threat',
      threat_type: detection.category || 'unknown',
      description: detection.description || '',
      hostname: detection.computerDnsName || 'Unknown Host',
      username: detection.userPrincipalName,
      process_name: detection.processName,
      file_path: detection.filePath,
      network_connections: this.parseMicrosoftDefenderNetworkConnections(detection.networkConnections),
      raw_data: detection,
      metadata: {
        machine_id: detection.machineId,
        tenant_id: detection.tenantId,
        incident_id: detection.incidentId,
      },
    }));
  }

  private parseCrowdStrikeTelemetry(data: any[]): EDRTelemetry[] {
    return data.map((event: any) => ({
      id: event.event_id || `crowdstrike_tel_${Date.now()}_${Math.random()}`,
      timestamp: new Date(event.timestamp),
      event_type: this.mapCrowdStrikeEventType(event.event_type),
      hostname: event.computer_name || 'Unknown Host',
      username: event.user_name,
      process_name: event.process_name,
      command_line: event.command_line,
      file_path: event.file_path,
      network_data: this.parseCrowdStrikeNetworkData(event.network_data),
      raw_data: event,
    }));
  }

  private parseSentinelOneTelemetry(data: any[]): EDRTelemetry[] {
    return data.map((event: any) => ({
      id: event.id?.toString() || `sentinelone_tel_${Date.now()}_${Math.random()}`,
      timestamp: new Date(event.createdAt),
      event_type: this.mapSentinelOneEventType(event.activityType),
      hostname: event.agentComputerName || 'Unknown Host',
      username: event.agentUser,
      process_name: event.processName,
      command_line: event.commandLine,
      file_path: event.filePath,
      network_data: this.parseSentinelOneNetworkData(event.networkData),
      raw_data: event,
    }));
  }

  private parseCarbonBlackTelemetry(data: any[]): EDRTelemetry[] {
    return data.map((event: any) => ({
      id: event.id?.toString() || `carbonblack_tel_${Date.now()}_${Math.random()}`,
      timestamp: new Date(event.start),
      event_type: this.mapCarbonBlackEventType(event.event_type),
      hostname: event.hostname || 'Unknown Host',
      username: event.username,
      process_name: event.process_name,
      command_line: event.cmdline,
      file_path: event.file_path,
      network_data: this.parseCarbonBlackNetworkData(event.network_data),
      raw_data: event,
    }));
  }

  private parseMicrosoftDefenderTelemetry(data: any[]): EDRTelemetry[] {
    return data.map((event: any) => ({
      id: event.id || `microsoft_defender_tel_${Date.now()}_${Math.random()}`,
      timestamp: new Date(event.timestamp),
      event_type: this.mapMicrosoftDefenderEventType(event.eventType),
      hostname: event.computerDnsName || 'Unknown Host',
      username: event.userPrincipalName,
      process_name: event.processName,
      command_line: event.commandLine,
      file_path: event.filePath,
      network_data: this.parseMicrosoftDefenderNetworkData(event.networkData),
      raw_data: event,
    }));
  }

  // Severity mapping methods
  private mapCrowdStrikeSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      '1': 'low',
      '2': 'low',
      '3': 'medium',
      '4': 'medium',
      '5': 'high',
      '6': 'high',
      '7': 'critical',
      '8': 'critical',
      '9': 'critical',
      '10': 'critical',
    };
    return severityMap[severity?.toString()] || 'medium';
  }

  private mapSentinelOneSeverity(confidence: any): 'low' | 'medium' | 'high' | 'critical' {
    const confidenceNum = parseInt(confidence?.toString() || '0');
    
    if (confidenceNum <= 25) return 'low';
    if (confidenceNum <= 50) return 'medium';
    if (confidenceNum <= 75) return 'high';
    return 'critical';
  }

  private mapCarbonBlackSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      '1': 'low',
      '2': 'medium',
      '3': 'high',
      '4': 'critical',
    };
    return severityMap[severity?.toString()] || 'medium';
  }

  private mapMicrosoftDefenderSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical',
    };
    return severityMap[severity?.toString().toLowerCase()] || 'medium';
  }

  // Status mapping methods
  private mapCrowdStrikeStatus(status: any): 'new' | 'investigating' | 'resolved' | 'false_positive' {
    const statusMap: Record<string, 'new' | 'investigating' | 'resolved' | 'false_positive'> = {
      'new': 'new',
      'in_progress': 'investigating',
      'true_positive': 'investigating',
      'false_positive': 'false_positive',
      'resolved': 'resolved',
    };
    return statusMap[status?.toString().toLowerCase()] || 'new';
  }

  private mapSentinelOneStatus(status: any): 'new' | 'investigating' | 'resolved' | 'false_positive' {
    const statusMap: Record<string, 'new' | 'investigating' | 'resolved' | 'false_positive'> = {
      'new': 'new',
      'in_progress': 'investigating',
      'mitigated': 'resolved',
      'false_positive': 'false_positive',
    };
    return statusMap[status?.toString().toLowerCase()] || 'new';
  }

  private mapCarbonBlackStatus(status: any): 'new' | 'investigating' | 'resolved' | 'false_positive' {
    const statusMap: Record<string, 'new' | 'investigating' | 'resolved' | 'false_positive'> = {
      'new': 'new',
      'in_progress': 'investigating',
      'resolved': 'resolved',
      'false_positive': 'false_positive',
    };
    return statusMap[status?.toString().toLowerCase()] || 'new';
  }

  private mapMicrosoftDefenderStatus(status: any): 'new' | 'investigating' | 'resolved' | 'false_positive' {
    const statusMap: Record<string, 'new' | 'investigating' | 'resolved' | 'false_positive'> = {
      'new': 'new',
      'in_progress': 'investigating',
      'resolved': 'resolved',
      'false_positive': 'false_positive',
    };
    return statusMap[status?.toString().toLowerCase()] || 'new';
  }

  // Event type mapping methods
  private mapCrowdStrikeEventType(eventType: any): 'process' | 'network' | 'file' | 'registry' | 'dns' {
    const typeMap: Record<string, 'process' | 'network' | 'file' | 'registry' | 'dns'> = {
      'ProcessRollup2': 'process',
      'NetworkRollup2': 'network',
      'FileWriteEvent': 'file',
      'RegKeyEvent': 'registry',
      'DnsRequest': 'dns',
    };
    return typeMap[eventType?.toString()] || 'process';
  }

  private mapSentinelOneEventType(eventType: any): 'process' | 'network' | 'file' | 'registry' | 'dns' {
    const typeMap: Record<string, 'process' | 'network' | 'file' | 'registry' | 'dns'> = {
      'process': 'process',
      'network': 'network',
      'file': 'file',
      'registry': 'registry',
      'dns': 'dns',
    };
    return typeMap[eventType?.toString().toLowerCase()] || 'process';
  }

  private mapCarbonBlackEventType(eventType: any): 'process' | 'network' | 'file' | 'registry' | 'dns' {
    const typeMap: Record<string, 'process' | 'network' | 'file' | 'registry' | 'dns'> = {
      'proc': 'process',
      'netconn': 'network',
      'filemod': 'file',
      'regmod': 'registry',
      'dns': 'dns',
    };
    return typeMap[eventType?.toString().toLowerCase()] || 'process';
  }

  private mapMicrosoftDefenderEventType(eventType: any): 'process' | 'network' | 'file' | 'registry' | 'dns' {
    const typeMap: Record<string, 'process' | 'network' | 'file' | 'registry' | 'dns'> = {
      'ProcessCreated': 'process',
      'NetworkConnection': 'network',
      'FileCreated': 'file',
      'RegistryKeyCreated': 'registry',
      'DnsLookup': 'dns',
    };
    return typeMap[eventType?.toString()] || 'process';
  }

  // Network connection parsing methods
  private parseCrowdStrikeNetworkConnections(behaviors: any[]): EDRNetworkConnection[] {
    if (!behaviors) return [];
    
    return behaviors
      .filter(behavior => behavior.network_connections)
      .flatMap(behavior => behavior.network_connections)
      .map(conn => ({
        local_ip: conn.local_ip,
        local_port: conn.local_port,
        remote_ip: conn.remote_ip,
        remote_port: conn.remote_port,
        protocol: conn.protocol,
        direction: conn.direction,
      }));
  }

  private parseSentinelOneNetworkConnections(connections: any[]): EDRNetworkConnection[] {
    if (!connections) return [];
    
    return connections.map(conn => ({
      local_ip: conn.localAddress,
      local_port: conn.localPort,
      remote_ip: conn.remoteAddress,
      remote_port: conn.remotePort,
      protocol: conn.protocol,
      direction: conn.direction,
    }));
  }

  private parseCarbonBlackNetworkConnections(connections: any[]): EDRNetworkConnection[] {
    if (!connections) return [];
    
    return connections.map(conn => ({
      local_ip: conn.local_ip,
      local_port: conn.local_port,
      remote_ip: conn.remote_ip,
      remote_port: conn.remote_port,
      protocol: conn.protocol,
      direction: conn.direction,
    }));
  }

  private parseMicrosoftDefenderNetworkConnections(connections: any[]): EDRNetworkConnection[] {
    if (!connections) return [];
    
    return connections.map(conn => ({
      local_ip: conn.localAddress,
      local_port: conn.localPort,
      remote_ip: conn.remoteAddress,
      remote_port: conn.remotePort,
      protocol: conn.protocol,
      direction: conn.direction,
    }));
  }

  // Network data parsing methods for telemetry
  private parseCrowdStrikeNetworkData(networkData: any): EDRNetworkConnection | undefined {
    if (!networkData) return undefined;
    
    return {
      local_ip: networkData.local_ip,
      local_port: networkData.local_port,
      remote_ip: networkData.remote_ip,
      remote_port: networkData.remote_port,
      protocol: networkData.protocol,
      direction: networkData.direction,
    };
  }

  private parseSentinelOneNetworkData(networkData: any): EDRNetworkConnection | undefined {
    if (!networkData) return undefined;
    
    return {
      local_ip: networkData.localAddress,
      local_port: networkData.localPort,
      remote_ip: networkData.remoteAddress,
      remote_port: networkData.remotePort,
      protocol: networkData.protocol,
      direction: networkData.direction,
    };
  }

  private parseCarbonBlackNetworkData(networkData: any): EDRNetworkConnection | undefined {
    if (!networkData) return undefined;
    
    return {
      local_ip: networkData.local_ip,
      local_port: networkData.local_port,
      remote_ip: networkData.remote_ip,
      remote_port: networkData.remote_port,
      protocol: networkData.protocol,
      direction: networkData.direction,
    };
  }

  private parseMicrosoftDefenderNetworkData(networkData: any): EDRNetworkConnection | undefined {
    if (!networkData) return undefined;
    
    return {
      local_ip: networkData.localAddress,
      local_port: networkData.localPort,
      remote_ip: networkData.remoteAddress,
      remote_port: networkData.remotePort,
      protocol: networkData.protocol,
      direction: networkData.direction,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      const response = await this.client.get('/oauth2/tokeninfo');
      return response.status === 200;
    } catch (error) {
      this.logger.error('EDR connection test failed', { error });
      return false;
    }
  }
}
