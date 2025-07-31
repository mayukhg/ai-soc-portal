#!/bin/bash

# SOC Nexus Monitoring Deployment Script
# This script deploys the monitoring infrastructure for critical services

set -e

# Configuration
ENVIRONMENT=${1:-production}
TEAMS_WEBHOOK_URL=${2:-""}
AWS_REGION=${AWS_REGION:-us-east-1}
STACK_NAME="soc-nexus-monitoring-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if AWS credentials are configured
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if Teams webhook URL is provided
    if [ -z "$TEAMS_WEBHOOK_URL" ]; then
        log_warning "Teams webhook URL not provided. Monitoring will be deployed without Teams notifications."
        log_info "You can add Teams notifications later by updating the stack with the webhook URL."
    fi
    
    log_success "Prerequisites check passed"
}

# Deploy CloudFormation stack
deploy_stack() {
    log_info "Deploying monitoring stack: $STACK_NAME"
    
    # Prepare CloudFormation parameters
    PARAMETERS="Environment=$ENVIRONMENT"
    
    if [ -n "$TEAMS_WEBHOOK_URL" ]; then
        PARAMETERS="$PARAMETERS TeamsWebhookURL=$TEAMS_WEBHOOK_URL"
    fi
    
    # Deploy the stack
    aws cloudformation deploy \
        --template-file monitoring/cloudwatch-config.yaml \
        --stack-name "$STACK_NAME" \
        --parameter-overrides $PARAMETERS \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION" \
        --no-fail-on-empty-changeset
    
    log_success "Monitoring stack deployed successfully"
}

# Deploy Lambda functions
deploy_lambda_functions() {
    log_info "Deploying Lambda functions..."
    
    # Create deployment package for health check
    log_info "Creating health check Lambda deployment package..."
    cd backend/lambda
    zip -r health-check.zip health_check.py
    cd ../..
    
    # Create deployment package for Teams alert handler
    log_info "Creating Teams alert handler Lambda deployment package..."
    cd backend/lambda
    zip -r teams-alert-handler.zip teams_alert_handler.py
    cd ../..
    
    # Get the Lambda function names from CloudFormation
    HEALTH_CHECK_FUNCTION=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs[?OutputKey==`HealthCheckFunctionName`].OutputValue' \
        --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")
    
    TEAMS_HANDLER_FUNCTION=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs[?OutputKey==`TeamsAlertHandlerFunctionName`].OutputValue' \
        --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")
    
    # Update Lambda function code if functions exist
    if [ -n "$HEALTH_CHECK_FUNCTION" ]; then
        log_info "Updating health check Lambda function..."
        aws lambda update-function-code \
            --function-name "$HEALTH_CHECK_FUNCTION" \
            --zip-file fileb://backend/lambda/health-check.zip \
            --region "$AWS_REGION"
    fi
    
    if [ -n "$TEAMS_HANDLER_FUNCTION" ]; then
        log_info "Updating Teams alert handler Lambda function..."
        aws lambda update-function-code \
            --function-name "$TEAMS_HANDLER_FUNCTION" \
            --zip-file fileb://backend/lambda/teams-alert-handler.zip \
            --region "$AWS_REGION"
    fi
    
    # Clean up deployment packages
    rm -f backend/lambda/health-check.zip
    rm -f backend/lambda/teams-alert-handler.zip
    
    log_success "Lambda functions deployed successfully"
}

# Configure environment variables
configure_environment() {
    log_info "Configuring environment variables..."
    
    # Create .env file for local development
    cat > .env.monitoring << EOF
# Monitoring Configuration
TEAMS_WEBHOOK_URL=$TEAMS_WEBHOOK_URL
AWS_REGION=$AWS_REGION
ENVIRONMENT=$ENVIRONMENT

# Health Check Endpoints
HEALTH_CHECK_URL=https://api.soc-nexus.com/health
DETAILED_HEALTH_URL=https://api.soc-nexus.com/health/detailed

# CloudWatch Configuration
CLOUDWATCH_NAMESPACE=SOC-Nexus/Health
CLOUDWATCH_DASHBOARD_NAME=SOC-Nexus-Monitoring-$ENVIRONMENT

# Monitoring Intervals (in milliseconds)
HEALTH_CHECK_INTERVAL=30000
ALERT_CHECK_INTERVAL=60000
EOF
    
    log_success "Environment configuration created: .env.monitoring"
}

# Test monitoring setup
test_monitoring() {
    log_info "Testing monitoring setup..."
    
    # Test health check endpoint (if available)
    if command -v curl &> /dev/null; then
        log_info "Testing health check endpoint..."
        HEALTH_CHECK_URL="https://api.soc-nexus.com/health"
        
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
            log_success "Health check endpoint is responding"
        else
            log_warning "Health check endpoint is not responding (this is normal if not deployed yet)"
        fi
    fi
    
    # Test CloudWatch dashboard
    log_info "Testing CloudWatch dashboard..."
    DASHBOARD_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs[?OutputKey==`DashboardURL`].OutputValue' \
        --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")
    
    if [ -n "$DASHBOARD_URL" ]; then
        log_success "CloudWatch dashboard is available: $DASHBOARD_URL"
    else
        log_warning "CloudWatch dashboard URL not available yet"
    fi
    
    log_success "Monitoring setup test completed"
}

# Display deployment summary
show_summary() {
    log_info "=== Monitoring Deployment Summary ==="
    echo
    echo "Environment: $ENVIRONMENT"
    echo "AWS Region: $AWS_REGION"
    echo "Stack Name: $STACK_NAME"
    echo "Teams Webhook: ${TEAMS_WEBHOOK_URL:-Not configured}"
    echo
    
    # Get stack outputs
    log_info "Retrieving stack outputs..."
    STACK_OUTPUTS=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs' \
        --output json \
        --region "$AWS_REGION" 2>/dev/null || echo "[]")
    
    if [ "$STACK_OUTPUTS" != "[]" ]; then
        echo "Stack Outputs:"
        echo "$STACK_OUTPUTS" | jq -r '.[] | "  \(.OutputKey): \(.OutputValue)"'
        echo
    fi
    
    log_info "=== Next Steps ==="
    echo "1. Configure your Microsoft Teams webhook URL if not done already"
    echo "2. Test the monitoring alerts by temporarily stopping a service"
    echo "3. Set up escalation procedures for your team"
    echo "4. Configure additional custom metrics as needed"
    echo "5. Set up monitoring dashboards for your team"
    echo
    log_success "Monitoring deployment completed successfully!"
}

# Main deployment function
main() {
    log_info "Starting SOC Nexus monitoring deployment..."
    echo
    
    check_prerequisites
    deploy_stack
    deploy_lambda_functions
    configure_environment
    test_monitoring
    show_summary
}

# Help function
show_help() {
    echo "SOC Nexus Monitoring Deployment Script"
    echo
    echo "Usage: $0 [ENVIRONMENT] [TEAMS_WEBHOOK_URL]"
    echo
    echo "Arguments:"
    echo "  ENVIRONMENT        Environment name (default: production)"
    echo "  TEAMS_WEBHOOK_URL Microsoft Teams webhook URL (optional)"
    echo
    echo "Examples:"
    echo "  $0 production"
    echo "  $0 staging https://your-teams-webhook-url"
    echo
    echo "Environment Variables:"
    echo "  AWS_REGION        AWS region (default: us-east-1)"
    echo
}

# Parse command line arguments
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# Run main function
main "$@" 