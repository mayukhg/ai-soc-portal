# Sample Data Integration Guide

## Overview

This guide provides detailed instructions for integrating and using the sample cybersecurity datasets included with the SOC Nexus agent-based implementation. The sample data provides realistic security events, threat indicators, incidents, and network flows for testing, demonstration, and development purposes.

## 📁 Sample Data Structure

```
data/sample/
├── security_events.json      # Security events and alerts
├── threat_indicators.json    # Threat intelligence indicators
├── incidents.json            # Security incidents with timelines
└── network_flows.csv         # Network traffic flows
```

## 🔧 Integration Steps

### 1. Automatic Integration

The sample data is automatically integrated when the system starts:

```typescript
// Sample data service is automatically initialized
import { sampleDataService } from './services/sampleDataService';

// Data is immediately available
const events = sampleDataService.getSecurityEvents();
const incidents = sampleDataService.getIncidents();
const indicators = sampleDataService.getThreatIndicators();
```

### 2. Agent Integration

Each agent automatically uses sample data when no real data is provided:

```typescript
// Threat Detection Agent
const threats = await threatDetectionAgent.detectThreats(null, 'sample_data');

// Incident Analysis Agent
const analysis = await incidentAnalysisAgent.analyzeIncident('inc_001');

// Response Planning Agent
const response = await responsePlanningAgent.planResponse('inc_002');
```

### 3. Dashboard Integration

The dashboard automatically displays sample data statistics:

```typescript
// Statistics are calculated automatically
const stats = sampleDataService.getStatistics();
// Returns: { totalEvents, totalIndicators, totalIncidents, eventsBySeverity, ... }
```

## 📊 Dataset Details

### Security Events Dataset

**File**: `data/sample/security_events.json`
**Records**: 10 events
**Time Range**: 2024-01-15 08:30 - 11:10

#### Event Types:
- **Blocked Connection**: Firewall blocking suspicious IPs
- **Intrusion Attempt**: SQL injection attacks
- **Malware Detection**: Trojan horse in email
- **Network Anomaly**: Unusual traffic patterns
- **Failed Login**: Brute force attempts
- **Suspicious Request**: Malicious domain access
- **File Access**: Unauthorized file access
- **Process Anomaly**: Suspicious process execution
- **Privilege Escalation**: Database privilege escalation
- **API Abuse**: Excessive API calls

#### Severity Distribution:
- **Critical**: 2 events (malware, privilege escalation)
- **High**: 3 events (intrusion, suspicious request, process anomaly)
- **Medium**: 4 events (blocked connection, anomaly, file access, API abuse)
- **Low**: 1 event (failed login)

### Threat Indicators Dataset

**File**: `data/sample/threat_indicators.json`
**Records**: 10 indicators
**Status**: All active

#### Indicator Types:
- **IP Address**: Known malicious IPs
- **Domain**: Malware distribution domains
- **File Hash**: SHA-256 hashes of malware
- **Email Address**: Phishing email addresses
- **URL**: Credential harvesting URLs
- **User Agent**: Automated attack user agents
- **Certificate**: Suspicious SSL certificates
- **Process Name**: Malware process names
- **Registry Key**: Malware registry entries
- **Network Signature**: Malicious traffic signatures

#### Confidence Levels:
- **High (0.9+)**: 4 indicators
- **Medium (0.8-0.9)**: 4 indicators
- **Lower (0.7-0.8)**: 2 indicators

### Incidents Dataset

**File**: `data/sample/incidents.json`
**Records**: 4 incidents
**Status**: 2 open, 1 contained, 1 resolved

#### Incident Types:
1. **SQL Injection Attack** (Investigating)
   - Severity: High
   - Affected: Web server, database
   - Timeline: 4 events

2. **Malware Detection** (Contained)
   - Severity: Critical
   - Affected: Mail server, workstations
   - Timeline: 4 events

3. **Privilege Escalation** (Resolved)
   - Severity: Critical
   - Affected: Database server, domain controller
   - Timeline: 5 events

4. **Network Anomaly** (Investigating)
   - Severity: Medium
   - Affected: Workstation, network switch
   - Timeline: 3 events

### Network Flows Dataset

