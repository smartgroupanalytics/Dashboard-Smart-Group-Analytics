@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0corrigir-rota-custos-rentabilidade.ps1"
echo.
pause
