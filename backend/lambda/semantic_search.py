import os
import json
import openai
import pinecone
import redis
import psycopg2
import boto3
import re
import hashlib
from typing import List, Dict, Any
from datetime import datetime, timedelta

# Environment variables (set in Lambda configuration)
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')  # OpenAI API key for embeddings
PINECONE_API_KEY = os.environ.get('PINECONE_API_KEY')  # Pinecone API key
PINECONE_ENV = os.environ.get('PINECONE_ENV')  # Pinecone environment (e.g., us-west1-gcp)
PINECONE_INDEX = os.environ.get('PINECONE_INDEX')  # Pinecone index name
REDIS_HOST = os.environ.get('REDIS_HOST')  # Redis endpoint
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))  # Redis port
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD')  # Redis password
AURORA_HOST = os.environ.get('AURORA_HOST')  # Aurora endpoint
AURORA_DB = os.environ.get('AURORA_DB')  # Aurora database name
AURORA_USER = os.environ.get('AURORA_USER')  # Aurora username
AURORA_PASSWORD = os.environ.get('AURORA_PASSWORD')  # Aurora password
AURORA_PORT = int(os.environ.get('AURORA_PORT', 5432))  # Aurora port

# Initialize Redis client for caching embeddings and results
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD, decode_responses=True)

# Initialize Pinecone client for vector search
pinecone.init(api_key=PINECONE_API_KEY, environment=PINECONE_ENV)
pinecone_index = pinecone.Index(PINECONE_INDEX)

# Set OpenAI API key
openai.api_key = OPENAI_API_KEY

def get_aurora_connection():
    """Establish a connection to Aurora Serverless (Postgres)."""
    return psycopg2.connect(
        host=AURORA_HOST,
        database=AURORA_DB,
        user=AURORA_USER,
        password=AURORA_PASSWORD,
        port=AURORA_PORT
    )

def detect_threat_patterns(text: str) -> Dict[str, Any]:
    """Detect common threat patterns and indicators in text."""
    patterns = {
        'malware_indicators': [
            r'(?i)(malware|virus|trojan|ransomware|backdoor|rootkit)',
            r'(?i)(payload|exploit|shellcode|injection)',
            r'(?i)(keylogger|spyware|adware)'
        ],
        'network_indicators': [
            r'(?i)(lateral movement|pivot|exfiltration)',
            r'(?i)(command and control|c2|beacon)',
            r'(?i)(data breach|leak|exfil)'
        ],
        'attack_vectors': [
            r'(?i)(phishing|spear phishing|social engineering)',
            r'(?i)(privilege escalation|escalation)',
            r'(?i)(persistence|persistent)'
        ],
        'ioc_patterns': [
            r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b',  # IP addresses
            r'\b(?:[a-f0-9]{2}:){5}[a-f0-9]{2}\b',  # MAC addresses
            r'\b[A-Za-z0-9+/]{40}={0,2}\b',  # SHA1 hashes
            r'\b[A-Za-z0-9+/]{64}={0,2}\b',  # SHA256 hashes
            r'\b[A-Za-z0-9+/]{32}={0,2}\b'   # MD5 hashes
        ]
    }
    
    detected = {
        'threat_level': 'low',
        'confidence_score': 0.0,
        'indicators': [],
        'risk_factors': []
    }
    
    threat_count = 0
    for category, pattern_list in patterns.items():
        for pattern in pattern_list:
            matches = re.findall(pattern, text)
            if matches:
                detected['indicators'].extend(matches)
                threat_count += len(matches)
    
    # Calculate threat level based on indicators found
    if threat_count >= 5:
        detected['threat_level'] = 'critical'
        detected['confidence_score'] = 0.9
    elif threat_count >= 3:
        detected['threat_level'] = 'high'
        detected['confidence_score'] = 0.7
    elif threat_count >= 1:
        detected['threat_level'] = 'medium'
        detected['confidence_score'] = 0.5
    
    # Add risk factors based on detected patterns
    if any('malware' in indicator.lower() for indicator in detected['indicators']):
        detected['risk_factors'].append('Malware detected')
    if any('lateral' in indicator.lower() for indicator in detected['indicators']):
        detected['risk_factors'].append('Lateral movement detected')
    if any('exfil' in indicator.lower() for indicator in detected['indicators']):
        detected['risk_factors'].append('Data exfiltration risk')
    
    return detected

