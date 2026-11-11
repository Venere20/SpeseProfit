@echo off
title Installa SpeseProfit
node "%~dp0scripts\install-android.mjs"
set speseprofit_result=%errorlevel%
echo.
pause
exit /b %speseprofit_result%
