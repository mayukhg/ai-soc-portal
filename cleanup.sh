#!/bin/bash

# =============================================================================
# SOC-AI Nexus Cleanup Script
# =============================================================================
# This script provides comprehensive cleanup functionality for the SOC-AI Nexus
# project, including shutdown of all running services and cleanup of temporary
# files and processes.
#
# Features:
# - Graceful shutdown of frontend and backend services
# - Process cleanup and port release
# - Temporary file cleanup
# - Service status summary
# - Comprehensive logging
#
# Author: AI Assistant
# Version: 1.0
# Date: $(date)
# =============================================================================

# Exit immediately if any command fails
set -e

# =============================================================================
# CONFIGURATION VARIABLES
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/cleanup.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Service configuration
FRONTEND_PORT="5173"
BACKEND_PORT="8000"
FRONTEND_URL="http://localhost:${FRONTEND_PORT}"
BACKEND_URL="http://localhost:${BACKEND_PORT}"

# Process tracking
FRONTEND_PID=""
BACKEND_PID=""
CLEANUP_COUNT=0

# =============================================================================
# OUTPUT COLOR CODES
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Logging function - outputs to both console and log file
log() {
    echo -e "${1}" | tee -a "${LOG_FILE}"
}

# =============================================================================
# MESSAGE FUNCTIONS
# =============================================================================

# Error handling - logs error and exits with code 1
error_exit() {
    log "${RED}❌ ERROR: $1${NC}"
    log "${RED}Cleanup failed at $(date)${NC}"
    exit 1
}

# Success message - displays success with green checkmark
success() {
    log "${GREEN}✅ $1${NC}"
}

# Info message - displays informational message in blue
info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# Warning message - displays warning in yellow
warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

# =============================================================================
# DISPLAY FUNCTIONS
# =============================================================================

# Display header with project information
header() {
    log "${BLUE}"
    log "=================================================="
    log "🧹 SOC-AI Nexus Cleanup Script"
    log "=================================================="
    log "Timestamp: ${TIMESTAMP}"
    log "Script Directory: ${SCRIPT_DIR}"
    log "Log File: ${LOG_FILE}"
    log "=================================================="
    log "${NC}"
}

# Display cleanup summary
display_cleanup_summary() {
    log "${GREEN}"
    log "=================================================="
    log "📊 CLEANUP SUMMARY"
    log "=================================================="
    log "Services Shutdown: ${CLEANUP_COUNT}"
    log "Frontend Port ${FRONTEND_PORT}: $(check_port_status ${FRONTEND_PORT})"
    log "Backend Port ${BACKEND_PORT}: $(check_port_status ${BACKEND_PORT})"
    log "=================================================="
    log "${NC}"
    
    if [ $CLEANUP_COUNT -eq 0 ]; then
        log "${BLUE}ℹ️  No services were running - system was already clean${NC}"
    else
        log "${GREEN}✅ Successfully cleaned up ${CLEANUP_COUNT} service(s)${NC}"
    fi
}

# =============================================================================
# SERVICE MANAGEMENT FUNCTIONS
# =============================================================================

