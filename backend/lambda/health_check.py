"""
SOC Nexus Health Check Lambda Function

This module provides health check endpoints for monitoring critical services.
Supports basic health checks, detailed service monitoring, and CloudWatch metrics.

Author: SOC Nexus Team
Version: 1.0.0
"""

import json
import os
import logging
import boto3
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
cloudwatch = boto3.client('cloudwatch')

@dataclass
class HealthCheckResult:
    """Data class for health check results"""
    service: str
    status: str
    response_time: int
    timestamp: str
    details: Optional[Dict[str, Any]] = None

@dataclass
class DetailedHealthResponse:
    """Data class for detailed health response"""
    database: HealthCheckResult
    auth: HealthCheckResult
    ai: HealthCheckResult
    overall: str
    timestamp: str

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main health check handler
    
    Routes requests to appropriate health check endpoints based on path.
    Supports CORS and provides structured responses.
    
    Args:
        event: Lambda event containing HTTP request details
        context: Lambda context object
        
    Returns:
        Dict containing HTTP response with status code and body
    """
    try:
        # Parse the request
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        
        logger.info(f"Health check request: {http_method} {path}")
        
        if http_method == 'GET':
            if path == '/health':
                return check_basic_health()
            elif path == '/health/detailed':
                return check_detailed_health()
            elif path == '/health/database':
                return check_database_health()
            elif path == '/health/auth':
                return check_auth_health()
            elif path == '/health/ai':
                return check_ai_health()
            else:
                return create_response(404, {'error': 'Endpoint not found'})
        else:
            return create_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        logger.error(f"Health check handler error: {str(e)}")
        return create_response(500, {
            'error': 'Internal server error',
            'message': str(e)
        })

def check_basic_health() -> Dict[str, Any]:
    """
    Basic health check - verifies the Lambda function is running
    
    Returns:
        Dict containing basic health status response
    """
    try:
        logger.info("Performing basic health check")
        
        response_data = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'soc-nexus-backend',
            'version': '1.0.0',
            'environment': os.environ.get('ENVIRONMENT', 'production')
        }
        
        logger.info("Basic health check completed successfully")
        return create_response(200, response_data)
        
    except Exception as e:
        logger.error(f"Basic health check failed: {str(e)}")
        return create_response(500, {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })

def check_detailed_health():
    """Detailed health check for all services"""
    try:
        health_results = {
            'database': check_database_health_internal(),
            'auth': check_auth_health_internal(),
            'ai': check_ai_health_internal(),
            'overall': 'healthy',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Determine overall status
        if any(result.get('status') == 'down' for result in health_results.values() if isinstance(result, dict)):
            health_results['overall'] = 'down'
        elif any(result.get('status') == 'degraded' for result in health_results.values() if isinstance(result, dict)):
            health_results['overall'] = 'degraded'
        
        # Send metrics to CloudWatch
        send_health_metrics(health_results)
        
        return create_response(200, health_results)
    except Exception as e:
        return create_response(500, {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })

def check_database_health():
    """Database-specific health check"""
    try:
        result = check_database_health_internal()
        return create_response(200, result)
    except Exception as e:
        return create_response(500, {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })

def check_auth_health():
    """Authentication-specific health check"""
    try:
        result = check_auth_health_internal()
        return create_response(200, result)
    except Exception as e:
        return create_response(500, {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })

def check_ai_health():
    """AI services health check"""
    try:
        result = check_ai_health_internal()
        return create_response(200, result)
    except Exception as e:
        return create_response(500, {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })

def check_database_health_internal():
    """Internal database health check"""
    try:
        # Check Supabase connection
        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            return {
                'status': 'degraded',
                'error': 'Supabase credentials not configured',
                'response_time': 0
            }
        
        # Test database connection
        headers = {
            'apikey': supabase_key,
            'Authorization': f'Bearer {supabase_key}',
            'Content-Type': 'application/json'
        }
        
        start_time = datetime.utcnow()
        response = requests.get(
            f'{supabase_url}/rest/v1/profiles?select=count&limit=1',
            headers=headers,
            timeout=10
        )
        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        if response.status_code == 200:
            return {
                'status': 'healthy',
                'response_time': int(response_time),
                'connection': 'active'
            }
        else:
            return {
                'status': 'degraded',
                'response_time': int(response_time),
                'error': f'Database returned status {response.status_code}'
            }
    except Exception as e:
        return {
            'status': 'down',
            'error': str(e),
            'response_time': 0
        }

def check_auth_health_internal():
    """Internal authentication health check"""
    try:
        # Check Supabase Auth
        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            return {
                'status': 'degraded',
                'error': 'Supabase credentials not configured',
                'response_time': 0
            }
        
        # Test auth service
        headers = {
            'apikey': supabase_key,
            'Authorization': f'Bearer {supabase_key}',
            'Content-Type': 'application/json'
        }
        
        start_time = datetime.utcnow()
        response = requests.get(
            f'{supabase_url}/auth/v1/user',
            headers=headers,
            timeout=10
        )
        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        if response.status_code in [200, 401]:  # 401 is expected for unauthenticated requests
            return {
                'status': 'healthy',
                'response_time': int(response_time),
                'service': 'supabase_auth'
            }
        else:
            return {
                'status': 'degraded',
                'response_time': int(response_time),
                'error': f'Auth service returned status {response.status_code}'
            }
    except Exception as e:
        return {
            'status': 'down',
            'error': str(e),
            'response_time': 0
        }

def check_ai_health_internal():
    """Internal AI services health check"""
    try:
        # Check OpenAI API
        openai_api_key = os.environ.get('OPENAI_API_KEY')
        
        if not openai_api_key:
            return {
                'status': 'degraded',
                'error': 'OpenAI API key not configured',
                'response_time': 0
            }
        
        # Test OpenAI API
        headers = {
            'Authorization': f'Bearer {openai_api_key}',
            'Content-Type': 'application/json'
        }
        
        start_time = datetime.utcnow()
        response = requests.get(
            'https://api.openai.com/v1/models',
            headers=headers,
            timeout=15
        )
        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        if response.status_code == 200:
            return {
                'status': 'healthy',
                'response_time': int(response_time),
                'service': 'openai'
            }
        else:
            return {
                'status': 'degraded',
                'response_time': int(response_time),
                'error': f'OpenAI API returned status {response.status_code}'
            }
    except Exception as e:
        return {
            'status': 'down',
            'error': str(e),
            'response_time': 0
        }

def send_health_metrics(health_results: Dict[str, Any]):
    """Send health metrics to CloudWatch"""
    try:
        timestamp = datetime.utcnow()
        
        # Prepare metrics
        metrics = []
        
        # Overall health metric
        overall_status = 1 if health_results.get('overall') == 'healthy' else 0
        metrics.append({
            'MetricName': 'OverallHealth',
            'Value': overall_status,
            'Unit': 'None',
            'Timestamp': timestamp
        })
        
        # Individual service metrics
        for service_name, result in health_results.items():
            if isinstance(result, dict) and 'status' in result:
                status_value = 1 if result['status'] == 'healthy' else 0
                response_time = result.get('response_time', 0)
                
                metrics.append({
                    'MetricName': f'{service_name.capitalize()}Health',
                    'Value': status_value,
                    'Unit': 'None',
                    'Timestamp': timestamp
                })
                
                metrics.append({
                    'MetricName': f'{service_name.capitalize()}ResponseTime',
                    'Value': response_time,
                    'Unit': 'Milliseconds',
                    'Timestamp': timestamp
                })
        
        # Send metrics to CloudWatch
        cloudwatch.put_metric_data(
            Namespace='SOC-Nexus/Health',
            MetricData=metrics
        )
        
    except Exception as e:
        print(f"Failed to send metrics to CloudWatch: {e}")

def create_response(status_code: int, body: Dict[str, Any]):
    """Create HTTP response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        'body': json.dumps(body)
    } 