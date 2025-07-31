# Critical Services Monitoring Plan

## Overview

This document outlines a comprehensive monitoring strategy for critical SOC Nexus services with automated Microsoft Teams notifications for downtime events. The monitoring system ensures high availability and rapid incident response.

## Critical Services Identified

### 1. **Frontend Application**
- **Service**: React/Vite application
- **Critical Functions**: Dashboard, Authentication, Real-time alerts
- **Monitoring Points**: Uptime, Response time, Error rates

### 2. **Backend API Services**
- **Service**: AWS Lambda functions
- **Critical Functions**: Alert processing, AI assistant, KPI calculations
- **Monitoring Points**: Function execution, Error rates, Cold start times

### 3. **Database Services**
- **Service**: Supabase PostgreSQL
- **Critical Functions**: Data storage, Real-time subscriptions
- **Monitoring Points**: Connection health, Query performance, Storage usage

### 4. **Authentication Services**
- **Service**: Supabase Auth + Azure AD
- **Critical Functions**: User authentication, Role management
- **Monitoring Points**: Auth success rates, Token validation, SSO health

### 5. **AI/ML Services**
- **Service**: OpenAI API, Pinecone Vector DB
- **Critical Functions**: Semantic search, AI assistant, Threat analysis
- **Monitoring Points**: API response times, Rate limits, Embedding generation

### 6. **Infrastructure Services**
- **Service**: AWS CloudFront, API Gateway, VPC
- **Critical Functions**: Content delivery, API routing, Network security
- **Monitoring Points**: CDN performance, Gateway health, Network latency

## Monitoring Architecture

### 1. **Health Check Endpoints**
```
GET /api/health
GET /api/health/detailed
GET /api/health/database
GET /api/health/auth
GET /api/health/ai
```

### 2. **Monitoring Stack**
- **Application Monitoring**: AWS CloudWatch + Custom metrics
- **Infrastructure Monitoring**: AWS CloudWatch + AWS Health
- **Synthetic Monitoring**: AWS Synthetics
- **Real-time Alerting**: AWS SNS + Lambda → Microsoft Teams
- **Dashboard**: CloudWatch Dashboards + Grafana

### 3. **Microsoft Teams Integration**
- **Webhook URL**: Configured for SOC Operations channel
- **Message Format**: Rich cards with status, metrics, and actions
- **Escalation**: Automated escalation to on-call team

## Implementation Plan

### Phase 1: Health Check Implementation

#### 1.1 Frontend Health Checks
```typescript
// src/services/healthCheck.ts
export class HealthCheckService {
  async checkFrontendHealth(): Promise<HealthStatus> {
    // Check React app responsiveness
    // Verify critical components loading
    // Test authentication flow
  }
}
```

#### 1.2 Backend Health Checks
```python
# backend/lambda/health_check.py
def lambda_handler(event, context):
    health_status = {
        'database': check_database_health(),
        'auth': check_auth_health(),
        'ai': check_ai_health(),
        'overall': 'healthy'
    }
    return health_status
```

### Phase 2: Monitoring Infrastructure

#### 2.1 AWS CloudWatch Configuration
```yaml
# monitoring/cloudwatch-config.yaml
Resources:
  SOCNexusMonitoring:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: SOC-Nexus-Critical-Service-Down
      MetricName: HealthyHostCount
      Namespace: AWS/ApplicationELB
      Statistic: Average
      Period: 60
      EvaluationPeriods: 2
      Threshold: 1
      ComparisonOperator: LessThanThreshold
```

#### 2.2 Synthetic Monitoring
```yaml
# monitoring/synthetic-tests.yaml
Resources:
  FrontendSyntheticTest:
    Type: AWS::Synthetics::Canary
    Properties:
      Name: SOC-Nexus-Frontend-Test
      ArtifactS3Location: s3://soc-nexus-monitoring/canaries/
      RuntimeVersion: syn-nodejs-puppeteer-3.9
      ExecutionRoleArn: !GetAtt MonitoringRole.Arn
      Schedule:
        Expression: rate(1 minute)
      RunConfig:
        TimeoutInSeconds: 300
```

### Phase 3: Microsoft Teams Integration

