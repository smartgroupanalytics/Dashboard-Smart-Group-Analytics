# Execute na pasta raiz do projeto apos copiar os arquivos do ZIP.
$ErrorActionPreference = 'Stop'
$Raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$Fonte = Join-Path $Raiz 'modulos\compras\fornecedores-fonte'
$Destino = Join-Path $Raiz 'modulos\compras\fornecedores'
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js/NPM nao encontrado. Instale a versao LTS do Node.js e execute novamente.'
  exit 1
}
Push-Location $Fonte
try {
  npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'Falha no npm ci.' }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Falha no npm run build.' }
  if (-not (Test-Path (Join-Path $Fonte 'dist\index.html'))) { throw 'Build nao criou index.html.' }
  New-Item -ItemType Directory -Force $Destino | Out-Null
  Get-ChildItem $Destino -Force | Remove-Item -Recurse -Force
  Copy-Item (Join-Path $Fonte 'dist\*') $Destino -Recurse -Force
  Write-Host ''
  Write-Host 'OK. RADAR ORIGINAL GERADO EM modulos/compras/fornecedores' -ForegroundColor Green
  Write-Host 'Agora voce pode fazer o commit dos arquivos novos no GitHub.' -ForegroundColor Green
} finally { Pop-Location }
