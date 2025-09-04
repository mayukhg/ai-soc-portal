/**
 * Sample Data Service
 * 
 * This service provides access to sample cybersecurity datasets for testing
 * and demonstration purposes. It integrates with the agent system to provide
 * realistic data for threat detection, incident analysis, and system monitoring.
 */

import securityEvents from '../../data/sample/security_events.json';
import threatIndicators from '../../data/sample/threat_indicators.json';
import incidents from '../../data/sample/incidents.json';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  source: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source_ip: string;
  destination_ip: string;
  port: number;
  protocol: string;
  action: string;
  rule_id: string;
  user: string;
  location: string;
  tags: string[];
}

export interface ThreatIndicator {
  id: string;
  type: string;
  value: string;
  description: string;
  confidence: number;
  source: string;
  first_seen: string;
  last_seen: string;
  tags: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'inactive' | 'expired';
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  created_at: string;
  updated_at: string;
  assigned_to: string;
  affected_systems: string[];
  source_ips: string[];
  tags: string[];
  timeline: Array<{
    timestamp: string;
    event: string;
    description: string;
    agent: string;
  }>;
  indicators: string[];
  related_events: string[];
  resolution: {
    status: string;
    description: string;
    resolved_at: string;
    resolved_by: string;
  } | null;
}

export interface NetworkFlow {
  timestamp: string;
  source_ip: string;
  destination_ip: string;
  source_port: number;
  destination_port: number;
  protocol: string;
  packets: number;
  bytes: number;
  duration: number;
  flags: string;
  service: string;
  state: string;
}

export class SampleDataService {
  private static instance: SampleDataService;
  private securityEvents: SecurityEvent[];
  private threatIndicators: ThreatIndicator[];
  private incidents: Incident[];

  private constructor() {
    this.securityEvents = securityEvents as SecurityEvent[];
    this.threatIndicators = threatIndicators as ThreatIndicator[];
    this.incidents = incidents as Incident[];
  }

  public static getInstance(): SampleDataService {
    if (!SampleDataService.instance) {
      SampleDataService.instance = new SampleDataService();
    }
    return SampleDataService.instance;
  }

  /**
   * Get all security events
   */
  public getSecurityEvents(): SecurityEvent[] {
    return [...this.securityEvents];
  }

  /**
   * Get security events by severity
   */
  public getSecurityEventsBySeverity(severity: string): SecurityEvent[] {
    return this.securityEvents.filter(event => event.severity === severity);
  }

  /**
   * Get security events by source
   */
  public getSecurityEventsBySource(source: string): SecurityEvent[] {
    return this.securityEvents.filter(event => event.source === source);
  }

  /**
   * Get security events by time range
   */
  public getSecurityEventsByTimeRange(startTime: string, endTime: string): SecurityEvent[] {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return this.securityEvents.filter(event => {
      const eventTime = new Date(event.timestamp);
      return eventTime >= start && eventTime <= end;
    });
  }

  /**
   * Get security events by tags
   */
  public getSecurityEventsByTags(tags: string[]): SecurityEvent[] {
    return this.securityEvents.filter(event => 
      tags.some(tag => event.tags.includes(tag))
    );
  }

  /**
   * Get all threat indicators
   */
  public getThreatIndicators(): ThreatIndicator[] {
    return [...this.threatIndicators];
  }

  /**
   * Get threat indicators by type
   */
  public getThreatIndicatorsByType(type: string): ThreatIndicator[] {
    return this.threatIndicators.filter(indicator => indicator.type === type);
  }

  /**
   * Get threat indicators by severity
   */
  public getThreatIndicatorsBySeverity(severity: string): ThreatIndicator[] {
    return this.threatIndicators.filter(indicator => indicator.severity === severity);
  }

  /**
   * Get active threat indicators
   */
  public getActiveThreatIndicators(): ThreatIndicator[] {
    return this.threatIndicators.filter(indicator => indicator.status === 'active');
  }

  /**
   * Get all incidents
   */
  public getIncidents(): Incident[] {
    return [...this.incidents];
  }

  /**
   * Get incidents by status
   */
  public getIncidentsByStatus(status: string): Incident[] {
    return this.incidents.filter(incident => incident.status === status);
  }

  /**
   * Get incidents by severity
   */
  public getIncidentsBySeverity(severity: string): Incident[] {
    return this.incidents.filter(incident => incident.severity === severity);
  }

  /**
   * Get open incidents
   */
  public getOpenIncidents(): Incident[] {
    return this.incidents.filter(incident => 
      ['open', 'investigating', 'contained'].includes(incident.status)
    );
  }

  /**
   * Get incidents by assigned team
   */
  public getIncidentsByTeam(team: string): Incident[] {
    return this.incidents.filter(incident => incident.assigned_to === team);
  }

