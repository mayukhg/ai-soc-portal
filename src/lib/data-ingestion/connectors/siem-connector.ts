/**
 * SIEM Connector
 * Connects to various SIEM systems (Splunk, QRadar, etc.) for data ingestion
 */

import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/logger';

export interface SIEMConfig {
  type: 'splunk' | 'qradar' | 'elastic' | 'arcsight';
  host: string;
  port: number;
  username: string;
  password: string;
  apiKey?: string;
  ssl: boolean;
  timeout: number;
  retryAttempts: number;
}

export interface SIEMEvent {
  id: string;
  timestamp: Date;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  raw_data: any;
  metadata: Record<string, any>;
}

export interface SIEMQuery {
  timeRange: string;
  eventTypes: string[];
  limit: number;
  filters?: Record<string, any>;
}

export class SIEMConnector {
  private config: SIEMConfig;
  private client: AxiosInstance;
  private logger: Logger;

  constructor(config: SIEMConfig) {
    this.config = config;
    this.logger = new Logger('SIEMConnector');
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
        'User-Agent': 'SOC-Portal-SIEM-Connector/1.0',
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

  async fetchRecentEvents(query: SIEMQuery): Promise<SIEMEvent[]> {
    try {
      this.logger.info(`Fetching events from ${this.config.type} SIEM`, { query });

      let events: SIEMEvent[] = [];

      switch (this.config.type) {
        case 'splunk':
          events = await this.fetchSplunkEvents(query);
          break;
        case 'qradar':
          events = await this.fetchQRadarEvents(query);
          break;
        case 'elastic':
          events = await this.fetchElasticEvents(query);
          break;
        case 'arcsight':
          events = await this.fetchArcSightEvents(query);
          break;
        default:
          throw new Error(`Unsupported SIEM type: ${this.config.type}`);
      }

      this.logger.info(`Successfully fetched ${events.length} events from ${this.config.type}`);
      return events;

    } catch (error) {
      this.logger.error(`Failed to fetch events from ${this.config.type}`, { error });
      throw error;
    }
  }

  private async fetchSplunkEvents(query: SIEMQuery): Promise<SIEMEvent[]> {
    const searchQuery = this.buildSplunkQuery(query);
    
    const response = await this.client.post('/services/search/jobs', {
      search: searchQuery,
      exec_mode: 'blocking',
      max_count: query.limit,
    });

    const jobId = response.data.sid;
    
    // Wait for job completion
    await this.waitForSplunkJob(jobId);
    
    // Get results
    const resultsResponse = await this.client.get(`/services/search/jobs/${jobId}/results`, {
      params: {
        output_mode: 'json',
        count: query.limit,
      },
    });

    return this.parseSplunkResults(resultsResponse.data);
  }

  private async fetchQRadarEvents(query: SIEMQuery): Promise<SIEMEvent[]> {
    const aqlQuery = this.buildQRadarQuery(query);
    
    const response = await this.client.post('/api/ariel/searches', {
      query_expression: aqlQuery,
    });

    const searchId = response.data.search_id;
    
    // Wait for search completion
    await this.waitForQRadarSearch(searchId);
    
    // Get results
    const resultsResponse = await this.client.get(`/api/ariel/searches/${searchId}/results`, {
      params: {
        output_format: 'json',
        range: `0-${query.limit}`,
      },
    });

    return this.parseQRadarResults(resultsResponse.data);
  }

  private async fetchElasticEvents(query: SIEMQuery): Promise<SIEMEvent[]> {
    const elasticQuery = this.buildElasticQuery(query);
    
    const response = await this.client.post('/_search', elasticQuery);

    return this.parseElasticResults(response.data);
  }

  private async fetchArcSightEvents(query: SIEMQuery): Promise<SIEMEvent[]> {
    const cqlQuery = this.buildArcSightQuery(query);
    
    const response = await this.client.post('/services/event/search', {
      query: cqlQuery,
      limit: query.limit,
    });

    return this.parseArcSightResults(response.data);
  }

  private buildSplunkQuery(query: SIEMQuery): string {
    const timeRange = this.parseTimeRange(query.timeRange);
    const eventTypes = query.eventTypes.join(' OR ');
    
    let splunkQuery = `earliest=${timeRange.earliest} latest=${timeRange.latest}`;
    
    if (eventTypes) {
      splunkQuery += ` (${eventTypes})`;
    }
    
    if (query.filters) {
      const filterConditions = Object.entries(query.filters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' AND ');
      splunkQuery += ` AND ${filterConditions}`;
    }
    
    return splunkQuery;
  }

  private buildQRadarQuery(query: SIEMQuery): string {
    const timeRange = this.parseTimeRange(query.timeRange);
    const eventTypes = query.eventTypes.join(' OR ');
    
    let aqlQuery = `SELECT * FROM events WHERE starttime >= ${timeRange.earliest} AND starttime <= ${timeRange.latest}`;
    
    if (eventTypes) {
      aqlQuery += ` AND (${eventTypes})`;
    }
    
    if (query.filters) {
      const filterConditions = Object.entries(query.filters)
        .map(([key, value]) => `${key}='${value}'`)
        .join(' AND ');
      aqlQuery += ` AND ${filterConditions}`;
    }
    
    aqlQuery += ` ORDER BY starttime DESC LIMIT ${query.limit}`;
    
    return aqlQuery;
  }

  private buildElasticQuery(query: SIEMQuery): any {
    const timeRange = this.parseTimeRange(query.timeRange);
    
    const mustQueries: any[] = [
      {
        range: {
          '@timestamp': {
            gte: timeRange.earliest,
            lte: timeRange.latest,
          },
        },
      },
    ];
    
    if (query.eventTypes.length > 0) {
      mustQueries.push({
        terms: {
          'event.type': query.eventTypes,
        },
      });
    }
    
    if (query.filters) {
      Object.entries(query.filters).forEach(([key, value]) => {
        mustQueries.push({
          term: {
            [key]: value,
          },
        });
      });
    }
    
    return {
      query: {
        bool: {
          must: mustQueries,
        },
      },
      size: query.limit,
      sort: [
        {
          '@timestamp': {
            order: 'desc',
          },
        },
      ],
    };
  }

  private buildArcSightQuery(query: SIEMQuery): string {
    const timeRange = this.parseTimeRange(query.timeRange);
    const eventTypes = query.eventTypes.join(' OR ');
    
    let cqlQuery = `SELECT * FROM ArcSightEvents WHERE startTime >= '${timeRange.earliest}' AND startTime <= '${timeRange.latest}'`;
    
    if (eventTypes) {
      cqlQuery += ` AND (${eventTypes})`;
    }
    
    if (query.filters) {
      const filterConditions = Object.entries(query.filters)
        .map(([key, value]) => `${key}='${value}'`)
        .join(' AND ');
      cqlQuery += ` AND ${filterConditions}`;
    }
    
    cqlQuery += ` ORDER BY startTime DESC LIMIT ${query.limit}`;
    
    return cqlQuery;
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

  private async waitForSplunkJob(jobId: string): Promise<void> {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max wait

    while (attempts < maxAttempts) {
      const response = await this.client.get(`/services/search/jobs/${jobId}`);
      
      if (response.data.entry[0].content.isDone) {
        return;
      }
      
      await this.delay(5000); // Wait 5 seconds
      attempts++;
    }

    throw new Error(`Splunk job ${jobId} timed out`);
  }

  private async waitForQRadarSearch(searchId: string): Promise<void> {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max wait

    while (attempts < maxAttempts) {
      const response = await this.client.get(`/api/ariel/searches/${searchId}`);
      
      if (response.data.status === 'COMPLETED') {
        return;
      }
      
      if (response.data.status === 'ERROR') {
        throw new Error(`QRadar search ${searchId} failed: ${response.data.error}`);
      }
      
      await this.delay(5000); // Wait 5 seconds
      attempts++;
    }

    throw new Error(`QRadar search ${searchId} timed out`);
  }

  private parseSplunkResults(data: any): SIEMEvent[] {
    if (!data.results) return [];

    return data.results.map((result: any) => ({
      id: result._raw || `splunk_${Date.now()}_${Math.random()}`,
      timestamp: new Date(result._time * 1000),
      source: 'splunk',
      severity: this.mapSplunkSeverity(result.severity || result.priority),
      category: result.category || 'unknown',
      description: result.description || result.message || result._raw,
      raw_data: result,
      metadata: {
        index: result.index,
        sourcetype: result.sourcetype,
        source: result.source,
        host: result.host,
      },
    }));
  }

  private parseQRadarResults(data: any): SIEMEvent[] {
    if (!data.events) return [];

    return data.events.map((event: any) => ({
      id: event.id || `qradar_${Date.now()}_${Math.random()}`,
      timestamp: new Date(event.starttime),
      source: 'qradar',
      severity: this.mapQRadarSeverity(event.severity),
      category: event.category || 'unknown',
      description: event.description || event.name,
      raw_data: event,
      metadata: {
        sourceip: event.sourceip,
        destinationip: event.destinationip,
        sourceport: event.sourceport,
        destinationport: event.destinationport,
        protocol: event.protocol,
      },
    }));
  }

  private parseElasticResults(data: any): SIEMEvent[] {
    if (!data.hits?.hits) return [];

    return data.hits.hits.map((hit: any) => ({
      id: hit._id || `elastic_${Date.now()}_${Math.random()}`,
      timestamp: new Date(hit._source['@timestamp']),
      source: 'elastic',
      severity: this.mapElasticSeverity(hit._source.severity || hit._source.priority),
      category: hit._source.category || 'unknown',
      description: hit._source.message || hit._source.description || hit._source._raw,
      raw_data: hit._source,
      metadata: {
        index: hit._index,
        type: hit._type,
        score: hit._score,
      },
    }));
  }

  private parseArcSightResults(data: any): SIEMEvent[] {
    if (!data.events) return [];

    return data.events.map((event: any) => ({
      id: event.id || `arcsight_${Date.now()}_${Math.random()}`,
      timestamp: new Date(event.startTime),
      source: 'arcsight',
      severity: this.mapArcSightSeverity(event.severity),
      category: event.category || 'unknown',
      description: event.description || event.name,
      raw_data: event,
      metadata: {
        sourceAddress: event.sourceAddress,
        destinationAddress: event.destinationAddress,
        sourcePort: event.sourcePort,
        destinationPort: event.destinationPort,
        protocol: event.protocol,
      },
    }));
  }

  private mapSplunkSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      '0': 'low',
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

  private mapQRadarSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    const severityNum = parseInt(severity?.toString() || '0');
    
    if (severityNum <= 2) return 'low';
    if (severityNum <= 4) return 'medium';
    if (severityNum <= 6) return 'high';
    return 'critical';
  }

  private mapElasticSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    const severityStr = severity?.toString().toLowerCase() || '';
    
    if (severityStr.includes('critical') || severityStr.includes('emergency')) return 'critical';
    if (severityStr.includes('high') || severityStr.includes('error')) return 'high';
    if (severityStr.includes('medium') || severityStr.includes('warning')) return 'medium';
    return 'low';
  }

  private mapArcSightSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    const severityNum = parseInt(severity?.toString() || '0');
    
    if (severityNum <= 2) return 'low';
    if (severityNum <= 4) return 'medium';
    if (severityNum <= 6) return 'high';
    return 'critical';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/services/auth/current-context');
      return response.status === 200;
    } catch (error) {
      this.logger.error('SIEM connection test failed', { error });
      return false;
    }
  }
}