#### 3.1 Teams Webhook Service
```typescript
// src/services/teamsNotification.ts
export class TeamsNotificationService {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async sendDowntimeAlert(service: string, details: DowntimeDetails): Promise<void> {
    const message = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": "FF0000",
      "summary": `🚨 ${service} Service Down`,
      "sections": [
        {
          "activityTitle": `🚨 Critical Service Alert: ${service}`,
          "activitySubtitle": new Date().toISOString(),
          "facts": [
            {
              "name": "Service",
              "value": service
            },
            {
              "name": "Status",
              "value": "DOWN"
            },
            {
              "name": "Duration",
              "value": details.duration
            },
            {
              "name": "Impact",
              "value": details.impact
            }
          ]
        }
      ],
      "potentialAction": [
        {
          "@type": "OpenUri",
          "name": "View Dashboard",
          "targets": [
            {
              "os": "default",
              "uri": "https://dashboard.soc-nexus.com"
            }
          ]
        },
        {
          "@type": "OpenUri",
          "name": "Check Status Page",
          "targets": [
            {
              "os": "default",
              "uri": "https://status.soc-nexus.com"
            }
          ]
        }
      ]
    };

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  }

  async sendRecoveryAlert(service: string, details: RecoveryDetails): Promise<void> {
    const message = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": "00FF00",
      "summary": `✅ ${service} Service Recovered`,
      "sections": [
        {
          "activityTitle": `✅ Service Recovered: ${service}`,
          "activitySubtitle": new Date().toISOString(),
          "facts": [
            {
              "name": "Service",
              "value": service
            },
            {
              "name": "Status",
              "value": "HEALTHY"
            },
            {
              "name": "Downtime Duration",
              "value": details.downtimeDuration
            },
            {
              "name": "Recovery Time",
              "value": details.recoveryTime
            }
          ]
        }
      ]
    };

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  }
}
```

#### 3.2 AWS Lambda Alert Handler
```python
# backend/lambda/teams_alert_handler.py
import json
import boto3
import requests
from datetime import datetime

def lambda_handler(event, context):
    """Handle CloudWatch alarms and send Teams notifications"""
    
    # Teams webhook URL from environment
    teams_webhook_url = os.environ['TEAMS_WEBHOOK_URL']
    
    # Parse CloudWatch alarm event
    alarm_name = event['detail']['alarmName']
    alarm_state = event['detail']['state']['value']
    alarm_reason = event['detail']['state']['reasonData']
    
    # Determine service from alarm name
    service = extract_service_from_alarm(alarm_name)
    
    if alarm_state == 'ALARM':
        # Service is down
        message = create_downtime_message(service, alarm_reason)
    elif alarm_state == 'OK':
        # Service recovered
        message = create_recovery_message(service, alarm_reason)
    else:
        return {'statusCode': 200, 'body': 'Unknown alarm state'}
    
    # Send to Teams
    response = requests.post(
        teams_webhook_url,
        json=message,
        headers={'Content-Type': 'application/json'}
    )
    
    return {
        'statusCode': response.status_code,
        'body': 'Teams notification sent'
    }

def create_downtime_message(service, reason):
    return {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "FF0000",
        "summary": f"🚨 {service} Service Down",
        "sections": [
            {
                "activityTitle": f"🚨 Critical Service Alert: {service}",
                "activitySubtitle": datetime.now().isoformat(),
                "facts": [
                    {"name": "Service", "value": service},
                    {"name": "Status", "value": "DOWN"},
                    {"name": "Reason", "value": reason},
                    {"name": "Time", "value": datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")}
                ]
            }
        ],
        "potentialAction": [
            {
                "@type": "OpenUri",
                "name": "View Dashboard",
                "targets": [{"os": "default", "uri": "https://dashboard.soc-nexus.com"}]
            },
            {
                "@type": "OpenUri",
                "name": "Check Status Page",
                "targets": [{"os": "default", "uri": "https://status.soc-nexus.com"}]
            }
        ]
    }

def create_recovery_message(service, reason):
    return {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "00FF00",
        "summary": f"✅ {service} Service Recovered",
        "sections": [
            {
                "activityTitle": f"✅ Service Recovered: {service}",
                "activitySubtitle": datetime.now().isoformat(),
                "facts": [
                    {"name": "Service", "value": service},
                    {"name": "Status", "value": "HEALTHY"},
                    {"name": "Recovery Time", "value": datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")}
                ]
            }
        ]
    }
```

### Phase 4: Monitoring Dashboard

#### 4.1 CloudWatch Dashboard
```yaml
# monitoring/dashboard.yaml
Resources:
  SOCNexusDashboard:
    Type: AWS::CloudWatch::Dashboard
    Properties:
      DashboardName: SOC-Nexus-Monitoring
      DashboardBody: !Sub |
        {
          "widgets": [
            {
              "type": "metric",
              "properties": {
                "metrics": [
                  ["AWS/ApplicationELB", "HealthyHostCount", "LoadBalancer", "soc-nexus-alb"],
                  [".", "UnHealthyHostCount", ".", "."]
                ],
                "period": 60,
                "stat": "Average",
                "region": "${AWS::Region}",
                "title": "Load Balancer Health"
              }
            },
            {
              "type": "metric",
              "properties": {
                "metrics": [
                  ["AWS/Lambda", "Duration", "FunctionName", "soc-nexus-api"],
                  [".", "Errors", ".", "."]
                ],
                "period": 300,
                "stat": "Average",
                "region": "${AWS::Region}",
                "title": "Lambda Performance"
              }
            },
            {
              "type": "metric",
              "properties": {
                "metrics": [
                  ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", "soc-nexus-db"],
                  [".", "CPUUtilization", ".", "."]
                ],
                "period": 300,
                "stat": "Average",
                "region": "${AWS::Region}",
                "title": "Database Health"
              }
            }
          ]
        }
```

