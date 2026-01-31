#!/bin/bash
set -e

# Automated AWS Deployment Script for Roadmap Tracker
# This script automates the entire AWS deployment process

echo "=========================================="
echo "Roadmap Tracker - AWS Deployment Script"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="roadmap-tracker"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Please install it first."
        exit 1
    fi
    
    # Check if AWS is configured
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI not configured. Run 'aws configure' first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

generate_secrets() {
    print_info "Generating secure secrets..."
    
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -hex 64)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    
    print_success "Secrets generated"
}

create_rds_database() {
    print_info "Creating RDS PostgreSQL database..."
    
    aws rds create-db-instance \
        --db-instance-identifier ${PROJECT_NAME}-db \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version 14.7 \
        --master-username postgres \
        --master-user-password "$DB_PASSWORD" \
        --allocated-storage 20 \
        --backup-retention-period 7 \
        --publicly-accessible \
        --region $AWS_REGION \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT" \
        > /dev/null 2>&1 || print_info "Database may already exist"
    
    print_info "Waiting for database to be available (this takes 5-10 minutes)..."
    aws rds wait db-instance-available \
        --db-instance-identifier ${PROJECT_NAME}-db \
        --region $AWS_REGION
    
    DB_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier ${PROJECT_NAME}-db \
        --region $AWS_REGION \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    
    print_success "Database created: $DB_ENDPOINT"
}

create_redis_cluster() {
    print_info "Creating ElastiCache Redis cluster..."
    
    aws elasticache create-cache-cluster \
        --cache-cluster-id ${PROJECT_NAME}-redis \
        --cache-node-type cache.t3.micro \
        --engine redis \
        --num-cache-nodes 1 \
        --region $AWS_REGION \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT" \
        > /dev/null 2>&1 || print_info "Redis cluster may already exist"
    
    print_info "Waiting for Redis cluster to be available (this takes 5-10 minutes)..."
    aws elasticache wait cache-cluster-available \
        --cache-cluster-id ${PROJECT_NAME}-redis \
        --region $AWS_REGION
    
    REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
        --cache-cluster-id ${PROJECT_NAME}-redis \
        --show-cache-node-info \
        --region $AWS_REGION \
        --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
        --output text)
    
    print_success "Redis cluster created: $REDIS_ENDPOINT"
}

save_configuration() {
    print_info "Saving configuration..."
    
    cat > deployment-config.env << EOF
# Deployment Configuration
# Generated: $(date)

PROJECT_NAME=$PROJECT_NAME
AWS_REGION=$AWS_REGION
ENVIRONMENT=$ENVIRONMENT

# Database
DB_ENDPOINT=$DB_ENDPOINT
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://postgres:$DB_PASSWORD@$DB_ENDPOINT:5432/roadmap_tracker

# Redis
REDIS_ENDPOINT=$REDIS_ENDPOINT
REDIS_URL=redis://$REDIS_ENDPOINT:6379

# Security
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Next Steps:
# 1. Deploy backend using App Runner or EC2
# 2. Deploy frontend using Amplify or S3+CloudFront
# 3. Configure environment variables in your deployment service
EOF

    chmod 600 deployment-config.env
    
    print_success "Configuration saved to deployment-config.env"
}

print_next_steps() {
    echo ""
    echo "=========================================="
    echo "Deployment Complete!"
    echo "=========================================="
    echo ""
    echo "Infrastructure created:"
    echo "  • PostgreSQL Database: $DB_ENDPOINT"
    echo "  • Redis Cluster: $REDIS_ENDPOINT"
    echo ""
    echo "Configuration saved to: deployment-config.env"
    echo ""
    echo "Next steps:"
    echo ""
    echo "Option 1: Deploy with AWS App Runner (Recommended)"
    echo "  1. Go to AWS App Runner console"
    echo "  2. Create service from GitHub repository"
    echo "  3. Add environment variables from deployment-config.env"
    echo ""
    echo "Option 2: Deploy with Heroku"
    echo "  heroku create $PROJECT_NAME-backend"
    echo "  heroku config:set DATABASE_URL=\$DATABASE_URL"
    echo "  heroku config:set REDIS_URL=\$REDIS_URL"
    echo "  heroku config:set JWT_SECRET=\$JWT_SECRET"
    echo "  heroku config:set ENCRYPTION_KEY=\$ENCRYPTION_KEY"
    echo "  git push heroku main"
    echo ""
    echo "Option 3: Deploy with Railway"
    echo "  railway init"
    echo "  railway up"
    echo "  # Add environment variables via dashboard"
    echo ""
    echo "=========================================="
}

# Main execution
main() {
    check_prerequisites
    generate_secrets
    create_rds_database
    create_redis_cluster
    save_configuration
    print_next_steps
}

# Run main function
main
