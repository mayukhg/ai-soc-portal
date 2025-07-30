import os
import openai
import pinecone
import psycopg2

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
PINECONE_API_KEY = os.environ.get('PINECONE_API_KEY')
PINECONE_ENV = os.environ.get('PINECONE_ENV')
PINECONE_INDEX = os.environ.get('PINECONE_INDEX')
AURORA_HOST = os.environ.get('AURORA_HOST')
AURORA_DB = os.environ.get('AURORA_DB')
AURORA_USER = os.environ.get('AURORA_USER')
AURORA_PASSWORD = os.environ.get('AURORA_PASSWORD')
AURORA_PORT = int(os.environ.get('AURORA_PORT', 5432))

openai.api_key = OPENAI_API_KEY
pinecone.init(api_key=PINECONE_API_KEY, environment=PINECONE_ENV)
index = pinecone.Index(PINECONE_INDEX)

def get_aurora_connection():
    return psycopg2.connect(
        host=AURORA_HOST,
        database=AURORA_DB,
        user=AURORA_USER,
        password=AURORA_PASSWORD,
        port=AURORA_PORT
    )

def fetch_incidents():
    conn = get_aurora_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, title, description FROM incidents")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

def get_embedding(text):
    response = openai.Embedding.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response['data'][0]['embedding']

def main():
    incidents = fetch_incidents()
    pinecone_vectors = []
    for incident in incidents:
        incident_id, title, description = incident
        text = f"{title}\n{description or ''}"
        embedding = get_embedding(text)
        pinecone_vectors.append((str(incident_id), embedding))
    # Upsert to Pinecone
    index.upsert(vectors=pinecone_vectors)
    print(f"Upserted {len(pinecone_vectors)} incidents to Pinecone.")

if __name__ == "__main__":
    main()

# TODO: Add batching for large datasets.
# TODO: Add error handling and logging.
# TODO: Add support for updating only new/changed incidents.