  /**
   * Get incident by ID
   */
  public getIncidentById(id: string): Incident | undefined {
    return this.incidents.find(incident => incident.id === id);
  }

  /**
   * Get security events related to an incident
   */
  public getSecurityEventsForIncident(incidentId: string): SecurityEvent[] {
    const incident = this.getIncidentById(incidentId);
    if (!incident) return [];
    
    return this.securityEvents.filter(event => 
      incident.related_events.includes(event.id)
    );
  }

  /**
   * Get threat indicators for an incident
   */
  public getThreatIndicatorsForIncident(incidentId: string): ThreatIndicator[] {
    const incident = this.getIncidentById(incidentId);
    if (!incident) return [];
    
    return this.threatIndicators.filter(indicator => 
      incident.indicators.includes(indicator.id)
    );
  }

  /**
   * Get statistics for dashboard
   */
  public getStatistics() {
    const totalEvents = this.securityEvents.length;
    const totalIndicators = this.threatIndicators.length;
    const totalIncidents = this.incidents.length;
    
    const eventsBySeverity = this.securityEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const incidentsByStatus = this.incidents.reduce((acc, incident) => {
      acc[incident.status] = (acc[incident.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const indicatorsByType = this.threatIndicators.reduce((acc, indicator) => {
      acc[indicator.type] = (acc[indicator.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalEvents,
      totalIndicators,
      totalIncidents,
      eventsBySeverity,
      incidentsByStatus,
      indicatorsByType,
      openIncidents: this.getOpenIncidents().length,
      activeIndicators: this.getActiveThreatIndicators().length
    };
  }

  /**
   * Search security events
   */
  public searchSecurityEvents(query: string): SecurityEvent[] {
    const lowercaseQuery = query.toLowerCase();
    
    return this.securityEvents.filter(event => 
      event.description.toLowerCase().includes(lowercaseQuery) ||
      event.source_ip.includes(query) ||
      event.destination_ip.includes(query) ||
      event.user.toLowerCase().includes(lowercaseQuery) ||
      event.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Search incidents
   */
  public searchIncidents(query: string): Incident[] {
    const lowercaseQuery = query.toLowerCase();
    
    return this.incidents.filter(incident => 
      incident.title.toLowerCase().includes(lowercaseQuery) ||
      incident.description.toLowerCase().includes(lowercaseQuery) ||
      incident.assigned_to.toLowerCase().includes(lowercaseQuery) ||
      incident.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Get recent activity (last N hours)
   */
  public getRecentActivity(hours: number = 24): {
    events: SecurityEvent[];
    incidents: Incident[];
    indicators: ThreatIndicator[];
  } {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    const recentEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp) >= cutoffTime
    );
    
    const recentIncidents = this.incidents.filter(incident => 
      new Date(incident.created_at) >= cutoffTime
    );
    
    const recentIndicators = this.threatIndicators.filter(indicator => 
      new Date(indicator.last_seen) >= cutoffTime
    );
    
    return {
      events: recentEvents,
      incidents: recentIncidents,
      indicators: recentIndicators
    };
  }

  /**
   * Get data for agent analysis
   */
  public getDataForAgent(agentType: string, context?: any): any {
    switch (agentType) {
      case 'threat_detection':
        return {
          events: this.getSecurityEvents(),
          indicators: this.getThreatIndicators(),
          recentActivity: this.getRecentActivity(1) // Last hour
        };
      
      case 'incident_analysis':
        return {
          incidents: this.getIncidents(),
          openIncidents: this.getOpenIncidents(),
          events: this.getSecurityEvents()
        };
      
      case 'response_planning':
        return {
          openIncidents: this.getOpenIncidents(),
          criticalIncidents: this.getIncidentsBySeverity('critical'),
          highPriorityIncidents: this.getIncidentsBySeverity('high')
        };
      
      case 'intelligence_gathering':
        return {
          indicators: this.getThreatIndicators(),
          activeIndicators: this.getActiveThreatIndicators(),
          recentIndicators: this.getRecentActivity(24).indicators
        };
      
      case 'monitoring':
        return {
          statistics: this.getStatistics(),
          recentActivity: this.getRecentActivity(1),
          systemHealth: {
            totalEvents: this.securityEvents.length,
            openIncidents: this.getOpenIncidents().length,
            activeIndicators: this.getActiveThreatIndicators().length
          }
        };
      
      default:
        return {
          events: this.getSecurityEvents(),
          incidents: this.getIncidents(),
          indicators: this.getThreatIndicators()
        };
    }
  }
}

// Export singleton instance
export const sampleDataService = SampleDataService.getInstance();
