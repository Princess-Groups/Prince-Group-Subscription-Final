# Security Pre-Deployment Verification Script (Windows)
# Run this to verify your app is safe to deploy

Write-Host "[SECURITY] Pre-Deployment Verification"
Write-Host "======================================="

$errors = 0
$warnings = 0

Write-Host ""
Write-Host "Checking .gitignore..."
if ((Test-Path .gitignore) -and ((Get-Content .gitignore) -match '\.env')) {
    Write-Host "[OK] .env is in .gitignore"
} else {
    Write-Host "[ERROR] .env NOT in .gitignore"
    $errors++
}

Write-Host ""
Write-Host "Checking example files..."
if (Test-Path .env.example) {
    Write-Host "[OK] .env.example exists"
} else {
    Write-Host "[ERROR] .env.example missing"
    $errors++
}

if (Test-Path supabase\.env.local.example) {
    Write-Host "[OK] supabase/.env.local.example exists"
} else {
    Write-Host "[ERROR] supabase/.env.local.example missing"
    $errors++
}

Write-Host ""
Write-Host "Checking Supabase functions..."
$functions = @(
    "supabase\functions\create-razorpay-order\index.ts",
    "supabase\functions\confirm-razorpay-payment\index.ts",
    "supabase\functions\save-payment\index.ts",
    "supabase\functions\razorpay-webhook\index.ts",
    "supabase\functions\send-whatsapp\index.ts"
)

foreach ($func in $functions) {
    if (Test-Path $func) {
        Write-Host "[OK] $func"
    } else {
        Write-Host "[ERROR] $func missing"
        $errors++
    }
}

Write-Host ""
Write-Host "Checking documentation..."
$docs = @(
    "DEPLOYMENT.md",
    "SECURITY_CHECKLIST.md",
    "QUICK_DEPLOY.md"
)

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Write-Host "[OK] $doc"
    } else {
        Write-Host "[WARNING] $doc missing"
        $warnings++
    }
}

Write-Host ""
Write-Host "Local environment..."
if (Test-Path .env) {
    Write-Host "[WARNING] .env file exists locally (OK for development)"
} else {
    Write-Host "[OK] .env not found"
}

Write-Host ""
Write-Host "======================================="
Write-Host "Summary: $errors errors, $warnings warnings"
Write-Host ""

if ($errors -eq 0) {
    Write-Host "[SUCCESS] Ready to deploy!"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Read QUICK_DEPLOY.md for step-by-step instructions"
    Write-Host "2. Make sure .env is NOT committed to git"
    Write-Host "3. Push code to GitHub"
    Write-Host "4. Deploy on Vercel, Render, or Railway"
} else {
    Write-Host "[ERROR] Fix issues before deploying"
}
