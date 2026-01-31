# Simplified AWS Deployment Guide

## Overview

This guide provides the **easiest** way to deploy the email-based progress tracking system to AWS using fully managed services. This approach minimizes infrastructure management and reduces deployment time from hours to minutes.

## Simplified Architecture

Instead of managing EC2, VPC, security groups, and load balancers, we'll use:

- **AWS Amplify** - Frontend hosting (replaces S3 + CloudFront + manual builds)
- **AWS App Runner** - Backend hosting (replaces EC2 + ALB + PM2)
- **Amazon RDS** - Managed PostgreSQL (same, but simplified setup)
- **Amazon ElastiCache** - Managed Redis (same, but simplified setup)

**Benefits**:
- ✅ No server management
- ✅ Auto-scaling built-in
- ✅ SSL certificates automatic
- ✅ CI/CD built-in
- ✅ ~50% less configuration
- ✅ Similar cost (~$80-150/month)

---

## Option 1: AWS Amplify + App Runner (Recommended)

### Total Time: ~30 minutes

### Step 1: Install AWS Amplify CLI

```bash
npm install -g @aws-amplify/cli
amplify configure
```

### Step 2: Initialize Amplify

```bash
cd /path/to/your/project
amplify init

# Answer prompts:
# Project name: roadmap-tracker
# Environment: production
# Default editor: Visual Studio Code
# App type: javascript
# Framework: react
# Source directory: src
# Distribution directory: dist
# Build command: npm run build
# Start command: npm run dev
```

### Step 3: Add Hosting

```bash
amplify add hosting

# Choose: Hosting with Amplify Console
# Choose: Manual deployment

amplify publish
```

**That's it for frontend!** Amplify handles:
- Building your app
- SSL certificate
- CDN distribution
- Custom domain setup
- Automatic deployments on git push

### Step 4: Deploy Backend with App Runner

Create `apprunner.yaml` in your backend directory:

```yaml
version: 1.0
runtime: nodejs18
build:
  commands:
    pre-build:
      - npm install
    build:
      - npm run build
run:
  command: node dist/index.js
  network:
    port: 3001
  env:
    - name: NODE_ENV
      value: production
```

Deploy via AWS Console:
1. Go to AWS App Runner console
2. Click "Create service"
3. Choose "Source code repository" (connect GitHub)
4. Select your repository and branch
5. App Runner auto-detects `apprunner.yaml`
6. Click "Create & deploy"

**That's it for backend!** App Runner handles:
- Building your app
- SSL certificate
- Auto-scaling
- Load balancing
- Health checks
- Automatic deployments on git push

### Step 5: Create Database (Simplified)

```bash
# One command to create RDS
aws rds create-db-instance \
  --db-instance-identifier roadmap-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password $(openssl rand -base64 20) \
  --allocated-storage 20 \
  --publicly-accessible \
  --backup-retention-period 7

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier roadmap-db \
  --query 'DBInstances[0].Endpoint.Address'
```

### Step 6: Create Redis (Simplified)

```bash
# One command to create Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id roadmap-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1

# Get endpoint
aws elasticache describe-cache-clusters \
  --cache-cluster-id roadmap-redis \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address'
```

### Step 7: Configure Environment Variables

In App Runner console:
1. Go to your service
2. Click "Configuration" → "Environment variables"
3. Add:
   - `DATABASE_URL`: postgresql://postgres:password@endpoint:5432/roadmap_tracker
   - `REDIS_URL`: redis://endpoint:6379
   - `JWT_SECRET`: (generate with `openssl rand -hex 64`)
   - `ENCRYPTION_KEY`: (generate with `openssl rand -hex 32`)

### Total Cost: ~$80/month
- App Runner: $25/month
- RDS t3.micro: $15/month
- ElastiCache t3.micro: $12/month
- Amplify: $15/month
- Data transfer: $13/month

---

## Option 2: Heroku (Easiest - 10 minutes)

### Step 1: Install Heroku CLI

```bash
brew install heroku/brew/heroku
heroku login
```

### Step 2: Deploy Backend

```bash
cd backend
heroku create roadmap-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Add Redis
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -hex 64)
heroku config:set ENCRYPTION_KEY=$(openssl rand -hex 32)

# Deploy
git push heroku main

# Run migrations
heroku run npm run migrate
```

### Step 3: Deploy Frontend

```bash
cd ..
heroku create roadmap-frontend

# Set API URL
heroku config:set VITE_API_BASE_URL=https://roadmap-backend.herokuapp.com/api

# Deploy
git push heroku main
```

### Total Cost: ~$50/month
- Heroku Eco Dynos (2): $10/month
- PostgreSQL Mini: $5/month
- Redis Mini: $3/month
- Total: $18/month (or $50/month for production dynos)

---

## Option 3: Railway (Modern Alternative - 10 minutes)

Railway is like Heroku but more modern and cheaper.

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### Step 2: Deploy Everything

```bash
cd /path/to/your/project

# Initialize project
railway init

# Add PostgreSQL
railway add --plugin postgresql

# Add Redis
railway add --plugin redis

# Deploy backend
cd backend
railway up

# Deploy frontend
cd ..
railway up

# Set environment variables via dashboard
railway open
```

