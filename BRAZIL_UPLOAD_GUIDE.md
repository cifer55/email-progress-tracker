# Brazil Upload Guide

## Overview

This guide helps you upload your Email Progress Tracker code to Amazon's internal Brazil/Code repository.

Since you're working on a Mac (not an Amazon dev desktop), you'll use **Code.Amazon.com** web interface and git commands.

---

## Step 1: Create Repository on Code.Amazon.com

1. **Go to**: https://code.amazon.com
2. **Click**: "Create Repository" (top right)
3. **Fill in details**:
   - **Repository Name**: `EmailProgressTracker`
   - **Description**: `Email-based progress tracking system for roadmap visualization with AWS deployment`
   - **Visibility**: Choose based on your needs:
     - `Private` - Only you and specified users
     - `Internal` - All Amazon employees
     - `Public` - Everyone (rare for internal tools)
   - **Initialize**: Leave unchecked (we already have code)
4. **Click**: "Create Repository"

---

## Step 2: Get Repository URL

After creation, Code.Amazon.com will show you the repository URL. It will look like:

```
ssh://git.amazon.com/pkg/EmailProgressTracker
```

Or for HTTPS:

```
https://git.amazon.com/pkg/EmailProgressTracker
```

**Recommended**: Use SSH for easier authentication

---

## Step 3: Set Up SSH Keys (One-time setup)

If you haven't set up SSH keys for Code.Amazon.com:

### Check if you have SSH keys:
```bash
ls -la ~/.ssh/id_rsa.pub
```

### If no keys exist, generate them:
```bash
ssh-keygen -t rsa -b 4096 -C "your-email@amazon.com"
# Press Enter to accept default location
# Enter a passphrase (optional but recommended)
```

### Add your public key to Code.Amazon.com:
```bash
# Copy your public key
cat ~/.ssh/id_rsa.pub | pbcopy

# Then:
# 1. Go to https://code.amazon.com/settings/keys
# 2. Click "Add SSH Key"
# 3. Paste your key
# 4. Give it a name (e.g., "MacBook Pro")
# 5. Click "Add Key"
```

### Test SSH connection:
```bash
ssh -T git.amazon.com
# Should see: "You've successfully authenticated"
```

---

## Step 4: Add Brazil Remote and Push

Now that you have the repository URL, add it as a remote:

```bash
# Add Brazil remote (replace with your actual URL)
git remote add brazil ssh://git.amazon.com/pkg/EmailProgressTracker

# Push to Brazil
git push brazil main

# Or if you want to push to 'mainline' branch (Brazil convention)
git push brazil main:mainline
```

---

## Step 5: Verify Upload

1. Go to: https://code.amazon.com/packages/EmailProgressTracker
2. You should see all your code
3. Verify the files are there:
   - Backend code
   - Frontend code
   - Deployment guides
   - Tests

---

## Alternative: Clone and Copy Method

If you prefer to start fresh:

```bash
# Clone the empty Brazil repository
git clone ssh://git.amazon.com/pkg/EmailProgressTracker brazil-repo
cd brazil-repo

# Copy all your code (from your current directory)
cp -r ../RoadmapVisualizer/* .
cp -r ../RoadmapVisualizer/.* . 2>/dev/null

# Commit and push
git add .
git commit -m "Initial commit: Email progress tracking system"
git push origin mainline
```

---

## Step 6: Create Brazil Package (Optional)

If you want to create a proper Brazil package for building/deployment:

### Create Config files:

**Config** file (in root directory):
```
[package]
name = EmailProgressTracker
version = 1.0

[dependencies]
# Add any Brazil package dependencies here

[build]
type = nodejs
```

**Makefile** (in root directory):
```makefile
include $(BRAZIL_BUILD_TOOLS)/Makefile.nodejs
```

Then commit and push:
```bash
git add Config Makefile
git commit -m "Add Brazil package configuration"
git push brazil main:mainline
```

---

## Troubleshooting

### Issue: Permission Denied (publickey)
**Solution**: Make sure you've added your SSH key to Code.Amazon.com (Step 3)

### Issue: Repository not found
**Solution**: 
- Verify the repository URL is correct
- Check you have access to the repository
- Try using HTTPS instead of SSH

### Issue: Authentication failed
**Solution**:
- For SSH: Check your SSH keys are set up correctly
- For HTTPS: Use your Amazon credentials

### Issue: Can't push to 'main'
**Solution**: Brazil often uses 'mainline' as the default branch:
```bash
git push brazil main:mainline
```

---

## Quick Reference Commands

```bash
# Check current remotes
git remote -v

# Add Brazil remote
git remote add brazil ssh://git.amazon.com/pkg/EmailProgressTracker

# Push to Brazil
git push brazil main:mainline

# Pull from Brazil
git pull brazil mainline

# View Brazil repository
open https://code.amazon.com/packages/EmailProgressTracker
```

---

## What Gets Uploaded

Your repository includes:
- ✅ Complete email progress tracking system
- ✅ Backend (Node.js/Express with TypeScript)
- ✅ Frontend (React/TypeScript)
- ✅ 7 comprehensive deployment guides (125KB)
- ✅ AWS deployment automation script
- ✅ 273 passing tests
- ✅ Docker configuration
- ✅ All documentation and specs

**Total**: 197 files, 58,281 lines of code

---

## Next Steps After Upload

1. **Share with team**: Send them the Code.Amazon.com URL
2. **Set up CI/CD**: Configure Brazil build pipeline
3. **Deploy**: Use the AWS deployment guides
4. **Documentation**: Point team to deployment guides

---

## Support

- **Code.Amazon.com Help**: https://code.amazon.com/help
- **Brazil Documentation**: https://w.amazon.com/bin/view/Brazil/
- **SSH Key Setup**: https://code.amazon.com/help/ssh-keys

---

## Summary

1. Create repository on Code.Amazon.com
2. Set up SSH keys (one-time)
3. Add Brazil remote: `git remote add brazil ssh://git.amazon.com/pkg/EmailProgressTracker`
4. Push code: `git push brazil main:mainline`
5. Verify on Code.Amazon.com

Your code is ready to upload! 🚀
