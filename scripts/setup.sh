#!/bin/bash

# ============================================================================
# BILLING & ACCOUNTING APPLICATION - SETUP SCRIPT
# ============================================================================
# This script automates the setup of the billing application
# Run with: bash scripts/setup.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    local missing_commands=()
    
    # Check Node.js
    if ! command_exists node; then
        missing_commands+=("Node.js")
    else
        local node_version=$(node --version | cut -d'v' -f2)
        local major_version=$(echo "$node_version" | cut -d'.' -f1)
        if [ "$major_version" -lt 18 ]; then
            print_error "Node.js version 18+ is required. Current version: $node_version"
            exit 1
        fi
        print_success "Node.js $node_version found"
    fi
    
    # Check npm
    if ! command_exists npm; then
        missing_commands+=("npm")
    else
        local npm_version=$(npm --version)
        print_success "npm $npm_version found"
    fi
    
    # Check Docker
    if ! command_exists docker; then
        missing_commands+=("Docker")
    else
        local docker_version=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_success "Docker $docker_version found"
    fi
    
    # Check Docker Compose
    if ! command_exists docker compose; then
        if ! docker compose version >/dev/null 2>&1; then
            missing_commands+=("Docker Compose")
        else
            print_success "Docker Compose found"
        fi
    else
        local compose_version=$(docker compose --version | cut -d' ' -f3 | cut -d',' -f1)
        print_success "Docker Compose $compose_version found"
    fi
    
    # Check Git
    if ! command_exists git; then
        missing_commands+=("Git")
    else
        local git_version=$(git --version | cut -d' ' -f3)
        print_success "Git $git_version found"
    fi
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        print_error "Missing required commands: ${missing_commands[*]}"
        print_status "Please install the missing commands and run the script again."
        exit 1
    fi
    
    print_success "All system requirements met!"
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    local directories=(
        "logs"
        "uploads"
        "backups"
        "temp"
        "storage"
        "docker/postgres/init"
        "docker/postgres/backups"
        "docker/redis"
        "docker/nginx/conf.d"
        "docker/nginx/ssl"
        "docker/monitoring"
        "docker/backup"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_success "Created directory: $dir"
        else
            print_status "Directory already exists: $dir"
        fi
    done
}

# Function to setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Server environment
    if [ ! -f "packages/server/.env" ]; then
        if [ -f "packages/server/env.example" ]; then
            cp packages/server/env.example packages/server/.env
            print_success "Created packages/server/.env from template"
            print_warning "Please edit packages/server/.env with your actual values"
        else
            print_error "Environment template not found: packages/server/env.example"
            exit 1
        fi
    else
        print_status "Server environment file already exists"
    fi
    
    # Desktop environment
    if [ ! -f "packages/desktop/.env" ]; then
        if [ -f "packages/desktop/env.example" ]; then
            cp packages/desktop/env.example packages/desktop/.env
            print_success "Created packages/desktop/.env from template"
            print_warning "Please edit packages/desktop/.env with your actual values"
        else
            print_status "Desktop environment template not found, skipping..."
        fi
    else
        print_status "Desktop environment file already exists"
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Install shared package dependencies
    print_status "Installing shared package dependencies..."
    cd packages/shared
    npm install
    cd ../..
    
    # Install server dependencies
    print_status "Installing server dependencies..."
    cd packages/server
    npm install
    cd ../..
    
    # Install desktop dependencies
    print_status "Installing desktop dependencies..."
    cd packages/desktop
    npm install
    cd ../..
    
    print_success "All dependencies installed successfully!"
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    # Start PostgreSQL and Redis
    print_status "Starting database services..."
    docker compose up -d postgres redis
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check if services are healthy
    if ! docker compose ps | grep -q "healthy"; then
        print_warning "Services may not be fully ready, waiting a bit more..."
        sleep 20
    fi
    
    # Setup database schema
    print_status "Setting up database schema..."
    cd packages/server
    npm run setup:db
    cd ../..
    
    print_success "Database setup completed!"
}

# Function to build application
build_application() {
    print_status "Building application..."
    
    # Build shared package
    print_status "Building shared package..."
    cd packages/shared
    npm run build
    cd ../..
    
    # Build server
    print_status "Building server..."
    cd packages/server
    npm run build
    cd ../..
    
    # Build desktop
    print_status "Building desktop..."
    cd packages/desktop
    npm run build
    cd ../..
    
    print_success "Application built successfully!"
}

# Function to setup development environment
setup_development() {
    print_status "Setting up development environment..."
    
    # Start all services
    print_status "Starting development services..."
    docker compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for all services to be ready..."
    sleep 30
    
    # Check service status
    print_status "Checking service status..."
    docker compose ps
    
    print_success "Development environment setup completed!"
}

# Function to display next steps
display_next_steps() {
    echo
    echo -e "${GREEN}============================================================================${NC}"
    echo -e "${GREEN}SETUP COMPLETED SUCCESSFULLY!${NC}"
    echo -e "${GREEN}============================================================================${NC}"
    echo
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Edit environment files with your actual values:"
    echo "   - packages/server/.env"
    echo "   - packages/desktop/.env"
    echo
    echo "2. Access the application:"
    echo "   - Server API: http://localhost:3001"
    echo "   - Health Check: http://localhost:3001/health"
    echo "   - API Docs: http://localhost:3001/api-docs"
    echo
    echo "3. Database Management:"
    echo "   - pgAdmin: http://localhost:5050 (admin@billingapp.com / admin_password)"
    echo "   - Redis Commander: http://localhost:8081"
    echo
    echo "4. Development Commands:"
    echo "   - Start all services: npm run dev"
    echo "   - Start server only: npm run dev:server"
    echo "   - Start desktop only: npm run dev:desktop"
    echo "   - Run tests: npm run test"
    echo "   - Build: npm run build"
    echo
    echo "5. Docker Commands:"
    echo "   - View logs: npm run docker:logs"
    echo "   - Stop services: npm run docker:down"
    echo "   - Restart services: npm run docker:up"
    echo
    echo -e "${YELLOW}Important:${NC}"
    echo "- Change default passwords in production"
    echo "- Update JWT secrets in production"
    echo "- Configure SSL certificates for production"
    echo "- Set up proper backup strategies"
    echo
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main setup function
main() {
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${BLUE}BILLING & ACCOUNTING APPLICATION - SETUP SCRIPT${NC}"
    echo -e "${BLUE}============================================================================${NC}"
    echo
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        print_error "Please do not run this script as root"
        exit 1
    fi
    
    # Check requirements
    check_requirements
    
    # Create directories
    create_directories
    
    # Setup environment files
    setup_environment
    
    # Install dependencies
    install_dependencies
    
    # Setup database
    setup_database
    
    # Build application
    build_application
    
    # Setup development environment
    setup_development
    
    # Display next steps
    display_next_steps
}

# Run main function
main "$@"
