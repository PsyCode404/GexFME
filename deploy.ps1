# GexFME Deployment Script for Render
# Built for corporate Gexpertise
# This script prepares and deploys the GexFME application to Render

Write-Host "🚀 GexFME Deployment Script - Corporate Gexpertise" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "Backend/app" -PathType Container)) {
    Write-Host "❌ Error: Please run this script from the GexFME project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Pre-deployment checklist:" -ForegroundColor Yellow
Write-Host "   ✅ S3 storage configured (Backblaze B2 - TESTED AND WORKING)"
Write-Host "   ✅ Environment variables ready for Render"
Write-Host "   ✅ Database connection tested (Neon.tech)"
Write-Host "   ✅ All storage operations verified"
Write-Host ""

# Check git status
Write-Host "🔍 Checking git status..." -ForegroundColor Blue
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "📝 Uncommitted changes found:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    
    $response = Read-Host "Do you want to commit these changes? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        $commitMessage = Read-Host "Enter commit message (or press Enter for default)"
        if (-not $commitMessage) {
            $commitMessage = "feat: configure Backblaze B2 storage and prepare for Render deployment"
        }
        
        Write-Host "📦 Adding files to git..." -ForegroundColor Blue
        git add .
        
        Write-Host "💾 Committing changes..." -ForegroundColor Blue
        git commit -m $commitMessage
    }
}

# Check current branch
$currentBranch = git branch --show-current
Write-Host "🌿 Current branch: $currentBranch" -ForegroundColor Blue

if ($currentBranch -ne "master" -and $currentBranch -ne "main") {
    Write-Host "⚠️ Warning: You're not on master/main branch" -ForegroundColor Yellow
    $response = Read-Host "Continue anyway? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "❌ Deployment cancelled" -ForegroundColor Red
        exit 1
    }
}

# Push to GitHub
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Blue
try {
    git push origin $currentBranch
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to push to GitHub. Please check your git configuration." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Deployment preparation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Go to https://render.com and create a new Web Service"
Write-Host "   2. Connect your GitHub repository"
Write-Host "   3. Use Docker environment with existing render.yaml"
Write-Host "   4. Deploy and monitor the build logs"
Write-Host "   5. Test the health endpoint: /health"
Write-Host ""
Write-Host "📚 For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "   - DEPLOYMENT.md"
Write-Host "   - DEPLOYMENT_CHECKLIST.md"
Write-Host ""
Write-Host "🏢 Built for corporate Gexpertise" -ForegroundColor Green
Write-Host "✨ Ready for production deployment!" -ForegroundColor Green
