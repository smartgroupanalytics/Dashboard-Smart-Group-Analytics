$ErrorActionPreference = 'Stop'
# Acrescenta somente as entradas descritas em integracao.json. Nao executa Git.
try {
    $root = $PSScriptRoot
    $manifestPath = Join-Path $root 'modulos\marcas-familias\integracao.json'
    $utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
    $manifest = [System.IO.File]::ReadAllText($manifestPath, $utf8Strict) | ConvertFrom-Json
    $required = @('module-guard.js', 'modulos\marcas-familias\index.html', 'modulos\marcas-familias\app.js', 'modulos\marcas-familias\core.js', 'modulos\marcas-familias\style.css', 'modulos\marcas-familias\data\base.json', 'modulos\marcas-familias\vendor\xlsx.full.min.js')
    foreach ($relative in $required) {
        if (-not (Test-Path -LiteralPath (Join-Path $root $relative) -PathType Leaf)) { throw "Arquivo ausente: $relative. Extraia o pacote completo na raiz do projeto." }
    }
    $changes = @()
    foreach ($group in ($manifest.patches | Group-Object file)) {
        if ($group.Name -notin @('index.html', 'app.js', 'usuarios/index.html')) { throw 'Arquivo de integracao inesperado.' }
        $path = Join-Path $root $group.Name
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Nao foi encontrado: $path" }
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $hadBom = $bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191
        $original = [System.IO.File]::ReadAllText($path, $utf8Strict)
        $crlf = $original.Contains("`r`n")
        $result = $original.Replace("`r`n", "`n")
        foreach ($patch in $group.Group) {
            if ($result.Contains([string]$patch.marker)) { continue }
            $regex = New-Object System.Text.RegularExpressions.Regex([string]$patch.pattern)
            if ($regex.Matches($result).Count -ne 1) { throw "Estrutura diferente em $($group.Name), etapa $($patch.marker). Nenhum arquivo foi alterado. Envie o ZIP atualizado para adaptar a integracao." }
            $result = $regex.Replace($result, [string]$patch.replacement, 1)
        }
        if ($crlf) { $result = $result.Replace("`n", "`r`n") }
        if ($result -ne $original) {
            $changes += [PSCustomObject]@{Path=$path; Relative=$group.Name; Content=$result; Bom=$hadBom; Bytes=$bytes}
        }
    }
    if ($changes.Count -eq 0) {
        Write-Host 'Marcas e Familias ja esta integrado. Nenhuma alteracao necessaria.' -ForegroundColor Green
        exit 0
    }
    # Todos os pontos de inclusao foram validados antes de criar ou alterar arquivos.
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $backup = Join-Path (Split-Path -Parent $root) "Backup-Marcas-Familias-$stamp"
    New-Item -ItemType Directory -Path $backup | Out-Null
    foreach ($change in $changes) {
        $destination = Join-Path $backup $change.Relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
        [System.IO.File]::WriteAllBytes($destination, $change.Bytes)
    }
    $written = @()
    try {
        foreach ($change in $changes) {
            # Revalida concorrencia para nao sobrescrever uma atualizacao durante a instalacao.
            $current = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($change.Path))
            if ($current -ne [Convert]::ToBase64String($change.Bytes)) { throw "O arquivo $($change.Relative) mudou durante a instalacao. Tente novamente apos concluir outras operacoes." }
            $encoding = New-Object System.Text.UTF8Encoding($change.Bom)
            $written += $change
            [System.IO.File]::WriteAllText($change.Path, $change.Content, $encoding)
        }
    } catch {
        foreach ($change in $written) { [System.IO.File]::WriteAllBytes($change.Path, $change.Bytes) }
        throw
    }
    Write-Host 'Modulo Marcas e Familias integrado com sucesso.' -ForegroundColor Green
    Write-Host "Backup dos arquivos do portal: $backup"
    Write-Host 'Modulos existentes, automacoes e pasta .git nao foram alterados.'
    Write-Host 'No GitHub Desktop, confira as alteracoes antes de fazer commit/publicar.'
    Write-Host 'Administradores tem acesso. Para outros usuarios, marque Marcas e Familias em Administracao > Usuarios.'
} catch {
    Write-Host "Instalacao interrompida: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
