@echo off
setlocal
cd /d "%~dp0"
title La Elite PvP - Reparar el mercado y el bot de Discord

set "SQL=%~dp0..\supabase\migrations\20260830_reparar_mercado_v6.sql"
set "PROYECTO=thlbxskhcrxyejpvhpyn"

echo.
echo  ==========================================================
echo    REPARAR MERCADO  -  20260830_reparar_mercado_v6.sql
echo  ==========================================================
echo.
echo  Que arregla:
echo    - el fallo de signo que disparo el precio a 2.964 millones
echo    - el desbordamiento numerico que tumbaba al bot de Discord
echo      ("No pude hablar con el servidor")
echo    - vender sin saldo desde el panel: ya no se puede
echo    - reinicia el grafico con velas normales
echo    - deja a Bruce Wayne con 123.000 coins
echo.
echo  Es DDL: hay que correrla desde el editor SQL de Supabase,
echo  no se puede desde la API.
echo.

if not exist "%SQL%" (
  echo  [X] No encuentro el archivo:
  echo      %SQL%
  echo.
  pause
  exit /b 1
)

echo  1) Copiando la SQL al portapapeles...
powershell -NoProfile -Command "Get-Content -Raw -Encoding UTF8 '%SQL%' | Set-Clipboard"
if errorlevel 1 (
  echo     [!] No pude copiarla. Abre el archivo a mano:
  echo         %SQL%
) else (
  echo     [OK] Copiada.
)

echo.
echo  2) Abriendo el editor SQL de Supabase...
start "" "https://supabase.com/dashboard/project/%PROYECTO%/sql/new"

echo.
echo  3) Alli: pega con Ctrl+V y pulsa RUN.
echo.
echo  4) Mira la tabla que sale al final:
echo       precio_ahora           un numero pequeno, tipo 0.0001
echo       saldo_bruce            123000
echo       versiones_market_push  1
echo.
echo  5) Reinicia el bot de Discord (iniciar.bat) y prueba una apuesta.
echo.
pause