#### 4.2 Status Page
```typescript
// src/pages/StatusPage.tsx
export function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [overallStatus, setOverallStatus] = useState<'operational' | 'degraded' | 'down'>('operational');

  useEffect(() => {
    // Fetch real-time service status
    const fetchStatus = async () => {
      const response = await fetch('/api/status');
      const data = await response.json();
      setServices(data.services);
      setOverallStatus(data.overallStatus);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">SOC Nexus Status</h1>
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-white ${
            overallStatus === 'operational' ? 'bg-green-500' :
            overallStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
          }`}>
            <span className="capitalize">{overallStatus}</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceStatusCard key={service.name} service={service} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Alert Escalation Matrix

### Level 1: Immediate Response (0-5 minutes)
- **Trigger**: Any critical service down
- **Action**: Automated Teams notification
- **Response**: On-call engineer acknowledgment

### Level 2: Escalation (5-15 minutes)
- **Trigger**: No acknowledgment within 5 minutes
- **Action**: Escalate to senior engineer
- **Response**: Senior engineer takes ownership

### Level 3: Management Alert (15-30 minutes)
- **Trigger**: Service still down after 15 minutes
- **Action**: Alert SOC manager
- **Response**: Management oversight and coordination

### Level 4: Emergency Response (30+ minutes)
- **Trigger**: Extended downtime
- **Action**: Emergency response team activation
- **Response**: Full incident response procedures

## Monitoring Metrics

### Application Metrics
- **Response Time**: < 200ms for 95% of requests
- **Error Rate**: < 1% for all endpoints
- **Availability**: 99.9% uptime target
- **Throughput**: Monitor requests per second

### Infrastructure Metrics
- **CPU Utilization**: < 80% average
- **Memory Usage**: < 85% average
- **Disk Space**: < 90% usage
- **Network Latency**: < 100ms average

### Business Metrics
- **Active Users**: Monitor concurrent users
- **Alert Processing**: Monitor alert processing time
- **AI Response Time**: Monitor AI assistant response
- **Authentication Success Rate**: > 99% success rate

## Implementation Timeline

### Week 1: Foundation
- [ ] Set up CloudWatch monitoring
- [ ] Implement health check endpoints
- [ ] Configure basic alarms

### Week 2: Teams Integration
- [ ] Set up Teams webhook
- [ ] Implement alert handlers
- [ ] Test notification system

### Week 3: Advanced Monitoring
- [ ] Deploy synthetic tests
- [ ] Set up custom dashboards
- [ ] Implement status page

### Week 4: Optimization
- [ ] Fine-tune alert thresholds
- [ ] Optimize notification messages
- [ ] Conduct monitoring drills

## Cost Estimation

### AWS CloudWatch
- **Basic Monitoring**: $0.30 per metric per month
- **Detailed Monitoring**: $0.30 per metric per month
- **Custom Metrics**: $0.30 per metric per month
- **Synthetic Monitoring**: $0.0012 per canary run

### Estimated Monthly Cost
- **50 Metrics**: $15/month
- **Synthetic Tests**: $5/month
- **Total**: ~$20/month

## Success Criteria

### Technical Metrics
- **Mean Time to Detection (MTTD)**: < 1 minute
- **Mean Time to Resolution (MTTR)**: < 15 minutes
- **False Positive Rate**: < 5%
- **Alert Fatigue**: Minimal through proper threshold tuning

### Business Metrics
- **Service Availability**: 99.9% uptime
- **Customer Satisfaction**: Maintain high satisfaction during incidents
- **Incident Response Time**: < 5 minutes acknowledgment
- **Recovery Time**: < 15 minutes for most incidents

## Maintenance and Updates

### Monthly Tasks
- [ ] Review and update alert thresholds
- [ ] Analyze false positives
- [ ] Update monitoring dashboards
- [ ] Test incident response procedures

### Quarterly Tasks
- [ ] Review monitoring strategy
- [ ] Update escalation procedures
- [ ] Conduct monitoring drills
- [ ] Update documentation

This monitoring plan ensures comprehensive coverage of critical services with rapid incident response through Microsoft Teams integration. 