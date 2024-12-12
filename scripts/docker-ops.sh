#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to show usage
show_usage() {
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./docker-ops.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start       - Start development environment"
    echo "  stop        - Stop development environment"
    echo "  restart     - Restart development environment"
    echo "  logs        - Show logs from all containers"
    echo "  build       - Rebuild containers"
    echo "  clean       - Remove all containers and volumes"
    echo "  test        - Run tests in container"
    echo "  prod-build  - Build production image"
    echo "  shell       - Open shell in api container"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Error: Docker is not running${NC}"
        exit 1
    fi
}

case "$1" in
    "start")
        check_docker
        echo -e "${GREEN}Starting development environment...${NC}"
        docker-compose up -d
        echo -e "${GREEN}Development environment started${NC}"
        ;;
    
    "stop")
        check_docker
        echo -e "${YELLOW}Stopping development environment...${NC}"
        docker-compose down
        echo -e "${GREEN}Development environment stopped${NC}"
        ;;
    
    "restart")
        check_docker
        echo -e "${YELLOW}Restarting development environment...${NC}"
        docker-compose down
        docker-compose up -d
        echo -e "${GREEN}Development environment restarted${NC}"
        ;;
    
    "logs")
        check_docker
        docker-compose logs -f
        ;;
    
    "build")
        check_docker
        echo -e "${YELLOW}Rebuilding containers...${NC}"
        docker-compose build --no-cache
        echo -e "${GREEN}Containers rebuilt${NC}"
        ;;
    
    "clean")
        check_docker
        echo -e "${RED}Removing all containers and volumes...${NC}"
        docker-compose down -v
        echo -e "${GREEN}Cleanup complete${NC}"
        ;;
    
    "test")
        check_docker
        echo -e "${YELLOW}Running tests...${NC}"
        docker-compose run --rm api npm test
        ;;
    
    "prod-build")
        check_docker
        echo -e "${YELLOW}Building production image...${NC}"
        docker build -t backend-boiler:latest .
        echo -e "${GREEN}Production image built${NC}"
        ;;
    
    "shell")
        check_docker
        echo -e "${YELLOW}Opening shell in api container...${NC}"
        docker-compose exec api /bin/sh
        ;;
    
    *)
        show_usage
        exit 1
        ;;
esac