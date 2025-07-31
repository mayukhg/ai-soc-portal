import json
import os
import boto3
import requests
from datetime import datetime
from typing import Dict, Any

def lambda_handler(event, context):
    """Handle CloudWatch alarms and send Teams notifications"""
    
    try:
        # Teams webhook URL from environment
        teams_webhook_url = os.environ.get('TEAMS_WEBHOOK_URL')
        
        if not teams_webhook_url:
            print("Teams webhook URL not configured")
            return {
                'statusCode': 200,
                'body': 'Teams webhook not configured'
            }
        
        # Parse CloudWatch alarm event
        alarm_name = event.get('detail', {}).get('alarmName', 'Unknown Alarm')
        alarm_state = event.get('detail', {}).get('state', {}).get('value', 'UNKNOWN')
        alarm_reason = event.get('detail', {}).get('state', {}).get('reasonData', 'No reason provided')
        
        # Determine service from alarm name
        service = extract_service_from_alarm(alarm_name)
        
        if alarm_state == 'ALARM':
            # Service is down
            message = create_downtime_message(service, alarm_reason, alarm_name)
        elif alarm_state == 'OK':
            # Service recovered
            message = create_recovery_message(service, alarm_reason, alarm_name)
        else:
            print(f"Unknown alarm state: {alarm_state}")
            return {
                'statusCode': 200,
                'body': 'Unknown alarm state'
            }
        
        # Send to Teams
        response = requests.post(
            teams_webhook_url,
            json=message,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"Teams notification sent successfully for {service}")
            return {
                'statusCode': 200,
                'body': 'Teams notification sent'
            }
        else:
            print(f"Failed to send Teams notification: {response.status_code} {response.text}")
            return {
                'statusCode': 500,
                'body': f'Failed to send Teams notification: {response.status_code}'
            }
            
    except Exception as e:
        print(f"Error processing alarm: {str(e)}")
        return {
            'statusCode': 500,
            'body': f'Error processing alarm: {str(e)}'
        }

def extract_service_from_alarm(alarm_name: str) -> str:
    """Extract service name from CloudWatch alarm name"""
    
    # Common service patterns in alarm names
    service_patterns = {
        'frontend': ['frontend', 'ui', 'web', 'app'],
        'database': ['database', 'db', 'postgres', 'supabase'],
        'authentication': ['auth', 'login', 'sso'],
        'ai': ['ai', 'openai', 'gpt', 'ml'],
        'api': ['api', 'lambda', 'backend'],
        'infrastructure': ['alb', 'ec2', 'rds', 'cloudfront']
    }
    
    alarm_lower = alarm_name.lower()
    
    for service, patterns in service_patterns.items():
        for pattern in patterns:
            if pattern in alarm_lower:
                return service
    
    # Default to 'unknown' if no pattern matches
    return 'unknown'

def create_downtime_message(service: str, reason: str, alarm_name: str) -> Dict[str, Any]:
    """Create Teams message for service downtime"""
    
    return {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "FF0000",
        "summary": f"🚨 {service.capitalize()} Service Down",
        "sections": [
            {
                "activityTitle": f"🚨 Critical Service Alert: {service.capitalize()}",
                "activitySubtitle": datetime.now().isoformat(),
                "facts": [
                    {"name": "Service", "value": service.capitalize()},
                    {"name": "Status", "value": "DOWN"},
                    {"name": "Alarm", "value": alarm_name},
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
            },
            {
                "@type": "OpenUri",
                "name": "View CloudWatch",
                "targets": [{"os": "default", "uri": "https://console.aws.amazon.com/cloudwatch/home"}]
            }
        ]
    }

def create_recovery_message(service: str, reason: str, alarm_name: str) -> Dict[str, Any]:
    """Create Teams message for service recovery"""
    
    return {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "00FF00",
        "summary": f"✅ {service.capitalize()} Service Recovered",
        "sections": [
            {
                "activityTitle": f"✅ Service Recovered: {service.capitalize()}",
                "activitySubtitle": datetime.now().isoformat(),
                "facts": [
                    {"name": "Service", "value": service.capitalize()},
                    {"name": "Status", "value": "HEALTHY"},
                    {"name": "Alarm", "value": alarm_name},
                    {"name": "Recovery Time", "value": datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")}
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

def create_escalation_message(service: str, downtime_duration: str, escalation_level: str) -> Dict[str, Any]:
    """Create Teams message for escalation alerts"""
    
    return {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "FF0000",
        "summary": f"🚨 ESCALATION: {service.capitalize()} Still Down",
        "sections": [
            {
                "activityTitle": f"🚨 ESCALATION ALERT: {service.capitalize()}",
                "activitySubtitle": datetime.now().isoformat(),
                "facts": [
                    {"name": "Service", "value": service.capitalize()},
                    {"name": "Downtime Duration", "value": downtime_duration},
                    {"name": "Escalation Level", "value": escalation_level},
                    {"name": "Priority", "value": "HIGH"},
                    {"name": "Time", "value": datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")}
                ]
            }
        ],
        "potentialAction": [
            {
                "@type": "OpenUri",
                "name": "View Incident",
                "targets": [{"os": "default", "uri": "https://dashboard.soc-nexus.com/incidents"}]
            },
            {
                "@type": "OpenUri",
                "name": "Contact On-Call",
                "targets": [{"os": "default", "uri": "https://teams.microsoft.com/l/chat/0/0?users=oncall@soc-nexus.com"}]
            }
        ]
    }

def create_maintenance_message(service: str, maintenance_type: str, scheduled_time: str, duration: str) -> Dict[str, Any]:
    """Create Teams message for maintenance alerts"""
    
    return {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "FFA500",
        "summary": f"🔧 {service.capitalize()} Maintenance Scheduled",
        "sections": [
            {
                "activityTitle": f"🔧 Maintenance Alert: {service.capitalize()}",
                "activitySubtitle": datetime.now().isoformat(),
                "facts": [
                    {"name": "Service", "value": service.capitalize()},
                    {"name": "Type", "value": maintenance_type},
                    {"name": "Scheduled Time", "value": scheduled_time},
                    {"name": "Expected Duration", "value": duration},
                    {"name": "Impact", "value": "Planned downtime"}
                ]
            }
        ],
        "potentialAction": [
            {
                "@type": "OpenUri",
                "name": "View Status Page",
                "targets": [{"os": "default", "uri": "https://status.soc-nexus.com"}]
            }
        ]
    } 