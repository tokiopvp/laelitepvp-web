@echo off
setlocal
cd /d "%~dp0"
title La Elite PvP - Aplicar migracion de Supabase

set "SQL=%~dp0..\supabase\emblemas_y_contacto.sql"
set "PROYECTO=thlbxskhcrxyejpvhpyn"

echo.
echo  ==========================================================
echo    APLICAR MIGRACION  -  emblemas_y_contacto.sql
echo  ==========================================================
echo.
echo  Que hace esta migracion:
echo    - crea el bucket 'emblemas' para los rangos reales del juego
echo    - anade members.emblema_br_url / emblema_cs_url
echo    - anade profiles.whatsapp (con indice unico)
echo    - crea la funcion guardar_vinculacion(ffid, whatsapp)
echo    - crea la vista clan_contactos, que lee el bot
echo.
echo  Es DDL: hay que correrla con permisos de dueno del proyecto,
echo  no se puede desde la API. Por eso va por el editor SQL.
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
echo  Cuando termine, comprueba que quedo bien con:
echo     scripts\COMPROBAR-MIGRACION.bat
echo.
pause
