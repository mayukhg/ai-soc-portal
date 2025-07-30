#!/bin/bash

# SOC-AI Frontend Deployment Script
# This script automates the deployment of the React frontend

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_TYPE=${DEPLOYMENT_TYPE:-"aws"}  # aws, vercel, netlify
AWS_S3_BUCKET=${AWS_S3_BUCKET:-"soc-ai-frontend"}
AWS_REGION=${AWS_REGION:-"us-west-2"}

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

# Function to check environment variables
check_environment_variables() {
    print_status "Checking environment variables..."
    
    if [ -z "$VITE_SEMANTIC_SEARCH_API" ]; then
        print_error "VITE_SEMANTIC_SEARCH_API is not set. Please set it to your API Gateway endpoint."
        exit 1
    fi
    
    if [ -z "$VITE_SUPABASE_URL" ]; then
        print_warning "VITE_SUPABASE_URL is not set. Some features may not work."
    fi
    
    if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
        print_warning "VITE_SUPABASE_ANON_KEY is not set. Some features may not work."
    fi
    
    print_success "Environment variables checked"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing frontend dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Dependencies installed"
}

# Function to build frontend
build_frontend() {
    print_status "Building frontend for production..."
    
    # Create production environment file
    cat > .env.production << EOF
VITE_SEMANTIC_SEARCH_API=$VITE_SEMANTIC_SEARCH_API
VITE_SUPABASE_URL=$VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
EOF
    
    # Build the application
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Frontend built successfully"
    else
        print_error "Frontend build failed"
        exit 1
    fi
}

# Function to deploy to AWS S3 + CloudFront
deploy_aws() {
    print_status "Deploying to AWS S3 + CloudFront..."
    
    # Check AWS CLI
    check_command "aws"
    
    # Create S3 bucket if it doesn't exist
    if aws s3 ls "s3://$AWS_S3_BUCKET" 2>&1 | grep -q 'NoSuchBucket'; then
        print_status "Creating S3 bucket: $AWS_S3_BUCKET"
        aws s3 mb "s3://$AWS_S3_BUCKET" --region $AWS_REGION
        
        # Enable static website hosting
        aws s3 website "s3://$AWS_S3_BUCKET" \
            --index-document index.html \
            --error-document index.html
    fi
    
    # Upload files to S3
    print_status "Uploading files to S3..."
    aws s3 sync dist/ "s3://$AWS_S3_BUCKET" --delete
    
    # Get the website URL
    WEBSITE_URL=$(aws s3api get-bucket-website --bucket $AWS_S3_BUCKET --query 'WebsiteEndpoint' --output text)
    
    print_success "Frontend deployed to S3"
    echo "Website URL: http://$WEBSITE_URL"
    echo "Note: For production, set up CloudFront distribution for HTTPS and custom domain"
}

# Function to deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_status "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Deploy to Vercel
    vercel --prod
    
    print_success "Frontend deployed to Vercel"
}

# Function to deploy to Netlify
deploy_netlify() {
    print_status "Deploying to Netlify..."
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        print_status "Installing Netlify CLI..."
        npm install -g netlify-cli
    fi
    
    # Deploy to Netlify
    netlify deploy --prod --dir=dist
    
    print_success "Frontend deployed to Netlify"
}

# Function to deploy to GitHub Pages
deploy_github_pages() {
    print_status "Deploying to GitHub Pages..."
    
    # Check if gh CLI is installed
    if ! command -v gh &> /dev/null; then
        print_error "GitHub CLI (gh) is not installed. Please install it first."
        exit 1
    fi
    
    # Create gh-pages branch and push
    git checkout -b gh-pages
    git add dist -f
    git commit -m "Deploy to GitHub Pages"
    git push origin gh-pages --force
    
    # Go back to main branch
    git checkout main
    git branch -D gh-pages
    
    print_success "Frontend deployed to GitHub Pages"
    echo "Enable GitHub Pages in your repository settings"
}

# Function to test deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Wait a moment for deployment to complete
    sleep 10
    
    # Test the deployed application
    if [ "$DEPLOYMENT_TYPE" = "aws" ]; then
        WEBSITE_URL=$(aws s3api get-bucket-website --bucket $AWS_S3_BUCKET --query 'WebsiteEndpoint' --output text)
        curl -I "http://$WEBSITE_URL" --max-time 30
    fi
    
    print_success "Deployment test completed"
}

# Function to show deployment URLs
show_deployment_info() {
    print_status "Deployment Information:"
    
    case $DEPLOYMENT_TYPE in
        "aws")
            WEBSITE_URL=$(aws s3api get-bucket-website --bucket $AWS_S3_BUCKET --query 'WebsiteEndpoint' --output text)
            echo "Frontend URL: http://$WEBSITE_URL"
            echo "API Endpoint: $VITE_SEMANTIC_SEARCH_API"
            ;;
        "vercel")
            echo "Frontend URL: Check Vercel dashboard for URL"
            echo "API Endpoint: $VITE_SEMANTIC_SEARCH_API"
            ;;
        "netlify")
            echo "Frontend URL: Check Netlify dashboard for URL"
            echo "API Endpoint: $VITE_SEMANTIC_SEARCH_API"
            ;;
        "github")
            echo "Frontend URL: https://your-username.github.io/your-repo-name"
            echo "API Endpoint: $VITE_SEMANTIC_SEARCH_API"
            ;;
    esac
    
    echo ""
    print_status "Next steps:"
    echo "1. Test the application functionality"
    echo "2. Configure custom domain (optional)"
    echo "3. Set up monitoring and analytics"
    echo "4. Configure SSL certificates"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    
    # Remove temporary files
    rm -f .env.production
    
    print_success "Cleanup completed"
}

# Main deployment function
main() {
    print_status "Starting SOC-AI frontend deployment..."
    
    # Check prerequisites
    check_command "node"
    check_command "npm"
    
    # Check environment variables
    check_environment_variables
    
    # Install dependencies
    install_dependencies
    
    # Build frontend
    build_frontend
    
    # Deploy based on deployment type
    case $DEPLOYMENT_TYPE in
        "aws")
            deploy_aws
            ;;
        "vercel")
            deploy_vercel
            ;;
        "netlify")
            deploy_netlify
            ;;
        "github")
            deploy_github_pages
            ;;
        *)
            print_error "Unknown deployment type: $DEPLOYMENT_TYPE"
            echo "Supported types: aws, vercel, netlify, github"
            exit 1
            ;;
    esac
    
    # Test deployment
    test_deployment
    
    # Show deployment information
    show_deployment_info
    
    # Cleanup
    cleanup
    
    print_success "SOC-AI frontend deployment completed successfully!"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --type TYPE     Deployment type (aws, vercel, netlify, github)"
    echo "  -b, --bucket BUCKET S3 bucket name (for AWS deployment)"
    echo "  -r, --region REGION AWS region (for AWS deployment)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  VITE_SEMANTIC_SEARCH_API  API Gateway endpoint"
    echo "  VITE_SUPABASE_URL         Supabase URL (optional)"
    echo "  VITE_SUPABASE_ANON_KEY    Supabase anonymous key (optional)"
    echo ""
    echo "Examples:"
    echo "  $0 -t aws -b my-frontend-bucket"
    echo "  $0 -t vercel"
    echo "  $0 -t netlify"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            DEPLOYMENT_TYPE="$2"
            shift 2
            ;;
        -b|--bucket)
            AWS_S3_BUCKET="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run main function
main "$@" 