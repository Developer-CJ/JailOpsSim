@echo off
powershell.exe -NoProfile -File "%~dp0windows\Start.ps1"
if errorlevel 1 pause
