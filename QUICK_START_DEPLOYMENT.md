# Quick Start Deployment Guide

## Choose Your Path

Pick the deployment method that matches your needs:

- **🚀 Fastest (10 minutes)**: [Railway](#railway-10-minute-deployment) or [Heroku](#heroku-10-minute-deployment)
- **⚡ AWS Managed (30 minutes)**: [AWS Amplify + App Runner](#aws-amplify--app-runner-30-minute-deployment)
- **🔧 Full Control (3 hours)**: [Manual EC2 Setup](#manual-ec2-setup-3-hour-deployment)

---

## Railway (10 Minute Deployment)

### Cost: $20/month | Difficulty: ⭐ Easy

**Step 1: Sign Up**
1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign in with GitHub

**Step 2: Deploy Backend**
1. Click "Deploy from GitHub repo"
2. Select your repository
3. Select `backend` folder
4. Railway auto-detects Node.js and deploys

**Step 3: Add Database**
1. Click "New" → "Database" → "Add PostgreSQL"
2. Click "New" → "Database" → "Add Redis"
3. Railway automatically connects them

**Step 4: Set Environment Variables**
1. Click on your backend service
2. Go to "Variables" tab
3. Add these variables:
   ```
   NODE_ENV=production
   JWT_SECRET=<generate with: openssl rand -hex 64>
   ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

**Step 5: Deploy Frontend**
1. Click "New" → "GitHub Repo"
2. Select your repository (root folder)
3. Railway auto-detects React and deploys
4. Add environment variable:
   ```
   VITE_API_BASE_URL=<your-backend-url>/api
   ```

**Step 6: Get Your URLs**
1. Click on backend service → "Settings" → "Generate Domain"
2. Click on frontend service → "Settings" → "Generate Domain"
3. Done! Your app is live 🎉

**Total Time: 10 minutes**
**Total Cost: $20/month**

---

## Heroku (10 Minute Deployment)

### Cost: $50/month | Difficulty: ⭐ Easy

**Step 1: Install Heroku CLI**
```bash
# macOS
brew install heroku/brew/heroku

# Windows
# Download from heroku.com/install

# Login
heroku login
```

**Step 2: Deploy Backend**
```bash
cd backend

# Create app
heroku create your-app-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Add Redis
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -hex 64)
heroku config:set ENCRYPTION_KEY=$(openssl rand -hex 32)
heroku config:set SMTP_HOST=smtp.gmail.com
heroku config:set SMTP_PORT=587
heroku config:set SMTP_USER=your-email@gmail.com
heroku config:set SMTP_PASS=your-app-password

# Create Procfile
echo "web: npm start" > Procfile

# Deploy
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a your-app-backend
git push heroku main

# Initialize database
heroku run npm run migrate
```

**Step 3: Deploy Frontend**
```bash
cd ..

# Create app
heroku create your-app-frontend

# Set API URL
heroku config:set VITE_API_BASE_URL=https://your-app-backend.herokuapp.com/api

# Deploy
git add .
git commit -m "Add frontend"
heroku git:remote -a your-app-frontend
git push heroku main
```

**Step 4: Open Your App**
```bash
heroku open -a your-app-frontend
```

**Total Time: 10 minutes**
**Total Cost: $50/month**

---

## AWS Amplify + App Runner (30 Minute Deployment)

### Cost: $80/month | Difficulty: ⭐⭐ Medium

**Step 1: Install AWS Amplify CLI**
```bash
npm install -g @aws-amplify/cli
amplify configure
```

**Step 2: Deploy Frontend with Amplify**
```bash
cd /path/to/your/project

# Initialize Amplify
amplify init
# Project name: roadmap-tracker
# Environment: production
# Choose defaults for other options

# Add hosting
amplify add hosting
# Choose: Hosting with Amplify Console
# Choose: Manual deployment

# Publish
amplify publish
```

**Step 3: Create Database and Redis**
```bash
# Run the automated script
./deploy-to-aws.sh

# This creates:
# - RDS PostgreSQL database
# - ElastiCache Redis cluster
# - Saves configuration to deployment-config.env
```

**Step 4: Deploy Backend with App Runner**
1. Go to [AWS App Runner Console](https://console.aws.amazon.com/apprunner/)
2. Click "Create service"
3. Choose "Source code repository"
4. Connect your GitHub account
5. Select repository and `backend` folder
6. App Runner auto-detects Node.js
7. Click "Next"
8. Add environment variables from `deployment-config.env`:
   - DATABASE_URL
   - REDIS_URL
   - JWT_SECRET
   - ENCRYPTION_KEY
   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
9. Click "Create & deploy"

**Step 5: Update Frontend API URL**
```bash
# Update Amplify environment variable
amplify env update production
# Set VITE_API_BASE_URL to your App Runner URL

# Republish
amplify publish
```

**Total Time: 30 minutes**
**Total Cost: $80/month**

---

## Manual EC2 Setup (3 Hour Deployment)

### Cost: $72-195/month | Difficulty: ⭐⭐⭐⭐ Hard

**Step 1: Run Automated Infrastructure Setup**
```bash
# This creates database and Redis
./deploy-to-aws.sh
```

**Step 2: Follow Detailed Guide**
See [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md) for complete instructions:
1. VPC and Network Configuration (30 min)
2. Security Groups (15 min)
3. EC2 Instance Setup (30 min)
4. Application Load Balancer (20 min)
5. S3 and CloudFront (20 min)
6. Route 53 DNS (15 min)
7. SSL Certificates (20 min)
8. Application Deployment (30 min)
9. CloudWatch Monitoring (20 min)

**Total Time: 3 hours**
**Total Cost: $72-195/month**

---

## Post-Deployment Checklist

After deploying with any method:

### 1. Test Health Endpoint
```bash
curl https://your-api-url/health
# Should return: {"status":"ok","timestamp":"..."}
```

### 2. Initialize Database
```bash
# Railway/Heroku: Automatic
# AWS: Run migrations manually
psql $DATABASE_URL -f backend/src/database/schema.sql
```

### 3. Configure Email
1. Open your app in browser
2. Go to Settings → Email Configuration
3. Enter your email credentials
4. Click "Test Connection"

### 4. Create Test Feature
1. Create a new feature in the roadmap
2. Send a test email about it
3. Verify it appears in the progress tracking

### 5. Set Up Monitoring
- **Railway**: Built-in metrics dashboard
- **Heroku**: Install New Relic add-on
- **AWS**: CloudWatch already configured

### 6. Configure Custom Domain (Optional)
- **Railway**: Settings → Domains → Add Custom Domain
- **Heroku**: Settings → Domains → Add Domain
- **AWS**: Route 53 → Create Record Set

---

## Troubleshooting

### Issue: Database Connection Failed
```bash
# Check database is running
# Railway: Check "Deployments" tab
# Heroku: heroku pg:info
# AWS: aws rds describe-db-instances

# Verify connection string
echo $DATABASE_URL
```

### Issue: Application Won't Start
```bash
# Check logs
# Railway: Click on service → "Logs" tab
# Heroku: heroku logs --tail
# AWS: Check CloudWatch logs

# Common fixes:
# 1. Verify all environment variables are set
# 2. Check Node.js version matches
# 3. Ensure dependencies are installed
```

### Issue: Frontend Can't Connect to Backend
```bash
# Verify API URL is correct
echo $VITE_API_BASE_URL

# Check CORS settings in backend
# Should allow your frontend domain

# Test API directly
curl https://your-api-url/health
```

---

## Cost Optimization Tips

### Railway
- Use preview environments for testing (free)
- Monitor usage dashboard
- Upgrade to Pro only when needed

### Heroku
- Use Eco dynos for non-critical apps ($5/month)
- Consolidate apps to reduce dyno count
- Use Heroku Scheduler instead of worker dynos

### AWS
- Use Reserved Instances (save 40%)
- Enable auto-scaling to scale down during low traffic
- Use CloudFront caching to reduce data transfer
- Stop dev/staging environments during off-hours

---

## Scaling Guide

### When to Scale Up

**Railway → Heroku** (when you hit 8GB RAM limit)
- Export database
- Deploy to Heroku
- Import database
- Update DNS

**Heroku → AWS** (when you need >10,000 users)
- Export database
- Set up AWS infrastructure
- Deploy application
- Migrate database
- Update DNS

**AWS Managed → Manual EC2** (when you need custom infrastructure)
- Already on AWS, easier migration
- Set up EC2 infrastructure
- Deploy application
- Update load balancer

---

## Recommended Approach

**For 90% of users:**
1. Start with **Railway** ($20/month)
2. Migrate to **Heroku** if you need more reliability ($50/month)
3. Migrate to **AWS Amplify** if you need enterprise features ($80/month)
4. Only use **Manual EC2** if you have specific requirements

**Why?**
- Get to market faster
- Focus on product, not infrastructure
- Lower costs initially
- Easy migration path

---

## Getting Help

### Railway
- Documentation: docs.railway.app
- Discord: railway.app/discord
- Support: help@railway.app

### Heroku
- Documentation: devcenter.heroku.com
- Support: help.heroku.com
- Community: forums.heroku.com

### AWS
- Documentation: docs.aws.amazon.com
- Support: console.aws.amazon.com/support
- Forums: forums.aws.amazon.com

---

## Summary

| Method | Time | Cost | Best For |
|--------|------|------|----------|
| **Railway** | 10 min | $20/mo | MVPs, startups |
| **Heroku** | 10 min | $50/mo | Small production |
| **AWS Amplify** | 30 min | $80/mo | Growing companies |
| **Manual EC2** | 3 hours | $72-195/mo | Enterprises |

**My recommendation: Start with Railway.** It's the fastest, cheapest, and easiest way to get your app live. You can always migrate later if needed.

🚀 **Now go deploy your app!**
