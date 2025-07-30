import os
import json
import openai
import pinecone
import redis
import psycopg2
import boto3
from typing import List

# Environment variables (set in Lambda configuration)
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
PINECONE_API_KEY = os.environ.get('PINECONE_API_KEY')
PINECONE_ENV = os.environ.get('PINECONE_ENV')
PINECONE_INDEX = os.environ.get('PINECONE_INDEX')
REDIS_HOST = os.environ.get('REDIS_HOST')
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD')
AURORA_HOST = os.environ.get('AURORA_HOST')
AURORA_DB = os.environ.get('AURORA_DB')
AURORA_USER = os.environ.get('AURORA_USER')
AURORA_PASSWORD = os.environ.get('AURORA_PASSWORD')
AURORA_PORT = int(os.environ.get('AURORA_PORT', 5432))

# Initialize Redis client
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD, decode_responses=True)

# Initialize Pinecone
pinecone.init(api_key=PINECONE_API_KEY, environment=PINECONE_ENV)
pinecone_index = pinecone.Index(PINECONE_INDEX)

# OpenAI config
openai.api_key = OPENAI_API_KEY

# Aurora connection helper
def get_aurora_connection():
    return psycopg2.connect(
        host=AURORA_HOST,
        database=AURORA_DB,
        user=AURORA_USER,
        password=AURORA_PASSWORD,
        port=AURORA_PORT
    )

def lambda_handler(event, context):
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
        # 2. Get embedding from OpenAI
        try:
            response = openai.Embedding.create(
                input=query,
                model="text-embedding-3-small"
            )
            embedding = response['data'][0]['embedding']
            # Cache embedding in Redis
            redis_client.setex(embedding_key, 60*60*24, json.dumps(embedding))  # 24h TTL
        except Exception as e:
            return { 'statusCode': 500, 'body': json.dumps({'error': f'OpenAI error: {str(e)}'}) }

    # 3. Query Pinecone for similar vectors
    try:
        pinecone_results = pinecone_index.query(
            vector=embedding,
            top_k=match_count,
            include_metadata=False
        )
        ids = [match['id'] for match in pinecone_results['matches'] if match['score'] >= match_threshold]
    except Exception as e:
        return { 'statusCode': 500, 'body': json.dumps({'error': f'Pinecone error: {str(e)}'}) }

    # 4. Fetch metadata from Aurora
    incidents = []
    if ids:
        try:
            conn = get_aurora_connection()
            cur = conn.cursor()
            sql = "SELECT id, title, description, severity, status, assignee, alert_count, tags, created_at, updated_at FROM incidents WHERE id = ANY(%s)"
            cur.execute(sql, (ids,))
            rows = cur.fetchall()
            for row in rows:
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
                    'updated_at': row[9].isoformat() if row[9] else None
                })
            cur.close()
            conn.close()
        except Exception as e:
            return { 'statusCode': 500, 'body': json.dumps({'error': f'Aurora error: {str(e)}'}) }

    # 5. Optionally cache results in Redis (by query)
    result_key = f"search:{query}:{match_threshold}:{match_count}"
    redis_client.setex(result_key, 60*10, json.dumps(incidents))  # 10 min TTL

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
