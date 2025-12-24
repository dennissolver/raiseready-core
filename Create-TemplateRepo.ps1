# ============================================================================
# BATCH SECURITY PATCH - CVE-2025-55182
# ============================================================================
# Patches React/Next.js RCE vulnerability across all projects
# ============================================================================

param(
    [string]$GitHubOwner = "dennissolver",
    [switch]$MergePRs,      # Try to merge Vercel's auto-PRs
    [switch]$ManualPatch,   # Clone, update, push manually
    [switch]$DryRun         # Show what would be done without doing it
)

$repos = @(
    "raiseready-template",
    "creative-action-consulting",
    "connexions",
    "universal-interviews",
    "raiseready-impact",
    "tenderwatch",
    "soxton-law"
)

# Skip repos that should be deleted
$skipRepos = @(
    "creative-action-consulting"  # Orphaned from failed setup
)

$token = $env:GITHUB_TOKEN
if (-not $token) {
    Write-Host "ERROR: GITHUB_TOKEN environment variable not set" -ForegroundColor Red
    Write-Host "Set it with: `$env:GITHUB_TOKEN = 'your-token-here'" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    Authorization = "Bearer $token"
    Accept = "application/vnd.github+json"
}

Write-Host @"

╔══════════════════════════════════════════════════════════════════════════════╗
║           BATCH SECURITY PATCH - CVE-2025-55182                              ║
║           React/Next.js Remote Code Execution Fix                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# ============================================================================
# OPTION 1: Merge Vercel's Auto-PRs
# ============================================================================

if ($MergePRs -or (-not $ManualPatch)) {
    Write-Host "=== Checking for Vercel Security PRs ===" -ForegroundColor Yellow

    foreach ($repo in $repos) {
        if ($skipRepos -contains $repo) {
            Write-Host "  ⊘ $repo (skipped)" -ForegroundColor DarkGray
            continue
        }

        Write-Host "  Checking $repo..." -ForegroundColor Cyan -NoNewline

        try {
            # List open PRs
            $prsUrl = "https://api.github.com/repos/$GitHubOwner/$repo/pulls?state=open"
            $prs = Invoke-RestMethod -Uri $prsUrl -Headers $headers -ErrorAction Stop

            # Find Vercel security PR
            $securityPR = $prs | Where-Object {
                $_.title -match "security|CVE|vulnerability|patch" -or
                $_.user.login -eq "vercel[bot]" -or
                $_.head.ref -match "security|patch|vercel"
            } | Select-Object -First 1

            if ($securityPR) {
                Write-Host " Found PR #$($securityPR.number)" -ForegroundColor Green

                if ($DryRun) {
                    Write-Host "    [DRY RUN] Would merge PR #$($securityPR.number): $($securityPR.title)" -ForegroundColor Magenta
                } else {
                    # Merge the PR
                    $mergeUrl = "https://api.github.com/repos/$GitHubOwner/$repo/pulls/$($securityPR.number)/merge"
                    $mergeBody = @{
                        commit_title = "Security: patch CVE-2025-55182"
                        merge_method = "squash"
                    } | ConvertTo-Json

                    try {
                        Invoke-RestMethod -Uri $mergeUrl -Method PUT -Headers $headers -Body $mergeBody -ContentType "application/json" | Out-Null
                        Write-Host "    ✓ Merged PR #$($securityPR.number)" -ForegroundColor Green
                    } catch {
                        Write-Host "    ✗ Failed to merge: $_" -ForegroundColor Red
                    }
                }
            } else {
                Write-Host " No security PR found" -ForegroundColor Yellow
            }
        } catch {
            Write-Host " Error: $_" -ForegroundColor Red
        }
    }
}

# ============================================================================
# OPTION 2: Manual Patch (clone, update, push)
# ============================================================================

if ($ManualPatch) {
    Write-Host "`n=== Manual Patching ===" -ForegroundColor Yellow

    $tempDir = Join-Path $env:TEMP "security-patch-$(Get-Date -Format 'yyyyMMddHHmmss')"
    New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

    Push-Location $tempDir

    foreach ($repo in $repos) {
        if ($skipRepos -contains $repo) {
            Write-Host "  ⊘ $repo (skipped)" -ForegroundColor DarkGray
            continue
        }

        Write-Host "`n  Patching $repo..." -ForegroundColor Cyan

        if ($DryRun) {
            Write-Host "    [DRY RUN] Would clone, update packages, and push" -ForegroundColor Magenta
            continue
        }

        try {
            # Clone
            git clone "https://github.com/$GitHubOwner/$repo.git" --depth 1 2>$null
            Push-Location $repo

            # Check if package.json exists
            if (-not (Test-Path "package.json")) {
                Write-Host "    ⊘ No package.json found" -ForegroundColor Yellow
                Pop-Location
                continue
            }

            # Update packages
            Write-Host "    Installing dependencies..." -ForegroundColor DarkGray
            npm install 2>$null | Out-Null

            Write-Host "    Updating Next.js and React..." -ForegroundColor DarkGray
            npm install next@latest react@latest react-dom@latest 2>$null | Out-Null

            # Check if there are changes
            $changes = git status --porcelain
            if ($changes) {
                git add package.json package-lock.json 2>$null
                git commit -m "Security: patch CVE-2025-55182 React/Next.js RCE vulnerability" 2>$null | Out-Null
                git push 2>$null | Out-Null
                Write-Host "    ✓ Patched and pushed" -ForegroundColor Green
            } else {
                Write-Host "    ⊘ Already up to date" -ForegroundColor Yellow
            }

            Pop-Location
        } catch {
            Write-Host "    ✗ Error: $_" -ForegroundColor Red
            if ((Get-Location).Path -ne $tempDir) { Pop-Location }
        }
    }

    Pop-Location
    Write-Host "`nTemp directory: $tempDir" -ForegroundColor DarkGray
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host @"

╔══════════════════════════════════════════════════════════════════════════════╗
║                              COMPLETE                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Vercel will automatically redeploy patched projects.                        ║
║  Check deployment status at: https://vercel.com/dashboard                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan