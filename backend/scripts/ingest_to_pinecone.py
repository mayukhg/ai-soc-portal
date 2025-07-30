import os
import openai
import pinecone
import psycopg2

# Environment variables for config
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')  # OpenAI API key
PINECONE_API_KEY = os.environ.get('PINECONE_API_KEY')  # Pinecone API key
PINECONE_ENV = os.environ.get('PINECONE_ENV')  # Pinecone environment
PINECONE_INDEX = os.environ.get('PINECONE_INDEX')  # Pinecone index name
AURORA_HOST = os.environ.get('AURORA_HOST')  # Aurora endpoint
AURORA_DB = os.environ.get('AURORA_DB')  # Aurora database name
AURORA_USER = os.environ.get('AURORA_USER')  # Aurora username
AURORA_PASSWORD = os.environ.get('AURORA_PASSWORD')  # Aurora password
AURORA_PORT = int(os.environ.get('AURORA_PORT', 5432))  # Aurora port

# Set API keys for OpenAI and Pinecone
openai.api_key = OPENAI_API_KEY
pinecone.init(api_key=PINECONE_API_KEY, environment=PINECONE_ENV)
index = pinecone.Index(PINECONE_INDEX)

def get_aurora_connection():
    """Establish a connection to Aurora Serverless (Postgres)."""
    return psycopg2.connect(
        host=AURORA_HOST,
        database=AURORA_DB,
        user=AURORA_USER,
        password=AURORA_PASSWORD,
        port=AURORA_PORT
    )

def fetch_incidents():
    """Fetch all incidents from Aurora for embedding and upsert."""
    conn = get_aurora_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, title, description FROM incidents")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

def get_embedding(text):
    """Generate an embedding for the given text using OpenAI."""
    response = openai.Embedding.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response['data'][0]['embedding']

def main():
    """
    Fetch incidents from Aurora, generate embeddings, and upsert to Pinecone.
    """
    incidents = fetch_incidents()
    pinecone_vectors = []
    for incident in incidents:
        incident_id, title, description = incident
        # Combine title and description for embedding
        text = f"{title}\n{description or ''}"
        embedding = get_embedding(text)
        pinecone_vectors.append((str(incident_id), embedding))
    # Upsert all vectors to Pinecone
    index.upsert(vectors=pinecone_vectors)
    print(f"Upserted {len(pinecone_vectors)} incidents to Pinecone.")

if __name__ == "__main__":
    main()

# TODO: Add batching for large datasets.
# TODO: Add error handling and logging.
# TODO: Add support for updating only new/changed incidents.