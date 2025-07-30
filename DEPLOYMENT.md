# SOC-AI Deployment Guide

This guide provides step-by-step instructions for deploying the SOC-AI application, including both the React frontend and the serverless backend.

## 📋 Prerequisites

### Required Accounts & Services
- **AWS Account** with appropriate permissions
- **GitHub Account** for code repository
- **OpenAI API Key** for embeddings
- **Pinecone Account** for vector database
- **Node.js 18+** and **npm/yarn** for frontend build
- **Python 3.11+** for backend development
- **AWS CLI** configured with appropriate credentials

### Required AWS Permissions
- CloudFormation (full access)
- Lambda (full access)
- API Gateway (full access)
- RDS/Aurora (full access)
- ElastiCache (full access)
- VPC (full access)
- IAM (limited to required roles)
- S3 (for deployment packages)

---

## 🚀 Backend Deployment (AWS Serverless)

### Step 1: Prepare Pinecone
1. **Create Pinecone Account**
   ```bash
   # Visit https://www.pinecone.io and create account
   ```

2. **Create Pinecone Index**
   ```bash
   # Using Pinecone console or API
   # Index name: soc-ai-incidents
   # Dimensions: 1536 (for OpenAI text-embedding-3-small)
   # Metric: cosine
   # Environment: us-west1-gcp (or your preferred region)
   ```

3. **Get Pinecone Credentials**
   - API Key from Pinecone console
   - Environment (e.g., `us-west1-gcp`)
   - Index name (e.g., `soc-ai-incidents`)

### Step 2: Prepare OpenAI
1. **Get OpenAI API Key**
   ```bash
   # Visit https://platform.openai.com/api-keys
   # Create new API key for production use
   ```

### Step 3: Deploy AWS Infrastructure

1. **Install AWS CLI and configure**
   ```bash
   # Install AWS CLI
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install

   # Configure AWS credentials
   aws configure
   ```

2. **Create S3 Bucket for Lambda Deployment**
   ```bash
   # Create deployment bucket
   aws s3 mb s3://soc-ai-deployment-$(date +%s)
   
   # Note the bucket name for CloudFormation template
   ```

3. **Update CloudFormation Template**
   ```bash
   # Edit backend/cloudformation.yaml
   # Replace <REPLACE_WITH_DEPLOYMENT_BUCKET> with your S3 bucket name
   # Replace <REPLACE_WITH_DEPLOYMENT_KEY> with your deployment key
   ```

4. **Package Lambda Code**
   ```bash
   cd backend
   
   # Install Python dependencies
   pip install -r requirements.txt -t lambda/
   
   # Create deployment package
   cd lambda
   zip -r ../semantic-search.zip .
   cd ..
   ```

5. **Upload Lambda Package to S3**
   ```bash
   # Upload to S3
   aws s3 cp semantic-search.zip s3://your-deployment-bucket/semantic-search.zip
   ```

6. **Deploy CloudFormation Stack**
   ```bash
   # Deploy the infrastructure
   aws cloudformation create-stack \
     --stack-name soc-ai-backend \
     --template-body file://cloudformation.yaml \
     --parameters \
       ParameterKey=OpenAIApiKey,ParameterValue=your-openai-key \
       ParameterKey=PineconeApiKey,ParameterValue=your-pinecone-key \
       ParameterKey=PineconeEnv,ParameterValue=us-west1-gcp \
       ParameterKey=PineconeIndex,ParameterValue=soc-ai-incidents \
       ParameterKey=DBUsername,ParameterValue=soc_admin \
       ParameterKey=DBPassword,ParameterValue=your-secure-password \
       ParameterKey=DBName,ParameterValue=soc_ai \
       ParameterKey=RedisPassword,ParameterValue=your-redis-password \
     --capabilities CAPABILITY_IAM
   ```

7. **Wait for Stack Creation**
   ```bash
   # Monitor stack creation
   aws cloudformation describe-stacks --stack-name soc-ai-backend
   
   # Check for any errors
   aws cloudformation describe-stack-events --stack-name soc-ai-backend
   ```

### Step 4: Setup Database Schema

