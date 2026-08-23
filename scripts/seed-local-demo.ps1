$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  throw "Docker Desktop não foi encontrado. Instale/inicie o Docker Desktop e execute este script novamente. Nenhum projeto hospedado foi alterado."
}

Push-Location $repositoryRoot
try {
  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop está instalado, mas não está em execução."
  }

  pnpm exec supabase start
  if ($LASTEXITCODE -ne 0) { throw "Não foi possível iniciar o Supabase local." }

  # --local is intentional: this script must never reset a linked/hosted project.
  pnpm exec supabase db reset --local --yes
  if ($LASTEXITCODE -ne 0) { throw "O reset/seed local falhou." }

  pnpm exec supabase status
  Write-Host "Demo local pronto. Login: thiago.demo@pperfil.local / PPerfilDemo#2026"
}
finally {
  Pop-Location
}
