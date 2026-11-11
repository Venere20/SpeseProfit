@echo off
title SpeseProfit - Android Studio
node "%~dp0scripts\prepare-android-studio.mjs" --open
if errorlevel 1 pause