1. **Connect to Aurora Database**
   ```bash
   # Get the database endpoint from CloudFormation outputs
   aws cloudformation describe-stacks \
     --stack-name soc-ai-backend \
     --query 'Stacks[0].Outputs[?OutputKey==`AuroraEndpoint`].OutputValue' \
     --output text
   ```

2. **Run Database Schema**
   ```bash
   # Connect to Aurora and run the schema
   psql -h <aurora-endpoint> -U soc_admin -d soc_ai -f scripts/aurora_schema.sql
   ```

### Step 5: Deploy Data Ingestion Script

1. **Set Environment Variables**
   ```bash
   export OPENAI_API_KEY="your-openai-key"
   export PINECONE_API_KEY="your-pinecone-key"
   export PINECONE_ENV="us-west1-gcp"
   export PINECONE_INDEX="soc-ai-incidents"
   export AURORA_HOST="your-aurora-endpoint"
   export AURORA_DB="soc_ai"
   export AURORA_USER="soc_admin"
   export AURORA_PASSWORD="your-db-password"
   export AURORA_PORT="5432"
   ```

2. **Run Ingestion Script**
   ```bash
   cd backend/scripts
   python ingest_to_pinecone.py
   ```

### Step 6: Test Backend API

1. **Get API Gateway Endpoint**
   ```bash
   aws cloudformation describe-stacks \
     --stack-name soc-ai-backend \
     --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
     --output text
   ```

2. **Test Semantic Search**
   ```bash
   curl -X POST https://your-api-gateway-url/prod/semantic-search \
     -H "Content-Type: application/json" \
     -d '{"query": "suspicious powershell execution", "matchThreshold": 0.7, "matchCount": 5}'
   ```

---

## 🌐 Frontend Deployment

### Option 1: Deploy to AWS S3 + CloudFront

1. **Build Frontend**
   ```bash
   # Install dependencies
   npm install

   # Set environment variables
   export VITE_SEMANTIC_SEARCH_API="https://your-api-gateway-url/prod/semantic-search"
   export VITE_SUPABASE_URL="your-supabase-url"
   export VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"

   # Build for production
   npm run build
   ```

2. **Create S3 Bucket for Frontend**
   ```bash
   # Create bucket
   aws s3 mb s3://soc-ai-frontend

   # Enable static website hosting
   aws s3 website s3://soc-ai-frontend --index-document index.html --error-document index.html
   ```

3. **Upload Frontend to S3**
   ```bash
   # Upload build files
   aws s3 sync dist/ s3://soc-ai-frontend --delete
   ```

4. **Create CloudFront Distribution**
   ```bash
   # Create CloudFront distribution via AWS Console
   # Origin: S3 bucket (soc-ai-frontend)
   # Default root object: index.html
   # Error pages: redirect to index.html (for SPA routing)
   ```

### Option 2: Deploy to Vercel

1. **Connect GitHub Repository**
   ```bash
   # Visit https://vercel.com
   # Connect your GitHub repository
   ```

2. **Configure Environment Variables**
   ```bash
   # In Vercel dashboard, add environment variables:
   VITE_SEMANTIC_SEARCH_API=https://your-api-gateway-url/prod/semantic-search
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Deploy**
   ```bash
   # Vercel will automatically deploy on git push
   # Or manually deploy from dashboard
   ```

### Option 3: Deploy to Netlify

1. **Connect Repository**
   ```bash
   # Visit https://netlify.com
   # Connect your GitHub repository
   ```

2. **Configure Build Settings**
   ```bash
   # Build command: npm run build
   # Publish directory: dist
   ```

3. **Set Environment Variables**
   ```bash
   # In Netlify dashboard, add environment variables
   VITE_SEMANTIC_SEARCH_API=https://your-api-gateway-url/prod/semantic-search
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

---

## 🔧 Environment Configuration