# Check if a port is in use
check_port_in_use() {
    local port=$1
    if lsof -Pi :${port} -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Get process ID using a specific port
get_pid_by_port() {
    local port=$1
    lsof -Pi :${port} -sTCP:LISTEN -t 2>/dev/null | head -1
}

# Check port status for display
check_port_status() {
    local port=$1
    if check_port_in_use ${port}; then
        echo "IN USE"
    else
        echo "FREE"
    fi
}

# Shutdown service on specific port
shutdown_service_on_port() {
    local port=$1
    local service_name=$2
    
    if check_port_in_use ${port}; then
        local pid=$(get_pid_by_port ${port})
        if [ ! -z "$pid" ]; then
            info "Shutting down ${service_name} on port ${port} (PID: ${pid})"
            
            # Try graceful shutdown first
            kill -TERM ${pid} 2>/dev/null || true
            sleep 3
            
            # Check if process is still running
            if kill -0 ${pid} 2>/dev/null; then
                warning "Graceful shutdown failed, forcing termination..."
                kill -KILL ${pid} 2>/dev/null || true
                sleep 1
            fi
            
            # Verify shutdown
            if ! kill -0 ${pid} 2>/dev/null; then
                success "${service_name} shutdown complete"
                CLEANUP_COUNT=$((CLEANUP_COUNT + 1))
            else
                warning "Failed to shutdown ${service_name} (PID: ${pid})"
            fi
        fi
    else
        info "${service_name} on port ${port} is not running"
    fi
}

# Shutdown all SOC-AI Nexus services
shutdown_all_services() {
    info "Starting service cleanup..."
    
    # Shutdown frontend service
    shutdown_service_on_port ${FRONTEND_PORT} "Frontend (React/Vite)"
    
    # Shutdown backend service
    shutdown_service_on_port ${BACKEND_PORT} "Backend API"
    
    # Shutdown any additional Node.js development processes
    local node_pids=$(pgrep -f "vite\|npm.*dev\|node.*dev" 2>/dev/null || true)
    if [ ! -z "$node_pids" ]; then
        info "Shutting down additional Node.js development processes..."
        echo "$node_pids" | while read pid; do
            if [ ! -z "$pid" ]; then
                info "Shutting down Node.js process (PID: ${pid})"
                kill -TERM ${pid} 2>/dev/null || true
                sleep 2
                if kill -0 ${pid} 2>/dev/null; then
                    kill -KILL ${pid} 2>/dev/null || true
                fi
                if ! kill -0 ${pid} 2>/dev/null; then
                    success "Node.js process (PID: ${pid}) shutdown complete"
                    CLEANUP_COUNT=$((CLEANUP_COUNT + 1))
                fi
            fi
        done
    fi
    
    # Shutdown any Python development servers
    local python_pids=$(pgrep -f "python.*runserver\|python.*dev\|uvicorn" 2>/dev/null || true)
    if [ ! -z "$python_pids" ]; then
        info "Shutting down Python development processes..."
        echo "$python_pids" | while read pid; do
            if [ ! -z "$pid" ]; then
                info "Shutting down Python process (PID: ${pid})"
                kill -TERM ${pid} 2>/dev/null || true
                sleep 2
                if kill -0 ${pid} 2>/dev/null; then
                    kill -KILL ${pid} 2>/dev/null || true
                fi
                if ! kill -0 ${pid} 2>/dev/null; then
                    success "Python process (PID: ${pid}) shutdown complete"
                    CLEANUP_COUNT=$((CLEANUP_COUNT + 1))
                fi
            fi
        done
    fi
}

# =============================================================================
# CLEANUP FUNCTIONS
# =============================================================================

# Clean up temporary files and build artifacts
cleanup_temp_files() {
    info "Cleaning up temporary files and build artifacts..."
    
    local temp_cleaned=0
    
    # Clean up frontend build artifacts
    if [ -d "${SCRIPT_DIR}/dist" ]; then
        info "Removing frontend build directory..."
        rm -rf "${SCRIPT_DIR}/dist"
        success "Frontend build directory removed"
        temp_cleaned=$((temp_cleaned + 1))
    fi
    
    # Clean up node_modules if requested
    if [ -d "${SCRIPT_DIR}/node_modules" ]; then
        info "Node modules directory found (${SCRIPT_DIR}/node_modules)"
        read -p "Do you want to remove node_modules? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "${SCRIPT_DIR}/node_modules"
            success "Node modules directory removed"
            temp_cleaned=$((temp_cleaned + 1))
        fi
    fi
    
    # Clean up Python cache files
    if [ -d "${SCRIPT_DIR}/backend" ]; then
        info "Cleaning up Python cache files..."
        find "${SCRIPT_DIR}/backend" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
        find "${SCRIPT_DIR}/backend" -name "*.pyc" -delete 2>/dev/null || true
        success "Python cache files cleaned"
        temp_cleaned=$((temp_cleaned + 1))
    fi
    
    # Clean up log files if requested
    if [ -f "${SCRIPT_DIR}/setup.log" ] || [ -f "${SCRIPT_DIR}/cleanup.log" ]; then
        info "Log files found"
        read -p "Do you want to remove log files? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -f "${SCRIPT_DIR}/setup.log" "${SCRIPT_DIR}/cleanup.log" 2>/dev/null || true
            success "Log files removed"
            temp_cleaned=$((temp_cleaned + 1))
        fi
    fi
    
    if [ $temp_cleaned -eq 0 ]; then
        info "No temporary files to clean up"
    else
        success "Cleaned up ${temp_cleaned} temporary file group(s)"
    fi
}

# =============================================================================
# MAIN EXECUTION FUNCTION
# =============================================================================

# Main execution function - orchestrates the entire cleanup process
main() {
    # Initialize log file with timestamp
    echo "SOC-AI Nexus Cleanup Log - ${TIMESTAMP}" > "${LOG_FILE}"
    echo "========================================" >> "${LOG_FILE}"
    
    # Display header information
    header
    
    # Step 1: Shutdown all running services
    shutdown_all_services
    
    # Step 2: Clean up temporary files
    cleanup_temp_files
    
    # Step 3: Display cleanup summary
    display_cleanup_summary
    
    # Final success message
    log "${GREEN}"
    log "=================================================="
    log "🎉 Cleanup completed successfully!"
    log "=================================================="
    log "All services have been shut down"
    log "Temporary files have been cleaned up"
    log "System is ready for fresh deployment"
    log "Logs: ${LOG_FILE}"
    log "=================================================="
    log "${NC}"
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Run main function with all arguments
main "$@"
