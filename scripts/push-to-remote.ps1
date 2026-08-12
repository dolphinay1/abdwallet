param(
  [string]$remoteName = "dolphin",
  [string]$remoteUrl  = "https://github.com/dolphinay1/abdwallet.git",
  [string]$branch     = "main"
)

if (-not (Test-Path -Path .git)) {
  Write-Error "This folder is not a git repository. Initialize with `git init` first or run inside a cloned repo."
  exit 1
}

Write-Host "Adding remote '$remoteName' -> $remoteUrl"
try {
  git remote remove $remoteName 2>$null
} catch {}

git remote add $remoteName $remoteUrl

Write-Host "Fetching remote..."
git fetch $remoteName

Write-Host "Pushing local branch '$branch' to remote '$remoteName' (will set upstream)"
$push = git push -u $remoteName $branch
if ($LASTEXITCODE -ne 0) {
  Write-Error "Git push failed. Please ensure you have permission and that credentials are configured."
  exit $LASTEXITCODE
}

Write-Host "Done — branch '$branch' pushed to $remoteUrl as remote '$remoteName'"
