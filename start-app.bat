@echo off
echo Starting WebApp Music Application...
echo.

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm start"

echo.
echo Frontend server is starting...
echo Frontend: http://localhost:3000
echo.
echo Note: Backend is deployed on Vercel at:
echo https://web-app-music-przybylektutorials-projects.vercel.app
echo.
echo Press any key to close this window...
pause > nul 