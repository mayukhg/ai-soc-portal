#!/bin/bash

# SOC-AI Backend Deployment Script
# This script automates the deployment of the serverless backend

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="soc-ai-backend"
REGION="us-west-2"  # Change to your preferred region
DEPLOYMENT_BUCKET="soc-ai-deployment-$(date +%s)"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# Function to check AWS CLI configuration
check_aws_config() {
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    print_success "AWS CLI is configured"
}

# Function to create S3 deployment bucket
create_deployment_bucket() {
    print_status "Creating S3 deployment bucket: $DEPLOYMENT_BUCKET"
    
    if aws s3 ls "s3://$DEPLOYMENT_BUCKET" 2>&1 | grep -q 'NoSuchBucket'; then
        aws s3 mb "s3://$DEPLOYMENT_BUCKET" --region $REGION
        print_success "Created S3 bucket: $DEPLOYMENT_BUCKET"
    else
        print_warning "S3 bucket $DEPLOYMENT_BUCKET already exists"
    fi
}

# Function to package Lambda code
package_lambda() {
    print_status "Packaging Lambda code..."
    
    cd backend
    
    # Clean up previous package
    rm -f semantic-search.zip
    rm -rf lambda/package
    
    # Create package directory
    mkdir -p lambda/package
    
    # Install dependencies
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt -t lambda/package/
    
    # Copy Lambda function
    cp lambda/semantic_search.py lambda/package/
    
    # Create deployment package
    cd lambda/package
    zip -r ../../semantic-search.zip .
    cd ../..
    
    print_success "Lambda package created: semantic-search.zip"
}

# Function to upload Lambda package to S3
upload_lambda_package() {
    print_status "Uploading Lambda package to S3..."
    
    aws s3 cp backend/semantic-search.zip "s3://$DEPLOYMENT_BUCKET/semantic-search.zip"
    
    print_success "Lambda package uploaded to S3"
}

# Function to update CloudFormation template
update_cloudformation_template() {
    print_status "Updating CloudFormation template with deployment bucket..."
    
    # Create a temporary copy of the template
    cp backend/cloudformation.yaml backend/cloudformation-deploy.yaml
    
    # Replace placeholder values
    sed -i.bak "s/<REPLACE_WITH_DEPLOYMENT_BUCKET>/$DEPLOYMENT_BUCKET/g" backend/cloudformation-deploy.yaml
    sed -i.bak "s/<REPLACE_WITH_DEPLOYMENT_KEY>/semantic-search.zip/g" backend/cloudformation-deploy.yaml
    
    print_success "CloudFormation template updated"
}

# Function to deploy CloudFormation stack
deploy_cloudformation() {
    print_status "Deploying CloudFormation stack: $STACK_NAME"
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name $STACK_NAME &> /dev/null; then
        print_warning "Stack $STACK_NAME already exists. Updating..."
        aws cloudformation update-stack \
            --stack-name $STACK_NAME \
            --template-body file://backend/cloudformation-deploy.yaml \
            --parameters \
                ParameterKey=OpenAIApiKey,ParameterValue=$OPENAI_API_KEY \
                ParameterKey=PineconeApiKey,ParameterValue=$PINECONE_API_KEY \
                ParameterKey=PineconeEnv,ParameterValue=$PINECONE_ENV \
                ParameterKey=PineconeIndex,ParameterValue=$PINECONE_INDEX \
                ParameterKey=DBUsername,ParameterValue=$DB_USERNAME \
                ParameterKey=DBPassword,ParameterValue=$DB_PASSWORD \
                ParameterKey=DBName,ParameterValue=$DB_NAME \
                ParameterKey=RedisPassword,ParameterValue=$REDIS_PASSWORD \
            --capabilities CAPABILITY_IAM \
            --region $REGION
    else
        print_status "Creating new stack: $STACK_NAME"
        aws cloudformation create-stack \
            --stack-name $STACK_NAME \
            --template-body file://backend/cloudformation-deploy.yaml \
            --parameters \
                ParameterKey=OpenAIApiKey,ParameterValue=$OPENAI_API_KEY \
                ParameterKey=PineconeApiKey,ParameterValue=$PINECONE_API_KEY \
                ParameterKey=PineconeEnv,ParameterValue=$PINECONE_ENV \
                ParameterKey=PineconeIndex,ParameterValue=$PINECONE_INDEX \
                ParameterKey=DBUsername,ParameterValue=$DB_USERNAME \
                ParameterKey=DBPassword,ParameterValue=$DB_PASSWORD \
                ParameterKey=DBName,ParameterValue=$DB_NAME \
                ParameterKey=RedisPassword,ParameterValue=$REDIS_PASSWORD \
            --capabilities CAPABILITY_IAM \
            --region $REGION
    fi
    
    print_status "Waiting for CloudFormation stack to complete..."
    aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION || \
    aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region $REGION
    
    print_success "CloudFormation stack deployment completed"
}

