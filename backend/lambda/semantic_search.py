import os
import json
import openai
import pinecone
import redis
import psycopg2
import boto3
from typing import List

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
