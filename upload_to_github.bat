@echo off
echo Initializing Git...
git init

echo Adding remote origin...
git remote add origin https://github.com/Luis4334/X4-1.1-VOX.git

echo Adding files...
git add .

echo Creating initial commit...
git commit -m "Initial commit of X4-1.1-VOX project"

echo Setting main branch...
git branch -M main

echo Pushing to GitHub...
echo Note: If you haven't configured your credentials, a login window may appear.
git push -u origin main

echo Done!
pause
