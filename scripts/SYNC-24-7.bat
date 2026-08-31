@echo off
title SYNC WEB - La Elite PvP
cd /d "%~dp0"

REM ============================================================
REM  Sube los datos del clan a la web, cada minuto, sin parar.
REM
REM  POR QUE EXISTE ESTE ARCHIVO
REM  ---------------------------
REM  Esto lo hacia una tarea del Programador de Windows, y se ha
REM  encontrado DESHABILITADA dos veces. Las dos con resultado 0,
REM  o sea, la ultima ejecucion fue correcta: algo la apaga, no
REM  falla. Y cuando se apaga nadie se entera hasta que alguien
REM  mira la web y ve "Sin actualizar hace 13 horas".
REM
REM  Aqui el sync arranca CON los bots y se ve en pantalla. Si se
REM  para, se nota igual que si se para un bot.
REM
REM  Se puede dejar la tarea programada tambien: correr los dos a
REM  la vez no rompe nada -si coinciden, el segundo escribe los
REM  mismos datos encima- pero con esto ya no hace falta.
REM ============================================================

set PY=
where py >nul 2>&1 && set PY=py
if "%PY%"=="" ( where python >nul 2>&1 && set PY=python )
if "%PY%"=="" (
  echo.
  echo  No encuentro Python. Instalalo desde python.org y marca
  echo  "Add Python to PATH" durante la instalacion.
  echo.
  pause
  exit /b 1
)

echo.
echo  Subiendo datos del clan a la web cada minuto.
echo  Deja esta ventana abierta. Ctrl+C para parar.
echo.

:bucle
%PY% sync_clan.py
REM 55 segundos, no 60: el propio script tarda unos segundos, y
REM asi el ciclo completo ronda el minuto en vez de irse a 70s.
timeout /t 55 /nobreak >nul
goto bucle