**File**: `data/sample/network_flows.csv`
**Records**: 10 flows
**Protocols**: TCP, UDP, ICMP

#### Flow Characteristics:
- **SSH**: 1 flow (blocked connection)
- **HTTP**: 1 flow (SQL injection)
- **SMTP**: 1 flow (malware email)
- **DNS**: 1 flow (anomaly)
- **RDP**: 1 flow (failed login)
- **HTTPS**: 2 flows (malicious domain, API abuse)
- **SMB**: 1 flow (file access)
- **Ping**: 1 flow (process anomaly)
- **MSSQL**: 1 flow (privilege escalation)

## 🚀 Usage Examples

### Basic Data Access

```typescript
import { sampleDataService } from './services/sampleDataService';

// Get all data
const allEvents = sampleDataService.getSecurityEvents();
const allIncidents = sampleDataService.getIncidents();
const allIndicators = sampleDataService.getThreatIndicators();

// Get statistics
const stats = sampleDataService.getStatistics();
console.log(`Total Events: ${stats.totalEvents}`);
console.log(`Open Incidents: ${stats.openIncidents}`);
console.log(`Active Indicators: ${stats.activeIndicators}`);
```

### Filtering and Searching

```typescript
// Filter by severity
const criticalEvents = sampleDataService.getSecurityEventsBySeverity('critical');
const highIncidents = sampleDataService.getIncidentsBySeverity('high');

// Filter by source
const firewallEvents = sampleDataService.getSecurityEventsBySource('firewall');
const idsEvents = sampleDataService.getSecurityEventsBySource('ids');

// Search functionality
const malwareEvents = sampleDataService.searchSecurityEvents('malware');
const sqlIncidents = sampleDataService.searchIncidents('sql injection');

// Get recent activity
const lastHour = sampleDataService.getRecentActivity(1);
const lastDay = sampleDataService.getRecentActivity(24);
```

### Agent-Specific Data

```typescript
// Get data for specific agent types
const threatData = sampleDataService.getDataForAgent('threat_detection');
const incidentData = sampleDataService.getDataForAgent('incident_analysis');
const responseData = sampleDataService.getDataForAgent('response_planning');
const intelData = sampleDataService.getDataForAgent('intelligence_gathering');
const monitoringData = sampleDataService.getDataForAgent('monitoring');
```

### Time-Based Queries

```typescript
// Get events by time range
const morningEvents = sampleDataService.getSecurityEventsByTimeRange(
  '2024-01-15T08:00:00Z',
  '2024-01-15T12:00:00Z'
);

// Get recent activity
const recentActivity = sampleDataService.getRecentActivity(6); // Last 6 hours
```

## 🔄 Customizing Sample Data

### Adding New Security Events

1. **Edit the JSON file**:
   ```json
   {
     "id": "evt_011",
     "timestamp": "2024-01-15T12:00:00Z",
     "source": "new_source",
     "type": "new_event_type",
     "severity": "medium",
     "description": "New security event description",
     "source_ip": "10.0.0.100",
     "destination_ip": "10.0.0.200",
     "port": 443,
     "protocol": "HTTPS",
     "action": "alert",
     "rule_id": "NEW_RULE_001",
     "user": "new_user",
     "location": "new_location",
     "tags": ["new_tag", "custom"]
   }
   ```

2. **Restart the application** to load new data

### Adding New Incidents

1. **Create incident with timeline**:
   ```json
   {
     "id": "inc_005",
     "title": "New Security Incident",
     "description": "Description of the new incident",
     "status": "open",
     "severity": "high",
     "priority": "urgent",
     "created_at": "2024-01-15T12:00:00Z",
     "updated_at": "2024-01-15T12:00:00Z",
     "assigned_to": "security_team_delta",
     "affected_systems": ["system_01", "system_02"],
     "source_ips": ["10.0.0.100"],
     "tags": ["new_incident", "custom"],
     "timeline": [
       {
         "timestamp": "2024-01-15T12:00:00Z",
         "event": "Incident created",
         "description": "New incident detected",
         "agent": "orchestrator"
       }
     ],
     "indicators": ["ti_001"],
     "related_events": ["evt_001"],
     "resolution": null
   }
   ```

