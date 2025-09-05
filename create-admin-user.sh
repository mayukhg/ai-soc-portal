#!/bin/bash

# =============================================================================
# Create Admin User Script
# =============================================================================
# This script creates an admin user for the SOC-AI Nexus dashboard
# with the credentials: mayukh@gmail.com / ajpap@29
#
# Author: AI Assistant
# Version: 1.0
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/admin-user-creation.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${1}" | tee -a "${LOG_FILE}"
}

# Error handling
error_exit() {
    log "${RED}❌ ERROR: $1${NC}"
    log "${RED}Admin user creation failed at $(date)${NC}"
    exit 1
}

# Success message
success() {
    log "${GREEN}✅ $1${NC}"
}

# Info message
info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# Warning message
warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Header
header() {
    log "${BLUE}"
    log "=================================================="
    log "👤 SOC-AI Nexus Admin User Creation"
    log "=================================================="
    log "Timestamp: ${TIMESTAMP}"
    log "Script Directory: ${SCRIPT_DIR}"
    log "Log File: ${LOG_FILE}"
    log "=================================================="
    log "${NC}"
}

# Check if Supabase CLI is installed
check_supabase_cli() {
    info "Checking Supabase CLI installation..."
    
    if ! command -v supabase &> /dev/null; then
        error_exit "Supabase CLI is not installed. Please install it first:
        npm install -g supabase
        or
        brew install supabase/tap/supabase"
    fi
    
    success "Supabase CLI is installed"
}

# Check if we're in a Supabase project
check_supabase_project() {
    info "Checking Supabase project configuration..."
    
    if [ ! -f "${SCRIPT_DIR}/supabase/config.toml" ]; then
        error_exit "Not in a Supabase project directory. Please run this from the project root."
    fi
    
    success "Supabase project configuration found"
}

# Apply the migration
apply_migration() {
    info "Applying admin user migration..."
    
    cd "${SCRIPT_DIR}"
    
    # Start Supabase if not running
    if ! supabase status &> /dev/null; then
        info "Starting Supabase local development environment..."
        supabase start
    fi
    
    # Apply the migration
    if supabase db reset --linked; then
        success "Migration applied successfully"
    else
        error_exit "Failed to apply migration"
    fi
}

# Verify admin user creation
verify_admin_user() {
    info "Verifying admin user creation..."
    
    # Check if the user exists in the database
    USER_EXISTS=$(supabase db query "SELECT COUNT(*) FROM auth.users WHERE email = 'mayukh@gmail.com';" --output csv | tail -n 1)
    
    if [ "$USER_EXISTS" = "1" ]; then
        success "Admin user created successfully"
        
        # Get user details
        USER_DETAILS=$(supabase db query "SELECT u.email, p.username, p.role, p.full_name FROM auth.users u JOIN public.profiles p ON u.id = p.user_id WHERE u.email = 'mayukh@gmail.com';" --output csv | tail -n 1)
        
        log "${GREEN}User Details:${NC}"
        log "Email: $(echo $USER_DETAILS | cut -d',' -f1)"
        log "Username: $(echo $USER_DETAILS | cut -d',' -f2)"
        log "Role: $(echo $USER_DETAILS | cut -d',' -f3)"
        log "Full Name: $(echo $USER_DETAILS | cut -d',' -f4)"
        
    else
        error_exit "Admin user was not created successfully"
    fi
}

# Display access information
display_access_info() {
    log "${GREEN}"
    log "=================================================="
    log "🎉 Admin User Created Successfully!"
    log "=================================================="
    log "Email: mayukh@gmail.com"
    log "Password: ajpap@29"
    log "Role: admin"
    log "Username: mayukh_admin"
    log "Full Name: Mayukh Ghosh"
    log "=================================================="
    log "Access the SOC Dashboard at:"
    log "http://localhost:5173"
    log "=================================================="
    log "Sample data has been created for testing:"
    log "- 3 sample alerts (high, medium, critical severity)"
    log "- 2 sample incidents (malware, phishing)"
    log "- 2 threat intelligence indicators"
    log "- 4 KPI metrics"
    log "=================================================="
    log "${NC}"
}

# Main execution
main() {
    # Initialize log file
    echo "SOC-AI Nexus Admin User Creation Log - ${TIMESTAMP}" > "${LOG_FILE}"
    echo "================================================" >> "${LOG_FILE}"
    
    header
    
    # Run setup steps
    check_supabase_cli
    check_supabase_project
    apply_migration
    verify_admin_user
    display_access_info
    
    success "Admin user creation completed successfully!"
    log "Log file: ${LOG_FILE}"
}

# Run main function
main "$@"