### Frontend Environment Variables
Create `.env.production` file:
```env
VITE_SEMANTIC_SEARCH_API=https://your-api-gateway-url/prod/semantic-search
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Backend Environment Variables (Lambda)
Set in CloudFormation template:
```yaml
Environment:
  Variables:
    OPENAI_API_KEY: your-openai-key
    PINECONE_API_KEY: your-pinecone-key
    PINECONE_ENV: us-west1-gcp
    PINECONE_INDEX: soc-ai-incidents
    REDIS_HOST: your-redis-endpoint
    REDIS_PORT: 6379
    REDIS_PASSWORD: your-redis-password
    AURORA_HOST: your-aurora-endpoint
    AURORA_DB: soc_ai
    AURORA_USER: soc_admin
    AURORA_PASSWORD: your-db-password
    AURORA_PORT: 5432
```

---

## 🔒 Security Considerations

### Production Security Checklist
- [ ] Use AWS Secrets Manager for sensitive data
- [ ] Enable CloudTrail for audit logging
- [ ] Configure VPC security groups properly
- [ ] Use HTTPS for all API endpoints
- [ ] Implement proper CORS policies
- [ ] Set up monitoring and alerting
- [ ] Regular security updates and patches
- [ ] Database encryption at rest and in transit
- [ ] Redis encryption enabled
- [ ] API Gateway throttling configured

### Monitoring Setup
```bash
# Enable CloudWatch monitoring
aws cloudwatch put-metric-alarm \
  --alarm-name "soc-ai-lambda-errors" \
  --alarm-description "Lambda function errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

---

## 🧪 Testing Deployment

### Backend API Testing
```bash
# Test semantic search
curl -X POST https://your-api-gateway-url/prod/semantic-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "malware detection",
    "matchThreshold": 0.7,
    "matchCount": 10
  }'

# Expected response:
{
  "success": true,
  "results": [...],
  "query": "malware detection",
  "matchThreshold": 0.7,
  "matchCount": 5
}
```

### Frontend Testing
1. **Load the application**
2. **Test semantic search functionality**
3. **Verify incident management features**
4. **Check collaboration panel**
5. **Test AI assistant integration**

---

## 📊 Cost Optimization

### AWS Cost Management
- **Aurora Serverless**: Auto-scaling based on usage
- **Lambda**: Pay per request
- **ElastiCache**: Choose appropriate instance size
- **API Gateway**: Monitor request volume
- **CloudFront**: Cache static assets

### Monitoring Costs
```bash
# Set up billing alerts
aws cloudwatch put-metric-alarm \
  --alarm-name "aws-billing-alert" \
  --alarm-description "AWS billing alert" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold
```

---

## 🚨 Troubleshooting

### Common Issues

1. **Lambda Timeout**
   ```bash
   # Increase timeout in CloudFormation
   Timeout: 60  # Increase from 30 seconds
   ```

2. **CORS Errors**
   ```bash
   # Add CORS headers to API Gateway
   # Or configure in Lambda response
   ```

3. **Database Connection Issues**
   ```bash
   # Check security groups
   # Verify VPC configuration
   # Test connection manually
   ```

4. **Pinecone Connection Issues**
   ```bash
   # Verify API key and environment
   # Check index name and dimensions
   ```

### Debug Commands
```bash
# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/soc-ai"

# Test database connection
psql -h <aurora-endpoint> -U soc_admin -d soc_ai -c "SELECT 1;"

# Check Redis connection
redis-cli -h <redis-endpoint> -p 6379 -a <password> ping
```

---

## 📈 Scaling Considerations

### Auto-scaling Configuration
- **Lambda**: Configure provisioned concurrency for high traffic
- **Aurora**: Serverless v2 for better scaling
- **Redis**: Multi-AZ for high availability
- **API Gateway**: Configure throttling and caching

### Performance Optimization
- **Frontend**: Implement lazy loading and code splitting
- **Backend**: Optimize Lambda cold starts with provisioned concurrency
- **Database**: Use connection pooling
- **Cache**: Implement proper cache invalidation strategies

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy SOC-AI

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy CloudFormation
        run: |
          aws cloudformation deploy \
            --template-file backend/cloudformation.yaml \
            --stack-name soc-ai-backend \
            --capabilities CAPABILITY_IAM

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and Deploy Frontend
        run: |
          npm install
          npm run build
          aws s3 sync dist/ s3://soc-ai-frontend --delete
```

This deployment guide provides a comprehensive approach to deploying your SOC-AI application in a production-ready manner. 