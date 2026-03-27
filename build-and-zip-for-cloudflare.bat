@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

REM Перейти в папку проекта (рядом с package.json), даже если bat запущен откуда угодно
cd /d "%~dp0"

echo.
echo === Сборка сайта и ZIP для Cloudflare Pages ===
echo Папка проекта: %CD%
echo.

REM Node.js в PATH (если установлен в стандартное место, а в консоли не виден)
where node >nul 2>&1
if errorlevel 1 (
  if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
  )
)
where node >nul 2>&1
if errorlevel 1 (
  echo [ОШИБКА] Node.js не найден. Установите LTS с https://nodejs.org/
  echo После установки закройте окно и запустите этот файл снова.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [ОШИБКА] package.json не найден. Запускайте bat из корня проекта ^(папка site^).
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Первый раз: ставлю зависимости ^(npm install^)...
  call npm install
  if errorlevel 1 (
    echo [ОШИБКА] npm install не удался.
    pause
    exit /b 1
  )
  echo.
)

if not exist ".env.local" (
  echo [ВНИМАНИЕ] Нет файла .env.local
  echo Для работы Supabase в проде создайте .env.local с:
  echo   VITE_SUPABASE_URL=...
  echo   VITE_SUPABASE_ANON_KEY=...
  echo Сборка всё равно продолжится.
  echo.
)

echo Запускаю сборку и создание cloudflare-pages-upload.zip...
echo.
call npm run build:cf-upload
if errorlevel 1 (
  echo.
  echo [ОШИБКА] Сборка или архив не удались. Сообщение выше.
  pause
  exit /b 1
)

set "ZIP=%CD%\cloudflare-pages-upload.zip"
if not exist "%ZIP%" (
  echo [ОШИБКА] Файл cloudflare-pages-upload.zip не создан.
  pause
  exit /b 1
)

echo.
echo === Готово ===
echo Файл для загрузки: %ZIP%
echo.
echo Дальше в Cloudflare:
echo   1. Workers and Pages -^> Create -^> Pages -^> Direct Upload
echo   2. Загрузите cloudflare-pages-upload.zip из этой папки
echo   3. После деплоя откройте выданный *.pages.dev
echo.

REM Показать папку и выделить ZIP в проводнике
explorer /select,"%ZIP%"

pause
endlocal
