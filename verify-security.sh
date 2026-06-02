#!/bin/bash
# Security Pre-Deployment Verification Script
# Run this before deploying to ensure no secrets are exposed

echo "🔒 Security Pre-Deployment Verification"
echo "========================================"
echo ""

ERRORS=0
WARNINGS=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: .env files not in git
echo "✓ Checking if .env files are in git..."
if git ls-files | grep -E '\.env[^.]|\.env\.local' > /dev/null; then
    echo -e "${RED}✗ ERROR: .env files are tracked by git!${NC}"
    echo "  Run: git rm --cached .env supabase/.env.local"
    ((ERRORS++))
else
    echo -e "${GREEN}✓ .env files not in git${NC}"
fi
echo ""

# Check 2: .gitignore contains .env
echo "✓ Checking if .gitignore excludes .env..."
if grep -E '\.env|\.env\.local' .gitignore > /dev/null; then
    echo -e "${GREEN}✓ .env files in .gitignore${NC}"
else
    echo -e "${RED}✗ ERROR: .env files NOT in .gitignore${NC}"
    ((ERRORS++))
fi
echo ""

# Check 3: Example files exist
echo "✓ Checking for .env.example files..."
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓ .env.example exists${NC}"
else
    echo -e "${YELLOW}⚠ WARNING: .env.example missing${NC}"
    ((WARNINGS++))
fi

if [ -f "supabase/.env.local.example" ]; then
    echo -e "${GREEN}✓ supabase/.env.local.example exists${NC}"
else
    echo -e "${YELLOW}⚠ WARNING: supabase/.env.local.example missing${NC}"
    ((WARNINGS++))
fi
echo ""

# Check 4: No secrets in source files
echo "✓ Checking for exposed secrets in source code..."
SECRET_PATTERNS=(
    "rzp_live_"
    "rzp_test_"
    "sb_secret_"
    "RAZORPAY_KEY_SECRET"
    "SUPABASE_SERVICE_ROLE_KEY"
)

for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -r "$pattern" src/ --exclude-dir=node_modules 2>/dev/null | grep -v "env" | grep -v "example" | grep -v "DEPLOYMENT" | grep -v "SECURITY" | grep -v "QUICK" > /dev/null; then
        echo -e "${YELLOW}⚠ WARNING: '$pattern' found in source code${NC}"
        grep -r "$pattern" src/ --exclude-dir=node_modules 2>/dev/null
        ((WARNINGS++))
    fi
done

if [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ No secrets found in source code${NC}"
fi
echo ""

# Check 5: Verify function files exist
echo "✓ Checking Supabase functions..."
FUNCTIONS=(
    "supabase/functions/create-razorpay-order/index.ts"
    "supabase/functions/confirm-razorpay-payment/index.ts"
    "supabase/functions/save-payment/index.ts"
    "supabase/functions/razorpay-webhook/index.ts"
    "supabase/functions/send-whatsapp/index.ts"
)

for func in "${FUNCTIONS[@]}"; do
    if [ -f "$func" ]; then
        echo -e "${GREEN}✓ $func exists${NC}"
    else
        echo -e "${RED}✗ ERROR: $func missing${NC}"
        ((ERRORS++))
    fi
done
echo ""

# Check 6: Environment variable format
echo "✓ Checking environment variable format in .env (if it exists)..."
if [ -f ".env" ]; then
    # Warn about test keys
    if grep -E "rzp_test_|sb_publishable_" .env > /dev/null; then
        echo -e "${YELLOW}⚠ WARNING: Using TEST keys in .env (OK for development)${NC}"
        ((WARNINGS++))
    fi
    
    # Warn about secrets in .env
    if grep -E "RAZORPAY_KEY_SECRET|SUPABASE_SERVICE_ROLE_KEY" .env | grep -v "=" > /dev/null; then
        echo -e "${YELLOW}⚠ WARNING: Secret keys might be exposed${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠ .env not found (OK if already deployed)${NC}"
fi
echo ""

# Check 7: Deployment guides exist
echo "✓ Checking deployment documentation..."
DOCS=(
    "DEPLOYMENT.md"
    "SECURITY_CHECKLIST.md"
    "QUICK_DEPLOY.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓ $doc exists${NC}"
    else
        echo -e "${YELLOW}⚠ WARNING: $doc missing${NC}"
        ((WARNINGS++))
    fi
done
echo ""

# Summary
echo "========================================"
echo "Verification Summary:"
echo -e "Errors: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Ready for deployment!${NC}"
    exit 0
else
    echo -e "${RED}❌ Fix errors before deploying${NC}"
    exit 1
fi
