# Backend (Serverless) Overview

This backend is implemented using AWS Lambda (Python), Pinecone (vector database), Aurora Serverless (Postgres), and Redis (ElastiCache).

## Main Files
- `lambda/semantic_search.py`: Main Lambda function for semantic search.
- `requirements.txt`: Python dependencies for Lambda deployment.
- `scripts/`: Utilities for data ingestion, migration, and local testing.

## Services Used
- **AWS Lambda**: Stateless compute for API endpoints.
- **API Gateway**: HTTP interface for Lambda.
- **Pinecone**: Vector similarity search for semantic queries.
- **Aurora Serverless (Postgres)**: Stores incident metadata.
- **Redis (ElastiCache)**: Caching for embeddings and search results.

Configuration and deployment are managed via CloudFormation (template to be provided).