def generate_security_recommendations(threat_analysis: Dict[str, Any]) -> List[str]:
    """Generate security recommendations based on threat analysis."""
    recommendations = []
    
    if threat_analysis['threat_level'] in ['high', 'critical']:
        recommendations.extend([
            'Immediate incident response required',
            'Isolate affected systems',
            'Notify security team and management',
            'Preserve evidence for forensic analysis'
        ])
    
    if 'Malware detected' in threat_analysis['risk_factors']:
        recommendations.extend([
            'Run full antivirus scan on all systems',
            'Check for persistence mechanisms',
            'Review system logs for additional indicators'
        ])
    
    if 'Lateral movement detected' in threat_analysis['risk_factors']:
        recommendations.extend([
            'Review network segmentation',
            'Check for unauthorized access attempts',
            'Monitor for additional lateral movement'
        ])
    
    if 'Data exfiltration risk' in threat_analysis['risk_factors']:
        recommendations.extend([
            'Review data access logs',
            'Check for unusual data transfers',
            'Implement data loss prevention measures'
        ])
    
    return recommendations[:5]  # Limit to top 5 recommendations

def lambda_handler(event, context):
    """
    AWS Lambda handler for semantic search.
    Receives a query, checks Redis for cached embedding, calls OpenAI if needed,
    queries Pinecone for similar vectors, fetches metadata from Aurora, and returns results.
    """
    body = event.get('body')
    if isinstance(body, str):
        body = json.loads(body)
    query = body.get('query')
    match_threshold = float(body.get('matchThreshold', 0.7))
    match_count = int(body.get('matchCount', 10))
    if not query:
        return { 'statusCode': 400, 'body': json.dumps({'error': 'Query is required'}) }

    # 1. Check Redis for cached embedding
    embedding_key = f"embedding:{query}"
    embedding = redis_client.get(embedding_key)
    if embedding:
        embedding = json.loads(embedding)
    else:
        # 2. Get embedding from OpenAI if not cached
        try:
            response = openai.Embedding.create(
                input=query,
                model="text-embedding-3-small"
            )
            embedding = response['data'][0]['embedding']
            # Cache embedding in Redis for 24 hours
            redis_client.setex(embedding_key, 60*60*24, json.dumps(embedding))
        except Exception as e:
            return { 'statusCode': 500, 'body': json.dumps({'error': f'OpenAI error: {str(e)}'}) }

    # 3. Query Pinecone for similar vectors (semantic search)
    try:
        pinecone_results = pinecone_index.query(
            vector=embedding,
            top_k=match_count,
            include_metadata=False
        )
        # Only include matches above the similarity threshold
        ids = [match['id'] for match in pinecone_results['matches'] if match['score'] >= match_threshold]
    except Exception as e:
        return { 'statusCode': 500, 'body': json.dumps({'error': f'Pinecone error: {str(e)}'}) }

    # 4. Fetch incident metadata from Aurora for the matched IDs
    incidents = []
    if ids:
        try:
            conn = get_aurora_connection()
            cur = conn.cursor()
            # Fetch all relevant fields for the matched incidents
            sql = "SELECT id, title, description, severity, status, assignee, alert_count, tags, created_at, updated_at FROM incidents WHERE id = ANY(%s)"
            cur.execute(sql, (ids,))
            rows = cur.fetchall()
            for row in rows:
                # Perform threat analysis on incident description
                threat_analysis = detect_threat_patterns(f"{row[1]} {row[2] or ''}")
                security_recommendations = generate_security_recommendations(threat_analysis)
                
                incidents.append({
                    'id': row[0],
                    'title': row[1],
                    'description': row[2],
                    'severity': row[3],
                    'status': row[4],
                    'assignee': row[5],
                    'alert_count': row[6],
                    'tags': row[7],
                    'created_at': row[8].isoformat() if row[8] else None,
                    'updated_at': row[9].isoformat() if row[9] else None,
                    'threat_analysis': {
                        'threat_level': threat_analysis['threat_level'],
                        'confidence_score': threat_analysis['confidence_score'],
                        'indicators': threat_analysis['indicators'][:10],  # Limit to top 10
                        'risk_factors': threat_analysis['risk_factors'],
                        'recommendations': security_recommendations
                    }
                })
            cur.close()
            conn.close()
        except Exception as e:
            return { 'statusCode': 500, 'body': json.dumps({'error': f'Aurora error: {str(e)}'}) }

    # 5. Optionally cache results in Redis (by query, for 10 minutes)
    result_key = f"search:{query}:{match_threshold}:{match_count}"
    redis_client.setex(result_key, 60*10, json.dumps(incidents))

    # 6. Return the search results to the frontend
    return {
        'statusCode': 200,
        'body': json.dumps({
            'success': True,
            'results': incidents,
            'query': query,
            'matchThreshold': match_threshold,
            'matchCount': len(incidents)
        })
    }

# TODO: Add error handling for connection timeouts, retries, and logging.
# TODO: Add authentication/authorization if needed.
# TODO: Add environment variable validation and fallback defaults.