### Adding New Threat Indicators

1. **Create indicator with metadata**:
   ```json
   {
     "id": "ti_011",
     "type": "ip_address",
     "value": "203.0.113.100",
     "description": "New malicious IP address",
     "confidence": 0.85,
     "source": "threat_intelligence_feed",
     "first_seen": "2024-01-15T00:00:00Z",
     "last_seen": "2024-01-15T12:00:00Z",
     "tags": ["malicious", "new_threat"],
     "severity": "high",
     "status": "active"
   }
   ```

## 🧪 Testing with Sample Data

### Unit Testing

```typescript
import { sampleDataService } from './services/sampleDataService';

describe('Sample Data Service', () => {
  test('should load security events', () => {
    const events = sampleDataService.getSecurityEvents();
    expect(events).toHaveLength(10);
    expect(events[0]).toHaveProperty('id');
    expect(events[0]).toHaveProperty('severity');
  });

  test('should filter events by severity', () => {
    const criticalEvents = sampleDataService.getSecurityEventsBySeverity('critical');
    expect(criticalEvents).toHaveLength(2);
    criticalEvents.forEach(event => {
      expect(event.severity).toBe('critical');
    });
  });

  test('should get statistics', () => {
    const stats = sampleDataService.getStatistics();
    expect(stats.totalEvents).toBe(10);
    expect(stats.totalIncidents).toBe(4);
    expect(stats.totalIndicators).toBe(10);
  });
});
```

### Integration Testing

```typescript
import { ThreatDetectionAgent } from './agents/ThreatDetectionAgent';

describe('Threat Detection with Sample Data', () => {
  let agent: ThreatDetectionAgent;

  beforeEach(() => {
    agent = new ThreatDetectionAgent();
  });

  test('should detect threats from sample data', async () => {
    const threats = await agent.detectThreats(null, 'sample_data');
    expect(threats).toBeDefined();
    expect(Array.isArray(threats)).toBe(true);
  });

  test('should analyze patterns in sample events', async () => {
    const events = sampleDataService.getSecurityEvents();
    const patterns = await agent.analyzePatterns(events, 3600);
    expect(patterns).toHaveProperty('frequency');
    expect(patterns).toHaveProperty('sequences');
    expect(patterns).toHaveProperty('correlations');
  });
});
```

## 📈 Performance Optimization

### Caching Strategy

```typescript
// The service automatically caches data
// Statistics are cached and updated only when needed
const stats = sampleDataService.getStatistics(); // Cached
const events = sampleDataService.getSecurityEvents(); // Cached
```

### Memory Management

```typescript
// For large datasets, consider implementing pagination
const paginatedEvents = sampleDataService.getSecurityEvents().slice(0, 50);
const searchResults = sampleDataService.searchSecurityEvents('query').slice(0, 20);
```

### Query Optimization

```typescript
// Use specific filters instead of loading all data
const criticalEvents = sampleDataService.getSecurityEventsBySeverity('critical');
const openIncidents = sampleDataService.getOpenIncidents();
const activeIndicators = sampleDataService.getActiveThreatIndicators();
```

## 🔍 Troubleshooting

### Common Issues

1. **Data not loading**:
   - Check JSON file syntax
   - Verify file paths
   - Check browser console for errors

2. **Missing data in dashboard**:
   - Ensure service is imported correctly
   - Check that statistics are calculated
   - Verify agent integration

3. **Performance issues**:
   - Reduce sample data size
   - Implement pagination
   - Use search filters

### Debug Mode

```typescript
// Enable debug logging
console.log('Sample data loaded:', sampleDataService.getStatistics());
console.log('Events count:', sampleDataService.getSecurityEvents().length);
console.log('Incidents count:', sampleDataService.getIncidents().length);
```

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Common Attack Patterns](https://capec.mitre.org/)
- [Security Event Formats](https://www.elastic.co/guide/en/ecs/current/index.html)

## 🤝 Contributing

To contribute new sample data:

1. Follow the existing data schemas
2. Ensure realistic and diverse scenarios
3. Include proper metadata and relationships
4. Test with the agent system
5. Update documentation

## 📄 License

The sample data is provided under the same license as the main project (MIT License).
