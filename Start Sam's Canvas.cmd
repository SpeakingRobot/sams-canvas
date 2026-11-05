@echo off
cd /d "%~dp0"
start "Sam's Canvas browser" http://localhost:4173
node server.mjs
