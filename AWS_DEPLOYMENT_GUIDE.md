# AWS Deployment Guide - Email-Based Progress Tracking

## Overview

This guide provides step-by-step instructions for deploying the email-based progress tracking system to Amazon Web Services (AWS). This deployment uses managed AWS services for reliability, scalability, and ease of maintenance.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                │
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Route 53   │─────▶│     ALB      │─────▶│   EC2 Auto   │  │
│  │     DNS      │      │ Load Balancer│      │ Scaling Group│  │
│  └──────────────┘      └──────────────┘      └──────┬───────┘  │
│                              │                       │           │
│                              │                       ▼           │
│                              │              ┌──────────────┐    │
│                              │              │  EC2 Backend │    │
│                              │              │   Instances  │    │
│                              │              └──────┬───────┘    │
│                              │                     │            │
│                              ▼                     │            │
│                     ┌──────────────┐              │            │
│                     │   S3 Bucket  │              │            │
│                     │   Frontend   │              │            │
│                     └──────────────┘              │            │
│                                                    │            │
│                     ┌──────────────┐              │            │
│                     │  RDS Postgres│◀─────────────┘            │
│                     │   Database   │                           │
│                     └──────────────┘                           │
│                                                                 │
│                     ┌──────────────┐                           │
│                     │ ElastiCache  │◀──────────────────────────┘
│                     │    Redis     │                           │
│                     └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Account Setup](#aws-account-setup)
3. [VPC and Network Configuration](#vpc-and-network-configuration)
4. [RDS PostgreSQL Setup](#rds-postgresql-setup)
5. [ElastiCache Redis Setup](#elasticache-redis-setup)
6. [EC2 Instance Setup](#ec2-instance-setup)
7. [Application Load Balancer](#application-load-balancer)
8. [S3 and CloudFront for Frontend](#s3-and-cloudfront-for-frontend)
9. [Route 53 DNS Configuration](#route-53-dns-configuration)
10. [SSL Certificate Setup](#ssl-certificate-setup)
11. [Application Deployment](#application-deployment)
12. [CloudWatch Monitoring](#cloudwatch-monitoring)
13. [Backup and Disaster Recovery](#backup-and-disaster-recovery)
14. [Cost Optimization](#cost-optimization)
15. [Troubleshooting](#troubleshooting)


---

## Prerequisites

### Required Tools
- AWS CLI v2 installed and configured
- AWS account with appropriate permissions
- Domain name (for production deployment)
- SSH key pair for EC2 access
- Git installed locally

### AWS Permissions Required
Your IAM user/role needs permissions for:
- EC2 (instances, security groups, key pairs)
- RDS (database instances)
- ElastiCache (Redis clusters)
- VPC (subnets, route tables, internet gateways)
- S3 (buckets, objects)
- CloudFront (distributions)
- Route 53 (hosted zones, records)
- ACM (SSL certificates)
- IAM (roles, policies)
- CloudWatch (logs, metrics, alarms)

### Install AWS CLI

**macOS**:
```bash
brew install awscli
```

**Linux**:
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Verify Installation**:
```bash
aws --version
# Expected: aws-cli/2.x.x
```

### Configure AWS CLI

```bash
aws configure
# AWS Access Key ID: [Your access key]
# AWS Secret Access Key: [Your secret key]
# Default region name: us-east-1
# Default output format: json
```

### Set Environment Variables

```bash
export AWS_REGION=us-east-1
export PROJECT_NAME=roadmap-tracker
export ENVIRONMENT=production
```


---

## AWS Account Setup

### Step 1: Create IAM User for Deployment

```bash
# Create IAM user
aws iam create-user --user-name roadmap-deployer

# Attach necessary policies
aws iam attach-user-policy \
  --user-name roadmap-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

aws iam attach-user-policy \
  --user-name roadmap-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess

aws iam attach-user-policy \
  --user-name roadmap-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonElastiCacheFullAccess

aws iam attach-user-policy \
  --user-name roadmap-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Create access key
aws iam create-access-key --user-name roadmap-deployer
```

### Step 2: Create SSH Key Pair

```bash
# Create key pair
aws ec2 create-key-pair \
  --key-name roadmap-key \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/roadmap-key.pem

# Set permissions
chmod 400 ~/.ssh/roadmap-key.pem
```

### Step 3: Set Up Budget Alerts (Optional but Recommended)

```bash
# Create budget to monitor costs
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json

# budget.json content:
cat > budget.json << 'EOF'
{
  "BudgetName": "roadmap-tracker-monthly",
  "BudgetLimit": {
    "Amount": "100",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
EOF
```


---

## VPC and Network Configuration

### Step 1: Create VPC

```bash
# Create VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$PROJECT_NAME-vpc}]" \
  --query 'Vpc.VpcId' \
  --output text)

echo "VPC ID: $VPC_ID"

# Enable DNS hostnames
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames
```

### Step 2: Create Subnets

```bash
# Create public subnet 1 (us-east-1a)
PUBLIC_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-public-1}]" \
  --query 'Subnet.SubnetId' \
  --output text)

# Create public subnet 2 (us-east-1b)
PUBLIC_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-public-2}]" \
  --query 'Subnet.SubnetId' \
  --output text)

# Create private subnet 1 (us-east-1a)
PRIVATE_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.11.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-private-1}]" \
  --query 'Subnet.SubnetId' \
  --output text)

# Create private subnet 2 (us-east-1b)
PRIVATE_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.12.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-private-2}]" \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Public Subnets: $PUBLIC_SUBNET_1, $PUBLIC_SUBNET_2"
echo "Private Subnets: $PRIVATE_SUBNET_1, $PRIVATE_SUBNET_2"
```

### Step 3: Create Internet Gateway

```bash
# Create internet gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$PROJECT_NAME-igw}]" \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

# Attach to VPC
aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID

echo "Internet Gateway: $IGW_ID"
```

### Step 4: Create Route Tables

```bash
# Create public route table
PUBLIC_RT=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$PROJECT_NAME-public-rt}]" \
  --query 'RouteTable.RouteTableId' \
  --output text)

# Add route to internet gateway
aws ec2 create-route \
  --route-table-id $PUBLIC_RT \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID

# Associate public subnets
aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_1 \
  --route-table-id $PUBLIC_RT

aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_2 \
  --route-table-id $PUBLIC_RT

echo "Public Route Table: $PUBLIC_RT"
```

### Step 5: Create Security Groups

```bash
# ALB Security Group
ALB_SG=$(aws ec2 create-security-group \
  --group-name $PROJECT_NAME-alb-sg \
  --description "Security group for ALB" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# EC2 Security Group
EC2_SG=$(aws ec2 create-security-group \
  --group-name $PROJECT_NAME-ec2-sg \
  --description "Security group for EC2 instances" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG \
  --protocol tcp \
  --port 3001 \
  --source-group $ALB_SG

# RDS Security Group
RDS_SG=$(aws ec2 create-security-group \
  --group-name $PROJECT_NAME-rds-sg \
  --description "Security group for RDS" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $EC2_SG

# Redis Security Group
REDIS_SG=$(aws ec2 create-security-group \
  --group-name $PROJECT_NAME-redis-sg \
  --description "Security group for Redis" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $REDIS_SG \
  --protocol tcp \
  --port 6379 \
  --source-group $EC2_SG

echo "Security Groups Created:"
echo "ALB: $ALB_SG"
echo "EC2: $EC2_SG"
echo "RDS: $RDS_SG"
echo "Redis: $REDIS_SG"
```


---

## RDS PostgreSQL Setup

### Step 1: Create DB Subnet Group

```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name $PROJECT_NAME-db-subnet \
  --db-subnet-group-description "Subnet group for RDS" \
  --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2 \
  --tags "Key=Name,Value=$PROJECT_NAME-db-subnet"
```

### Step 2: Generate Database Password

```bash
# Generate secure password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "Database Password: $DB_PASSWORD"
echo "IMPORTANT: Save this password securely!"
```

### Step 3: Create RDS Instance

```bash
# Create PostgreSQL RDS instance
aws rds create-db-instance \
  --db-instance-identifier $PROJECT_NAME-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.7 \
  --master-username postgres \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids $RDS_SG \
  --db-subnet-group-name $PROJECT_NAME-db-subnet \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --multi-az false \
  --publicly-accessible false \
  --storage-encrypted \
  --enable-cloudwatch-logs-exports '["postgresql"]' \
  --tags "Key=Name,Value=$PROJECT_NAME-db"

echo "RDS instance creation initiated. This will take 5-10 minutes..."
```

### Step 4: Wait for RDS to be Available

```bash
# Wait for RDS instance to be available
aws rds wait db-instance-available \
  --db-instance-identifier $PROJECT_NAME-db

echo "RDS instance is now available!"
```

### Step 5: Get RDS Endpoint

```bash
# Get RDS endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier $PROJECT_NAME-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "Database Endpoint: $DB_ENDPOINT"
echo "Database URL: postgresql://postgres:$DB_PASSWORD@$DB_ENDPOINT:5432/roadmap_tracker"
```

### Step 6: Create Database

```bash
# Install PostgreSQL client if not already installed
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql-client

# Connect from EC2 instance (after EC2 is created) and create database
# psql -h $DB_ENDPOINT -U postgres -c "CREATE DATABASE roadmap_tracker;"
```

### RDS Configuration Options

**For Production (Recommended)**:
```bash
# Use larger instance
--db-instance-class db.t3.small  # or db.t3.medium

# Enable Multi-AZ for high availability
--multi-az true

# Increase storage
--allocated-storage 100

# Enable automated backups
--backup-retention-period 30
```

**For Development**:
```bash
# Use smallest instance
--db-instance-class db.t3.micro

# Single AZ
--multi-az false

# Minimal storage
--allocated-storage 20
```


---

## ElastiCache Redis Setup

### Step 1: Create Cache Subnet Group

```bash
# Create cache subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name $PROJECT_NAME-redis-subnet \
  --cache-subnet-group-description "Subnet group for Redis" \
  --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2
```

### Step 2: Create Redis Cluster

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id $PROJECT_NAME-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name $PROJECT_NAME-redis-subnet \
  --security-group-ids $REDIS_SG \
  --preferred-maintenance-window "mon:05:00-mon:06:00" \
  --snapshot-retention-limit 5 \
  --snapshot-window "04:00-05:00" \
  --tags "Key=Name,Value=$PROJECT_NAME-redis"

echo "Redis cluster creation initiated. This will take 5-10 minutes..."
```

### Step 3: Wait for Redis to be Available

```bash
# Wait for Redis cluster to be available
aws elasticache wait cache-cluster-available \
  --cache-cluster-id $PROJECT_NAME-redis

echo "Redis cluster is now available!"
```

### Step 4: Get Redis Endpoint

```bash
# Get Redis endpoint
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id $PROJECT_NAME-redis \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text)

REDIS_PORT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id $PROJECT_NAME-redis \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Port' \
  --output text)

echo "Redis Endpoint: $REDIS_ENDPOINT:$REDIS_PORT"
echo "Redis URL: redis://$REDIS_ENDPOINT:$REDIS_PORT"
```

### Redis Configuration Options

**For Production (Recommended)**:
```bash
# Use larger instance
--cache-node-type cache.t3.small

# Enable automatic failover with replication
aws elasticache create-replication-group \
  --replication-group-id $PROJECT_NAME-redis-cluster \
  --replication-group-description "Redis cluster with failover" \
  --cache-node-type cache.t3.small \
  --engine redis \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --cache-subnet-group-name $PROJECT_NAME-redis-subnet \
  --security-group-ids $REDIS_SG
```

**For Development**:
```bash
# Use smallest instance
--cache-node-type cache.t3.micro

# Single node
--num-cache-nodes 1
```


---

## EC2 Instance Setup

### Step 1: Create IAM Role for EC2

```bash
# Create trust policy
cat > ec2-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name $PROJECT_NAME-ec2-role \
  --assume-role-policy-document file://ec2-trust-policy.json

# Attach policies
aws iam attach-role-policy \
  --role-name $PROJECT_NAME-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

aws iam attach-role-policy \
  --role-name $PROJECT_NAME-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

# Create instance profile
aws iam create-instance-profile \
  --instance-profile-name $PROJECT_NAME-ec2-profile

aws iam add-role-to-instance-profile \
  --instance-profile-name $PROJECT_NAME-ec2-profile \
  --role-name $PROJECT_NAME-ec2-role
```

### Step 2: Create User Data Script

```bash
cat > user-data.sh << 'EOF'
#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install PostgreSQL client
apt-get install -y postgresql-client

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E ./amazon-cloudwatch-agent.deb

# Create application directory
mkdir -p /opt/roadmap-tracker
chown ubuntu:ubuntu /opt/roadmap-tracker

# Install PM2 for process management
npm install -g pm2

echo "EC2 setup complete!"
EOF
```

### Step 3: Launch EC2 Instance

```bash
# Get latest Ubuntu AMI
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)

# Launch instance
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.small \
  --key-name roadmap-key \
  --security-group-ids $EC2_SG \
  --subnet-id $PUBLIC_SUBNET_1 \
  --iam-instance-profile Name=$PROJECT_NAME-ec2-profile \
  --user-data file://user-data.sh \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$PROJECT_NAME-backend}]" \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "Instance ID: $INSTANCE_ID"
echo "Waiting for instance to be running..."

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

echo "Instance is now running!"
```

### Step 4: Allocate and Associate Elastic IP

```bash
# Allocate Elastic IP
ALLOCATION_ID=$(aws ec2 allocate-address \
  --domain vpc \
  --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=$PROJECT_NAME-backend-eip}]" \
  --query 'AllocationId' \
  --output text)

# Associate with instance
aws ec2 associate-address \
  --instance-id $INSTANCE_ID \
  --allocation-id $ALLOCATION_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-addresses \
  --allocation-ids $ALLOCATION_ID \
  --query 'Addresses[0].PublicIp' \
  --output text)

echo "Elastic IP: $PUBLIC_IP"
```

### Step 5: Connect to EC2 Instance

```bash
# Wait for user data script to complete (about 5 minutes)
sleep 300

# Connect via SSH
ssh -i ~/.ssh/roadmap-key.pem ubuntu@$PUBLIC_IP

# Verify installations
node --version
docker --version
docker-compose --version
psql --version
```


---

## Application Load Balancer

### Step 1: Create Target Group

```bash
# Create target group
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
  --name $PROJECT_NAME-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id $VPC_ID \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Target Group ARN: $TARGET_GROUP_ARN"
```

### Step 2: Register EC2 Instance with Target Group

```bash
# Register instance
aws elbv2 register-targets \
  --target-group-arn $TARGET_GROUP_ARN \
  --targets Id=$INSTANCE_ID

echo "Instance registered with target group"
```

### Step 3: Create Application Load Balancer

```bash
# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name $PROJECT_NAME-alb \
  --subnets $PUBLIC_SUBNET_1 $PUBLIC_SUBNET_2 \
  --security-groups $ALB_SG \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --tags "Key=Name,Value=$PROJECT_NAME-alb" \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

echo "ALB ARN: $ALB_ARN"

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB DNS: $ALB_DNS"
```

### Step 4: Create HTTP Listener (Temporary)

```bash
# Create HTTP listener (will redirect to HTTPS later)
HTTP_LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
  --query 'Listeners[0].ListenerArn' \
  --output text)

echo "HTTP Listener ARN: $HTTP_LISTENER_ARN"
```

### Step 5: Test ALB

```bash
# Wait for ALB to be active
aws elbv2 wait load-balancer-available \
  --load-balancer-arns $ALB_ARN

# Test health check (after application is deployed)
curl http://$ALB_DNS/health
```


---

## S3 and CloudFront for Frontend

### Step 1: Create S3 Bucket for Frontend

```bash
# Create S3 bucket (bucket name must be globally unique)
BUCKET_NAME="$PROJECT_NAME-frontend-$(date +%s)"

aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region us-east-1

echo "S3 Bucket: $BUCKET_NAME"
```

### Step 2: Configure S3 Bucket for Static Website Hosting

```bash
# Enable static website hosting
aws s3 website s3://$BUCKET_NAME/ \
  --index-document index.html \
  --error-document index.html

# Create bucket policy for public read
cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

# Apply bucket policy
aws s3api put-bucket-policy \
  --bucket $BUCKET_NAME \
  --policy file://bucket-policy.json

# Disable block public access
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

### Step 3: Create CloudFront Distribution

```bash
# Create CloudFront origin access identity
OAI_ID=$(aws cloudfront create-cloud-front-origin-access-identity \
  --cloud-front-origin-access-identity-config \
    CallerReference=$(date +%s),Comment="OAI for $PROJECT_NAME" \
  --query 'CloudFrontOriginAccessIdentity.Id' \
  --output text)

# Create distribution config
cat > cloudfront-config.json << EOF
{
  "CallerReference": "$(date +%s)",
  "Comment": "$PROJECT_NAME frontend distribution",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-$BUCKET_NAME",
        "DomainName": "$BUCKET_NAME.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/$OAI_ID"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-$BUCKET_NAME",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "Compress": true
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "PriceClass": "PriceClass_100"
}
EOF

# Create distribution
DISTRIBUTION_ID=$(aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json \
  --query 'Distribution.Id' \
  --output text)

# Get CloudFront domain
CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id $DISTRIBUTION_ID \
  --query 'Distribution.DomainName' \
  --output text)

echo "CloudFront Distribution ID: $DISTRIBUTION_ID"
echo "CloudFront Domain: $CLOUDFRONT_DOMAIN"
```

### Step 4: Build and Deploy Frontend

```bash
# On your local machine
cd /path/to/your/project

# Create production environment file
cat > .env.production << EOF
VITE_API_BASE_URL=https://api.your-domain.com/api
EOF

# Build frontend
npm run build

# Upload to S3
aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# Upload index.html with no-cache
aws s3 cp dist/index.html s3://$BUCKET_NAME/index.html \
  --cache-control "no-cache, no-store, must-revalidate"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo "Frontend deployed to CloudFront!"
echo "URL: https://$CLOUDFRONT_DOMAIN"
```


---

## Route 53 DNS Configuration

### Step 1: Create Hosted Zone

```bash
# Create hosted zone (if you don't have one)
HOSTED_ZONE_ID=$(aws route53 create-hosted-zone \
  --name your-domain.com \
  --caller-reference $(date +%s) \
  --query 'HostedZone.Id' \
  --output text)

echo "Hosted Zone ID: $HOSTED_ZONE_ID"

# Get nameservers
aws route53 get-hosted-zone \
  --id $HOSTED_ZONE_ID \
  --query 'DelegationSet.NameServers'

# Update your domain registrar with these nameservers
```

### Step 2: Create DNS Records

```bash
# Create A record for ALB (API subdomain)
cat > api-record.json << EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.your-domain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --query 'LoadBalancers[0].CanonicalHostedZoneId' --output text)",
          "DNSName": "$ALB_DNS",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://api-record.json

# Create A record for CloudFront (main domain)
cat > frontend-record.json << EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "your-domain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "$CLOUDFRONT_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://frontend-record.json

echo "DNS records created!"
echo "Frontend: https://your-domain.com"
echo "API: https://api.your-domain.com"
```

### Step 3: Verify DNS Propagation

```bash
# Check DNS resolution
dig your-domain.com
dig api.your-domain.com

# Or use nslookup
nslookup your-domain.com
nslookup api.your-domain.com
```


---

## SSL Certificate Setup

### Step 1: Request Certificate for ALB (us-east-1)

```bash
# Request certificate for API subdomain
API_CERT_ARN=$(aws acm request-certificate \
  --domain-name api.your-domain.com \
  --validation-method DNS \
  --region us-east-1 \
  --query 'CertificateArn' \
  --output text)

echo "API Certificate ARN: $API_CERT_ARN"
```

### Step 2: Request Certificate for CloudFront (us-east-1)

```bash
# Request certificate for main domain and www subdomain
CLOUDFRONT_CERT_ARN=$(aws acm request-certificate \
  --domain-name your-domain.com \
  --subject-alternative-names www.your-domain.com \
  --validation-method DNS \
  --region us-east-1 \
  --query 'CertificateArn' \
  --output text)

echo "CloudFront Certificate ARN: $CLOUDFRONT_CERT_ARN"
```

### Step 3: Get DNS Validation Records

```bash
# Get validation records for API certificate
aws acm describe-certificate \
  --certificate-arn $API_CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'

# Get validation records for CloudFront certificate
aws acm describe-certificate \
  --certificate-arn $CLOUDFRONT_CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[*].ResourceRecord'
```

### Step 4: Create DNS Validation Records

```bash
# Create validation record for API certificate
cat > api-cert-validation.json << EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_validation-record-name-from-above",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "_validation-record-value-from-above"
          }
        ]
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://api-cert-validation.json

# Repeat for CloudFront certificate validation records
```

### Step 5: Wait for Certificate Validation

```bash
# Wait for API certificate
aws acm wait certificate-validated \
  --certificate-arn $API_CERT_ARN \
  --region us-east-1

echo "API certificate validated!"

# Wait for CloudFront certificate
aws acm wait certificate-validated \
  --certificate-arn $CLOUDFRONT_CERT_ARN \
  --region us-east-1

echo "CloudFront certificate validated!"
```

### Step 6: Add HTTPS Listener to ALB

```bash
# Create HTTPS listener
HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$API_CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
  --query 'Listeners[0].ListenerArn' \
  --output text)

# Modify HTTP listener to redirect to HTTPS
aws elbv2 modify-listener \
  --listener-arn $HTTP_LISTENER_ARN \
  --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}"

echo "HTTPS listener configured!"
```

### Step 7: Update CloudFront with Certificate

```bash
# Update CloudFront distribution to use certificate
aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --if-match $(aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'ETag' --output text) \
  --distribution-config file://cloudfront-config-with-cert.json

# cloudfront-config-with-cert.json should include:
# "ViewerCertificate": {
#   "ACMCertificateArn": "$CLOUDFRONT_CERT_ARN",
#   "SSLSupportMethod": "sni-only",
#   "MinimumProtocolVersion": "TLSv1.2_2021"
# }
```


---

## Application Deployment

### Step 1: Connect to EC2 Instance

```bash
ssh -i ~/.ssh/roadmap-key.pem ubuntu@$PUBLIC_IP
```

### Step 2: Clone Repository

```bash
# On EC2 instance
cd /opt/roadmap-tracker
git clone https://github.com/your-username/your-repo.git .

# Or upload files via SCP
# On local machine:
# scp -i ~/.ssh/roadmap-key.pem -r ./backend ubuntu@$PUBLIC_IP:/opt/roadmap-tracker/
```

### Step 3: Create Environment File

```bash
# On EC2 instance
cd /opt/roadmap-tracker/backend

# Generate secrets
JWT_SECRET=$(openssl rand -hex 64)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Create .env file
cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://postgres:$DB_PASSWORD@$DB_ENDPOINT:5432/roadmap_tracker
DB_HOST=$DB_ENDPOINT
DB_PORT=5432
DB_NAME=roadmap_tracker
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD

# Redis Configuration
REDIS_HOST=$REDIS_ENDPOINT
REDIS_PORT=$REDIS_PORT
REDIS_URL=redis://$REDIS_ENDPOINT:$REDIS_PORT

# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# CORS Configuration
CORS_ORIGIN=https://your-domain.com

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Email Configuration (configure via UI later)
EMAIL_POLL_INTERVAL=300000

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Notification Configuration
NOTIFICATION_EMAIL_ENABLED=true
NOTIFICATION_EMAIL_RECIPIENTS=admin@your-domain.com

# Logging
LOG_LEVEL=info
LOG_FILE=/opt/roadmap-tracker/backend/logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
HELMET_ENABLED=true
TRUST_PROXY=true
EOF

chmod 600 .env
```

### Step 4: Install Dependencies

```bash
# Install backend dependencies
cd /opt/roadmap-tracker/backend
npm install --production
```

### Step 5: Initialize Database

```bash
# Create database
PGPASSWORD=$DB_PASSWORD psql -h $DB_ENDPOINT -U postgres -c "CREATE DATABASE roadmap_tracker;"

# Run schema
PGPASSWORD=$DB_PASSWORD psql -h $DB_ENDPOINT -U postgres -d roadmap_tracker -f src/database/schema.sql

echo "Database initialized!"
```

### Step 6: Build Application

```bash
# Build TypeScript
npm run build

# Verify build
ls -la dist/
```

### Step 7: Start Application with PM2

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'roadmap-backend',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M'
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u ubuntu --hp /home/ubuntu
# Run the command that PM2 outputs

# Check status
pm2 status
pm2 logs
```

### Step 8: Verify Application

```bash
# Test health endpoint
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"..."}

# Test from outside
curl https://api.your-domain.com/health
```

### Step 9: Setup Log Rotation

```bash
# Install PM2 log rotate module
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```


---

## CloudWatch Monitoring

### Step 1: Create CloudWatch Log Groups

```bash
# Create log group for application logs
aws logs create-log-group \
  --log-group-name /aws/ec2/$PROJECT_NAME/application

# Create log group for access logs
aws logs create-log-group \
  --log-group-name /aws/ec2/$PROJECT_NAME/access

# Set retention policy (30 days)
aws logs put-retention-policy \
  --log-group-name /aws/ec2/$PROJECT_NAME/application \
  --retention-in-days 30

aws logs put-retention-policy \
  --log-group-name /aws/ec2/$PROJECT_NAME/access \
  --retention-in-days 30
```

### Step 2: Install and Configure CloudWatch Agent

```bash
# On EC2 instance
# Create CloudWatch agent config
sudo cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/opt/roadmap-tracker/backend/logs/app.log",
            "log_group_name": "/aws/ec2/roadmap-tracker/application",
            "log_stream_name": "{instance_id}/app.log",
            "timezone": "UTC"
          },
          {
            "file_path": "/opt/roadmap-tracker/backend/logs/pm2-error.log",
            "log_group_name": "/aws/ec2/roadmap-tracker/application",
            "log_stream_name": "{instance_id}/pm2-error.log",
            "timezone": "UTC"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "RoadmapTracker",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_IDLE",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DISK_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEM_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

# Start CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

### Step 3: Create CloudWatch Alarms

```bash
# CPU Utilization Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name $PROJECT_NAME-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID

# Memory Utilization Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name $PROJECT_NAME-high-memory \
  --alarm-description "Alert when memory exceeds 80%" \
  --metric-name MEM_USED \
  --namespace RoadmapTracker \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID

# Disk Utilization Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name $PROJECT_NAME-high-disk \
  --alarm-description "Alert when disk exceeds 80%" \
  --metric-name DISK_USED \
  --namespace RoadmapTracker \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID

# ALB Target Health Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name $PROJECT_NAME-unhealthy-targets \
  --alarm-description "Alert when targets are unhealthy" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 2 \
  --dimensions Name=TargetGroup,Value=$(echo $TARGET_GROUP_ARN | cut -d: -f6) \
               Name=LoadBalancer,Value=$(echo $ALB_ARN | cut -d: -f6)
```

### Step 4: Create SNS Topic for Alerts

```bash
# Create SNS topic
TOPIC_ARN=$(aws sns create-topic \
  --name $PROJECT_NAME-alerts \
  --query 'TopicArn' \
  --output text)

# Subscribe email to topic
aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol email \
  --notification-endpoint admin@your-domain.com

# Confirm subscription via email

# Update alarms to send to SNS
aws cloudwatch put-metric-alarm \
  --alarm-name $PROJECT_NAME-high-cpu \
  --alarm-actions $TOPIC_ARN \
  --ok-actions $TOPIC_ARN
```

### Step 5: Create CloudWatch Dashboard

```bash
# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name $PROJECT_NAME-dashboard \
  --dashboard-body file://dashboard.json

# dashboard.json content:
cat > dashboard.json << EOF
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/EC2", "CPUUtilization", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "EC2 CPU Utilization"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "TargetResponseTime", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "ALB Response Time"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/RDS", "CPUUtilization", {"stat": "Average"}],
          [".", "DatabaseConnections", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "RDS Metrics"
      }
    }
  ]
}
EOF
```


---

## Backup and Disaster Recovery

### Step 1: Enable RDS Automated Backups

```bash
# Modify RDS instance for automated backups
aws rds modify-db-instance \
  --db-instance-identifier $PROJECT_NAME-db \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately

# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier $PROJECT_NAME-db \
  --db-snapshot-identifier $PROJECT_NAME-db-snapshot-$(date +%Y%m%d)
```

### Step 2: Create Backup Script for EC2

```bash
# On EC2 instance
cat > /opt/roadmap-tracker/backup.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/opt/roadmap-tracker/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_FILE \
  --exclude='node_modules' \
  --exclude='logs' \
  --exclude='backups' \
  /opt/roadmap-tracker/

# Upload to S3
aws s3 cp $BACKUP_FILE s3://$PROJECT_NAME-backups/ec2/

# Keep only last 7 days locally
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

chmod +x /opt/roadmap-tracker/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/roadmap-tracker/backup.sh") | crontab -
```

### Step 3: Create S3 Bucket for Backups

```bash
# Create backup bucket
BACKUP_BUCKET="$PROJECT_NAME-backups-$(date +%s)"

aws s3api create-bucket \
  --bucket $BACKUP_BUCKET \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $BACKUP_BUCKET \
  --versioning-configuration Status=Enabled

# Enable lifecycle policy
cat > lifecycle-policy.json << 'EOF'
{
  "Rules": [
    {
      "Id": "DeleteOldBackups",
      "Status": "Enabled",
      "Prefix": "",
      "Expiration": {
        "Days": 90
      },
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket $BACKUP_BUCKET \
  --lifecycle-configuration file://lifecycle-policy.json
```

### Step 4: Create AMI for EC2 Instance

```bash
# Create AMI
AMI_ID=$(aws ec2 create-image \
  --instance-id $INSTANCE_ID \
  --name "$PROJECT_NAME-ami-$(date +%Y%m%d)" \
  --description "Backup AMI for $PROJECT_NAME" \
  --no-reboot \
  --query 'ImageId' \
  --output text)

echo "AMI created: $AMI_ID"

# Tag AMI
aws ec2 create-tags \
  --resources $AMI_ID \
  --tags "Key=Name,Value=$PROJECT_NAME-backup" \
         "Key=Date,Value=$(date +%Y-%m-%d)"
```

### Step 5: Disaster Recovery Plan

Create a disaster recovery runbook:

```bash
cat > /opt/roadmap-tracker/DISASTER_RECOVERY.md << 'EOF'
# Disaster Recovery Runbook

## RDS Database Recovery

### Restore from Automated Backup
```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier roadmap-tracker-db \
  --target-db-instance-identifier roadmap-tracker-db-restored \
  --restore-time 2025-01-31T12:00:00Z
```

### Restore from Manual Snapshot
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier roadmap-tracker-db-restored \
  --db-snapshot-identifier roadmap-tracker-db-snapshot-20250131
```

## EC2 Instance Recovery

### Launch from AMI
```bash
aws ec2 run-instances \
  --image-id ami-xxxxx \
  --instance-type t3.small \
  --key-name roadmap-key \
  --security-group-ids sg-xxxxx \
  --subnet-id subnet-xxxxx
```

### Restore Application Files from S3
```bash
aws s3 cp s3://roadmap-tracker-backups/ec2/backup_latest.tar.gz /tmp/
tar -xzf /tmp/backup_latest.tar.gz -C /
```

## Redis Recovery

ElastiCache Redis automatically handles failover with Multi-AZ.
Manual recovery not typically needed.

## Complete System Recovery Time

- RDS: 15-30 minutes
- EC2: 10-15 minutes
- DNS propagation: 5-60 minutes
- Total: ~1-2 hours

## Recovery Testing Schedule

Test disaster recovery quarterly:
- Q1: Database restore
- Q2: EC2 restore
- Q3: Full system restore
- Q4: Cross-region restore
EOF
```


---

## Cost Optimization

### Current Architecture Costs (Monthly Estimates)

**Development/Staging Environment**:
- EC2 t3.small: $15/month
- RDS db.t3.micro: $15/month
- ElastiCache cache.t3.micro: $12/month
- ALB: $20/month
- S3 + CloudFront: $5/month
- Data Transfer: $5/month
- **Total: ~$72/month**

**Production Environment**:
- EC2 t3.medium (2 instances): $60/month
- RDS db.t3.small (Multi-AZ): $50/month
- ElastiCache cache.t3.small: $25/month
- ALB: $20/month
- S3 + CloudFront: $10/month
- Data Transfer: $20/month
- CloudWatch: $10/month
- **Total: ~$195/month**

### Cost Optimization Strategies

#### 1. Use Reserved Instances

```bash
# Purchase 1-year Reserved Instance (save ~40%)
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id offering-id \
  --instance-count 1

# Estimated savings: $25-30/month
```

#### 2. Use Savings Plans

```bash
# Commit to $50/month for 1 year (save ~30%)
# Configure via AWS Console > Savings Plans
```

#### 3. Right-Size Instances

```bash
# Monitor CloudWatch metrics for 2 weeks
# If CPU < 40% consistently, downgrade instance type

# Example: t3.small → t3.micro saves $7.50/month
```

#### 4. Use Spot Instances for Non-Critical Workloads

```bash
# For development/testing environments
aws ec2 run-instances \
  --instance-type t3.small \
  --instance-market-options MarketType=spot,SpotOptions={MaxPrice=0.01}

# Potential savings: 70-90%
```

#### 5. Optimize S3 Storage

```bash
# Use Intelligent-Tiering for S3
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket $BUCKET_NAME \
  --id IntelligentTiering \
  --intelligent-tiering-configuration file://tiering-config.json

# Estimated savings: 30-50% on storage costs
```

#### 6. Use CloudFront Caching Effectively

```bash
# Increase cache TTL to reduce origin requests
# Configure in CloudFront distribution settings
# Default TTL: 86400 (24 hours)
# Max TTL: 31536000 (1 year)

# Estimated savings: 40-60% on data transfer
```

#### 7. Schedule Non-Production Resources

```bash
# Stop development instances during off-hours
# Create Lambda function to stop/start instances

cat > stop-instances.py << 'EOF'
import boto3

ec2 = boto3.client('ec2')

def lambda_handler(event, context):
    # Stop instances tagged with Environment=dev
    instances = ec2.describe_instances(
        Filters=[{'Name': 'tag:Environment', 'Values': ['dev']}]
    )
    
    instance_ids = []
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_ids.append(instance['InstanceId'])
    
    if instance_ids:
        ec2.stop_instances(InstanceIds=instance_ids)
    
    return {'statusCode': 200}
EOF

# Schedule: Stop at 8 PM, Start at 8 AM (weekdays)
# Savings: ~50% on EC2 costs for dev environment
```

#### 8. Use AWS Cost Explorer

```bash
# Enable Cost Explorer
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Review monthly and set up cost anomaly detection
```

### Cost Monitoring Setup

```bash
# Create budget with alerts
cat > budget-config.json << 'EOF'
{
  "BudgetName": "roadmap-tracker-monthly",
  "BudgetLimit": {
    "Amount": "100",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {
    "TagKeyValue": ["user:Project$roadmap-tracker"]
  }
}
EOF

aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget-config.json \
  --notifications-with-subscribers file://notifications.json

# notifications.json
cat > notifications.json << 'EOF'
[
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "admin@your-domain.com"
      }
    ]
  }
]
EOF
```

### Monthly Cost Review Checklist

- [ ] Review CloudWatch metrics for underutilized resources
- [ ] Check S3 bucket sizes and apply lifecycle policies
- [ ] Review CloudFront cache hit ratio
- [ ] Analyze RDS performance insights
- [ ] Check for unused Elastic IPs
- [ ] Review EBS snapshots and delete old ones
- [ ] Verify all resources are properly tagged
- [ ] Review AWS Cost Explorer recommendations


---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Cannot Connect to RDS Database

**Symptoms**:
- Connection timeout
- "ECONNREFUSED" error

**Solutions**:
```bash
# Check security group rules
aws ec2 describe-security-groups --group-ids $RDS_SG

# Verify EC2 can reach RDS
# On EC2 instance:
telnet $DB_ENDPOINT 5432

# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier $PROJECT_NAME-db \
  --query 'DBInstances[0].DBInstanceStatus'

# Verify VPC and subnet configuration
aws rds describe-db-instances \
  --db-instance-identifier $PROJECT_NAME-db \
  --query 'DBInstances[0].DBSubnetGroup'
```

#### Issue 2: ALB Health Checks Failing

**Symptoms**:
- Targets showing as unhealthy
- 502/503 errors from ALB

**Solutions**:
```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn $TARGET_GROUP_ARN

# Verify application is running
# On EC2 instance:
pm2 status
curl http://localhost:3001/health

# Check security group allows ALB traffic
aws ec2 describe-security-groups --group-ids $EC2_SG

# Review ALB access logs
aws s3 ls s3://alb-logs-bucket/

# Check target group health check settings
aws elbv2 describe-target-groups \
  --target-group-arns $TARGET_GROUP_ARN
```

#### Issue 3: High Memory Usage

**Symptoms**:
- Application crashes
- Out of memory errors

**Solutions**:
```bash
# On EC2 instance, check memory usage
free -h
pm2 monit

# Check for memory leaks in logs
pm2 logs --lines 100 | grep -i "memory"

# Restart application
pm2 restart all

# Increase instance size if needed
aws ec2 modify-instance-attribute \
  --instance-id $INSTANCE_ID \
  --instance-type t3.medium

# Configure PM2 memory limit
pm2 start ecosystem.config.js --max-memory-restart 400M
```

#### Issue 4: SSL Certificate Not Working

**Symptoms**:
- Certificate validation errors
- HTTPS not working

**Solutions**:
```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn $API_CERT_ARN \
  --region us-east-1

# Verify DNS validation records
dig _validation-record-name CNAME

# Check ALB listener configuration
aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN

# Test SSL certificate
openssl s_client -connect api.your-domain.com:443 -servername api.your-domain.com
```

#### Issue 5: CloudFront Not Serving Latest Content

**Symptoms**:
- Old content being served
- Changes not visible

**Solutions**:
```bash
# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --id invalidation-id

# Verify cache settings
aws cloudfront get-distribution-config \
  --id $DISTRIBUTION_ID \
  --query 'DistributionConfig.DefaultCacheBehavior'

# Check S3 bucket content
aws s3 ls s3://$BUCKET_NAME/
```

#### Issue 6: Email Processing Not Working

**Symptoms**:
- Emails not being processed
- No updates appearing

**Solutions**:
```bash
# Check email configuration in database
# On EC2 instance:
PGPASSWORD=$DB_PASSWORD psql -h $DB_ENDPOINT -U postgres -d roadmap_tracker \
  -c "SELECT * FROM email_config;"

# Check email poller logs
pm2 logs | grep -i "email"

# Test email connection
# Via API:
curl -X POST https://api.your-domain.com/api/config/email/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Check Redis queue
redis-cli -h $REDIS_ENDPOINT LLEN email-queue
```

#### Issue 7: High Database Connection Count

**Symptoms**:
- "Too many connections" error
- Slow database queries

**Solutions**:
```bash
# Check current connections
PGPASSWORD=$DB_PASSWORD psql -h $DB_ENDPOINT -U postgres -d roadmap_tracker \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection pool settings in application
# Adjust in backend/.env:
# DATABASE_POOL_MIN=2
# DATABASE_POOL_MAX=10

# Monitor RDS connections
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=$PROJECT_NAME-db \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### Debugging Commands

```bash
# Check all AWS resources
aws ec2 describe-instances --filters "Name=tag:Name,Values=$PROJECT_NAME*"
aws rds describe-db-instances --db-instance-identifier $PROJECT_NAME-db
aws elasticache describe-cache-clusters --cache-cluster-id $PROJECT_NAME-redis
aws elbv2 describe-load-balancers --names $PROJECT_NAME-alb

# Check application logs
pm2 logs --lines 100
tail -f /opt/roadmap-tracker/backend/logs/app.log

# Check system resources
top
df -h
netstat -tulpn

# Check network connectivity
ping $DB_ENDPOINT
telnet $REDIS_ENDPOINT 6379
curl -I https://api.your-domain.com

# Check DNS resolution
dig api.your-domain.com
nslookup api.your-domain.com

# Check SSL certificate
echo | openssl s_client -connect api.your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Getting Help

**AWS Support**:
- Basic: Included with account
- Developer: $29/month
- Business: $100/month
- Enterprise: $15,000/month

**Community Resources**:
- AWS Forums: https://forums.aws.amazon.com/
- Stack Overflow: Tag questions with `amazon-web-services`
- AWS Documentation: https://docs.aws.amazon.com/

**Emergency Contacts**:
- AWS Support: https://console.aws.amazon.com/support/
- Your team's on-call: [Add contact info]


---

## Quick Reference

### Environment Variables Summary

```bash
# Save these for future reference
export VPC_ID="vpc-xxxxx"
export PUBLIC_SUBNET_1="subnet-xxxxx"
export PUBLIC_SUBNET_2="subnet-xxxxx"
export PRIVATE_SUBNET_1="subnet-xxxxx"
export PRIVATE_SUBNET_2="subnet-xxxxx"
export ALB_SG="sg-xxxxx"
export EC2_SG="sg-xxxxx"
export RDS_SG="sg-xxxxx"
export REDIS_SG="sg-xxxxx"
export DB_ENDPOINT="xxxxx.rds.amazonaws.com"
export DB_PASSWORD="xxxxx"
export REDIS_ENDPOINT="xxxxx.cache.amazonaws.com"
export INSTANCE_ID="i-xxxxx"
export PUBLIC_IP="x.x.x.x"
export ALB_ARN="arn:aws:elasticloadbalancing:..."
export ALB_DNS="xxxxx.elb.amazonaws.com"
export TARGET_GROUP_ARN="arn:aws:elasticloadbalancing:..."
export BUCKET_NAME="roadmap-tracker-frontend-xxxxx"
export DISTRIBUTION_ID="xxxxx"
export CLOUDFRONT_DOMAIN="xxxxx.cloudfront.net"
export API_CERT_ARN="arn:aws:acm:..."
export CLOUDFRONT_CERT_ARN="arn:aws:acm:..."
```

### Common Commands

```bash
# SSH to EC2
ssh -i ~/.ssh/roadmap-key.pem ubuntu@$PUBLIC_IP

# Check application status
pm2 status
pm2 logs

# Restart application
pm2 restart all

# Deploy new code
cd /opt/roadmap-tracker
git pull
npm install
npm run build
pm2 restart all

# Check database
PGPASSWORD=$DB_PASSWORD psql -h $DB_ENDPOINT -U postgres -d roadmap_tracker

# Check Redis
redis-cli -h $REDIS_ENDPOINT ping

# View CloudWatch logs
aws logs tail /aws/ec2/$PROJECT_NAME/application --follow

# Create database backup
aws rds create-db-snapshot \
  --db-instance-identifier $PROJECT_NAME-db \
  --db-snapshot-identifier manual-backup-$(date +%Y%m%d)

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

### Useful AWS Console Links

- **EC2 Instances**: https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#Instances:
- **RDS Databases**: https://console.aws.amazon.com/rds/home?region=us-east-1#databases:
- **ElastiCache**: https://console.aws.amazon.com/elasticache/home?region=us-east-1#cache-clusters:
- **Load Balancers**: https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#LoadBalancers:
- **S3 Buckets**: https://s3.console.aws.amazon.com/s3/home?region=us-east-1
- **CloudFront**: https://console.aws.amazon.com/cloudfront/v3/home
- **Route 53**: https://console.aws.amazon.com/route53/v2/home
- **CloudWatch**: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1
- **Cost Explorer**: https://console.aws.amazon.com/cost-management/home

---

## Deployment Checklist

### Pre-Deployment
- [ ] AWS CLI installed and configured
- [ ] Domain name registered
- [ ] Email account configured (Gmail/Outlook)
- [ ] Repository cloned locally
- [ ] Environment variables prepared

### Infrastructure Setup
- [ ] VPC and subnets created
- [ ] Security groups configured
- [ ] RDS PostgreSQL instance created
- [ ] ElastiCache Redis cluster created
- [ ] EC2 instance launched
- [ ] Elastic IP allocated
- [ ] ALB created and configured
- [ ] S3 bucket created
- [ ] CloudFront distribution created

### DNS and SSL
- [ ] Route 53 hosted zone created
- [ ] DNS records created
- [ ] SSL certificates requested
- [ ] Certificates validated
- [ ] HTTPS listeners configured

### Application Deployment
- [ ] Code deployed to EC2
- [ ] Dependencies installed
- [ ] Database schema initialized
- [ ] Environment variables configured
- [ ] Application started with PM2
- [ ] Frontend built and uploaded to S3

### Monitoring and Backup
- [ ] CloudWatch agent installed
- [ ] Log groups created
- [ ] Alarms configured
- [ ] SNS topic created for alerts
- [ ] Automated backups enabled
- [ ] Backup scripts configured

### Testing
- [ ] Health endpoint responding
- [ ] Database connection working
- [ ] Redis connection working
- [ ] Email configuration tested
- [ ] Frontend accessible
- [ ] API endpoints working
- [ ] SSL certificates valid

### Post-Deployment
- [ ] Documentation updated
- [ ] Team trained
- [ ] Monitoring dashboard created
- [ ] Backup tested
- [ ] Disaster recovery plan documented
- [ ] Cost alerts configured

---

## Next Steps

After successful deployment:

1. **Configure Email Account**: Use the Email Configuration dialog in the UI to set up your email account for progress tracking

2. **Create Test Data**: Create a few test features and send test emails to verify the system is working

3. **Monitor Performance**: Check CloudWatch dashboard daily for the first week

4. **Optimize Costs**: Review AWS Cost Explorer after the first month and adjust resources as needed

5. **Set Up CI/CD**: Implement automated deployment pipeline (GitHub Actions, Jenkins, etc.)

6. **Scale as Needed**: Monitor usage and scale resources up or down based on demand

7. **Regular Maintenance**: Schedule monthly reviews of logs, backups, and security updates

---

## Conclusion

You now have a complete, production-ready deployment of the email-based progress tracking system on AWS. The architecture is:

- **Scalable**: Can handle growth by adding more EC2 instances
- **Reliable**: Multi-AZ RDS, automated backups, health checks
- **Secure**: SSL/TLS, security groups, encrypted credentials
- **Monitored**: CloudWatch logs, metrics, and alarms
- **Cost-Effective**: Right-sized resources with optimization strategies

For questions or issues, refer to the troubleshooting section or contact your AWS support team.

**Happy tracking! 🚀**