# Function to get stack outputs
get_stack_outputs() {
    print_status "Getting stack outputs..."
    
    API_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
        --output text \
        --region $REGION)
    
    AURORA_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`AuroraEndpoint`].OutputValue' \
        --output text \
        --region $REGION)
    
    REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
        --output text \
        --region $REGION)
    
    print_success "Stack outputs retrieved"
    echo "API Endpoint: $API_ENDPOINT"
    echo "Aurora Endpoint: $AURORA_ENDPOINT"
    echo "Redis Endpoint: $REDIS_ENDPOINT"
}

# Function to setup database schema
setup_database() {
    print_status "Setting up database schema..."
    
    # Wait for Aurora to be available
    print_status "Waiting for Aurora database to be available..."
    sleep 60
    
    # Run database schema
    PGPASSWORD=$DB_PASSWORD psql -h $AURORA_ENDPOINT -U $DB_USERNAME -d $DB_NAME -f backend/scripts/aurora_schema.sql
    
    print_success "Database schema setup completed"
}

# Function to run data ingestion
run_data_ingestion() {
    print_status "Running data ingestion script..."
    
    # Set environment variables for ingestion script
    export OPENAI_API_KEY=$OPENAI_API_KEY
    export PINECONE_API_KEY=$PINECONE_API_KEY
    export PINECONE_ENV=$PINECONE_ENV
    export PINECONE_INDEX=$PINECONE_INDEX
    export AURORA_HOST=$AURORA_ENDPOINT
    export AURORA_DB=$DB_NAME
    export AURORA_USER=$DB_USERNAME
    export AURORA_PASSWORD=$DB_PASSWORD
    export AURORA_PORT="5432"
    
    # Run ingestion script
    cd backend/scripts
    python ingest_to_pinecone.py
    cd ../..
    
    print_success "Data ingestion completed"
}

# Function to test deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Test API endpoint
    curl -X POST "$API_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d '{"query": "test query", "matchThreshold": 0.7, "matchCount": 5}' \
        --max-time 30
    
    if [ $? -eq 0 ]; then
        print_success "API endpoint test passed"
    else
        print_error "API endpoint test failed"
    fi
}

# Function to cleanup temporary files
cleanup() {
    print_status "Cleaning up temporary files..."
    
    rm -f backend/cloudformation-deploy.yaml.bak
    rm -f backend/semantic-search.zip
    rm -rf backend/lambda/package
    
    print_success "Cleanup completed"
}

# Main deployment function
main() {
    print_status "Starting SOC-AI backend deployment..."
    
    # Check prerequisites
    check_command "aws"
    check_command "python3"
    check_command "pip"
    check_command "zip"
    check_command "psql"
    
    check_aws_config
    
    # Check required environment variables
    if [ -z "$OPENAI_API_KEY" ] || [ -z "$PINECONE_API_KEY" ] || [ -z "$PINECONE_ENV" ] || [ -z "$PINECONE_INDEX" ]; then
        print_error "Required environment variables are not set. Please set:"
        echo "  OPENAI_API_KEY"
        echo "  PINECONE_API_KEY"
        echo "  PINECONE_ENV"
        echo "  PINECONE_INDEX"
        echo "  DB_USERNAME"
        echo "  DB_PASSWORD"
        echo "  DB_NAME"
        echo "  REDIS_PASSWORD"
        exit 1
    fi
    
    # Set default values if not provided
    DB_USERNAME=${DB_USERNAME:-"soc_admin"}
    DB_NAME=${DB_NAME:-"soc_ai"}
    REDIS_PASSWORD=${REDIS_PASSWORD:-"soc-redis-password"}
    
    # Execute deployment steps
    create_deployment_bucket
    package_lambda
    upload_lambda_package
    update_cloudformation_template
    deploy_cloudformation
    get_stack_outputs
    setup_database
    run_data_ingestion
    test_deployment
    cleanup
    
    print_success "SOC-AI backend deployment completed successfully!"
    print_status "Next steps:"
    echo "  1. Update frontend environment variables with API endpoint: $API_ENDPOINT"
    echo "  2. Deploy frontend to your preferred hosting platform"
    echo "  3. Test the complete application"
}

# Run main function
main "$@" 