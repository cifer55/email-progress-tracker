#!/bin/bash

# Upload to Brazil Script
# This script helps you upload your code to Amazon's internal Brazil/Code repository
# Run this on your Amazon dev desktop (WorkSpaces or physical machine)

set -e

echo "=========================================="
echo "Upload to Brazil - Email Progress Tracker"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if we're on Amazon network
echo -e "${BLUE}Step 1: Checking Amazon network connectivity...${NC}"
if ! ping -c 1 git.amazon.com &> /dev/null; then
    echo -e "${RED}✗ Cannot reach git.amazon.com${NC}"
    echo -e "${YELLOW}Please ensure you're on Amazon network (VPN or dev desktop)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Connected to Amazon network${NC}"
echo ""

# Step 2: Check if Brazil CLI is available
echo -e "${BLUE}Step 2: Checking Brazil CLI...${NC}"
if command -v brazil &> /dev/null; then
    echo -e "${GREEN}✓ Brazil CLI found${NC}"
    BRAZIL_VERSION=$(brazil --version 2>&1 | head -1)
    echo "  Version: $BRAZIL_VERSION"
else
    echo -e "${YELLOW}⚠ Brazil CLI not found (optional)${NC}"
fi
echo ""

# Step 3: Check if git is configured
echo -e "${BLUE}Step 3: Checking git configuration...${NC}"
GIT_USER=$(git config user.name 2>/dev/null || echo "")
GIT_EMAIL=$(git config user.email 2>/dev/null || echo "")

if [ -z "$GIT_USER" ] || [ -z "$GIT_EMAIL" ]; then
    echo -e "${YELLOW}⚠ Git not fully configured${NC}"
    echo "Please configure git:"
    echo "  git config --global user.name \"Your Name\""
    echo "  git config --global user.email \"your-alias@amazon.com\""
    exit 1
fi

echo -e "${GREEN}✓ Git configured${NC}"
echo "  Name: $GIT_USER"
echo "  Email: $GIT_EMAIL"
echo ""

# Step 4: Check SSH key
echo -e "${BLUE}Step 4: Checking SSH key...${NC}"
if [ ! -f ~/.ssh/id_rsa.pub ]; then
    echo -e "${YELLOW}⚠ No SSH key found. Generating one...${NC}"
    ssh-keygen -t rsa -b 4096 -C "$GIT_EMAIL" -f ~/.ssh/id_rsa -N ""
    echo -e "${GREEN}✓ SSH key generated${NC}"
fi

echo -e "${GREEN}✓ SSH key exists${NC}"
echo ""
echo "Your public SSH key:"
echo "----------------------------------------"
cat ~/.ssh/id_rsa.pub
echo "----------------------------------------"
echo ""
echo -e "${YELLOW}Add this key to Code.Amazon.com:${NC}"
echo "  1. Go to: https://code.amazon.com/-/settings/ssh"
echo "  2. Click 'Add SSH Key'"
echo "  3. Paste the key above"
echo "  4. Click 'Add Key'"
echo ""
read -p "Press Enter once you've added the SSH key..."
echo ""

# Step 5: Test SSH connection
echo -e "${BLUE}Step 5: Testing SSH connection to git.amazon.com...${NC}"
if ssh -T git.amazon.com 2>&1 | grep -q "successfully authenticated"; then
    echo -e "${GREEN}✓ SSH authentication successful${NC}"
else
    echo -e "${RED}✗ SSH authentication failed${NC}"
    echo "Please check:"
    echo "  1. SSH key is added to Code.Amazon.com"
    echo "  2. You're on Amazon network"
    exit 1
fi
echo ""

# Step 6: Get repository name
echo -e "${BLUE}Step 6: Repository setup${NC}"
echo "Default repository name: EmailProgressTracker"
read -p "Enter repository name (or press Enter for default): " REPO_NAME
REPO_NAME=${REPO_NAME:-EmailProgressTracker}
echo ""

# Step 7: Check if repository exists on Code.Amazon.com
echo -e "${BLUE}Step 7: Checking if repository exists...${NC}"
REPO_URL="ssh://git.amazon.com/pkg/$REPO_NAME"
echo "Repository URL: $REPO_URL"
echo ""
echo -e "${YELLOW}If repository doesn't exist, create it:${NC}"
echo "  1. Go to: https://code.amazon.com/repositories/new"
echo "  2. Name: $REPO_NAME"
echo "  3. Description: Email-based progress tracking system"
echo "  4. Visibility: Internal"
echo "  5. Click 'Create Repository'"
echo ""
read -p "Press Enter once repository is created..."
echo ""

# Step 8: Add Brazil remote
echo -e "${BLUE}Step 8: Adding Brazil remote...${NC}"
if git remote | grep -q "^brazil$"; then
    echo -e "${YELLOW}⚠ Brazil remote already exists, removing...${NC}"
    git remote remove brazil
fi

git remote add brazil "$REPO_URL"
echo -e "${GREEN}✓ Brazil remote added${NC}"
echo ""

# Step 9: Push to Brazil
echo -e "${BLUE}Step 9: Pushing code to Brazil...${NC}"
echo "This will push your code to: $REPO_URL"
read -p "Continue? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Pushing to Brazil..."
if git push brazil main:mainline; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "✓ Successfully uploaded to Brazil!"
    echo "==========================================${NC}"
    echo ""
    echo "View your code at:"
    echo "  https://code.amazon.com/packages/$REPO_NAME"
    echo ""
    echo "Next steps:"
    echo "  1. Share repository with your team"
    echo "  2. Set up CI/CD pipeline"
    echo "  3. Deploy using AWS guides"
else
    echo ""
    echo -e "${RED}✗ Push failed${NC}"
    echo ""
    echo "Common issues:"
    echo "  1. Repository doesn't exist - create it on Code.Amazon.com"
    echo "  2. No permission - check repository access"
    echo "  3. Branch protection - try: git push brazil main:refs/heads/mainline"
    exit 1
fi
