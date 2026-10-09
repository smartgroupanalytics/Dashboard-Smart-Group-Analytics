$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$appPath = Join-Path $root 'app.js'
$indexPath = Join-Path $root 'index.html'

if (!(Test-Path $appPath)) {
    Write-Host 'ERRO: app.js nao encontrado.' -ForegroundColor Red
    Write-Host 'Coloque estes arquivos na RAIZ do projeto Dashboard-Smart-Group-Analytics e execute novamente.'
    exit 1
}

$app = Get-Content -Raw -Encoding UTF8 $appPath
$originalApp = $app

# 1) Permissao do modulo no mapa principal.
if ($app -notmatch '"custos-rentabilidade"\s*:\s*"custos-rentabilidade"') {
    $pattern = 'financeiro\s*:\s*"financeiro"\s*,'
    if ($app -notmatch $pattern) {
        throw 'Nao encontrei o ponto seguro para adicionar a permissao apos Financeiro.'
    }
    $app = [regex]::Replace(
        $app,
        $pattern,
        '$0' + "`r`n    \"custos-rentabilidade\": \"custos-rentabilidade\"," ,
        1
    )
}

# 2) Rota que realmente abre o iframe do modulo.
if ($app -notmatch 'case\s+"custos-rentabilidade"\s*:') {
$route = @'
case "custos-rentabilidade":

    titulo.innerText = "Custos e Rentabilidade";

    subtitulo.innerText =
    "Faturamento, custos, margem e rentabilidade por produto.";

    conteudo.innerHTML = `
        <iframe
            src="modulos/custos-rentabilidade/index.html?v=20261009-18"
            class="iframe-modulo"
            title="Módulo Custos e Rentabilidade"
            frameborder="0">
        </iframe>
    `;

break;

'@

    $marker = 'case\s+"compras"\s*:'
    $m = [regex]::Match($app, $marker)
    if (!$m.Success) {
        throw 'Nao encontrei o case "compras" para inserir a rota antes dele.'
    }
    $app = $app.Insert($m.Index, $route)
}

if ($app -ne $originalApp) {
    $backup = "$appPath.bak-antes-custos-v18"
    if (!(Test-Path $backup)) {
        Copy-Item $appPath $backup
    }
    Set-Content -Path $appPath -Value $app -Encoding UTF8
    Write-Host 'OK: app.js corrigido.' -ForegroundColor Green
} else {
    Write-Host 'INFO: app.js ja continha a permissao e a rota.' -ForegroundColor Yellow
}

# 3) Forca o navegador a buscar o app.js novo, sem alterar o restante do index.html.
if (Test-Path $indexPath) {
    $index = Get-Content -Raw -Encoding UTF8 $indexPath
    $newIndex = [regex]::Replace(
        $index,
        'app\.js\?v=[^"'']+',
        'app.js?v=custos-rentabilidade-route-v18-20261009',
        1
    )
    if ($newIndex -ne $index) {
        $backupIndex = "$indexPath.bak-antes-custos-v18"
        if (!(Test-Path $backupIndex)) {
            Copy-Item $indexPath $backupIndex
        }
        Set-Content -Path $indexPath -Value $newIndex -Encoding UTF8
        Write-Host 'OK: index.html atualizado para limpar cache do app.js.' -ForegroundColor Green
    } else {
        Write-Host 'AVISO: nao alterei index.html; confira manualmente a linha que carrega app.js.' -ForegroundColor Yellow
    }
} else {
    Write-Host 'AVISO: index.html nao encontrado. A rota foi corrigida no app.js, mas talvez seja necessario Ctrl+F5.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'CORRECAO CONCLUIDA.' -ForegroundColor Cyan
Write-Host 'Agora abra o GitHub Desktop, confira app.js e index.html, faca Commit e Push origin.'
Write-Host 'Depois aguarde o GitHub Pages publicar e pressione Ctrl+F5 no navegador.'