### Total Cost: ~$20/month
- Starter plan: $5/month
- PostgreSQL: $5/month
- Redis: $5/month
- Usage: $5/month

---

## Option 4: Docker + AWS ECS Fargate (Serverless Containers)

### Step 1: Create Docker Compose for Production

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    ports:
      - "3001:3001"
```

### Step 2: Deploy to ECS Fargate

```bash
# Install ECS CLI
brew install amazon-ecs-cli

# Configure
ecs-cli configure --cluster roadmap-cluster --region us-east-1

# Deploy
ecs-cli compose --file docker-compose.yml service up
```

### Total Cost: ~$40/month
- Fargate: $15/month
- RDS: $15/month
- Redis: $12/month

---

## Comparison Table

| Solution | Setup Time | Monthly Cost | Complexity | Auto-Scale | CI/CD |
|----------|-----------|--------------|------------|------------|-------|
| **Amplify + App Runner** | 30 min | $80 | Low | ✅ | ✅ |
| **Heroku** | 10 min | $50 | Very Low | ✅ | ✅ |
| **Railway** | 10 min | $20 | Very Low | ✅ | ✅ |
| **ECS Fargate** | 45 min | $40 | Medium | ✅ | ⚠️ |
| **Manual EC2** | 3 hours | $72 | High | ❌ | ❌ |

---

## Recommended Approach by Use Case

### For Startups/MVPs
**Use Railway** - Cheapest, fastest, easiest
- Deploy in 10 minutes
- $20/month
- Scale later if needed

### For Small Teams
**Use Heroku** - Battle-tested, reliable
- Deploy in 10 minutes
- $50/month
- Great documentation

### For Growing Companies
**Use Amplify + App Runner** - AWS native, scalable
- Deploy in 30 minutes
- $80/month
- Scales automatically

### For Enterprises
**Use Manual EC2 Setup** - Full control
- Deploy in 3 hours
- $72-195/month
- Complete customization

---

## Quick Start: Railway (Recommended for Simplicity)

### 1. Sign up at railway.app

### 2. Click "New Project" → "Deploy from GitHub"

### 3. Select your repository

### 4. Railway auto-detects and deploys both frontend and backend

### 5. Add PostgreSQL and Redis plugins

### 6. Set environment variables in dashboard

### 7. Done! Your app is live

**Seriously, that's it.** Railway handles:
- Building
- Deploying
- SSL certificates
- Custom domains
- Auto-scaling
- Monitoring
- Logs
- Backups

---

## Migration Path

Start simple, scale as needed:

1. **Start**: Railway ($20/month)
2. **Growing**: Heroku ($50/month)
3. **Scaling**: Amplify + App Runner ($80/month)
4. **Enterprise**: Manual EC2 ($195/month)

You can migrate between these as your needs grow.

---

## Automation Scripts

### One-Click AWS Deployment (CloudFormation)

Create `cloudformation-template.yaml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Roadmap Tracker - Complete Stack'

Resources:
  # RDS Database
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: roadmap-db
      Engine: postgres
      DBInstanceClass: db.t3.micro
      AllocatedStorage: 20
      MasterUsername: postgres
      MasterUserPassword: !Ref DBPassword

  # ElastiCache Redis
  RedisCluster:
    Type: AWS::ElastiCache::CacheCluster
    Properties:
      CacheNodeType: cache.t3.micro
      Engine: redis
      NumCacheNodes: 1

  # App Runner Service
  BackendService:
    Type: AWS::AppRunner::Service
    Properties:
      ServiceName: roadmap-backend
      SourceConfiguration:
        AutoDeploymentsEnabled: true
        CodeRepository:
          RepositoryUrl: !Ref GitHubRepo
          SourceCodeVersion:
            Type: BRANCH
            Value: main

Parameters:
  DBPassword:
    Type: String
    NoEcho: true
  GitHubRepo:
    Type: String

Outputs:
  BackendURL:
    Value: !GetAtt BackendService.ServiceUrl
  DatabaseEndpoint:
    Value: !GetAtt Database.Endpoint.Address
```

Deploy with one command:
```bash
aws cloudformation create-stack \
  --stack-name roadmap-tracker \
  --template-body file://cloudformation-template.yaml \
  --parameters ParameterKey=DBPassword,ParameterValue=SecurePassword123 \
               ParameterKey=GitHubRepo,ParameterValue=https://github.com/user/repo
```

---

## Conclusion

**For most users, I recommend Railway or Heroku** because:
- ✅ Deploy in 10 minutes
- ✅ No infrastructure management
- ✅ Built-in CI/CD
- ✅ Automatic SSL
- ✅ Easy scaling
- ✅ Great developer experience
- ✅ Low cost ($20-50/month)

The manual EC2 approach is only needed if you:
- Need complete control over infrastructure
- Have specific compliance requirements
- Want to optimize costs at scale (1000+ users)
- Have existing AWS infrastructure to integrate with

**Start simple, scale later!** 🚀
