param(
  [Parameter(Mandatory)][string]$SheetId,
  [string]$Remote = "https://github.com/bill541328/LineWeb.git",
  [string]$Branch = "main",
  [string]$PublicBranch = "public",     # 推回 LineWebDemo 的分支；"" = 不推
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"
Set-Location (git rev-parse --show-toplevel)
npm run build:public -- --sheet-id $SheetId
if ($LASTEXITCODE -ne 0) { throw "build/verify failed — nothing pushed" }
if ($DryRun) { Get-ChildItem dist/public -Recurse -File -Name; return }
$origin = git remote get-url origin
Push-Location dist/public
try {
  git init -q -b main
  git add -A
  git commit -q -m "Publish site"
  git push --force $Remote "HEAD:$Branch"
  if ($PublicBranch) { git push --force $origin "HEAD:$PublicBranch" }
} finally {
  Pop-Location
  Remove-Item dist/public/.git -Recurse -Force -ErrorAction SilentlyContinue
}
