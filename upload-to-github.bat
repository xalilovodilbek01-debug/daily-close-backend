@echo off
echo GitHub username kiriting (masalan: xalilovodilbek01-debug):
set /p USERNAME=

cd /d "C:\Users\User\daily-close\backend"

git init
git add .
git commit -m "Initial commit: Daily Close backend"
git branch -M main
git remote add origin https://github.com/%USERNAME%/daily-close-backend.git
git push -u origin main

echo.
echo ✅ Kod GitHub'ga yuklandi!
echo Endi Railway'ga boring va repo'ni tanlang.
pause
